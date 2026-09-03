"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireHiredFreelancer, requireProjectOwner } from "@/lib/authz";
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

      /*
       * A period may already exist because the freelancer raised it for
       * approval. Releasing then updates that row rather than inserting a
       * second one — the unique constraint is the guard against paying the
       * same period twice, not a reason to refuse a period that was claimed
       * first.
       */
      const claimed = existing.find(
        (p) => p.applicationId === applicationId && p.periodIndex === periodIndex,
      );

      if (claimed?.status === "RELEASED") {
        return {
          success: false as const,
          error: `Period ${periodIndex} has already been paid to this freelancer.`,
        };
      }

      let period;
      try {
        period = claimed
          ? await tx.stipendPeriod.update({
              where: { id: claimed.id },
              data: { status: "RELEASED", releasedAt: new Date(), amount: D(amount) },
            })
          : await tx.stipendPeriod.create({
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

/* ============================================================================
   RAISING A PERIOD

   A stipend period had no way to come into existence except by being paid:
   the schedule showed "no periods yet" and there was nothing to approve. The
   freelancer raises the period they have worked, which is a claim, not money —
   no ledger entry is written until the company releases it.
   ========================================================================= */

export async function submitStipendPeriod(projectId: string, periodIndex: number) {
  const actor = await requireHiredFreelancer(projectId);
  if (!actor.ok) return { success: false, error: actor.error };

  const comp = await getProjectCompensation(projectId);
  if (!comp) return { success: false, error: "This project has no compensation configured." };
  if (comp.type !== "STIPEND") {
    return { success: false, error: "This project is not a stipend engagement." };
  }

  const configured = comp.stipendFrequency === "ONE_TIME" ? 1 : (comp.stipendPeriods ?? 1);
  if (!Number.isInteger(periodIndex) || periodIndex < 1 || periodIndex > configured) {
    return {
      success: false,
      error: `This engagement runs for ${configured} period(s), so there is no period ${periodIndex}.`,
    };
  }

  const applicationId = actor.data.applicationId;

  const existing = await db.stipendPeriod.findFirst({
    where: { applicationId, periodIndex },
    select: { id: true, status: true },
  });

  if (existing) {
    if (existing.status === "RELEASED") {
      return { success: false, error: "That period has already been paid." };
    }
    if (existing.status === "SUBMITTED") {
      return { success: false, error: "That period is already awaiting the company's release." };
    }
    await db.stipendPeriod.update({ where: { id: existing.id }, data: { status: "SUBMITTED" } });
  } else {
    await db.stipendPeriod.create({
      data: {
        projectId,
        applicationId,
        periodIndex,
        amount: comp.stipendAmount ?? D(0),
        currency: comp.currency,
        status: "SUBMITTED",
      },
    });
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { title: true, company: { select: { userId: true } } },
  });
  if (project) {
    await db.notification.create({
      data: {
        userId: project.company.userId,
        title: "Stipend period raised",
        message: `A freelancer raised period ${periodIndex} on "${project.title}" for release.`,
      },
    });
  }

  revalidatePath(`/company/projects/${projectId}`);
  revalidatePath("/workspace/[applicationId]", "layout");
  revalidatePath("/company/workspace/[applicationId]", "layout");
  revalidatePath("/freelancer/workspace/[applicationId]", "layout");

  return { success: true };
}
