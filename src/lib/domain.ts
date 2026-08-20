import type {
  Application,
  Freelancer,
  LedgerEntry,
  Message,
  PaymentItem,
  Project,
  ProjectStatus,
  Role,
  StipendPeriod,
  Task,
  WorkLog,
} from "@/lib/types";

/* ============================================================================
   SHARED DOMAIN RULES

   Pure predicates and derivations that both the server reads and the client
   components need. Nothing here touches the database: it operates on rows the
   backend has already returned and authorised, so it is safe in a client
   bundle.
   ========================================================================= */

export const PUBLICLY_BROWSEABLE: ProjectStatus[] = ["OPEN", "IN_PROGRESS"];

export const TERMINAL_STATUSES: ProjectStatus[] = [
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
  "ARCHIVED",
];

export const isProjectMutable = (status: ProjectStatus) => !TERMINAL_STATUSES.includes(status);

export const acceptsApplications = (status: ProjectStatus) => PUBLICLY_BROWSEABLE.includes(status);

/* ---------------------------------------------------------------- filters --- */

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

/**
 * Applies the browse filters to a set of listings the server already fetched
 * and scored. The directory keeps its instant client-side filtering, and the
 * predicates are the same ones `browseProjects` runs in SQL — kept here so the
 * two cannot drift.
 */
export function filterProjects(projects: Project[], filters: BrowseFilters): Project[] {
  let list = projects;

  if (filters.query) {
    const q = filters.query.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.company.companyName.toLowerCase().includes(q) ||
        p.requiredSkills.some((s) => s.toLowerCase().includes(q)),
    );
  }
  if (filters.domains?.length) list = list.filter((p) => filters.domains!.includes(p.domain));
  if (filters.skills?.length) {
    list = list.filter((p) =>
      filters.skills!.some((s) => p.requiredSkills.includes(s) || p.preferredSkills.includes(s)),
    );
  }
  if (filters.priority?.length) list = list.filter((p) => filters.priority!.includes(p.priority));
  if (filters.compensation?.length) {
    list = list.filter((p) => filters.compensation!.includes(p.compensation.type));
  }

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

  const sorted = [...list];
  switch (filters.sort) {
    case "MATCH":
      return sorted.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    case "BUDGET_HIGH":
      return sorted.sort((a, b) => b.compensation.totalBudget - a.compensation.totalBudget);
    case "DEADLINE":
      return sorted.sort((a, b) => (a.dueDate ?? "z").localeCompare(b.dueDate ?? "z"));
    default:
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** The talent-directory counterpart of `filterProjects`. */
export function filterFreelancers(
  freelancers: Freelancer[],
  filters: TalentFilters,
): Freelancer[] {
  let list = freelancers;

  if (filters.query) {
    const q = filters.query.toLowerCase();
    list = list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.professionalHeadline.toLowerCase().includes(q) ||
        f.skills.some((s) => s.toLowerCase().includes(q)) ||
        f.location.toLowerCase().includes(q),
    );
  }
  if (filters.skills?.length) {
    list = list.filter((f) => filters.skills!.some((s) => f.skills.includes(s)));
  }
  if (filters.domains?.length) list = list.filter((f) => filters.domains!.includes(f.domain));
  if (filters.minRating) list = list.filter((f) => f.rating >= filters.minRating!);
  if (filters.minExperience) {
    list = list.filter((f) => f.experienceYears >= filters.minExperience!);
  }
  if (filters.availability?.length) {
    list = list.filter((f) => filters.availability!.includes(f.availabilityStatus));
  }
  if (filters.badges?.length) {
    list = list.filter((f) => filters.badges!.some((b) => f.verificationBadges.includes(b)));
  }

  const sorted = [...list];
  switch (filters.sort) {
    case "RATING":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "EXPERIENCE":
      return sorted.sort((a, b) => b.experienceYears - a.experienceYears);
    case "PROJECTS":
      return sorted.sort((a, b) => b.completedProjects - a.completedProjects);
    default:
      return filters.againstProjectId
        ? sorted.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
        : sorted.sort((a, b) => b.rating - a.rating);
  }
}

/* --------------------------------------------------------------- capacity --- */

export interface CapacityView {
  projectLimit: number;
  hiredPrimaries: number;
  projectFull: boolean;
  roleSlots?: number;
  roleHired?: number;
  roleFull?: boolean;
}

/** Remaining headroom on a listing, and on one of its roles when asked. */
export function getCapacity(
  project: Pick<Project, "freelancersLimit" | "roles"> | undefined,
  hired: Pick<Application, "roleId" | "isApprentice">[],
  roleId?: string,
): CapacityView {
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

/** Roster grouped by role, with the unassigned hires kept separate. */
export function getProjectTeam(project: Project | undefined, hired: Application[]) {
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

/* -------------------------------------------------------------- financial --- */

export interface FinancialSummary {
  currency: string;
  budget: number;
  funded: number;
  released: number;
  committed: number;
  remaining: number;
  progress: number;
}

/**
 * The project money view. Payment items cover fixed and milestone work; hourly
 * and stipend payouts have no item, so the ledger is read for those as well —
 * exactly the split the backend's own financial model uses.
 */
export function getProjectFinancialSummary(
  compensation: { currency: string; totalBudget: number } | undefined,
  items: Pick<PaymentItem, "fundedAmount" | "releasedAmount">[],
  ledger: Pick<LedgerEntry, "type" | "amount" | "paymentItemId">[],
): FinancialSummary {
  const currency = compensation?.currency ?? "USD";
  const budget = compensation?.totalBudget ?? 0;

  const itemFunded = items.reduce((s, i) => s + i.fundedAmount, 0);
  const itemReleased = items.reduce((s, i) => s + i.releasedAmount, 0);

  const ledgerOnly = ledger
    .filter((l) => l.type === "RELEASE" && !l.paymentItemId)
    .reduce((s, l) => s + Math.abs(l.amount), 0);

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

export interface ApplicationFinancials {
  items: PaymentItem[];
  logs: WorkLog[];
  periods: StipendPeriod[];
  ledger: LedgerEntry[];
  approvedHourlyValue: number;
  hourlyPaid: number;
  hourlyOutstanding: number;
  totalReleased: number;
}

/** One freelancer's money on one engagement. */
export function getApplicationFinancials(
  applicationId: string,
  all: {
    items: PaymentItem[];
    logs: WorkLog[];
    periods: StipendPeriod[];
    ledger: LedgerEntry[];
  },
): ApplicationFinancials {
  const items = all.items.filter((i) => i.applicationId === applicationId);
  const logs = all.logs.filter((l) => l.applicationId === applicationId);
  const periods = all.periods.filter((p) => p.applicationId === applicationId);
  const ledger = all.ledger.filter((l) => l.applicationId === applicationId);

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

/* -------------------------------------------------------------- channels --- */

/** Which workspace channels a viewer may see. Mirrors the backend's own rule. */
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

/* ------------------------------------------------------------- workspace --- */

/** Task-completion percentage, used as progress for unpaid engagements. */
export function taskProgress(tasks: Pick<Task, "status">[]) {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100);
}

export function unreadCount(messages: Message[], viewerUserId: string) {
  return messages.filter((m) => !m.seen && m.senderId !== viewerUserId).length;
}
