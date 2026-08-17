"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireProjectOwner, requireHiredFreelancer } from "@/lib/authz";
import {
  D,
  checkSaveItem,
  checkDeleteItem,
  checkFund,
  checkSubmit,
  checkReview,
  checkRelease,
  assertTransition,
  transitionKey,
  type ItemSnapshot,
} from "@/lib/paymentRules";
import {
  inFinancialTransaction,
  lockPaymentItem,
  lockProjectItems,
  appendLedger,
  sumAmounts,
  sumFunded,
  LedgerReplayError,
} from "@/lib/payments";
import { getProjectCompensation } from "@/lib/compensation";

/**
 * Payment stages, backed by the PaymentItem table and the append-only ledger
 * rather than by JSON inside Project.description (ARCH-001).
 *
 * The business rules are carried across unchanged — budget cap,
 * no-shrink-below-committed, no-reassignment-once-funded, no-delete-once-funded,
 * no-release-before-fully-funded, no-double-release, per-application isolation.
 * What changed is where the state lives and how concurrent callers are
 * serialised against it.
 */

export interface PaymentStageInput {
  id?: string;
  /** Required — every stage pays exactly one hired application (COMP-002, MF-003). */
  applicationId: string;
  title: string;
  description?: string;
  amount: number;
}

function toSnapshot(item: {
  id: string;
  applicationId: string;
  amount: any;
  fundedAmount: any;
  releasedAmount: any;
  status: any;
  revisionCount: number;
  currency: string;
}): ItemSnapshot {
  return {
    id: item.id,
    applicationId: item.applicationId,
    amount: D(item.amount),
    fundedAmount: D(item.fundedAmount),
    releasedAmount: D(item.releasedAmount),
    status: item.status,
    revisionCount: item.revisionCount,
    currency: item.currency,
  };
}

/** Stages currently defined on a project, scoped to a caller who may see them. */
export async function getPaymentStages(projectId: string) {
  const items = await db.paymentItem.findMany({
    where: { projectId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      application: {
        select: { id: true, freelancer: { select: { user: { select: { name: true } } } } },
      },
    },
  });
  return items.map((i) => ({
    id: i.id,
    applicationId: i.applicationId,
    freelancerName: i.application.freelancer.user.name || "Freelancer",
    title: i.title,
    description: i.description ?? "",
    amount: Number(i.amount),
    currency: i.currency,
    status: i.status,
    funded: Number(i.fundedAmount),
    released: Number(i.releasedAmount),
    submissionNote: i.submissionNote ?? "",
    reviewNote: i.reviewNote ?? "",
    revisionCount: i.revisionCount,
  }));
}

/** Adds or updates one stage. */
export async function savePaymentStage(projectId: string, input: PaymentStageInput) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) return { success: false, error: owned.error };

  const comp = await getProjectCompensation(projectId);
  if (!comp) return { success: false, error: "This project has no compensation configured." };
  // COMP-017 — payment controls must not operate on a non-monetary engagement.
  if (comp.type === "UNPAID") {
    return { success: false, error: "This is an unpaid engagement, so it has no payment stages." };
  }

  // The stage must pay a freelancer actually hired on THIS project.
  const application = await db.application.findFirst({
    where: { id: input.applicationId, projectId, status: "HIRED" },
    select: { id: true },
  });
  if (!application) {
    return { success: false, error: "That freelancer is not hired on this project." };
  }

  try {
    const result = await inFinancialTransaction(async (tx) => {
      const items = await lockProjectItems(tx, projectId);
      const existing = input.id ? items.find((i) => i.id === input.id) : undefined;
      if (input.id && !existing) return { success: false as const, error: "Stage not found." };

      const rule = checkSaveItem({
        amount: D(input.amount),
        title: input.title,
        currency: comp.currency,
        projectCurrency: comp.currency,
        projectBudget: D(comp.totalBudget),
        otherItemsTotal: sumAmounts(items, input.id),
        existing: existing ? toSnapshot(existing) : undefined,
        targetApplicationId: input.applicationId,
      });
      if (!rule.ok) return { success: false as const, error: rule.error! };

      if (existing) {
        await tx.paymentItem.update({
          where: { id: existing.id },
          data: {
            applicationId: input.applicationId,
            title: input.title.trim(),
            description: input.description ?? "",
            amount: D(input.amount),
          },
        });
      } else {
        await tx.paymentItem.create({
          data: {
            projectId,
            applicationId: input.applicationId,
            title: input.title.trim(),
            description: input.description ?? "",
            amount: D(input.amount),
            currency: comp.currency,
            sortOrder: items.length,
          },
        });
      }
      return { success: true as const };
    });

    if (!result.success) return result;
  } catch (err) {
    console.error("savePaymentStage failed:", err);
    return { success: false, error: "Could not save the payment stage." };
  }

  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, stages: await getPaymentStages(projectId) };
}

