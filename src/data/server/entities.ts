import "server-only";
import { db } from "@/lib/db";
import { rewardWhere } from "@/lib/browseFilters";
import { computeRecommendationScore } from "@/services/aiRecommendation";
import type { Application, Company, Freelancer, Project } from "@/lib/types";
import { PUBLICLY_BROWSEABLE } from "@/lib/domain";
import type { BrowseFilters, TalentFilters } from "@/lib/domain";
import {
  applicationInclude,
  companyInclude,
  freelancerInclude,
  projectInclude,
} from "@/adapters/include";
import type { ApplicationRow, ProjectRow } from "@/adapters/include";
import { toCompany, toFreelancer } from "@/adapters/profiles";
import { toProject } from "@/adapters/projects";
import { questionTextMap, toApplication } from "@/adapters/applications";
import { Prisma } from "@prisma/client";

/* ============================================================================
   ENTITY READS

   The real counterpart of the mock lookup helpers. Every function returns the
   domain types in `@/lib/types` so the components that consumed the fixtures
   consume these unchanged.
   ========================================================================= */

/* ------------------------------------------------------------ aggregates --- */

/** Review count and mean rating for a set of reviewee user ids, in one query. */
async function reviewStats(userIds: string[]) {
  const stats = new Map<string, { count: number; rating: number }>();
  if (userIds.length === 0) return stats;

  const rows = await db.review.groupBy({
    by: ["revieweeId"],
    where: { revieweeId: { in: userIds } },
    _count: { _all: true },
    _avg: { rating: true },
  });
  for (const row of rows) {
    stats.set(row.revieweeId, {
      count: row._count._all,
      rating: row._avg.rating ?? 0,
    });
  }
  return stats;
}

/** Total value released to each of the given applications' freelancers. */
async function earningsByFreelancer(freelancerIds: string[]) {
  const totals = new Map<string, number>();
  if (freelancerIds.length === 0) return totals;

  // PaymentTransaction stores `applicationId` as a column with no relation, so
  // the engagements are resolved first and the ledger is filtered by their ids
  // rather than scanned in full.
  const apps = await db.application.findMany({
    where: { freelancerId: { in: freelancerIds } },
    select: { id: true, freelancerId: true },
  });
  if (apps.length === 0) return totals;
  const owner = new Map(apps.map((a) => [a.id, a.freelancerId]));

  const rows = await db.paymentTransaction.findMany({
    where: { type: "RELEASE", applicationId: { in: apps.map((a) => a.id) } },
    select: { amount: true, applicationId: true },
  });

  for (const row of rows) {
    const freelancerId = owner.get(row.applicationId);
    if (!freelancerId) continue;
    totals.set(freelancerId, (totals.get(freelancerId) ?? 0) + Math.abs(Number(row.amount)));
  }
  return totals;
}

/** Hourly rate a freelancer is actually engaged at, taken from their work logs. */
async function hourlyRates(freelancerIds: string[]) {
  const rates = new Map<string, { rate: number; currency: string }>();
  if (freelancerIds.length === 0) return rates;

  const logs = await db.workLog.findMany({
    where: { application: { freelancerId: { in: freelancerIds } } },
    orderBy: { createdAt: "desc" },
    select: { rateSnapshot: true, currency: true, application: { select: { freelancerId: true } } },
  });
  for (const log of logs) {
    const id = log.application.freelancerId;
    if (!rates.has(id)) rates.set(id, { rate: Number(log.rateSnapshot), currency: log.currency });
  }
  return rates;
}

/** Hired, non-apprentice applications per project — the role/capacity inputs. */
async function hiredShape(projectIds: string[]) {
  const byProject = new Map<string, { roleId: string | null; isApprentice: boolean }[]>();
  if (projectIds.length === 0) return byProject;

  const rows = await db.application.findMany({
    where: { projectId: { in: projectIds }, status: "HIRED" },
    select: { projectId: true, roleId: true, isApprentice: true },
  });
  for (const row of rows) {
    const list = byProject.get(row.projectId) ?? [];
    list.push({ roleId: row.roleId, isApprentice: row.isApprentice });
    byProject.set(row.projectId, list);
  }
  return byProject;
}

/* ------------------------------------------------------------- mappers --- */

async function mapProjects(
  rows: ProjectRow[],
  matchScores?: Map<string, number>,
): Promise<Project[]> {
  const [ratings, hired] = await Promise.all([
    reviewStats(rows.map((r) => r.company.userId)),
    hiredShape(rows.map((r) => r.id)),
  ]);

  return rows.map((row) =>
    toProject(
      row,
      {
        companyRating: ratings.get(row.company.userId)?.rating ?? 0,
        matchScore: matchScores?.get(row.id),
      },
      hired.get(row.id) ?? [],
    ),
  );
}

