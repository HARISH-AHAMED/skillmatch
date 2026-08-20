import type {
  Application,
  Certificate,
  Company,
  Freelancer,
  Project,
  Role,
  WorkspaceSummary,
} from "@/lib/types";
import { COMPANIES, COMPANY_BY_ID } from "./companies";
import { FREELANCERS, FREELANCER_BY_ID } from "./freelancers";
import { PROJECTS, PROJECT_BY_ID } from "./projects";
import { APPLICATIONS, APPLICATION_BY_ID, computeScore } from "./applications";
import {
  LEDGER,
  MEETINGS,
  MESSAGES,
  PAYMENT_ITEMS,
  PROJECT_UPDATES,
  SHARED_FILES,
  STIPEND_PERIODS,
  TASKS,
  WORK_LOGS,
} from "./workspace";
import { CERTIFICATES, CERTIFICATE_BY_PUBLIC_ID, NOTIFICATIONS, REVIEWS } from "./records";

export {
  COMPANIES,
  FREELANCERS,
  PROJECTS,
  APPLICATIONS,
  PAYMENT_ITEMS,
  WORK_LOGS,
  STIPEND_PERIODS,
  LEDGER,
  TASKS,
  MESSAGES,
  SHARED_FILES,
  PROJECT_UPDATES,
  MEETINGS,
  CERTIFICATES,
  REVIEWS,
  NOTIFICATIONS,
  computeScore,
};

/* ============================================================================
   LOOKUPS
   ========================================================================= */

export const getProject = (id: string) => PROJECT_BY_ID.get(id);
export const getCompany = (id: string) => COMPANY_BY_ID.get(id);
export const getFreelancer = (id: string) => FREELANCER_BY_ID.get(id);
export const getApplication = (id: string) => APPLICATION_BY_ID.get(id);
export const getCertificate = (publicId: string) => CERTIFICATE_BY_PUBLIC_ID.get(publicId);

export const getCompanyByUserId = (userId: string) =>
  COMPANIES.find((c) => c.userId === userId);
export const getFreelancerByUserId = (userId: string) =>
  FREELANCERS.find((f) => f.userId === userId);

/* ============================================================================
   PROJECT DISCOVERY (§18.1)
   ========================================================================= */

export const PUBLICLY_BROWSEABLE: Project["status"][] = ["OPEN", "IN_PROGRESS"];
export const TERMINAL_STATUSES: Project["status"][] = [
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
  "ARCHIVED",
];

export const isProjectMutable = (status: Project["status"]) =>
  !TERMINAL_STATUSES.includes(status);
export const acceptsApplications = (status: Project["status"]) =>
  PUBLICLY_BROWSEABLE.includes(status);

export interface BrowseFilters {
  query?: string;
  domains?: string[];
  skills?: string[];
  reward?: "ALL" | "PAID" | "NON_MONETARY";
  experience?: "ALL" | "ENTRY" | "MID" | "SENIOR";
  priority?: string[];
  compensation?: string[];
  sort?: "NEWEST" | "MATCH" | "BUDGET_HIGH" | "DEADLINE";
}