/** Deletes a stage, unless money has already been funded or released against it. */
export async function deletePaymentStage(projectId: string, stageId: string) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) return { success: false, error: owned.error };

  const result = await inFinancialTransaction(async (tx) => {
    const item = await lockPaymentItem(tx, stageId, projectId);
    if (!item) return { success: false as const, error: "Stage not found." };

    const rule = checkDeleteItem(toSnapshot(item));
    if (!rule.ok) return { success: false as const, error: rule.error! };

    await tx.paymentItem.delete({ where: { id: stageId } });
    return { success: true as const };
  });

  if (!result.success) return result;
  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, stages: await getPaymentStages(projectId) };
}

/** Company commits funds to a stage. */
export async function fundPaymentStage(projectId: string, stageId: string, amount: number) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) return { success: false, error: owned.error };

  const comp = await getProjectCompensation(projectId);
  if (!comp) return { success: false, error: "This project has no compensation configured." };
  if (comp.type === "UNPAID") {
    return { success: false, error: "This is an unpaid engagement." };
  }

  try {
    const result = await inFinancialTransaction(async (tx) => {
      const items = await lockProjectItems(tx, projectId);
      const item = items.find((i) => i.id === stageId);
      if (!item) return { success: false as const, error: "Stage not found." };

      const snapshot = toSnapshot(item);
      const value = D(amount);
      const rule = checkFund({
        item: snapshot,
        value,
        projectBudget: D(comp.totalBudget),
        projectFundedTotal: sumFunded(items),
      });
      if (!rule.ok) return { success: false as const, error: rule.error! };

      const nextFunded = snapshot.fundedAmount.plus(value);
      // Incremental top-ups are legitimate, so the key includes the resulting
      // total rather than just the operation name.
      await appendLedger(tx, {
        projectId,
        applicationId: item.applicationId,
        paymentItemId: item.id,
        type: "FUND",
        amount: value,
        currency: item.currency,
        actorUserId: owned.data.userId,
        idempotencyKey: transitionKey("item", item.id, "fund", nextFunded.toFixed(2)),
      });

      await tx.paymentItem.update({
        where: { id: item.id },
        data: { fundedAmount: nextFunded, status: "FUNDED" },
      });
      return { success: true as const, applicationId: item.applicationId, amount: value, currency: item.currency, title: item.title };
    });

    if (!result.success) return result;

    // COMP-005 — the freelancer was never told about funding, approval or
    // release; they had to revisit the page to discover their own money moved.
    await notifyFreelancer(result.applicationId, "Stage funded", `"${result.title}" has been funded with ${result.currency} ${result.amount.toFixed(2)}. You can start work and submit it for review.`);
  } catch (err) {
    if (err instanceof LedgerReplayError) {
      return { success: false, error: "That funding has already been recorded." };
    }
    console.error("fundPaymentStage failed:", err);
    return { success: false, error: "Could not fund the payment stage." };
  }

  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, stages: await getPaymentStages(projectId) };
}

/** Hired freelancer submits a funded stage for review. */
export async function submitPaymentStage(projectId: string, stageId: string, note?: string) {
  const actor = await requireHiredFreelancer(projectId);
  if (!actor.ok) return { success: false, error: actor.error };

  const result = await inFinancialTransaction(async (tx) => {
    const item = await lockPaymentItem(tx, stageId, projectId);
    if (!item) return { success: false as const, error: "Stage not found." };

    const snapshot = toSnapshot(item);
    const rule = checkSubmit(snapshot, actor.data.applicationId);
    if (!rule.ok) return { success: false as const, error: rule.error! };

    const move = assertTransition(snapshot.status, "SUBMITTED");
    if (!move.ok) return { success: false as const, error: move.error! };

    await tx.paymentItem.update({
      where: { id: item.id },
      data: { status: "SUBMITTED", submissionNote: note || "", submittedAt: new Date() },
    });
    return { success: true as const, title: item.title, projectId };
  });

  if (!result.success) return result;

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { title: true, company: { select: { userId: true } } },
  });
  if (project) {
    await db.notification.create({
      data: {
        userId: project.company.userId,
        title: "Stage submitted for review",
        message: `A freelancer submitted "${result.title}" on "${project.title}" for your review.`,
      },
    });
  }

  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, stages: await getPaymentStages(projectId) };
}

