"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireProjectOwner, requireHiredFreelancer } from "@/lib/authz";
import {
  D,
  checkAddWorkLog,
  checkHourlyRelease,
  approvedHourlyValue,
  transitionKey,
} from "@/lib/paymentRules";
import { inFinancialTransaction, appendLedger, LedgerReplayError } from "@/lib/payments";
import { getProjectCompensation } from "@/lib/compensation";

/**
 * Hourly work logs and payments, backed by the WorkLog table and the ledger
 * rather than JSON in Project.description (ARCH-001).
 *
 * COMP-007 — each log stores the rate in force when the work was logged, so
 * editing the project rate no longer retroactively reprices approved work.
 */

/**
 * TIME-002 — a date-only value like "2026-08-17" parses as UTC midnight and
 * then renders a day earlier everywhere west of UTC. Anchoring to local noon
 * keeps the calendar date stable in every timezone the platform serves.
 */
function toWorkDate(dateString: string): Date {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
}

/** Freelancer records a day of work. Only a hired freelancer may log time. */
export async function addWorkLog(
  projectId: string,
  input: { date: string; hours: number; description: string }
) {
  const actor = await requireHiredFreelancer(projectId);
  if (!actor.ok) return { success: false, error: actor.error };

  const comp = await getProjectCompensation(projectId);
  if (!comp) return { success: false, error: "This project has no compensation configured." };
  if (comp.type !== "HOURLY") {
    return { success: false, error: "This project is not an hourly engagement." };
  }
  const rate = comp.hourlyRate ?? D(0);
  if (rate.lte(0)) {
    return { success: false, error: "This project has no hourly rate configured." };
  }

  // COMP-006 — cumulative hours were previously unbounded.
  const existing = await db.workLog.findMany({
    where: { applicationId: actor.data.applicationId, status: { not: "REJECTED" } },
    select: { hours: true },
  });
  const alreadyLogged = existing.reduce((t, l) => t.plus(l.hours), D(0));

  const rule = checkAddWorkLog({
    hours: D(input.hours),
    date: input.date,
    description: input.description,
    alreadyLoggedHours: alreadyLogged,
    maxHours: comp.maxHours ?? comp.estimatedHours ?? null,
  });
  if (!rule.ok) return { success: false, error: rule.error };

  try {
    await db.workLog.create({
      data: {
        projectId,
        applicationId: actor.data.applicationId,
        workDate: toWorkDate(input.date),
        hours: D(input.hours),
        description: input.description.trim(),
        rateSnapshot: rate,
        currency: comp.currency,
      },
    });
  } catch (err: any) {
    // COMP-009 — the same day + description cannot be logged twice.
    if (err?.code === "P2002") {
      return { success: false, error: "You have already logged this work for that date." };
    }
    throw err;
  }

  revalidatePath(`/company/projects/${projectId}`);
  // The workspace is where these are actually read; without it the panel kept
  // serving a cached list and a new log looked like it had not been saved.
  revalidatePath("/workspace/[applicationId]", "layout");
  revalidatePath("/company/workspace/[applicationId]", "layout");
  revalidatePath("/freelancer/workspace/[applicationId]", "layout");
  return { success: true, logs: await getWorkLogs(projectId) };
}

export async function getWorkLogs(projectId: string) {
  const logs = await db.workLog.findMany({
    where: { projectId },
    orderBy: { workDate: "desc" },
    include: {
      application: {
        select: { id: true, freelancer: { select: { userId: true, user: { select: { name: true } } } } },
      },
    },
  });
  return logs.map((l) => ({
    id: l.id,
    applicationId: l.applicationId,
    freelancerUserId: l.application.freelancer.userId,
    freelancerName: l.application.freelancer.user.name || "Freelancer",
    date: l.workDate.toISOString().slice(0, 10),
    hours: Number(l.hours),
    description: l.description,
    status: l.status,
    rate: Number(l.rateSnapshot),
    currency: l.currency,
    reviewedAt: l.reviewedAt?.toISOString(),
    reviewNote: l.reviewNote ?? "",
  }));
}

