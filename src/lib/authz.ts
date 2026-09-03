/**
 * Central authorization guards for server actions and route handlers.
 *
 * The audit (talentra-audit.md) found two distinct failure shapes across the
 * action layer:
 *
 *   Class A — the caller's *role* was checked but never that they own the
 *             object being acted on (SEC-004/005/006/007/011/012/013/014/016).
 *   Class B — a project-access check ran correctly, but the mutation then
 *             targeted a record id that was never confirmed to belong to that
 *             project (KANBAN-001, WS-001, WS-002, ROLE-001).
 *
 * Both classes exist because every call site wrote its own bespoke check. These
 * helpers are the single implementation both sweeps use. They follow the
 * pattern that was already correct in paymentStageActions.ts and
 * collaborationActions.ts rather than inventing a new one.
 *
 * Convention: every guard returns a discriminated result rather than throwing,
 * so callers keep returning `{ success: false, error }` to the client exactly
 * as they do today. Guards never leak whether a record exists to a caller who
 * is not entitled to it — "not found" and "not yours" both surface as the same
 * generic message.
 */

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import type { Project, Application, Company } from "@prisma/client";

export type Guard<T> = { ok: true; data: T } | { ok: false; error: string };

/** Deliberately identical for missing and forbidden, so ids cannot be probed. */
const DENIED = "Not found, or you do not have access to it." as const;
const UNAUTHENTICATED = "Unauthorized" as const;

function deny(message: string = DENIED): { ok: false; error: string } {
  return { ok: false, error: message };
}

/** Any signed-in user. */
export async function requireUser(): Promise<Guard<{ userId: string; role: Role; name: string | null }>> {
  const session = await auth();
  if (!session?.user?.id) return deny(UNAUTHENTICATED);
  return {
    ok: true,
    data: { userId: session.user.id, role: session.user.role, name: session.user.name ?? null },
  };
}

/** A signed-in user holding a specific role. */
export async function requireRole(
  role: Role
): Promise<Guard<{ userId: string; role: Role; name: string | null }>> {
  const user = await requireUser();
  if (!user.ok) return user;
  if (user.data.role !== role) return deny(UNAUTHENTICATED);
  return user;
}

/**
 * SEC-001. Platform administrator.
 *
 * Server actions are network endpoints: a layout guard on /admin does not
 * protect them. Every admin-only action must call this directly.
 */
export async function requireAdmin(): Promise<Guard<{ userId: string; name: string | null }>> {
  const user = await requireRole(Role.ADMIN);
  if (!user.ok) return user;
  return { ok: true, data: { userId: user.data.userId, name: user.data.name } };
}

/** The company profile belonging to the signed-in COMPANY user. */
export async function requireCompany(): Promise<Guard<{ userId: string; company: Company }>> {
  const user = await requireRole(Role.COMPANY);
  if (!user.ok) return user;
  const company = await db.company.findUnique({ where: { userId: user.data.userId } });
  if (!company) return deny("Complete your company profile first.");
  return { ok: true, data: { userId: user.data.userId, company } };
}

/**
 * Class A guard: the signed-in COMPANY user owns this project.
 * Replaces the ad-hoc `project.companyId !== company.id` checks.
 */
export async function requireProjectOwner(
  projectId: string
): Promise<Guard<{ userId: string; company: Company; project: Project }>> {
  const actor = await requireCompany();
  if (!actor.ok) return actor;
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || project.companyId !== actor.data.company.id) return deny();
  return { ok: true, data: { ...actor.data, project } };
}

/**
 * Class A guard: the signed-in COMPANY user owns the project this application
 * belongs to. This is the check that was missing from every mutation in
 * SEC-004, and from SEC-005/006/007.
 */
export async function requireApplicationOwner(applicationId: string): Promise<
  Guard<{
    userId: string;
    company: Company;
    application: Application & { project: Project };
  }>
> {
  const actor = await requireCompany();
  if (!actor.ok) return actor;
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: { project: true },
  });
  if (!application || application.project.companyId !== actor.data.company.id) return deny();
  return { ok: true, data: { ...actor.data, application } };
}

/**
 * Class A guard: the signed-in FREELANCER owns this application.
 */
export async function requireApplicationFreelancer(applicationId: string): Promise<
  Guard<{ userId: string; application: Application & { project: Project } }>
> {
  const user = await requireRole(Role.FREELANCER);
  if (!user.ok) return user;
  const application = await db.application.findFirst({
    where: { id: applicationId, freelancer: { userId: user.data.userId } },
    include: { project: true },
  });
  if (!application) return deny();
  return { ok: true, data: { userId: user.data.userId, application } };
}

/**
 * Class A guard: caller is a party to this project — either the owning company
 * or a currently-hired freelancer on it. Mirrors
 * collaborationActions.verifyProjectWorkspaceAccess, which was already correct.
 */
export async function requireProjectParty(projectId: string): Promise<
  Guard<{
    userId: string;
    role: "COMPANY" | "FREELANCER";
    project: Project;
    /** The caller's own hired application, when they are a freelancer. */
    applicationId: string | null;
  }>
> {
  const user = await requireUser();
  if (!user.ok) return user;
  const { userId } = user.data;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      company: { select: { userId: true } },
      applications: {
        where: { status: "HIRED", freelancer: { userId } },
        select: { id: true },
      },
    },
  });
  if (!project) return deny();

  if (project.company.userId === userId) {
    return { ok: true, data: { userId, role: "COMPANY", project, applicationId: null } };
  }
  const own = project.applications[0];
  if (own) {
    return { ok: true, data: { userId, role: "FREELANCER", project, applicationId: own.id } };
  }
  return deny();
}