export function browseProjects(filters: BrowseFilters = {}, viewerId?: string): Project[] {
  const viewer = viewerId ? FREELANCER_BY_ID.get(viewerId) : undefined;

  let list = PROJECTS.filter(
    (p) => PUBLICLY_BROWSEABLE.includes(p.status) && p.isVisible && p.visibility !== "PRIVATE",
  );

  if (filters.query) {
    const q = filters.query.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.company.companyName.toLowerCase().includes(q) ||
        p.requiredSkills.some((s) => s.includes(q)),
    );
  }
  if (filters.domains?.length) list = list.filter((p) => filters.domains!.includes(p.domain));
  if (filters.skills?.length)
    list = list.filter((p) =>
      filters.skills!.some((s) => p.requiredSkills.includes(s) || p.preferredSkills.includes(s)),
    );
  if (filters.priority?.length) list = list.filter((p) => filters.priority!.includes(p.priority));
  if (filters.compensation?.length)
    list = list.filter((p) => filters.compensation!.includes(p.compensation.type));

  if (filters.reward === "NON_MONETARY") {
    list = list.filter((p) => p.compensation.type === "UNPAID");
  } else if (filters.reward === "PAID") {
    list = list.filter((p) => p.compensation.type !== "UNPAID");
  }

  if (filters.experience && filters.experience !== "ALL") {
    const bands = { ENTRY: [0, 2], MID: [3, 5], SENIOR: [6, 99] } as const;
    const [lo, hi] = bands[filters.experience];
    list = list.filter((p) => p.experienceRequired >= lo && p.experienceRequired <= hi);
  }

  const scored = list.map((p) => ({
    ...p,
    matchScore: viewer ? computeScore(p.id, viewer.id).aiScore : undefined,
  }));

  switch (filters.sort) {
    case "MATCH":
      return scored.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    case "BUDGET_HIGH":
      return scored.sort((a, b) => b.compensation.totalBudget - a.compensation.totalBudget);
    case "DEADLINE":
      return scored.sort((a, b) => (a.dueDate ?? "z").localeCompare(b.dueDate ?? "z"));
    default:
      return scored.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/* ============================================================================
   FREELANCER SEARCH (§18.2)
   ========================================================================= */

export interface TalentFilters {
  query?: string;
  skills?: string[];
  domains?: string[];
  minRating?: number;
  minExperience?: number;
  availability?: string[];
  badges?: string[];
  againstProjectId?: string;
  sort?: "MATCH" | "RATING" | "EXPERIENCE" | "PROJECTS";
}

export function searchFreelancers(filters: TalentFilters = {}) {
  let list = [...FREELANCERS];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    list = list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.professionalHeadline.toLowerCase().includes(q) ||
        f.skills.some((s) => s.includes(q)) ||
        f.location.toLowerCase().includes(q),
    );
  }
  if (filters.skills?.length)
    list = list.filter((f) => filters.skills!.some((s) => f.skills.includes(s)));
  if (filters.domains?.length) list = list.filter((f) => filters.domains!.includes(f.domain));
  if (filters.minRating) list = list.filter((f) => f.rating >= filters.minRating!);
  if (filters.minExperience)
    list = list.filter((f) => f.experienceYears >= filters.minExperience!);
  if (filters.availability?.length)
    list = list.filter((f) => filters.availability!.includes(f.availabilityStatus));
  if (filters.badges?.length)
    list = list.filter((f) => filters.badges!.some((b) => f.verificationBadges.includes(b)));

  const withScore = list.map((f) => ({
    ...f,
    matchScore: filters.againstProjectId
      ? computeScore(filters.againstProjectId, f.id).aiScore
      : undefined,
  }));

  switch (filters.sort) {
    case "RATING":
      return withScore.sort((a, b) => b.rating - a.rating);
    case "EXPERIENCE":
      return withScore.sort((a, b) => b.experienceYears - a.experienceYears);
    case "PROJECTS":
      return withScore.sort((a, b) => b.completedProjects - a.completedProjects);
    default:
      return filters.againstProjectId
        ? withScore.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
        : withScore.sort((a, b) => b.rating - a.rating);
  }
}

/** Top-10 recommendation cache equivalent (§3.3). */
export function recommendationsForProject(projectId: string) {
  return searchFreelancers({ againstProjectId: projectId }).slice(0, 10);
}

export function recommendedProjectsFor(freelancerId: string, limit = 6) {
  return browseProjects({ sort: "MATCH" }, freelancerId).slice(0, limit);
}

/* ============================================================================
   COMPANY / FREELANCER SCOPED READS
   ========================================================================= */

export const projectsForCompany = (companyId: string) =>
  PROJECTS.filter((p) => p.companyId === companyId).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

export const draftsForCompany = (companyId: string) =>
  PROJECTS.filter((p) => p.companyId === companyId && p.status === "DRAFT");

export const applicationsForCompany = (companyId: string) =>
  APPLICATIONS.filter((a) => getProject(a.projectId)?.companyId === companyId).sort(
    (a, b) => b.aiScore - a.aiScore,
  );

export const applicationsForProject = (projectId: string) =>
  APPLICATIONS.filter((a) => a.projectId === projectId).sort((a, b) => b.aiScore - a.aiScore);

export const applicationsForFreelancer = (freelancerId: string) =>
  APPLICATIONS.filter((a) => a.freelancerId === freelancerId).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

export const hiredApplications = (projectId: string) =>
  APPLICATIONS.filter((a) => a.projectId === projectId && a.status === "HIRED");

