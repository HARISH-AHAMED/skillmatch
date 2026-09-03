import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Every decision this proxy makes is a function of the caller's session, and a
 * session lives in a cookie. Neither NextResponse.redirect nor .next says so,
 * and the platform was filling the gap with "Cache-Control: public,
 * max-age=0, must-revalidate" and no Vary header at all — which made an
 * auth-dependent redirect a *shared, cacheable* response.
 *
 * The consequence was a signed-out user being handed the redirect computed for
 * a signed-in one: /login answered "307 → /company/dashboard" long after the
 * session that justified it had gone, so the login page was unreachable, the
 * dashboard rendered against whatever the cache held, and it all came right on
 * its own once the entry was evicted.
 *
 * Marking these no-store, and varying on Cookie, is what makes an
 * authorization decision belong to the request that asked for it.
 */
function sessionScoped(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Vary", "Cookie");
  return response;
}

/** A redirect that is never reused across sessions. */
function redirectTo(url: URL): NextResponse {
  return sessionScoped(NextResponse.redirect(url));
}

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const pathname = nextUrl.pathname;

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isCompanyRoute = pathname === "/company" || pathname.startsWith("/company/");
  const isFreelancerRoute = pathname === "/freelancer" || pathname.startsWith("/freelancer/");
  /**
   * SEC-009 — /workspace matched none of the guarded prefixes, so the proxy
   * applied no gating to it. The page enforces its own membership check, so no
   * unauthorized access was reachable, but requiring a session here is the
   * defence-in-depth the other authenticated areas already get.
   */
  const isWorkspaceRoute = pathname === "/workspace" || pathname.startsWith("/workspace/");
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/login/") || pathname === "/register" || pathname.startsWith("/register/");
  const isPasswordRoute = pathname === "/account/password";

  /**
   * SEC-002 — a credential migrated out of legacy plaintext storage is secure
   * from here on, but the password itself was once stored in the clear. The
   * flag recording that was written and then read by nothing, so the prompt it
   * existed for never happened. The user is held here until they choose a new
   * one.
   */
  if (isLoggedIn && req.auth?.user?.passwordChangeRequired && !isPasswordRoute) {
    return redirectTo(new URL("/account/password", nextUrl.origin));
  }

  // Admin access control boundary
  // Force logged-in admins to stay within /admin paths. Changing your own
  // password is not an admin surface, so it is reachable from any role.
  if (isLoggedIn && userRole === "ADMIN" && !isAdminRoute && !isPasswordRoute) {
    return redirectTo(new URL("/admin/dashboard", nextUrl.origin));
  }

  // If user is logged in and trying to visit login/register, send them to their dashboard
  if (isAuthRoute) {
    if (isLoggedIn && userRole) {
      const dashboard = `/${userRole.toLowerCase()}/dashboard`;
      return redirectTo(new URL(dashboard, nextUrl.origin));
    }
    return sessionScoped(NextResponse.next());
  }

  // Route protection for dashboards
  if (isAdminRoute || isCompanyRoute || isFreelancerRoute || isWorkspaceRoute) {
    if (!isLoggedIn || !userRole) {
      return redirectTo(new URL("/login", nextUrl.origin));
    }
    // The workspace is shared by companies and freelancers, so it has no single
    // expected role; membership is decided by the page against the project.
    if (isWorkspaceRoute) return sessionScoped(NextResponse.next());

    // Role mismatch check
    if (isAdminRoute && userRole !== "ADMIN") {
      const dashboard = `/${userRole.toLowerCase()}/dashboard`;
      return redirectTo(new URL(dashboard, req.url));
    }
    if (isCompanyRoute && userRole !== "COMPANY") {
      const dashboard = `/${userRole.toLowerCase()}/dashboard`;
      return redirectTo(new URL(dashboard, req.url));
    }
    if (isFreelancerRoute && userRole !== "FREELANCER") {
      const dashboard = `/${userRole.toLowerCase()}/dashboard`;
      return redirectTo(new URL(dashboard, req.url));
    }
  }

  /*
   * The catch-all carries the headers too: a public page rendered while
   * signed in shows authenticated chrome, so its response is no more reusable
   * across sessions than a redirect is.
   */
  return sessionScoped(NextResponse.next());
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
