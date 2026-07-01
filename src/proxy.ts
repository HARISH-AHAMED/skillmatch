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
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/login/") || pathname === "/register" || pathname.startsWith("/register/");

  // Admin access control boundary
  // Force logged-in admins to stay within /admin paths
  if (isLoggedIn && userRole === "ADMIN" && !isAdminRoute) {
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
  if (isAdminRoute || isCompanyRoute || isFreelancerRoute) {
    if (!isLoggedIn || !userRole) {
      return NextResponse.redirect(new URL("/login", nextUrl.origin));
    }

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