export const reviewsFor = (revieweeId: string) =>
  REVIEWS.filter((r) => r.revieweeId === revieweeId).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

export const reviewsBy = (reviewerId: string) =>
  REVIEWS.filter((r) => r.reviewerId === reviewerId);

export const certificatesFor = (freelancerId: string, includeHidden = false) =>
  CERTIFICATES.filter(
    (c) => c.freelancerId === freelancerId && !c.revokedAt && (includeHidden || !c.hidden),
  );

export const notificationsFor = (userId: string, limit = 8) =>
  NOTIFICATIONS.filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

export const allNotificationsFor = (userId: string) =>
  NOTIFICATIONS.filter((n) => n.userId === userId).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

/* ============================================================================
   CAPACITY (§9.2) — the single capacity calculation
   ========================================================================= */

export interface CapacityView {
  projectLimit: number;
  hiredPrimaries: number;
  projectFull: boolean;
  roleSlots?: number;
  roleHired?: number;
  roleFull?: boolean;
}

export function getCapacity(projectId: string, roleId?: string): CapacityView {
  const project = getProject(projectId);
  const hired = hiredApplications(projectId);
  const hiredPrimaries = hired.filter((a) => !a.isApprentice).length;
  const projectLimit = project?.freelancersLimit ?? 1;

  const view: CapacityView = {
    projectLimit,
    hiredPrimaries,
    projectFull: hiredPrimaries >= projectLimit,
  };

  if (roleId) {
    const role = project?.roles.find((r) => r.id === roleId);
    const roleHired = hired.filter((a) => a.roleId === roleId && !a.isApprentice).length;
    view.roleSlots = role?.slots ?? 0;
    view.roleHired = roleHired;
    view.roleFull = roleHired >= (role?.slots ?? 0);
  }

  return view;
}

export function getProjectTeam(projectId: string) {
  const project = getProject(projectId);
  const hired = hiredApplications(projectId);
  const roles = (project?.roles ?? []).map((role) => ({
    role,
    members: hired.filter((a) => a.roleId === role.id),
  }));
  const unassigned = hired.filter((a) => !a.roleId);
  const totalSlots = (project?.roles ?? []).reduce((s, r) => s + r.slots, 0);
  const totalFilled = hired.filter((a) => !a.isApprentice).length;
  return {
    roles,
    unassigned,
    totalSlots,
    totalFilled,
    isTeamComplete: (project?.roles.length ?? 0) > 0 && totalFilled >= totalSlots,
  };
}

/* ============================================================================
   FINANCIAL SUMMARY (§10.4) — computed from tables + ledger, never from text
   ========================================================================= */

export interface FinancialSummary {
  currency: string;
  budget: number;
  funded: number;
  released: number;
  committed: number;
  remaining: number;
  progress: number;
}

export function getProjectFinancialSummary(projectId: string): FinancialSummary {
  const project = getProject(projectId);
  const currency = project?.compensation.currency ?? "USD";
  const budget = project?.compensation.totalBudget ?? 0;

  const items = PAYMENT_ITEMS.filter((i) => i.projectId === projectId);
  const itemFunded = items.reduce((s, i) => s + i.fundedAmount, 0);
  const itemReleased = items.reduce((s, i) => s + i.releasedAmount, 0);

  // Hourly and stipend payouts have no PaymentItem — read the ledger too.
  const ledgerOnly = LEDGER.filter(
    (l) => l.projectId === projectId && l.type === "RELEASE" && !l.paymentItemId,
  ).reduce((s, l) => s + Math.abs(l.amount), 0);

  const released = itemReleased + ledgerOnly;
  const committed = itemFunded - itemReleased;

  return {
    currency,
    budget,
    funded: itemFunded,
    released,
    committed,
    remaining: Math.max(0, budget - released - committed),
    progress: budget > 0 ? Math.min(100, (released / budget) * 100) : 0,
  };
}