async function mapApplications(rows: ApplicationRow[]): Promise<Application[]> {
  const ratings = await reviewStats(rows.map((r) => r.project.company.userId));

  // Screening answers are stored by question id; the labels come from the
  // owning project's rounds, so resolve one map per project rather than per row.
  const questionMaps = new Map<string, Map<string, string>>();
  for (const row of rows) {
    if (questionMaps.has(row.projectId)) continue;
    const project = toProject(row.project);
    questionMaps.set(row.projectId, questionTextMap(project.rounds));
  }

  return rows.map((row) =>
    toApplication(row, {
      questionText: questionMaps.get(row.projectId),
      companyRating: ratings.get(row.project.company.userId)?.rating ?? 0,
    }),
  );
}

/* -------------------------------------------------------------- lookups --- */

export async function getProject(id: string): Promise<Project | undefined> {
  const row = await db.project.findUnique({ where: { id }, include: projectInclude });
  if (!row) return undefined;
  return (await mapProjects([row]))[0];
}

export async function getCompany(id: string): Promise<Company | undefined> {
  const row = await db.company.findUnique({ where: { id }, include: companyInclude });
  if (!row) return undefined;
  return (await mapCompanies([row]))[0];
}

export async function getFreelancer(id: string): Promise<Freelancer | undefined> {
  const row = await db.freelancer.findUnique({ where: { id }, include: freelancerInclude });
  if (!row) return undefined;
  return (await mapFreelancers([row]))[0];
}

export async function getApplication(id: string): Promise<Application | undefined> {
  const row = await db.application.findUnique({ where: { id }, include: applicationInclude });
  if (!row) return undefined;
  return (await mapApplications([row]))[0];
}

export async function getCompanyByUserId(userId: string): Promise<Company | undefined> {
  const row = await db.company.findUnique({ where: { userId }, include: companyInclude });
  if (!row) return undefined;
  return (await mapCompanies([row]))[0];
}

export async function getFreelancerByUserId(userId: string): Promise<Freelancer | undefined> {
  const row = await db.freelancer.findUnique({ where: { userId }, include: freelancerInclude });
  if (!row) return undefined;
  return (await mapFreelancers([row]))[0];
}

/* ------------------------------------------------------ profile mappers --- */

export async function mapFreelancers(
  rows: Awaited<ReturnType<typeof db.freelancer.findMany>> extends never
    ? never
    : Parameters<typeof toFreelancer>[0][],
): Promise<Freelancer[]> {
  const [ratings, earnings, rates] = await Promise.all([
    reviewStats(rows.map((r) => r.userId)),
    earningsByFreelancer(rows.map((r) => r.id)),
    hourlyRates(rows.map((r) => r.id)),
  ]);

  return rows.map((row) =>
    toFreelancer(row, {
      reviewCount: ratings.get(row.userId)?.count ?? 0,
      totalEarnings: earnings.get(row.id) ?? 0,
      hourlyRate: rates.get(row.id)?.rate,
      currency: rates.get(row.id)?.currency,
    }),
  );
}

export async function mapCompanies(
  rows: Parameters<typeof toCompany>[0][],
): Promise<Company[]> {
  const ratings = await reviewStats(rows.map((r) => r.userId));

  const [hires, spend] = await Promise.all([
    db.application.groupBy({
      by: ["projectId"],
      where: { status: "HIRED", project: { companyId: { in: rows.map((r) => r.id) } } },
      _count: { _all: true },
    }),
    db.paymentTransaction.findMany({
      where: { type: "RELEASE", project: { companyId: { in: rows.map((r) => r.id) } } },
      select: { amount: true, project: { select: { companyId: true } } },
    }),
  ]);

  const projectOwners = await db.project.findMany({
    where: { id: { in: hires.map((h) => h.projectId) } },
    select: { id: true, companyId: true },
  });
  const ownerOf = new Map(projectOwners.map((p) => [p.id, p.companyId]));

  const hireTotals = new Map<string, number>();
  for (const hire of hires) {
    const companyId = ownerOf.get(hire.projectId);
    if (!companyId) continue;
    hireTotals.set(companyId, (hireTotals.get(companyId) ?? 0) + hire._count._all);
  }

  const spendTotals = new Map<string, number>();
  for (const row of spend) {
    const companyId = row.project.companyId;
    spendTotals.set(companyId, (spendTotals.get(companyId) ?? 0) + Math.abs(Number(row.amount)));
  }

  return rows.map((row) =>
    toCompany(row, {
      rating: ratings.get(row.userId)?.rating ?? 0,
      reviewCount: ratings.get(row.userId)?.count ?? 0,
      totalHires: hireTotals.get(row.id) ?? 0,
      totalSpend: spendTotals.get(row.id) ?? 0,
    }),
  );
}

