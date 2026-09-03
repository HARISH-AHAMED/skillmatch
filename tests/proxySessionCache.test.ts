import { describe, it, expect, vi } from "vitest";

/**
 * Session-dependent responses must never be reusable across sessions.
 *
 * Every decision the proxy makes is a function of the caller's cookie, but
 * neither NextResponse.redirect nor .next says so, and the platform filled the
 * gap with `Cache-Control: public, max-age=0, must-revalidate` and no Vary
 * header at all — making an authorization decision a shared, cacheable
 * response.
 *
 * A signed-out user was then handed the redirect computed for a signed-in one:
 * /login answered "307 → /company/dashboard" after the session that justified
 * it had gone, so the login page was unreachable, the dashboard rendered
 * against whatever the cache held, and it came right on its own once the entry
 * was evicted.
 */

// `auth()` wraps the handler; the identity wrapper hands it straight back so
// the routing logic can be driven directly.
vi.mock("@/auth", () => ({
  auth: (handler: unknown) => handler,
}));

const { proxy, config } = await import("@/proxy");

type Session = { user: { role: string; passwordChangeRequired?: boolean } } | null;

/** Drives the proxy for one path and auth state. */
function run(pathname: string, auth: Session) {
  const url = new URL(`https://frivvo.test${pathname}`);
  return (proxy as unknown as (req: unknown) => Response)({
    nextUrl: url,
    url: url.toString(),
    auth,
  });
}

const COMPANY: Session = { user: { role: "COMPANY" } };
const FREELANCER: Session = { user: { role: "FREELANCER" } };
const ADMIN: Session = { user: { role: "ADMIN" } };

/** Every path/auth combination the proxy can answer. */
const CASES: { path: string; auth: Session; label: string }[] = [
  { path: "/login", auth: null, label: "login, signed out" },
  { path: "/login", auth: COMPANY, label: "login, signed in" },
  { path: "/register", auth: FREELANCER, label: "register, signed in" },
  { path: "/company/dashboard", auth: null, label: "protected, signed out" },
  { path: "/company/dashboard", auth: COMPANY, label: "protected, right role" },
  { path: "/company/dashboard", auth: FREELANCER, label: "protected, wrong role" },
  { path: "/freelancer/dashboard", auth: COMPANY, label: "freelancer area, wrong role" },
  { path: "/admin/dashboard", auth: COMPANY, label: "admin area, wrong role" },
  { path: "/admin/dashboard", auth: ADMIN, label: "admin area, admin" },
  { path: "/workspace/app-1", auth: FREELANCER, label: "workspace, member" },
  { path: "/workspace/app-1", auth: null, label: "workspace, signed out" },
  { path: "/", auth: COMPANY, label: "public page, signed in" },
  { path: "/", auth: null, label: "public page, signed out" },
  { path: "/discover/projects", auth: null, label: "directory, signed out" },
  {
    path: "/company/dashboard",
    auth: { user: { role: "COMPANY", passwordChangeRequired: true } },
    label: "password change required",
  },
];

describe("the proxy never emits a cacheable session-dependent response", () => {
  for (const { path, auth, label } of CASES) {
    it(`marks ${label} no-store and Vary: Cookie`, () => {
      const res = run(path, auth);
      const cache = res.headers.get("cache-control") ?? "";
      const vary = res.headers.get("vary") ?? "";

      expect(cache).toContain("no-store");
      // `public` is what made an authorization decision shareable.
      expect(cache).not.toContain("public");
      expect(vary).toContain("Cookie");
    });
  }
});

describe("the routing decisions themselves are unchanged", () => {
  it("sends a signed-out caller from a protected route to login", () => {
    const res = run("/company/dashboard", null);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("lets a signed-out caller reach the login page", () => {
    // The bug: this used to be answerable with a cached redirect to a
    // dashboard, which is what made login unreachable after signing out.
    const res = run("/login", null);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("sends a signed-in caller away from the login page", () => {
    const res = run("/login", COMPANY);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/company/dashboard");
  });

  it("keeps an admin inside the admin area", () => {
    expect(run("/company/dashboard", ADMIN).headers.get("location")).toContain("/admin/dashboard");
  });

  it("lets an admin change their own password", () => {
    const res = run("/account/password", ADMIN);
    expect(res.headers.get("location")).toBeNull();
  });

  it("holds a migrated credential at the password screen", () => {
    const res = run("/company/dashboard", {
      user: { role: "COMPANY", passwordChangeRequired: true },
    });
    expect(res.headers.get("location")).toContain("/account/password");
  });

  it("admits a member to the workspace without a role check", () => {
    expect(run("/workspace/app-1", FREELANCER).headers.get("location")).toBeNull();
  });
});

describe("the matcher leaves non-page traffic alone", () => {
  it("excludes api and static assets", () => {
    const matcher = (config as { matcher: string[] }).matcher[0];
    expect(matcher).toContain("api");
    expect(matcher).toContain("_next/static");
  });
});