export function getApplicationFinancials(applicationId: string) {
  const items = PAYMENT_ITEMS.filter((i) => i.applicationId === applicationId);
  const logs = WORK_LOGS.filter((l) => l.applicationId === applicationId);
  const periods = STIPEND_PERIODS.filter((p) => p.applicationId === applicationId);
  const ledger = LEDGER.filter((l) => l.applicationId === applicationId);

  const approvedHourlyValue = logs
    .filter((l) => l.status === "APPROVED")
    .reduce((s, l) => s + l.hours * l.rateSnapshot, 0);
  const hourlyPaid = ledger
    .filter((l) => l.type === "RELEASE" && !l.paymentItemId)
    .reduce((s, l) => s + Math.abs(l.amount), 0);

  return {
    items,
    logs,
    periods,
    ledger,
    approvedHourlyValue,
    hourlyPaid,
    hourlyOutstanding: Math.max(0, approvedHourlyValue - hourlyPaid),
    totalReleased: ledger
      .filter((l) => l.type === "RELEASE")
      .reduce((s, l) => s + Math.abs(l.amount), 0),
  };
}

/* ============================================================================
   COMPLETION READINESS (§11.15)
   ========================================================================= */

export function getProjectCompletionReadiness(projectId: string) {
  const project = getProject(projectId);
  if (!project) return { ready: false, reason: "Project not found." };
  if (project.status === "COMPLETED")
    return { ready: false, completed: true, reason: "This project is already completed." };

  // A project nobody was hired onto has nothing to complete.
  const hired = hiredApplications(projectId);
  if (hired.length === 0)
    return { ready: false, reason: "Nobody has been hired onto this project yet." };

  const type = project.compensation.type;
  if (type === "UNPAID") return { ready: true };

  if (type === "FIXED" || type === "MILESTONE") {
    const items = PAYMENT_ITEMS.filter((i) => i.projectId === projectId);
    const open = items.filter((i) => i.status !== "RELEASED" && i.status !== "CANCELLED");
    return open.length === 0
      ? { ready: true }
      : { ready: false, reason: `${open.length} payment stage(s) are still awaiting release.` };
  }

  if (type === "HOURLY") {
    const pending = WORK_LOGS.filter((l) => l.projectId === projectId && l.status === "PENDING");
    if (pending.length)
      return { ready: false, reason: `${pending.length} work log(s) are still pending review.` };
    const unpaid = hiredApplications(projectId).filter(
      (a) => getApplicationFinancials(a.id).hourlyOutstanding > 0,
    );
    return unpaid.length === 0
      ? { ready: true }
      : { ready: false, reason: `${unpaid.length} freelancer(s) have unpaid approved hours.` };
  }

  const expected = project.compensation.stipendFrequency === "ONE_TIME"
    ? 1
    : (project.compensation.stipendPeriods ?? 1);
  const behind = hiredApplications(projectId).filter((a) => {
    const released = STIPEND_PERIODS.filter(
      (p) => p.applicationId === a.id && p.status === "RELEASED",
    ).length;
    return released < expected;
  });
  return behind.length === 0
    ? { ready: true }
    : {
        ready: false,
        reason: `${behind.length} freelancer(s) have unpaid stipend periods (${expected} expected each).`,
      };
}

/* ============================================================================
   WORKSPACES (§21.9 GET /api/workspaces)
   ========================================================================= */

export function workspacesForUser(userId: string, role: Role): WorkspaceSummary[] {
  if (role === "FREELANCER") {
    const freelancer = getFreelancerByUserId(userId);
    if (!freelancer) return [];
    return APPLICATIONS.filter(
      (a) =>
        a.freelancerId === freelancer.id &&
        a.status === "HIRED" &&
        PUBLICLY_BROWSEABLE.includes(getProject(a.projectId)?.status ?? "CLOSED"),
    ).map((a) => summarise(a));
  }

  const company = getCompanyByUserId(userId);
  if (!company) return [];
  const byProject = new Map<string, Application>();
  for (const a of APPLICATIONS) {
    const project = getProject(a.projectId);
    if (!project || project.companyId !== company.id) continue;
    if (a.status !== "HIRED") continue;
    if (!PUBLICLY_BROWSEABLE.includes(project.status)) continue;
    if (!byProject.has(a.projectId)) byProject.set(a.projectId, a);
  }
  return [...byProject.values()].map((a) => summarise(a));
}