/** Company approves or rejects a pending work log. */
export async function reviewWorkLog(
  projectId: string,
  logId: string,
  approve: boolean,
  reviewNote?: string
) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) return { success: false, error: owned.error };

  const result = await inFinancialTransaction(async (tx) => {
    // Scoped to the project, per the Phase 1 Class B rule.
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "WorkLog" WHERE "id" = ${logId} AND "projectId" = ${projectId} FOR UPDATE`;
    if (rows.length === 0) return { success: false as const, error: "Work log not found." };

    const log = await tx.workLog.findUnique({ where: { id: logId } });
    if (!log) return { success: false as const, error: "Work log not found." };
    if (log.status !== "PENDING") {
      return { success: false as const, error: "This work log has already been reviewed." };
    }

    await tx.workLog.update({
      where: { id: logId },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        reviewedAt: new Date(),
        reviewedById: owned.data.userId,
        // COMP-008 — a rejection now carries a reason, so a mistaken one is
        // explicable rather than silently terminal.
        reviewNote: approve ? null : reviewNote || "",
      },
    });
    return { success: true as const, applicationId: log.applicationId };
  });

  if (!result.success) return result;

  await notifyFreelancer(
    result.applicationId,
    approve ? "Work log approved" : "Work log rejected",
    approve
      ? "Your logged hours were approved and are now payable."
      : `Your logged hours were rejected.${reviewNote ? ` Reason: ${reviewNote}` : ""}`
  );

  revalidatePath(`/company/projects/${projectId}`);
  // The workspace is where these are actually read; without it the panel kept
  // serving a cached list and a new log looked like it had not been saved.
  revalidatePath("/workspace/[applicationId]", "layout");
  revalidatePath("/company/workspace/[applicationId]", "layout");
  revalidatePath("/freelancer/workspace/[applicationId]", "layout");
  return { success: true, logs: await getWorkLogs(projectId) };
}

/** Freelancer deletes their own log, only while it is still pending review. */
export async function deleteWorkLog(projectId: string, logId: string) {
  const actor = await requireHiredFreelancer(projectId);
  if (!actor.ok) return { success: false, error: actor.error };

  const log = await db.workLog.findFirst({ where: { id: logId, projectId } });
  if (!log) return { success: false, error: "Work log not found." };
  if (log.applicationId !== actor.data.applicationId) {
    return { success: false, error: "You can only remove your own work logs." };
  }
  if (log.status !== "PENDING") {
    return { success: false, error: "A reviewed work log can no longer be removed." };
  }

  await db.workLog.delete({ where: { id: logId } });
  revalidatePath(`/company/projects/${projectId}`);
  // The workspace is where these are actually read; without it the panel kept
  // serving a cached list and a new log looked like it had not been saved.
  revalidatePath("/workspace/[applicationId]", "layout");
  revalidatePath("/company/workspace/[applicationId]", "layout");
  revalidatePath("/freelancer/workspace/[applicationId]", "layout");
  return { success: true, logs: await getWorkLogs(projectId) };
}

/**
 * Company releases payment for a freelancer's approved hourly work.
 * Only APPROVED logs are payable, and only up to what remains unpaid for that
 * one application — one freelancer's balance can never pay another's.
 */
export async function releaseHourlyPayment(
  projectId: string,
  applicationId: string,
  amount: number
) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) return { success: false, error: owned.error };

  const comp = await getProjectCompensation(projectId);
  if (!comp) return { success: false, error: "This project has no compensation configured." };

  const application = await db.application.findFirst({
    where: { id: applicationId, projectId, status: "HIRED" },
    select: { id: true },
  });
  if (!application) {
    return { success: false, error: "That freelancer is not hired on this project." };
  }

  try {
    const result = await inFinancialTransaction(async (tx) => {
      // Lock this application's logs and prior payments together, so a
      // concurrent release cannot compute its balance from stale state.
      await tx.$queryRaw`
        SELECT "id" FROM "WorkLog" WHERE "applicationId" = ${applicationId} FOR UPDATE`;

      const logs = await tx.workLog.findMany({ where: { applicationId } });
      /**
       * `paymentItemId: null` alone also matches stipend releases, which carry
       * a stipendPeriodId instead — so a project whose compensation type had
       * been switched counted stipend payouts against the hourly balance.
       * Hourly releases are the entries with neither relation set.
       */
      const paid = await tx.paymentTransaction.findMany({
        where: { applicationId, type: "RELEASE", paymentItemId: null, stipendPeriodId: null },
      });
      // Every release on the project, for the budget ceiling below.
      const projectReleases = await tx.paymentTransaction.findMany({
        where: { projectId, type: "RELEASE" },
        select: { amount: true },
      });

      const approvedValue = approvedHourlyValue(
        logs.map((l) => ({ hours: D(l.hours), rateSnapshot: D(l.rateSnapshot), status: l.status }))
      );
      const alreadyPaid = paid.reduce((t, p) => t.plus(D(p.amount).abs()), D(0));
      const projectPaidTotal = projectReleases.reduce((t, p) => t.plus(D(p.amount).abs()), D(0));
      const value = D(amount);

      const rule = checkHourlyRelease({
        value,
        approvedValue,
        alreadyPaid,
        projectBudget: D(comp.totalBudget),
        projectPaidTotal,
      });
      if (!rule.ok) return { success: false as const, error: rule.error! };

      const nextPaid = alreadyPaid.plus(value);
      await appendLedger(tx, {
        projectId,
        applicationId,
        type: "RELEASE",
        amount: value,
        currency: comp.currency,
        actorUserId: owned.data.userId,
        idempotencyKey: transitionKey("hourly", applicationId, "release", nextPaid.toFixed(2)),
        note: "Hourly work payment",
      });
      return { success: true as const, value, currency: comp.currency };
    });

    if (!result.success) return result;

    await notifyFreelancer(
      applicationId,
      "Payment released",
      `${result.currency} ${result.value.toFixed(2)} was released for your approved hours.`
    );
  } catch (err) {
    if (err instanceof LedgerReplayError) {
      return { success: false, error: "That payment has already been recorded." };
    }
    console.error("releaseHourlyPayment failed:", err);
    return { success: false, error: "Could not release the payment." };
  }

  revalidatePath(`/company/projects/${projectId}`);
  // The workspace is where these are actually read; without it the panel kept
  // serving a cached list and a new log looked like it had not been saved.
  revalidatePath("/workspace/[applicationId]", "layout");
  revalidatePath("/company/workspace/[applicationId]", "layout");
  revalidatePath("/freelancer/workspace/[applicationId]", "layout");
  return { success: true, payments: await getHourlyPayments(projectId) };
}

export async function getHourlyPayments(projectId: string) {
  const entries = await db.paymentTransaction.findMany({
    // Neither relation set — a stipend release carries a stipendPeriodId and is
    // not an hourly payment.
    where: { projectId, type: "RELEASE", paymentItemId: null, stipendPeriodId: null },
    orderBy: { createdAt: "desc" },
  });
  return entries.map((e) => ({
    id: e.id,
    applicationId: e.applicationId,
    date: e.createdAt.toISOString(),
    amount: Number(e.amount.abs()),
    currency: e.currency,
    note: e.note ?? "",
  }));
}

async function notifyFreelancer(applicationId: string, title: string, message: string) {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { freelancer: { select: { userId: true } } },
  });
  if (!app) return;
  await db.notification.create({ data: { userId: app.freelancer.userId, title, message } });
}
