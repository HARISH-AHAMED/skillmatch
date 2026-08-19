/**
 * Project and application lifecycle — one state machine, one hire path, one
 * capacity calculation.
 *
 * The audit found three independent paths to HIRED with different guarantees
 * (LIFE-002), three writers of COMPLETED with different rules (LIFE-001), no
 * transition validation at all (LIFE-003), and two different answers to "is
 * this project full" (MF-004/MF-005). Every one of those existed because the
 * rule was re-implemented at each call site.
 */

import { Prisma, ProjectStatus, ApplicationStatus } from "@prisma/client";
import type { Tx } from "@/lib/payments";

/* ── Project state ───────────────────────────────────────────────────────────*/

/**
 * LIFE-001 / LIFE-003 — permitted project transitions.
 *
 * COMPLETED and CLOSED are both terminal: neither can be reopened, and neither
 * accepts further mutation. CLOSED is reachable from any live state (a company
 * withdrawing a listing); COMPLETED only from a live state via completeProject.
 */
const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  // A draft is unpublished: it can only be published or dropped.
  DRAFT: ["OPEN", "CANCELLED", "ARCHIVED"],
  OPEN: ["IN_PROGRESS", "COMPLETED", "CLOSED", "CANCELLED", "ARCHIVED"],
  IN_PROGRESS: ["OPEN", "COMPLETED", "CLOSED", "CANCELLED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  CLOSED: ["ARCHIVED"],
  // Cancelled work can still be filed away; archiving is the last stop.
  CANCELLED: ["ARCHIVED"],
  ARCHIVED: [],
};

/**
 * Terminal for the purposes of mutation. CANCELLED and ARCHIVED join the
 * original two: history stays readable, but nothing further may be changed.
 */
export const TERMINAL_PROJECT_STATUSES: ProjectStatus[] = ["COMPLETED", "CLOSED", "CANCELLED", "ARCHIVED"];

/** Statuses a public browse or search may ever return. */
export const PUBLICLY_BROWSEABLE_STATUSES: ProjectStatus[] = ["OPEN", "IN_PROGRESS"];

/** A project that is not yet published: owner-only, no applications. */
export function isDraft(status: ProjectStatus): boolean {
  return status === "DRAFT";
}

/** Whether the project may still accept new applications. */
export function acceptsApplications(status: ProjectStatus): boolean {
  return status === "OPEN" || status === "IN_PROGRESS";
}

/** A terminal project is read-only: no payments, no tasks, no hiring, no edits. */
export function isProjectMutable(status: ProjectStatus): boolean {
  return !TERMINAL_PROJECT_STATUSES.includes(status);
}

export function assertProjectTransition(
  from: ProjectStatus,
  to: ProjectStatus
): { ok: true } | { ok: false; error: string } {
  if (from === to) return { ok: true };
  if (!PROJECT_TRANSITIONS[from].includes(to)) {
    if (from === "CLOSED") {
      return { ok: false, error: "This project is closed and cannot be reopened." };
    }
    if (from === "COMPLETED") {
      return { ok: false, error: "This project is already complete and cannot change state." };
    }
    return { ok: false, error: `A project cannot move from ${from} to ${to}.` };
  }
  return { ok: true };
}

/**
 * The guard every mutating action calls before touching a project.
 * Returns an error message when the project is in a terminal state.
 */
export function assertProjectMutable(
  status: ProjectStatus,
  action = "change"
): { ok: true } | { ok: false; error: string } {
  if (status === "CLOSED") {
    return { ok: false, error: `This project is closed, so you cannot ${action} it.` };
  }
  if (status === "COMPLETED") {
    return { ok: false, error: `This project is complete, so you cannot ${action} it.` };
  }
  if (status === "CANCELLED") {
    return { ok: false, error: `This project was cancelled, so you cannot ${action} it.` };
  }
  if (status === "ARCHIVED") {
    return { ok: false, error: `This project is archived, so you cannot ${action} it.` };
  }
  return { ok: true };
}

/* ── Application state ─────────────────────────────────────────────────────*/

/**
 * LIFE-003 — permitted application transitions. Previously any target status
 * was accepted from any current one, so REJECTED → HIRED, HIRED → PENDING and
 * re-hiring an already-hired applicant all succeeded.
 */
const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  PENDING: ["SHORTLISTED", "REJECTED", "HIRED"],
  SHORTLISTED: ["HIRED", "REJECTED", "PENDING"],
  // A hired freelancer can be released, which returns them to REJECTED.
  HIRED: ["REJECTED"],
  // A rejected applicant can be reconsidered, but never jumped straight to hired.
  REJECTED: ["PENDING", "SHORTLISTED"],
};

export function assertApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus
): { ok: true } | { ok: false; error: string } {
  if (from === to) {
    return to === "HIRED"
      ? { ok: false, error: "This applicant is already hired." }
      : { ok: true };
  }
  if (!APPLICATION_TRANSITIONS[from].includes(to)) {
    return {
      ok: false,
      error: `An application cannot move from ${from.toLowerCase()} to ${to.toLowerCase()}.`,
    };
  }
  return { ok: true };
}

/* ── Capacity ──────────────────────────────────────────────────────────────*/

export interface CapacityView {
  projectLimit: number;
  /** Primaries only — apprentices shadow a role and consume no slot. */
  hiredPrimaries: number;
  projectFull: boolean;
  roleSlots: number | null;
  roleHired: number | null;
  roleFull: boolean;
}