function summarise(a: Application): WorkspaceSummary {
  const project = getProject(a.projectId)!;
  const summary = getProjectFinancialSummary(a.projectId);
  const tasks = TASKS.filter((t) => t.projectId === a.projectId);
  const done = tasks.filter((t) => t.status === "DONE").length;
  return {
    id: a.projectId,
    applicationId: a.id,
    projectId: a.projectId,
    label: project.title,
    company: project.company.companyName,
    companyLogo: project.company.logoUrl,
    status: project.status,
    href: `/workspace/${a.id}`,
    unread: MESSAGES.filter((m) => m.projectId === a.projectId && !m.seen).length,
    progress:
      project.compensation.type === "UNPAID"
        ? tasks.length
          ? Math.round((done / tasks.length) * 100)
          : 0
        : Math.round(summary.progress),
  };
}

/* ============================================================================
   WORKSPACE CHANNEL VISIBILITY (§14.3) — one shared predicate
   ========================================================================= */

export function visibleChannelsFor(role: Role, userId: string) {
  return (channel: string) => {
    if (channel === "group") return true;
    if (channel === "freelancers") return role === "FREELANCER";
    if (channel.startsWith("dm:")) {
      const parts = channel.split(":");
      return parts.length === 3 && parts.includes(userId);
    }
    return false;
  };
}

export function dmChannel(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

/* ============================================================================
   PLATFORM STATS (marketing + admin)
   ========================================================================= */

export function platformStats() {
  return {
    freelancers: FREELANCERS.length,
    companies: COMPANIES.length,
    projects: PROJECTS.length,
    openProjects: PROJECTS.filter((p) => p.status === "OPEN").length,
    applications: APPLICATIONS.length,
    hires: APPLICATIONS.filter((a) => a.status === "HIRED").length,
    reviews: REVIEWS.length,
    certificates: CERTIFICATES.length,
    totalReleased: LEDGER.filter((l) => l.type === "RELEASE").reduce(
      (s, l) => s + Math.abs(l.amount),
      0,
    ),
  };
}

export function companyDashboardStats(companyId: string) {
  const projects = projectsForCompany(companyId);
  const active = projects.filter((p) => p.status === "OPEN" || p.status === "IN_PROGRESS");
  const applications = applicationsForCompany(companyId);
  const spend = projects.reduce(
    (s, p) => s + getProjectFinancialSummary(p.id).released,
    0,
  );
  return {
    activeProjects: active.length,
    totalProjects: projects.length,
    applicants: applications.filter((a) => a.status === "PENDING").length,
    totalApplicants: applications.length,
    hires: applications.filter((a) => a.status === "HIRED").length,
    shortlisted: applications.filter((a) => a.status === "SHORTLISTED").length,
    spend,
    drafts: draftsForCompany(companyId).length,
  };
}

export function freelancerDashboardStats(freelancerId: string) {
  const apps = applicationsForFreelancer(freelancerId);
  const freelancer = getFreelancer(freelancerId);
  const active = apps.filter(
    (a) => a.status === "HIRED" && PUBLICLY_BROWSEABLE.includes(a.project.status),
  );
  const earnings = apps.reduce(
    (s, a) => s + getApplicationFinancials(a.id).totalReleased,
    0,
  );
  return {
    applications: apps.length,
    pending: apps.filter((a) => a.status === "PENDING").length,
    shortlisted: apps.filter((a) => a.status === "SHORTLISTED").length,
    activeProjects: active.length,
    earnings,
    rating: freelancer?.rating ?? 0,
    completed: freelancer?.completedProjects ?? 0,
    certificates: certificatesFor(freelancerId).length,
  };
}

/* ============================================================================
   LEADERBOARD (freelancer dashboard sidebar)
   ========================================================================= */

export function leaderboard(limit = 8) {
  return [...FREELANCERS]
    .sort((a, b) => b.rating * 100 + b.completedProjects - (a.rating * 100 + a.completedProjects))
    .slice(0, limit);
}

export function topFreelancers(limit = 6): Freelancer[] {
  return [...FREELANCERS]
    .filter((f) => f.verificationBadges.includes("Top Rated"))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function featuredProjects(limit = 8) {
  return browseProjects({ sort: "NEWEST" }).slice(0, limit);
}

export function featuredCompanies(limit = 6): Company[] {
  return [...COMPANIES].sort((a, b) => b.trustScore - a.trustScore).slice(0, limit);
}

export function certificatesIssuedBy(companyId: string): Certificate[] {
  return CERTIFICATES.filter((c) => c.companyId === companyId);
}
