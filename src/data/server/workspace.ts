import "server-only";
import { db } from "@/lib/db";
import { visibleChannelsFor } from "@/lib/authz";
import type {
  Application,
  LedgerEntry,
  Meeting,
  Message,
  PaymentItem,
  Project,
  ProjectUpdate,
  Role,
  SharedFile,
  StipendPeriod,
  Task,
  WorkLog,
  WorkspaceSummary,
} from "@/lib/types";
import {
  PUBLICLY_BROWSEABLE,
  getApplicationFinancials,
  getProjectFinancialSummary,
  taskProgress,
  type ApplicationFinancials,
  type FinancialSummary,
} from "@/lib/domain";
import {
  meetingInclude,
  messageInclude,
  paymentItemInclude,
  projectUpdateInclude,
  sharedFileInclude,
  stipendPeriodInclude,
  taskInclude,
  workLogInclude,
} from "@/adapters/include";
import {
  toLedgerEntry,
  toMeeting,
  toMessage,
  toPaymentItem,
  toProjectUpdate,
  toSharedFile,
  toStipendPeriod,
  toTask,
  toWorkLog,
} from "@/adapters/workspace";
import { getApplication as getApplicationById, getProject, hiredApplications } from "./entities";

/* ============================================================================
   WORKSPACE READS

   Everything a project workspace renders, gathered per project. Channel
   visibility uses the backend's own `visibleChannelsFor` filter, so a viewer
   never receives a direct message they are not party to.
   ========================================================================= */

export async function getPaymentItems(projectId: string): Promise<PaymentItem[]> {
  const rows = await db.paymentItem.findMany({
    where: { projectId },
    include: paymentItemInclude,
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toPaymentItem);
}

export async function getWorkLogs(projectId: string): Promise<WorkLog[]> {
  const rows = await db.workLog.findMany({
    where: { projectId },
    include: workLogInclude,
    orderBy: { workDate: "desc" },
  });
  return rows.map(toWorkLog);
}

export async function getStipendPeriods(projectId: string): Promise<StipendPeriod[]> {
  const rows = await db.stipendPeriod.findMany({
    where: { projectId },
    include: stipendPeriodInclude,
    orderBy: { periodIndex: "asc" },
  });
  return rows.map(toStipendPeriod);
}

export async function getLedger(projectId: string): Promise<LedgerEntry[]> {
  const rows = await db.paymentTransaction.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  // The ledger stores the actor as a user id; the statement lists names.
  const actors = await db.user.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.actorUserId))] } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(actors.map((a) => [a.id, a.name ?? "Member"]));

  return rows.map((row) => toLedgerEntry(row, nameOf.get(row.actorUserId) ?? "Member"));
}