/** Company approves a submitted stage, or sends it back for changes. */
export async function reviewPaymentStage(
  projectId: string,
  stageId: string,
  approve: boolean,
  reviewNote?: string
) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) return { success: false, error: owned.error };

  const result = await inFinancialTransaction(async (tx) => {
    const item = await lockPaymentItem(tx, stageId, projectId);
    if (!item) return { success: false as const, error: "Stage not found." };

    const snapshot = toSnapshot(item);
    const rule = checkReview(snapshot, approve);
    if (!rule.ok) return { success: false as const, error: rule.error! };

    // COMP-004 — a rejected stage is now distinguishable from one that was
    // never submitted, carries the reason, and consumes a revision.
    const nextStatus = approve ? "APPROVED" : "CHANGES_REQUESTED";
    const move = assertTransition(snapshot.status, nextStatus);
    if (!move.ok) return { success: false as const, error: move.error! };

    await tx.paymentItem.update({
      where: { id: item.id },
      data: {
        status: nextStatus,
        reviewNote: approve ? null : reviewNote || "",
        reviewedAt: new Date(),
        revisionCount: approve ? item.revisionCount : item.revisionCount + 1,
      },
    });
    return { success: true as const, applicationId: item.applicationId, title: item.title };
  });

  if (!result.success) return result;

  await notifyFreelancer(
    result.applicationId,
    approve ? "Stage approved" : "Changes requested",
    approve
      ? `"${result.title}" was approved. Payment can now be released.`
      : `"${result.title}" was sent back for changes.${reviewNote ? ` Note: ${reviewNote}` : ""}`
  );

  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, stages: await getPaymentStages(projectId) };
}

/**
 * Company releases an approved stage.
 * COMP-003 — omitting `amount` releases the full outstanding balance, which is
 * the previous behaviour; a partial release is now expressible.
 */
export async function releasePaymentStage(projectId: string, stageId: string, amount?: number) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) return { success: false, error: owned.error };

  try {
    const result = await inFinancialTransaction(async (tx) => {
      const item = await lockPaymentItem(tx, stageId, projectId);
      if (!item) return { success: false as const, error: "Stage not found." };

      const snapshot = toSnapshot(item);
      const check = checkRelease(snapshot, amount == null ? undefined : D(amount));
      if (!check.ok) return { success: false as const, error: check.error };

      const nextReleased = snapshot.releasedAmount.plus(check.amount);
      const fullyReleased = nextReleased.gte(snapshot.amount);

      await appendLedger(tx, {
        projectId,
        applicationId: item.applicationId,
        paymentItemId: item.id,
        type: "RELEASE",
        amount: check.amount,
        currency: item.currency,
        actorUserId: owned.data.userId,
        idempotencyKey: transitionKey("item", item.id, "release", nextReleased.toFixed(2)),
      });

      await tx.paymentItem.update({
        where: { id: item.id },
        data: {
          releasedAmount: nextReleased,
          status: fullyReleased ? "RELEASED" : "APPROVED",
          releasedAt: fullyReleased ? new Date() : null,
        },
      });
      return {
        success: true as const,
        applicationId: item.applicationId,
        title: item.title,
        amount: check.amount,
        currency: item.currency,
      };
    });

    if (!result.success) return result;

    await notifyFreelancer(
      result.applicationId,
      "Payment released",
      `${result.currency} ${result.amount.toFixed(2)} was released for "${result.title}".`
    );
  } catch (err) {
    if (err instanceof LedgerReplayError) {
      return { success: false, error: "This release has already been recorded." };
    }
    console.error("releasePaymentStage failed:", err);
    return { success: false, error: "Could not release the payment." };
  }

  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, stages: await getPaymentStages(projectId) };
}

/** COMP-005 — notify the freelancer behind an application. */
async function notifyFreelancer(applicationId: string, title: string, message: string) {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { freelancer: { select: { userId: true } } },
  });
  if (!app) return;
  await db.notification.create({
    data: { userId: app.freelancer.userId, title, message },
  });
}