/**
 * MF-004 / MF-005 — the single authoritative capacity calculation.
 *
 * `applyToProject` counted `isApprentice: false` while `hireApplicant` counted
 * every hire including apprentices, so the two disagreed about what "full"
 * meant: a project with one apprentice flipped to IN_PROGRESS with a primary
 * slot still open. Separately, `hireApplicant` enforced only *role* capacity,
 * so a project with no roles had no limit at all and could hire 50 freelancers
 * into one slot.
 *
 * Both now call this. Apprentices never consume capacity, in either count.
 *
 * Pass a transaction client when the result must be safe against a concurrent
 * hire; callers doing so should lock the application rows first.
 */
export async function getCapacity(
  client: Tx | typeof import("@/lib/db").db,
  projectId: string,
  roleId?: string | null
): Promise<CapacityView> {
  const project = await client.project.findUnique({
    where: { id: projectId },
    select: { freelancersLimit: true },
  });
  const projectLimit = project?.freelancersLimit ?? 1;

  const hiredPrimaries = await client.application.count({
    where: { projectId, status: ApplicationStatus.HIRED, isApprentice: false },
  });

  let roleSlots: number | null = null;
  let roleHired: number | null = null;
  if (roleId) {
    const role = await client.projectRole.findUnique({
      where: { id: roleId },
      select: { slots: true },
    });
    if (role) {
      roleSlots = role.slots;
      roleHired = await client.application.count({
        where: { roleId, status: ApplicationStatus.HIRED, isApprentice: false },
      });
    }
  }

  return {
    projectLimit,
    hiredPrimaries,
    projectFull: hiredPrimaries >= projectLimit,
    roleSlots,
    roleHired,
    roleFull: roleSlots != null && roleHired != null && roleHired >= roleSlots,
  };
}

/**
 * Locks the project's application rows so a concurrent hire cannot compute its
 * capacity from stale state. Two simultaneous hires into the last slot would
 * otherwise both see room.
 */
export async function lockApplicationsForCapacity(tx: Tx, projectId: string) {
  await tx.$queryRaw`
    SELECT "id" FROM "Application" WHERE "projectId" = ${projectId} FOR UPDATE`;
}

/* ── Tasks ─────────────────────────────────────────────────────────────────*/

/**
 * KANBAN-003 — Task.status is a bare String column and updateTaskStatus wrote
 * whatever it was given, so any value persisted. Combined with KANBAN-002 that
 * made a task invisible with no way back, since the board could not render it
 * and the detail dropdown could not express it.
 */
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

/**
 * KANBAN-002 — the board rendered only TODO/IN_PROGRESS/DONE while the schema
 * documents four states, so a REVIEW task belonged to no column and vanished
 * from the board while still counting in totals. REVIEW is now a real column.
 */
export const TASK_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "REVIEW", label: "Review" },
  { id: "DONE", label: "Done" },
];

/** The next/previous column, for the button-driven card movement. */
export function adjacentTaskStatus(current: TaskStatus, direction: "forward" | "back"): TaskStatus {
  const idx = TASK_STATUSES.indexOf(current);
  const next = direction === "forward" ? idx + 1 : idx - 1;
  return TASK_STATUSES[Math.min(Math.max(next, 0), TASK_STATUSES.length - 1)];
}

/* ── Contract milestones ───────────────────────────────────────────────────*/

/**
 * COMP-011 — the contract's payment schedule was a hardcoded 30/40/30 split of
 * the project budget, with fabricated titles ("Project Setup", "Beta Launch",
 * "Final Delivery"), injected for every project regardless of what the company
 * had actually configured, and duplicated at two call sites.
 *
 * The schedule is now derived from real configured data, in priority order:
 *   1. The offer's own agreed milestones.
 *   2. The project's configured payment items for that application.
 *   3. A single full-value milestone — an honest "one payment for the whole
 *      engagement" rather than an invented three-way split.
 */
export interface ContractMilestone {
  title: string;
  budget: number;
  status: "PENDING" | "ESCROWED" | "RELEASED";
}

/**
 * MF-007 — skills credited on a certificate.
 *
 * `roleTitle` previously read `role.title`, a field ProjectRole does not have
 * (it is `name`), so every certificate silently fell through to the generic
 * "Project Contributor". Skills came from `project.requiredSkills`, giving a
 * designer and a backend engineer on the same project identical lists.
 *
 * A role's name and description are the only role-specific signals the schema
 * carries, so skills named there are credited. A role naming none, or a project
 * using no roles at all, falls back to the project's required skills.
 */
export function deriveRoleSkills(
  role: { name: string; description: string | null } | null | undefined,
  projectSkills: string[]
): string[] {
  if (!role) return projectSkills.slice(0, 8);
  const haystack = `${role.name} ${role.description ?? ""}`.toLowerCase();
  const matched = projectSkills.filter((skill) => haystack.includes(skill.toLowerCase()));
  return (matched.length > 0 ? matched : projectSkills).slice(0, 8);
}

/** MF-007 — the role title credited on a certificate. */
export function deriveRoleTitle(
  role: { name: string } | null | undefined,
  isApprentice: boolean
): string {
  const base = role?.name?.trim() || "Project Contributor";
  return isApprentice ? `${base} (Apprentice)` : base;
}

export function buildContractMilestones(params: {
  offerMilestones?: { title: string; budget: number }[];
  configuredItems?: { title: string; amount: Prisma.Decimal | number }[];
  fallbackTotal: number;
  projectTitle: string;
}): ContractMilestone[] {
  const { offerMilestones, configuredItems, fallbackTotal, projectTitle } = params;

  if (offerMilestones?.length) {
    return offerMilestones.map((m) => ({
      title: m.title,
      budget: m.budget,
      status: "PENDING" as const,
    }));
  }

  if (configuredItems?.length) {
    return configuredItems.map((i) => ({
      title: i.title,
      budget: Number(i.amount),
      status: "PENDING" as const,
    }));
  }

  return [
    {
      title: `${projectTitle} — full engagement`,
      budget: fallbackTotal,
      status: "PENDING" as const,
    },
  ];
}