export async function getMessages(
  projectId: string,
  role: "COMPANY" | "FREELANCER",
  userId: string,
): Promise<Message[]> {
  const rows = await db.message.findMany({
    where: { projectId, ...visibleChannelsFor(role, userId) },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toMessage);
}

export async function getSharedFiles(
  projectId: string,
  role: "COMPANY" | "FREELANCER",
  userId: string,
): Promise<SharedFile[]> {
  const rows = await db.sharedFile.findMany({
    where: { projectId, ...visibleChannelsFor(role, userId) },
    include: sharedFileInclude,
    orderBy: { uploadedAt: "desc" },
  });
  return rows.map(toSharedFile);
}

export async function getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
  const rows = await db.projectUpdate.findMany({
    where: { projectId },
    include: projectUpdateInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toProjectUpdate);
}

export async function getTasks(projectId: string): Promise<Task[]> {
  const rows = await db.task.findMany({
    where: { projectId },
    include: taskInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toTask);
}

export async function getMeetings(projectId: string): Promise<Meeting[]> {
  const rows = await db.meeting.findMany({
    where: { projectId },
    include: meetingInclude,
    orderBy: { startsAt: "asc" },
  });
  return rows.map(toMeeting);
}

/**
 * Money per engagement, keyed by application id. Used by the screens that list
 * several engagements at once — completed projects, dashboards — so each row
 * shows what was actually released without a query per row.
 */
export async function financialsByApplication(
  applicationIds: string[],
): Promise<Map<string, ApplicationFinancials>> {
  const out = new Map<string, ApplicationFinancials>();
  if (applicationIds.length === 0) return out;

  const [items, logs, periods, ledger] = await Promise.all([
    db.paymentItem.findMany({
      where: { applicationId: { in: applicationIds } },
      include: paymentItemInclude,
    }),
    db.workLog.findMany({
      where: { applicationId: { in: applicationIds } },
      include: workLogInclude,
    }),
    db.stipendPeriod.findMany({
      where: { applicationId: { in: applicationIds } },
      include: stipendPeriodInclude,
    }),
    db.paymentTransaction.findMany({ where: { applicationId: { in: applicationIds } } }),
  ]);

  const all = {
    items: items.map(toPaymentItem),
    logs: logs.map(toWorkLog),
    periods: periods.map(toStipendPeriod),
    ledger: ledger.map((row) => toLedgerEntry(row, "Member")),
  };

  for (const id of applicationIds) out.set(id, getApplicationFinancials(id, all));
  return out;
}

/**
 * Project money summaries keyed by project id, for the screens that list many
 * projects at once.
 */
export async function financialSummaries(
  projectIds: string[],
): Promise<Map<string, FinancialSummary>> {
  const out = new Map<string, FinancialSummary>();
  if (projectIds.length === 0) return out;

  const [projects, items, ledger] = await Promise.all([
    db.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, compensation: { select: { currency: true, totalBudget: true } } },
    }),
    db.paymentItem.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, fundedAmount: true, releasedAmount: true },
    }),
    db.paymentTransaction.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, type: true, amount: true, paymentItemId: true },
    }),
  ]);

  for (const project of projects) {
    out.set(
      project.id,
      getProjectFinancialSummary(
        project.compensation
          ? {
              currency: project.compensation.currency,
              totalBudget: Number(project.compensation.totalBudget),
            }
          : undefined,
        items
          .filter((i) => i.projectId === project.id)
          .map((i) => ({
            fundedAmount: Number(i.fundedAmount),
            releasedAmount: Number(i.releasedAmount),
          })),
        ledger
          .filter((l) => l.projectId === project.id)
          .map((l) => ({
            type: l.type as LedgerEntry["type"],
            amount: Number(l.amount),
            paymentItemId: l.paymentItemId ?? undefined,
          })),
      ),
    );
  }
  return out;
}

/* --------------------------------------------------------------- bundle --- */

/** Everything one workspace screen renders, in one round of reads. */
export interface WorkspaceData {
  application: Application;
  project: Project;
  team: Application[];
  paymentItems: PaymentItem[];
  workLogs: WorkLog[];
  stipendPeriods: StipendPeriod[];
  ledger: LedgerEntry[];
  messages: Message[];
  files: SharedFile[];
  updates: ProjectUpdate[];
  tasks: Task[];
  meetings: Meeting[];
  viewerRole: "COMPANY" | "FREELANCER";
  viewerUserId: string;
}

/**
 * Assembles a workspace for a viewer already confirmed to be a party to it.
 * Callers pass the authorised application and role from `requireApplicationParty`
 * rather than re-deriving access here.
 */
export async function getWorkspaceData(
  application: Application,
  viewerRole: "COMPANY" | "FREELANCER",
  viewerUserId: string,
): Promise<WorkspaceData | null> {
  const projectId = application.projectId;
  const project = await getProject(projectId);
  if (!project) return null;

  const [team, paymentItems, workLogs, stipendPeriods, ledger, messages, files, updates, tasks, meetings] =
    await Promise.all([
      hiredApplications(projectId),
      getPaymentItems(projectId),
      getWorkLogs(projectId),
      getStipendPeriods(projectId),
      getLedger(projectId),
      getMessages(projectId, viewerRole, viewerUserId),
      getSharedFiles(projectId, viewerRole, viewerUserId),
      getProjectUpdates(projectId),
      getTasks(projectId),
      getMeetings(projectId),
    ]);

  return {
    application,
    project,
    team,
    paymentItems,
    workLogs,
    stipendPeriods,
    ledger,
    messages,
    files,
    updates,
    tasks,
    meetings,
    viewerRole,
    viewerUserId,
  };
}

/* ------------------------------------------------------ workspace index --- */

/**
 * The workspaces a viewer can open. A freelancer gets one per engagement they
 * were hired onto; a company gets one per project with at least one hire.
 */
