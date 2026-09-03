import { NextResponse } from "next/server";
import { auth } from "@/auth";

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
    return NextResponse.redirect(new URL("/account/password", nextUrl.origin));
  }

  // Admin access control boundary
  // Force logged-in admins to stay within /admin paths. Changing your own
  // password is not an admin surface, so it is reachable from any role.
  if (isLoggedIn && userRole === "ADMIN" && !isAdminRoute && !isPasswordRoute) {
    return NextResponse.redirect(new URL("/admin/dashboard", nextUrl.origin));
  }

  // If user is logged in and trying to visit login/register, send them to their dashboard
  if (isAuthRoute) {
    if (isLoggedIn && userRole) {
      const dashboard = `/${userRole.toLowerCase()}/dashboard`;
      return NextResponse.redirect(new URL(dashboard, nextUrl.origin));
    }
    return NextResponse.next();
  }

  // Route protection for dashboards
  if (isAdminRoute || isCompanyRoute || isFreelancerRoute || isWorkspaceRoute) {
    if (!isLoggedIn || !userRole) {
      return NextResponse.redirect(new URL("/login", nextUrl.origin));
    }
    // The workspace is shared by companies and freelancers, so it has no single
    // expected role; membership is decided by the page against the project.
    if (isWorkspaceRoute) return NextResponse.next();

    // Role mismatch check
    if (isAdminRoute && userRole !== "ADMIN") {
      const dashboard = `/${userRole.toLowerCase()}/dashboard`;
      return NextResponse.redirect(new URL(dashboard, req.url));
    }
    if (isCompanyRoute && userRole !== "COMPANY") {
      const dashboard = `/${userRole.toLowerCase()}/dashboard`;
      return NextResponse.redirect(new URL(dashboard, req.url));
    }
    if (isFreelancerRoute && userRole !== "FREELANCER") {
      const dashboard = `/${userRole.toLowerCase()}/dashboard`;
      return NextResponse.redirect(new URL(dashboard, req.url));
    }
  }

  return NextResponse.next();
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
