import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Role } from "@prisma/client";
import { createDbMock, sessionState, setSession, signedOut, COMPANY_A, COMPANY_B, FREELANCER_A, FREELANCER_B } from "./helpers/mocks";

/**
 * A-01 — all three workspace routes gated on requireApplicationParty, which is
 * deliberately permissive: it admits the freelancer who submitted the
 * application whatever its status, because offers and contract signing are
 * things a not-yet-hired candidate legitimately does.
 *
 * The workspace is not. It carries the team roster, every payment record, the
 * work log and the full transaction ledger, so a PENDING applicant — or one
 * just removed from the project — could read all of it. The polling route
 * required HIRED, so the two read paths disagreed.
 */

const db = createDbMock();
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));

const { requireWorkspaceMember, requireApplicationParty } = await import("@/lib/authz");

/** An application on COMPANY_A's project, submitted by FREELANCER_A. */
function application(status: string, freelancerUserId = FREELANCER_A!.id) {
  return {
    id: "app-1",
    status,
    projectId: "p1",
    project: { id: "p1", companyId: "company-a", company: { userId: COMPANY_A!.id } },
    freelancer: { userId: freelancerUserId },
  };
}

beforeEach(() => {
  Object.values(db).forEach((m: any) => {
    if (typeof m === "function") m.mockReset?.();
    else Object.values(m).forEach((f: any) => f.mockReset?.());
  });
  signedOut();
});

describe("A-01: requireWorkspaceMember", () => {
  it("admits the owning company for an application in any status", async () => {
    setSession(COMPANY_A);
    for (const status of ["PENDING", "SHORTLISTED", "REJECTED", "HIRED"]) {
      db.application.findUnique.mockResolvedValue(application(status));
      const res = await requireWorkspaceMember("app-1");
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.role).toBe("COMPANY");
    }
  });

  it("admits a hired freelancer", async () => {
    setSession(FREELANCER_A);
    db.application.findUnique.mockResolvedValue(application("HIRED"));
    const res = await requireWorkspaceMember("app-1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.role).toBe("FREELANCER");
  });

  it("denies a freelancer whose application is not hired", async () => {
    setSession(FREELANCER_A);
    for (const status of ["PENDING", "SHORTLISTED", "REJECTED"]) {
      db.application.findUnique.mockResolvedValue(application(status));
      const res = await requireWorkspaceMember("app-1");
      expect(res.ok).toBe(false);
    }
  });

  it("denies a freelancer removed from the project after being hired", async () => {
    setSession(FREELANCER_A);
    // removeFreelancer moves the application to REJECTED.
    db.application.findUnique.mockResolvedValue(application("REJECTED"));
    const res = await requireWorkspaceMember("app-1");
    expect(res.ok).toBe(false);
  });

  it("denies an unrelated company", async () => {
    setSession(COMPANY_B);
    db.application.findUnique.mockResolvedValue(application("HIRED"));
    expect((await requireWorkspaceMember("app-1")).ok).toBe(false);
  });

  it("denies an unrelated freelancer", async () => {
    setSession(FREELANCER_B);
    db.application.findUnique.mockResolvedValue(application("HIRED"));
    expect((await requireWorkspaceMember("app-1")).ok).toBe(false);
  });

  it("denies an anonymous caller", async () => {
    db.application.findUnique.mockResolvedValue(application("HIRED"));
    expect((await requireWorkspaceMember("app-1")).ok).toBe(false);
  });

  it("denies a missing application without revealing that it is missing", async () => {
    setSession(COMPANY_A);
    db.application.findUnique.mockResolvedValue(null);
    const res = await requireWorkspaceMember("nope");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/not found, or you do not have access/i);
  });

  it("denies an admin, who is not a party to the engagement", async () => {
    setSession({ id: "admin-1", role: Role.ADMIN, name: "Root" });
    db.application.findUnique.mockResolvedValue(application("HIRED"));
    expect((await requireWorkspaceMember("app-1")).ok).toBe(false);
  });
});

describe("A-01: the offer and signing guard stays permissive", () => {
  it("still admits a shortlisted freelancer, so offers are not over-restricted", async () => {
    setSession(FREELANCER_A);
    db.application.findUnique.mockResolvedValue(application("SHORTLISTED"));
    const res = await requireApplicationParty("app-1");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.role).toBe("FREELANCER");
  });

  it("still admits a pending freelancer", async () => {
    setSession(FREELANCER_A);
    db.application.findUnique.mockResolvedValue(application("PENDING"));
    expect((await requireApplicationParty("app-1")).ok).toBe(true);
  });
});

describe("A-01: no workspace route bypasses the guard", () => {
  const routes = [
    "src/app/workspace/[applicationId]/page.tsx",
    "src/app/company/workspace/[applicationId]/page.tsx",
    "src/app/freelancer/workspace/[applicationId]/page.tsx",
  ];

  it("every workspace page calls requireWorkspaceMember", () => {
    for (const route of routes) {
      const src = readFileSync(join(process.cwd(), route), "utf8");
      expect(src).toContain("requireWorkspaceMember(applicationId)");
      // The permissive guard must not remain as an alternative entry point.
      expect(src).not.toContain("requireApplicationParty(applicationId)");
      // Failure is a 404, never a partial render.
      expect(src).toMatch(/if \(!party\.ok\) notFound\(\)/);
    }
  });

  it("the polling API keeps requiring project membership", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/api/workspace/[projectId]/route.ts"),
      "utf8"
    );
    expect(src).toContain("requireProjectParty(projectId)");
    expect(src).toContain("visibleChannelsFor(role, userId)");
  });

  it("the workspace data loader is only reachable behind a guard", () => {
    const src = readFileSync(join(process.cwd(), "src/data/server/workspace.ts"), "utf8");
    // It takes the already-authorised role rather than deriving access itself,
    // so it must never be called without one.
    expect(src).toContain('viewerRole: "COMPANY" | "FREELANCER"');
  });
});
