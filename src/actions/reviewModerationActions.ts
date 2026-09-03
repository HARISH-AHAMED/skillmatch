"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { CACHE_TAGS, invalidatePublic } from "@/data/server/cache";
import { recomputeReputationFor } from "@/lib/reputation";

/* ============================================================================
   REVIEW MODERATION

   The admin console offered "hide" and "restore" controls that only edited a
   list in the browser: the toast said the review no longer appeared on public
   profiles, and nothing was written anywhere.

   Hiding never deletes the row. The record stays auditable — who hid it, when,
   and why — and can be restored. Hidden reviews are withheld from public
   profiles and from the ratings computed over them.
   ========================================================================= */

export type ModerationResult = { success: boolean; error?: string };

/**
 * Hide a review from public view, recording the administrator and the reason.
 * A reason is required: a moderation record without one cannot be reviewed
 * later by anybody, including the administrator who made it.
 */
export async function hideReview(reviewId: string, reason: string): Promise<ModerationResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const trimmed = reason.trim();
  if (!trimmed) {
    return { success: false, error: "Give a reason for hiding this review." };
  }

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, revieweeId: true },
  });
  if (!review) return { success: false, error: "That review no longer exists." };

  await db.review.update({
    where: { id: reviewId },
    data: {
      hiddenAt: new Date(),
      hiddenReason: trimmed,
      hiddenById: admin.data.userId,
    },
  });

  /**
   * Hiding withheld the review from the lists that render it but recomputed
   * nothing, so the score it had already been folded into kept carrying it —
   * until some unrelated review happened to recalculate, at which point it
   * silently dropped out. The aggregate is refreshed here, so the documented
   * behaviour and the stored number agree immediately.
   */
  await recomputeReputationFor(review.revieweeId);

  revalidatePath("/admin/reviews");
  // Profiles and directories render reviews and the scores drawn from them.
  invalidatePublic(CACHE_TAGS.freelancers, CACHE_TAGS.companies);

  return { success: true };
}

/** Put a hidden review back on public profiles, clearing the moderation record. */
export async function restoreReview(reviewId: string): Promise<ModerationResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, revieweeId: true },
  });
  if (!review) return { success: false, error: "That review no longer exists." };

  await db.review.update({
    where: { id: reviewId },
    data: { hiddenAt: null, hiddenReason: null, hiddenById: null },
  });

  // Restoring folds it back into the score, symmetrically with hiding.
  await recomputeReputationFor(review.revieweeId);

  revalidatePath("/admin/reviews");
  invalidatePublic(CACHE_TAGS.freelancers, CACHE_TAGS.companies);

  return { success: true };
}
