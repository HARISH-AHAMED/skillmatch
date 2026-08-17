"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireProjectOwner } from "@/lib/authz";
import { D, checkStipendRelease, transitionKey } from "@/lib/paymentRules";
import { inFinancialTransaction, appendLedger, LedgerReplayError } from "@/lib/payments";
import { getProjectCompensation } from "@/lib/compensation";

/**
 * Stipend payouts, backed by StipendPeriod + the ledger rather than JSON
 * (ARCH-001).
 *
 * COMP-013 — the unique index on (applicationId, periodIndex) makes paying the
 * same period twice a database constraint rather than an array scan that a
 * concurrent caller could race past.
 * COMP-014 — cumulative payouts are now capped at the project budget.
 */
export async function releaseStipendPayment(
  projectId: string,
  applicationId: string,
  periodIndex: number
) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) return { success: false, error: owned.error };

  const comp = await getProjectCompensation(projectId);
  if (!comp) return { success: false, error: "This project has no compensation configured." };
  if (comp.type !== "STIPEND") {
    return { success: false, error: "This project is not a stipend engagement." };
  }

  const application = await db.application.findFirst({
    where: { id: applicationId, projectId, status: "HIRED" },
    select: { id: true },
  });
  if (!application) {
    return { success: false, error: "That freelancer is not hired on this project." };
  }

  const amount = comp.stipendAmount ?? D(0);

  try {
    const result = await inFinancialTransaction(async (tx) => {
      // Lock this project's stipend rows so a concurrent release computes its
      // running total from committed state.
      await tx.$queryRaw`
        SELECT "id" FROM "StipendPeriod" WHERE "projectId" = ${projectId} FOR UPDATE`;

      const existing = await tx.stipendPeriod.findMany({ where: { projectId } });
      const alreadyPaidTotal = existing
        .filter((p) => p.status === "RELEASED")
        .reduce((t, p) => t.plus(D(p.amount)), D(0));

      const rule = checkStipendRelease({
        periodIndex,
        frequency: comp.stipendFrequency,
        configuredPeriods: comp.stipendPeriods,
        amount: D(amount),
        alreadyPaidTotal,
        projectBudget: D(comp.totalBudget),
      });
      if (!rule.ok) return { success: false as const, error: rule.error! };

      let period;
      try {
        period = await tx.stipendPeriod.create({
          data: {
            projectId,
            applicationId,
            periodIndex,
            amount: D(amount),
            currency: comp.currency,
            status: "RELEASED",
            releasedAt: new Date(),
          },
        });
      } catch (err: any) {
        if (err?.code === "P2002") {
          return {
            success: false as const,
            error: `Period ${periodIndex} has already been paid to this freelancer.`,
          };
        }
        throw err;
      }

      await appendLedger(tx, {
        projectId,
        applicationId,
        stipendPeriodId: period.id,
        type: "RELEASE",
        amount: D(amount),
        currency: comp.currency,
        actorUserId: owned.data.userId,
        idempotencyKey: transitionKey("stipend", applicationId, "release", periodIndex),
        note: `Stipend period ${periodIndex}`,
      });

      return { success: true as const, currency: comp.currency };
    });

    if (!result.success) return result;

    const app = await db.application.findUnique({
      where: { id: applicationId },
      select: { freelancer: { select: { userId: true } } },
    });
    if (app) {
      await db.notification.create({
        data: {
          userId: app.freelancer.userId,
          title: "Stipend released",
          message: `${result.currency} ${D(amount).toFixed(2)} was released for period ${periodIndex}.`,
        },
      });
    }
  } catch (err) {
    if (err instanceof LedgerReplayError) {
      return { success: false, error: "That stipend period has already been paid." };
    }
    console.error("releaseStipendPayment failed:", err);
    return { success: false, error: "Could not release the stipend." };
  }

  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, payments: await getStipendPayments(projectId) };
}

export async function getStipendPayments(projectId: string) {
  const periods = await db.stipendPeriod.findMany({
    where: { projectId },
    orderBy: { periodIndex: "asc" },
    include: {
      application: { select: { freelancer: { select: { user: { select: { name: true } } } } } },
    },
  });
  return periods.map((p) => ({
    id: p.id,
    applicationId: p.applicationId,
    freelancerName: p.application.freelancer.user.name || "Freelancer",
    periodIndex: p.periodIndex,
    amount: Number(p.amount),
    currency: p.currency,
    date: (p.releasedAt ?? p.createdAt).toISOString(),
    status: p.status,
  }));
}
