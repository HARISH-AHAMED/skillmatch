/**
 * Reputation aggregates, derived from the reviews that are currently visible.
 *
 * These scores used to be computed inline at the two places a review is
 * submitted, and nowhere else. Two consequences followed:
 *
 *   1. Hidden reviews still counted. The moderation module states that a hidden
 *      review is withheld "from the ratings computed over them", and the
 *      display queries honour that — but the stored aggregates never did, and
 *      hiding a review recomputed nothing. A review hidden for abuse kept
 *      dragging the score until some unrelated review happened to recalculate,
 *      at which point it was excluded and the number jumped.
 *   2. The arithmetic lived in two places and could drift.
 *
 * Everything is derived from the review rows, so a score is always a function
 * of what is visible right now rather than an accumulator that remembers
 * things it should have forgotten.
 */

import { db } from "@/lib/db";
import { ProjectStatus } from "@prisma/client";
import {
  parseFreelancerMetadata,
  serializeFreelancerMetadata,
  getFreelancerBioText,
} from "@/lib/workflowHelpers";

/** Only reviews that have not been hidden by an administrator count. */
const VISIBLE = { hiddenAt: null } as const;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, v) => total + v, 0) / values.length;
}

/** One decimal place, the precision the freelancer rating column carries. */
function toRating(values: number[]): number {
  return Math.round(average(values) * 10) / 10;
}

/** A percentage bounded to 0–100, the precision the company columns carry. */
function toPercent(value: number, outOf: number): number {
  if (outOf <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / outOf) * 100)));
}

/**
 * DATA-005 — completed projects, derived rather than accumulated, so repeated
 * reviews cannot inflate it and an unreviewed completion is not lost.
 */
export async function countCompletedProjects(freelancerId: string): Promise<number> {
  return db.application.count({
    where: {
      freelancerId,
      status: "HIRED",
      isApprentice: false,
      project: { status: ProjectStatus.COMPLETED },
    },
  });
}

/**
 * Recompute a freelancer's rating and completed-project count.
 *
 * Apprentice work is scored separately: reviews earned while shadowing a role
 * must not move the primary rating. The split is derived from the existing
 * Application.isApprentice flag, so there is no second score store.
 */
export async function recomputeFreelancerReputation(freelancerId: string): Promise<void> {
  const freelancer = await db.freelancer.findUnique({
    where: { id: freelancerId },
    select: { id: true, userId: true, bio: true },
  });
  if (!freelancer) return;

  const [apprenticeApps, visibleReviews] = await Promise.all([
    db.application.findMany({
      where: { freelancerId, isApprentice: true },
      select: { projectId: true },
    }),
    db.review.findMany({
      where: { revieweeId: freelancer.userId, ...VISIBLE },
      select: { rating: true, projectId: true },
    }),
  ]);

  const apprenticeProjectIds = new Set(apprenticeApps.map((a) => a.projectId));
  const primary = visibleReviews.filter((r) => !apprenticeProjectIds.has(r.projectId));

  // Persist the apprentice aggregate so other surfaces can reuse it without
  // recomputing. Written only when apprentice work exists, so freelancers with
  // no apprentice history keep an untouched bio.
  if (apprenticeProjectIds.size > 0) {
    const apprentice = visibleReviews.filter((r) => apprenticeProjectIds.has(r.projectId));
    const meta = parseFreelancerMetadata(freelancer.bio);
    meta.apprenticeScore = {
      rating: toRating(apprentice.map((r) => r.rating)),
      reviews: apprentice.length,
      updatedAt: new Date().toISOString(),
    };
    await db.freelancer.update({
      where: { id: freelancer.id },
      data: { bio: serializeFreelancerMetadata(getFreelancerBioText(freelancer.bio), meta) },
    });
  }

  await db.freelancer.update({
    where: { id: freelancer.id },
    data: {
      // With every review hidden the rating returns to zero rather than
      // keeping the last value computed from reviews nobody can see.
      rating: toRating(primary.map((r) => r.rating)),
      completedProjects: await countCompletedProjects(freelancer.id),
    },
  });
}

/**
 * Recompute a company's trust, reputation and payment-reliability scores.
 *
 * A review that carries no sub-scores contributes its own overall rating to
 * each of them. The submit path used to substitute the *incoming* review's
 * rating for every such row, which made the result depend on which review
 * happened to trigger the recalculation.
 */
export async function recomputeCompanyReputation(companyId: string): Promise<void> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, userId: true },
  });
  if (!company) return;

  const reviews = await db.review.findMany({
    where: { revieweeId: company.userId, ...VISIBLE },
    select: {
      rating: true,
      communicationScore: true,
      paymentReliabilityScore: true,
      projectClarityScore: true,
    },
  });

  if (reviews.length === 0) return;

  const avgRating = average(reviews.map((r) => r.rating));
  const avgComm = average(reviews.map((r) => r.communicationScore ?? r.rating));
  const avgPayment = average(reviews.map((r) => r.paymentReliabilityScore ?? r.rating));
  const avgClarity = average(reviews.map((r) => r.projectClarityScore ?? r.rating));

  await db.company.update({
    where: { id: company.id },
    data: {
      // Three five-point sub-scores, so the denominator is 15.
      trustScore: toPercent(avgComm + avgPayment + avgClarity, 15),
      reputationScore: toPercent(avgRating, 5),
      paymentReliability: toPercent(avgPayment, 5),
    },
  });
}

/**
 * Recompute whichever profile a review points at. Used by moderation, where
 * the reviewee may be either side of the marketplace.
 */
export async function recomputeReputationFor(revieweeUserId: string): Promise<void> {
  const [freelancer, company] = await Promise.all([
    db.freelancer.findUnique({ where: { userId: revieweeUserId }, select: { id: true } }),
    db.company.findUnique({ where: { userId: revieweeUserId }, select: { id: true } }),
  ]);

  if (freelancer) await recomputeFreelancerReputation(freelancer.id);
  if (company) await recomputeCompanyReputation(company.id);
}