/**
 * Class A guard: caller is a party to this *application* — either the company
 * that owns its project, or the freelancer who submitted it. Used where both
 * sides legitimately act on the same record (contract signing, offers).
 */
export async function requireApplicationParty(applicationId: string): Promise<
  Guard<{
    userId: string;
    role: "COMPANY" | "FREELANCER";
    application: Application & { project: Project };
  }>
> {
  const user = await requireUser();
  if (!user.ok) return user;
  const { userId } = user.data;

  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: { include: { company: { select: { userId: true } } } },
      freelancer: { select: { userId: true } },
    },
  });
  if (!application) return deny();

  if (application.project.company.userId === userId) {
    return { ok: true, data: { userId, role: "COMPANY", application } };
  }
  if (application.freelancer.userId === userId) {
    return { ok: true, data: { userId, role: "FREELANCER", application } };
  }
  return deny();
}

/**
 * Class A guard: caller may open the *workspace* for this application.
 *
 * requireApplicationParty is deliberately permissive — it admits the freelancer
 * who submitted the application whatever its status, because offers and
 * contract signing are things a not-yet-hired candidate legitimately does. The
 * workspace is not: it carries the team roster, every payment record, the work
 * log and the full transaction ledger.
 *
 * Gating all three workspace routes on the permissive guard meant a PENDING
 * applicant — or a freelancer who had just been removed from the project —
 * could open their own workspace URL and read all of it. The polling route
 * /api/workspace/[projectId] used requireProjectParty and correctly required
 * HIRED, so the two read paths disagreed. This is the predicate both use now.
 */
export async function requireWorkspaceMember(applicationId: string): Promise<
  Guard<{
    userId: string;
    role: "COMPANY" | "FREELANCER";
    application: Application & { project: Project };
  }>
> {
  const party = await requireApplicationParty(applicationId);
  if (!party.ok) return party;

  // The owning company sees the workspace for any application on its project.
  if (party.data.role === "COMPANY") return party;

  // A freelancer sees it only while actually engaged on the work.
  if (party.data.application.status !== "HIRED") return deny();

  return party;
}

/**
 * The caller's IP, read from request headers server-side.
 *
 * SEC-006: this was previously a caller-supplied argument defaulting to
 * "127.0.0.1", so the value recorded in signature audit trails was entirely
 * attacker-controlled.
 */
export async function callerIpAddress(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    return h.get("x-real-ip") ?? "unknown";
  } catch {
    // Outside a request scope (e.g. unit tests) there is no client address.
    return "unknown";
  }
}

/** Class A guard: caller is a currently-hired freelancer on this project. */
export async function requireHiredFreelancer(
  projectId: string
): Promise<Guard<{ userId: string; applicationId: string; project: Project }>> {
  const party = await requireProjectParty(projectId);
  if (!party.ok) return party;
  if (party.data.role !== "FREELANCER" || !party.data.applicationId) {
    return deny("Only a hired freelancer can do this.");
  }
  return {
    ok: true,
    data: {
      userId: party.data.userId,
      applicationId: party.data.applicationId,
      project: party.data.project,
    },
  };
}

/**
 * Class B: which message/file channels a caller may see on a project.
 *
 * SEC-011 and WS-002 are the same leak reached through two paths — the polling
 * API and the server-rendered page. Both now build their `where` clause from
 * this one predicate so they cannot drift apart again.
 *
 * Rules, matching what collaborationActions already enforces on write:
 *   - "group"       : everyone on the project
 *   - "freelancers" : hired freelancers only, never the company
 *   - "dm:a:b"      : only the two participants
 */
export type ChannelFilter = {
  OR: (
    | { channel: string }
    | { channel: { startsWith: string } }
    | { channel: { endsWith: string } }
  )[];
};

export function visibleChannelsFor(
  role: "COMPANY" | "FREELANCER",
  userId: string
): ChannelFilter {
  const clauses: ChannelFilter["OR"] = [{ channel: "group" }];
  if (role === "FREELANCER") clauses.push({ channel: "freelancers" });
  // A dm channel is `dm:${a}:${b}` with the two ids sorted, so the caller sits
  // in exactly one of the two positions. Matched with anchored prefix/suffix
  // rather than `contains`, which would let a user whose id is a suffix of
  // another id read a conversation they are not part of.
  clauses.push({ channel: { startsWith: `dm:${userId}:` } });
  clauses.push({ channel: { endsWith: `:${userId}` } });
  return { OR: clauses };
}

/**
 * Class B: confirm a record actually belongs to the project the caller was
 * granted access to. The bug this closes is subtle — the project-access check
 * passes legitimately, then the mutation runs against an id from a *different*
 * project. Callers must scope by project, not just by id.
 */
export async function scopedTask(taskId: string, projectId: string) {
  return db.task.findFirst({ where: { id: taskId, projectId } });
}

export async function scopedSharedFile(fileId: string, projectId: string) {
  return db.sharedFile.findFirst({ where: { id: fileId, projectId } });
}

export async function scopedMessage(messageId: string, projectId: string) {
  return db.message.findFirst({ where: { id: messageId, projectId } });
}

export async function scopedProjectUpdate(updateId: string, projectId: string) {
  return db.projectUpdate.findFirst({ where: { id: updateId, projectId } });
}

export { DENIED };
