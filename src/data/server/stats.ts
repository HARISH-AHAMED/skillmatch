import "server-only";
import { db } from "@/lib/db";
import { PUBLICLY_BROWSEABLE } from "@/lib/domain";

/* ============================================================================
   AGGREGATE READS

   Counters for the dashboards, the admin console and the marketing pages. All
   of them are database aggregates rather than lengths of a fetched list, so a
   dashboard does not pull the whole table to show one number.
   ========================================================================= */

export async function platformStats() {
  const [
    freelancers,
    companies,
    projects,
    openProjects,
    applications,
    hires,
    reviews,
    certificates,
    released,
  ] = await Promise.all([
    db.freelancer.count(),
    db.company.count(),
    db.project.count(),
    db.project.count({ where: { status: "OPEN" } }),
    db.application.count(),
    db.application.count({ where: { status: "HIRED" } }),
    db.review.count(),
    db.certificate.count({ where: { revokedAt: null } }),
    db.paymentTransaction.aggregate({ where: { type: "RELEASE" }, _sum: { amount: true } }),
  ]);

  return {
    freelancers,
    companies,
    projects,
    openProjects,
    applications,
    hires,
    reviews,
    certificates,
    totalReleased: Math.abs(Number(released._sum.amount ?? 0)),
  };
}

export async function companyDashboardStats(companyId: string) {
  const [
    totalProjects,
    activeProjects,
    drafts,
    totalApplicants,
    applicants,
    shortlisted,
    hires,
    spend,
  ] = await Promise.all([
    db.project.count({ where: { companyId } }),
    db.project.count({ where: { companyId, status: { in: PUBLICLY_BROWSEABLE } } }),
    db.project.count({ where: { companyId, status: "DRAFT" } }),
    db.application.count({ where: { project: { companyId } } }),
    db.application.count({ where: { project: { companyId }, status: "PENDING" } }),
    db.application.count({ where: { project: { companyId }, status: "SHORTLISTED" } }),
    db.application.count({ where: { project: { companyId }, status: "HIRED" } }),
    db.paymentTransaction.aggregate({
      where: { type: "RELEASE", project: { companyId } },
      _sum: { amount: true },
    }),
  ]);

  return {
    activeProjects,
    totalProjects,
    applicants,
    totalApplicants,
    hires,
    shortlisted,
    spend: Math.abs(Number(spend._sum.amount ?? 0)),
    drafts,
  };
}

export async function freelancerDashboardStats(freelancerId: string) {
  // PaymentTransaction carries `applicationId` as a plain column rather than a
  // relation, so the freelancer's engagements are resolved first.
  const engagements = await db.application.findMany({
    where: { freelancerId },
    select: { id: true },
  });
  const applicationIds = engagements.map((a) => a.id);

  const [profile, applications, pending, shortlisted, activeProjects, earnings, certificates] =
    await Promise.all([
      db.freelancer.findUnique({
        where: { id: freelancerId },
        select: { rating: true, completedProjects: true },
      }),
      db.application.count({ where: { freelancerId } }),
      db.application.count({ where: { freelancerId, status: "PENDING" } }),
      db.application.count({ where: { freelancerId, status: "SHORTLISTED" } }),
      db.application.count({
        where: {
          freelancerId,
          status: "HIRED",
          project: { status: { in: PUBLICLY_BROWSEABLE } },
        },
      }),
      db.paymentTransaction.aggregate({
        where: { type: "RELEASE", applicationId: { in: applicationIds } },
        _sum: { amount: true },
      }),
      db.certificate.count({ where: { freelancerId, revokedAt: null } }),
    ]);

  return {
    applications,
    pending,
    shortlisted,
    activeProjects,
    earnings: Math.abs(Number(earnings._sum.amount ?? 0)),
    rating: profile?.rating ?? 0,
    completed: profile?.completedProjects ?? 0,
    certificates,
  };
}