export async function workspacesForUser(userId: string, role: Role): Promise<WorkspaceSummary[]> {
  const where =
    role === "FREELANCER"
      ? { status: "HIRED" as const, freelancer: { userId }, project: { status: { in: PUBLICLY_BROWSEABLE } } }
      : { status: "HIRED" as const, project: { company: { userId }, status: { in: PUBLICLY_BROWSEABLE } } };

  const rows = await db.application.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      projectId: true,
      project: {
        select: {
          title: true,
          status: true,
          company: { select: { companyName: true, logoUrl: true } },
        },
      },
    },
  });

  // A company sees one workspace per project, not one per hire.
  const scoped = role === "FREELANCER" ? rows : dedupeByProject(rows);
  if (scoped.length === 0) return [];

  const projectIds = scoped.map((r) => r.projectId);

  const [projects, items, ledger, tasks, unread] = await Promise.all([
    db.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, compensation: true },
    }),
    db.paymentItem.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, fundedAmount: true, releasedAmount: true, applicationId: true },
    }),
    db.paymentTransaction.findMany({
      where: { projectId: { in: projectIds }, type: "RELEASE", paymentItemId: null },
      select: { projectId: true, amount: true },
    }),
    db.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { projectId: true, status: true },
    }),
    db.message.findMany({
      where: { projectId: { in: projectIds }, seen: false, senderId: { not: userId } },
      select: { projectId: true, channel: true },
    }),
  ]);

  const compensationOf = new Map(projects.map((p) => [p.id, p.compensation]));

  return scoped.map((row) => {
    const compensation = compensationOf.get(row.projectId);
    const projectTasks = tasks.filter((t) => t.projectId === row.projectId);

    const summary = getProjectFinancialSummary(
      {
        currency: compensation?.currency ?? "USD",
        totalBudget: compensation ? Number(compensation.totalBudget) : 0,
      },
      items
        .filter((i) => i.projectId === row.projectId)
        .map((i) => ({
          fundedAmount: Number(i.fundedAmount),
          releasedAmount: Number(i.releasedAmount),
        })),
      ledger
        .filter((l) => l.projectId === row.projectId)
        .map((l) => ({ type: "RELEASE" as const, amount: Number(l.amount) })),
    );

    return {
      id: row.projectId,
      applicationId: row.id,
      projectId: row.projectId,
      label: row.project.title,
      company: row.project.company.companyName,
      companyLogo: row.project.company.logoUrl ?? "",
      status: row.project.status,
      href: `/workspace/${row.id}`,
      unread: unread.filter(
        (m) =>
          m.projectId === row.projectId &&
          (m.channel === "group" ||
            (m.channel === "freelancers" && role === "FREELANCER") ||
            (m.channel.startsWith("dm:") && m.channel.includes(userId))),
      ).length,
      progress:
        compensation?.type === "UNPAID"
          ? taskProgress(projectTasks.map((t) => ({ status: t.status as Task["status"] })))
          : Math.round(summary.progress),
    };
  });
}

/** A workspace summary plus everything its index card renders. */
export interface WorkspaceCard extends WorkspaceSummary {
  project: Project;
  application: Application;
  summary: FinancialSummary;
  team: Application[];
  totalTasks: number;
  openTasks: number;
}

export async function workspaceCards(userId: string, role: Role): Promise<WorkspaceCard[]> {
  const summaries = await workspacesForUser(userId, role);
  if (summaries.length === 0) return [];

  const cards = await Promise.all(
    summaries.map(async (summary) => {
      const [project, application, team, items, ledger, tasks] = await Promise.all([
        getProject(summary.projectId),
        getApplicationById(summary.applicationId),
        hiredApplications(summary.projectId),
        getPaymentItems(summary.projectId),
        getLedger(summary.projectId),
        getTasks(summary.projectId),
      ]);
      if (!project || !application) return null;

      return {
        ...summary,
        project,
        application,
        summary: getProjectFinancialSummary(project.compensation, items, ledger),
        team,
        totalTasks: tasks.length,
        openTasks: tasks.filter((t) => t.status !== "DONE").length,
      } satisfies WorkspaceCard;
    }),
  );

  return cards.filter((card): card is WorkspaceCard => card !== null);
}

function dedupeByProject<T extends { projectId: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.projectId)) continue;
    seen.add(row.projectId);
    out.push(row);
  }
  return out;
}
