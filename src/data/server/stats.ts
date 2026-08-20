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

/** The admin overview: distributions and the most recent activity. */
export async function adminOverview() {
  const [byStatusRows, byDomainRows, totalProjects] = await Promise.all([
    db.project.groupBy({ by: ["status"], _count: { _all: true } }),
    db.project.groupBy({ by: ["domain"], _count: { _all: true } }),
    db.project.count(),
  ]);

  const statusCount = new Map(byStatusRows.map((r) => [r.status as string, r._count._all]));

  return {
    totalProjects,
    // The design lists these five in this order, whether or not any project
    // currently has that status.
    byStatus: ["OPEN", "IN_PROGRESS", "COMPLETED", "DRAFT", "CLOSED"].map((status) => ({
      status,
      count: statusCount.get(status) ?? 0,
    })),
    byDomain: byDomainRows
      .map((r) => ({ domain: r.domain ?? "Other", count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}

/** Open-listing count per company, for the directory and home-page cards. */
export async function openProjectCounts(companyIds: string[]) {
  const counts = new Map<string, number>();
  if (companyIds.length === 0) return counts;

  const rows = await db.project.groupBy({
    by: ["companyId"],
    where: { companyId: { in: companyIds }, status: "OPEN", isVisible: true },
    _count: { _all: true },
  });
  for (const row of rows) counts.set(row.companyId, row._count._all);
  return counts;
}

/** Total listing count per company, for the admin directory. */
export async function projectCounts(companyIds: string[]) {
  const counts = new Map<string, number>();
  if (companyIds.length === 0) return counts;

  const rows = await db.project.groupBy({
    by: ["companyId"],
    where: { companyId: { in: companyIds } },
    _count: { _all: true },
  });
  for (const row of rows) counts.set(row.companyId, row._count._all);
  return counts;
}

/** Application and certificate counts per freelancer, for the admin directory. */
export async function freelancerCounts(freelancerIds: string[]) {
  const counts = new Map<string, { applications: number; certificates: number }>();
  if (freelancerIds.length === 0) return counts;

  const [applications, certificates] = await Promise.all([
    db.application.groupBy({
      by: ["freelancerId"],
      where: { freelancerId: { in: freelancerIds } },
      _count: { _all: true },
    }),
    db.certificate.groupBy({
      by: ["freelancerId"],
      where: { freelancerId: { in: freelancerIds }, revokedAt: null },
      _count: { _all: true },
    }),
  ]);

  for (const id of freelancerIds) {
    counts.set(id, {
      applications: applications.find((a) => a.freelancerId === id)?._count._all ?? 0,
      certificates: certificates.find((c) => c.freelancerId === id)?._count._all ?? 0,
    });
  }
  return counts;
}

/** Company names for the marketing trust bar. */
export async function companyNames(limit = 12) {
  const rows = await db.company.findMany({
    orderBy: { trustScore: "desc" },
    take: limit,
    select: { companyName: true },
  });
  return rows.map((r) => r.companyName);
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
