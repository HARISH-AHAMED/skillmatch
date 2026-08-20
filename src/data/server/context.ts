import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Role } from "@/lib/types";
import { companyInclude, freelancerInclude } from "@/adapters/include";
import type { CompanyRow, FreelancerRow } from "@/adapters/include";

/* ============================================================================
   VIEWER CONTEXT

   Every server page starts here. Authentication is Auth.js exactly as the
   backend already configures it — this module only reads `auth()` and the
   viewer's profile row, and never decides anything the backend does not
   already decide.
   ========================================================================= */

export interface Viewer {
  userId: string;
  name: string;
  email: string;
  image?: string;
  role: Role;
  freelancer?: FreelancerRow;
  company?: CompanyRow;
  /** Company profiles are usable only once onboarding has been submitted. */
  onboardingComplete: boolean;
  profileId: string;
  profileHref: string;
}

export function homeForRole(role: Role) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "COMPANY") return "/company/dashboard";
  return "/freelancer/dashboard";
}

/** The signed-in viewer, or null when nobody is signed in. */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const role = session.user.role as Role;
  const userId = session.user.id;

  const freelancer =
    role === "FREELANCER"
      ? await db.freelancer.findUnique({ where: { userId }, include: freelancerInclude })
      : null;
  const company =
    role === "COMPANY"
      ? await db.company.findUnique({ where: { userId }, include: companyInclude })
      : null;

  return {
    userId,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    image: session.user.image ?? undefined,
    role,
    freelancer: freelancer ?? undefined,
    company: company ?? undefined,
    // Mirrors the gate the existing dashboards use: a freelancer is complete
    // once the onboarding badge is set, a company once its wizard has run.
    onboardingComplete:
      role === "FREELANCER"
        ? Boolean(freelancer?.verificationBadges.includes("ONBOARDING_COMPLETED"))
        : role === "COMPANY"
          ? Boolean(company)
          : true,
    profileId: freelancer?.id ?? company?.id ?? "admin",
    profileHref: freelancer
      ? `/freelancers/${freelancer.id}`
      : company
        ? `/companies/${company.id}`
        : "/admin/dashboard",
  };
}

/**
 * Guard for the role-scoped route groups. Unauthenticated visitors go to the
 * login page carrying where they were headed; a signed-in viewer in the wrong
 * group goes to their own home — the same redirects the client-side guard in
 * the design performs, run on the server instead.
 */
export async function requireViewer(
  allowed: Role | Role[],
  nextPath?: string,
): Promise<Viewer> {
  const viewer = await getViewer();
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  if (!viewer) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  if (!roles.includes(viewer.role)) {
    redirect(homeForRole(viewer.role));
  }
  return viewer;
}

/** The viewer's freelancer profile, or a redirect if they have no business here. */
export async function requireFreelancer(nextPath?: string) {
  const viewer = await requireViewer("FREELANCER", nextPath);
  if (!viewer.freelancer) redirect("/freelancer/profile");
  return { viewer, freelancer: viewer.freelancer };
}

/** The viewer's company profile, or a redirect if they have no business here. */
export async function requireCompanyViewer(nextPath?: string) {
  const viewer = await requireViewer("COMPANY", nextPath);
  if (!viewer.company) redirect("/company/profile");
  return { viewer, company: viewer.company };
}