/* ----------------------------------------------------- project browsing --- */

/**
 * The public project directory. Filtering that the database can express is
 * pushed into the query (status, visibility, skills, reward); the remainder —
 * experience banding and match sorting — is applied to the returned page, as
 * the existing browse screen does.
 */
export async function browseProjects(
  filters: BrowseFilters = {},
  viewerFreelancerId?: string,
): Promise<Project[]> {
  const where: Prisma.ProjectWhereInput = {
    status: { in: PUBLICLY_BROWSEABLE },
    isVisible: true,
  };

  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
      { company: { companyName: { contains: filters.query, mode: "insensitive" } } },
      { requiredSkills: { hasSome: [filters.query.toLowerCase()] } },
    ];
  }
  if (filters.domains?.length) where.domain = { in: filters.domains };
  if (filters.skills?.length) where.requiredSkills = { hasSome: filters.skills };
  if (filters.priority?.length) {
    where.priority = { in: filters.priority as Prisma.EnumProjectPriorityFilter["in"] };
  }
  if (filters.compensation?.length) {
    where.compensation = { is: { type: { in: filters.compensation as never } } };
  }

  const reward = rewardWhere(filters.reward);
  const rows = await db.project.findMany({
    where: reward ? { AND: [where, reward] } : where,
    include: projectInclude,
    orderBy: { createdAt: "desc" },
  });

  let projects = await mapProjects(rows);

  // Private and invite-only listings are excluded here rather than in SQL:
  // visibility lives in the project metadata block, not in a column.
  projects = projects.filter((p) => p.visibility !== "PRIVATE");

  if (filters.experience && filters.experience !== "ALL") {
    const bands = { ENTRY: [0, 2], MID: [3, 5], SENIOR: [6, 99] } as const;
    const [lo, hi] = bands[filters.experience];
    projects = projects.filter((p) => p.experienceRequired >= lo && p.experienceRequired <= hi);
  }

  if (viewerFreelancerId) {
    const scores = await scoreProjectsFor(viewerFreelancerId, rows);
    projects = projects.map((p) => ({ ...p, matchScore: scores.get(p.id) }));
  }

  switch (filters.sort) {
    case "MATCH":
      return projects.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    case "BUDGET_HIGH":
      return projects.sort((a, b) => b.compensation.totalBudget - a.compensation.totalBudget);
    case "DEADLINE":
      return projects.sort((a, b) => (a.dueDate ?? "z").localeCompare(b.dueDate ?? "z"));
    default:
      return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** Match scores for one freelancer against a set of already-fetched projects. */
async function scoreProjectsFor(freelancerId: string, rows: ProjectRow[]) {
  const scores = new Map<string, number>();
  const freelancer = await db.freelancer.findUnique({ where: { id: freelancerId } });
  if (!freelancer) return scores;
  for (const row of rows) scores.set(row.id, computeRecommendationScore(freelancer, row));
  return scores;
}

/**
 * The freelancer/project match score. Uses the platform's own scoring service,
 * so the number the UI shows is the number the backend ranks on.
 */
export async function computeScore(projectId: string, freelancerId: string) {
  const [project, freelancer] = await Promise.all([
    db.project.findUnique({ where: { id: projectId } }),
    db.freelancer.findUnique({ where: { id: freelancerId } }),
  ]);
  if (!project || !freelancer) return { aiScore: 0 };
  return { aiScore: computeRecommendationScore(freelancer, project) };
}

export async function recommendedProjectsFor(freelancerId: string, limit = 6): Promise<Project[]> {
  const projects = await browseProjects({ sort: "MATCH" }, freelancerId);
  return projects.slice(0, limit);
}

/* ------------------------------------------------------- talent search --- */

export async function searchFreelancers(filters: TalentFilters = {}): Promise<Freelancer[]> {
  const where: Prisma.FreelancerWhereInput = {};

  if (filters.query) {
    where.OR = [
      { user: { name: { contains: filters.query, mode: "insensitive" } } },
      { professionalHeadline: { contains: filters.query, mode: "insensitive" } },
      { skills: { hasSome: [filters.query.toLowerCase()] } },
    ];
  }
  if (filters.skills?.length) where.skills = { hasSome: filters.skills };
  if (filters.domains?.length) where.domain = { in: filters.domains };
  if (filters.minRating) where.rating = { gte: filters.minRating };
  if (filters.minExperience) where.experienceYears = { gte: filters.minExperience };
  if (filters.availability?.length) where.availabilityStatus = { in: filters.availability };

  const rows = await db.freelancer.findMany({
    where,
    include: freelancerInclude,
    orderBy: { rating: "desc" },
  });

  let list = await mapFreelancers(rows);

  // Badges are a union of the column and the metadata verification flags, so
  // the filter runs after adaptation rather than as an array predicate in SQL.
  if (filters.badges?.length) {
    list = list.filter((f) => filters.badges!.some((b) => f.verificationBadges.includes(b)));
  }

  if (filters.againstProjectId) {
    const project = await db.project.findUnique({ where: { id: filters.againstProjectId } });
    if (project) {
      const scored = new Map(
        rows.map((row) => [row.id, computeRecommendationScore(row, project)] as const),
      );
      list = list.map((f) => ({ ...f, matchScore: scored.get(f.id) }));
    }
  }

  switch (filters.sort) {
    case "RATING":
      return list.sort((a, b) => b.rating - a.rating);
    case "EXPERIENCE":
      return list.sort((a, b) => b.experienceYears - a.experienceYears);
    case "PROJECTS":
      return list.sort((a, b) => b.completedProjects - a.completedProjects);
    default:
      return filters.againstProjectId
        ? list.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
        : list.sort((a, b) => b.rating - a.rating);
  }
}

/**
 * The top-ten recommendation set for a listing. The backend caches this in the
 * Recommendation table; read the cache when it is populated and fall back to
 * scoring on demand when it is not (a project that has never been recalculated).
 */
export async function recommendationsForProject(projectId: string): Promise<Freelancer[]> {
  const cached = await db.recommendation.findMany({
    where: { projectId },
    orderBy: { score: "desc" },
    take: 10,
    include: { freelancer: { include: freelancerInclude } },
  });

  if (cached.length > 0) {
    const list = await mapFreelancers(cached.map((r) => r.freelancer));
    const scoreOf = new Map(cached.map((r) => [r.freelancerId, r.score]));
    return list
      .map((f) => ({ ...f, matchScore: scoreOf.get(f.id) }))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  const scored = await searchFreelancers({ againstProjectId: projectId });
  return scored.slice(0, 10);
}

/* ------------------------------------------------------- scoped project --- */

export async function projectsForCompany(companyId: string): Promise<Project[]> {
  const rows = await db.project.findMany({
    where: { companyId },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });
  return mapProjects(rows);
}

export async function draftsForCompany(companyId: string): Promise<Project[]> {
  const rows = await db.project.findMany({
    where: { companyId, status: "DRAFT" },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });
  return mapProjects(rows);
}

export async function featuredProjects(limit = 8): Promise<Project[]> {
  const projects = await browseProjects({ sort: "NEWEST" });
  return projects.slice(0, limit);
}

export async function featuredCompanies(limit = 6): Promise<Company[]> {
  const rows = await db.company.findMany({
    include: companyInclude,
    orderBy: { trustScore: "desc" },
    take: limit,
  });
  return mapCompanies(rows);
}

export async function leaderboard(limit = 8): Promise<Freelancer[]> {
  const rows = await db.freelancer.findMany({
    include: freelancerInclude,
    orderBy: [{ rating: "desc" }, { completedProjects: "desc" }],
    take: limit,
  });
  return mapFreelancers(rows);
}

export async function topFreelancers(limit = 6): Promise<Freelancer[]> {
  const rows = await db.freelancer.findMany({
    where: { verificationBadges: { has: "Top Rated" } },
    include: freelancerInclude,
    orderBy: { rating: "desc" },
    take: limit,
  });
  return mapFreelancers(rows);
}

/* --------------------------------------------------- scoped application --- */

export async function applicationsForCompany(companyId: string): Promise<Application[]> {
  const rows = await db.application.findMany({
    where: { project: { companyId } },
    include: applicationInclude,
    orderBy: { aiScore: "desc" },
  });
  return mapApplications(rows);
}

export async function applicationsForProject(projectId: string): Promise<Application[]> {
  const rows = await db.application.findMany({
    where: { projectId },
    include: applicationInclude,
    orderBy: { aiScore: "desc" },
  });
  return mapApplications(rows);
}

export async function applicationsForFreelancer(freelancerId: string): Promise<Application[]> {
  const rows = await db.application.findMany({
    where: { freelancerId },
    include: applicationInclude,
    orderBy: { createdAt: "desc" },
  });
  return mapApplications(rows);
}

export async function hiredApplications(projectId: string): Promise<Application[]> {
  const rows = await db.application.findMany({
    where: { projectId, status: "HIRED" },
    include: applicationInclude,
    orderBy: { createdAt: "asc" },
  });
  return mapApplications(rows);
}
