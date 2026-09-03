import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDbMock, sessionState, setSession, signedOut, ADMIN, COMPANY_A } from "./helpers/mocks";

/**
 * D-01 — hidden reviews were withheld from the lists that render them but not
 * from the stored aggregates, and hiding a review recomputed nothing. A review
 * hidden for abuse kept dragging the score until some unrelated review happened
 * to recalculate, at which point it silently dropped out and the number jumped.
 */

const db = createDbMock();
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/data/server/cache", () => ({
  CACHE_TAGS: { freelancers: "f", companies: "c", projects: "p", stats: "s" },
  invalidatePublic: vi.fn(),
}));

const { recomputeFreelancerReputation, recomputeCompanyReputation, recomputeReputationFor } =
  await import("@/lib/reputation");
const { hideReview, restoreReview } = await import("@/actions/reviewModerationActions");

beforeEach(() => {
  Object.values(db).forEach((m: any) => {
    if (typeof m === "function") m.mockReset?.();
    else Object.values(m).forEach((f: any) => f.mockReset?.());
  });
  signedOut();
  db.freelancer.update.mockResolvedValue({});
  db.company.update.mockResolvedValue({});
  db.review.update.mockResolvedValue({});
});

describe("D-01: freelancer rating excludes hidden reviews", () => {
  it("averages only the visible reviews and derives the project count", async () => {
    db.freelancer.findUnique.mockResolvedValue({ id: "f1", userId: "u1", bio: "Bio" });
    db.application.findMany.mockResolvedValue([]); // no apprentice work
    db.review.findMany.mockResolvedValue([
      { rating: 5, projectId: "p1" },
      { rating: 4, projectId: "p2" },
    ]);
    db.application.count.mockResolvedValue(2);

    await recomputeFreelancerReputation("f1");

    // The query itself must exclude hidden rows.
    expect(db.review.findMany.mock.calls[0][0].where.hiddenAt).toBeNull();

    const data = db.freelancer.update.mock.calls.at(-1)[0].data;
    expect(data.rating).toBe(4.5);
    expect(data.completedProjects).toBe(2);
  });

  it("returns the rating to zero when every review is hidden", async () => {
    db.freelancer.findUnique.mockResolvedValue({ id: "f1", userId: "u1", bio: "Bio" });
    db.application.findMany.mockResolvedValue([]);
    db.review.findMany.mockResolvedValue([]);
    db.application.count.mockResolvedValue(0);

    await recomputeFreelancerReputation("f1");
    const data = db.freelancer.update.mock.calls.at(-1)[0].data;
    // Not the last value computed from reviews nobody can see.
    expect(data.rating).toBe(0);
  });

  it("keeps apprentice reviews out of the primary rating", async () => {
    db.freelancer.findUnique.mockResolvedValue({ id: "f1", userId: "u1", bio: "Bio" });
    db.application.findMany.mockResolvedValue([{ projectId: "p-appr" }]);
    db.review.findMany.mockResolvedValue([
      { rating: 5, projectId: "p1" },
      { rating: 1, projectId: "p-appr" }, // apprentice work
    ]);
    db.application.count.mockResolvedValue(1);

    await recomputeFreelancerReputation("f1");

    const ratingWrite = db.freelancer.update.mock.calls.find((c: any) => c[0].data.rating !== undefined);
    expect(ratingWrite[0].data.rating).toBe(5);

    // The apprentice aggregate is persisted separately.
    const bioWrite = db.freelancer.update.mock.calls.find((c: any) => c[0].data.bio !== undefined);
    expect(bioWrite[0].data.bio).toContain('"rating":1');
  });

  it("does not touch the bio of a freelancer with no apprentice history", async () => {
    db.freelancer.findUnique.mockResolvedValue({ id: "f1", userId: "u1", bio: "Bio" });
    db.application.findMany.mockResolvedValue([]);
    db.review.findMany.mockResolvedValue([{ rating: 4, projectId: "p1" }]);
    db.application.count.mockResolvedValue(1);

    await recomputeFreelancerReputation("f1");
    expect(db.freelancer.update.mock.calls.every((c: any) => c[0].data.bio === undefined)).toBe(true);
  });

  it("no-ops on a missing freelancer", async () => {
    db.freelancer.findUnique.mockResolvedValue(null);
    await recomputeFreelancerReputation("gone");
    expect(db.freelancer.update).not.toHaveBeenCalled();
  });
});

describe("D-01: company scores exclude hidden reviews", () => {
  it("computes trust, reputation and payment reliability from visible reviews", async () => {
    db.company.findUnique.mockResolvedValue({ id: "c1", userId: "cu1" });
    db.review.findMany.mockResolvedValue([
      { rating: 5, communicationScore: 5, paymentReliabilityScore: 5, projectClarityScore: 5 },
      { rating: 3, communicationScore: 3, paymentReliabilityScore: 3, projectClarityScore: 3 },
    ]);

    await recomputeCompanyReputation("c1");
    expect(db.review.findMany.mock.calls[0][0].where.hiddenAt).toBeNull();

    const data = db.company.update.mock.calls[0][0].data;
    // avg sub-scores are 4 each → 12/15 = 80%.
    expect(data.trustScore).toBe(80);
    // avg rating 4 / 5 = 80%.
    expect(data.reputationScore).toBe(80);
    expect(data.paymentReliability).toBe(80);
  });

  it("falls back to a review's own rating when sub-scores are absent", async () => {
    db.company.findUnique.mockResolvedValue({ id: "c1", userId: "cu1" });
    db.review.findMany.mockResolvedValue([
      { rating: 2, communicationScore: null, paymentReliabilityScore: null, projectClarityScore: null },
    ]);

    await recomputeCompanyReputation("c1");
    const data = db.company.update.mock.calls[0][0].data;
    // 2/5 = 40% on every axis — independent of which review triggered this.
    expect(data.trustScore).toBe(40);
    expect(data.reputationScore).toBe(40);
  });

  it("caps every score at 100 and never goes negative", async () => {
    db.company.findUnique.mockResolvedValue({ id: "c1", userId: "cu1" });
    db.review.findMany.mockResolvedValue([
      { rating: 5, communicationScore: 5, paymentReliabilityScore: 5, projectClarityScore: 5 },
    ]);
    await recomputeCompanyReputation("c1");
    const data = db.company.update.mock.calls[0][0].data;
    expect(data.trustScore).toBe(100);
    expect(data.reputationScore).toBe(100);
  });

  it("leaves the existing scores alone when no visible review remains", async () => {
    db.company.findUnique.mockResolvedValue({ id: "c1", userId: "cu1" });
    db.review.findMany.mockResolvedValue([]);
    await recomputeCompanyReputation("c1");
    expect(db.company.update).not.toHaveBeenCalled();
  });
});

describe("D-01: moderation recomputes, and is admin-only", () => {
  function arrangeReview() {
    db.review.findUnique.mockResolvedValue({ id: "r1", revieweeId: "u1" });
    db.freelancer.findUnique.mockResolvedValue({ id: "f1", userId: "u1", bio: "Bio" });
    db.company.findUnique.mockResolvedValue(null);
    db.application.findMany.mockResolvedValue([]);
    db.review.findMany.mockResolvedValue([{ rating: 4, projectId: "p1" }]);
    db.application.count.mockResolvedValue(1);
  }

  it("hiding a review recomputes the reviewee's score", async () => {
    setSession(ADMIN);
    arrangeReview();

    const res = await hideReview("r1", "Abusive language");
    expect(res.success).toBe(true);
    expect(db.review.update.mock.calls[0][0].data.hiddenAt).toBeInstanceOf(Date);
    // The aggregate is refreshed in the same call, not left until some later review.
    expect(db.freelancer.update).toHaveBeenCalled();
  });

  it("restoring a review recomputes symmetrically", async () => {
    setSession(ADMIN);
    arrangeReview();

    const res = await restoreReview("r1");
    expect(res.success).toBe(true);
    expect(db.review.update.mock.calls[0][0].data.hiddenAt).toBeNull();
    expect(db.freelancer.update).toHaveBeenCalled();
  });

  it("requires a reason to hide", async () => {
    setSession(ADMIN);
    arrangeReview();
    const res = await hideReview("r1", "   ");
    expect(res.success).toBe(false);
    expect(db.review.update).not.toHaveBeenCalled();
    expect(db.freelancer.update).not.toHaveBeenCalled();
  });

  it("refuses a non-admin", async () => {
    setSession(COMPANY_A);
    arrangeReview();
    expect((await hideReview("r1", "reason")).success).toBe(false);
    expect((await restoreReview("r1")).success).toBe(false);
    expect(db.review.update).not.toHaveBeenCalled();
  });

  it("refuses an anonymous caller", async () => {
    arrangeReview();
    expect((await hideReview("r1", "reason")).success).toBe(false);
  });

  it("reports a review that no longer exists", async () => {
    setSession(ADMIN);
    db.review.findUnique.mockResolvedValue(null);
    const res = await hideReview("gone", "reason");
    expect(res.success).toBe(false);
    expect(db.review.update).not.toHaveBeenCalled();
  });

  it("recomputes whichever side of the marketplace the reviewee is", async () => {
    db.freelancer.findUnique.mockResolvedValue(null);
    db.company.findUnique.mockResolvedValue({ id: "c1", userId: "cu1" });
    db.review.findMany.mockResolvedValue([
      { rating: 4, communicationScore: 4, paymentReliabilityScore: 4, projectClarityScore: 4 },
    ]);

    await recomputeReputationFor("cu1");
    expect(db.company.update).toHaveBeenCalled();
    expect(db.freelancer.update).not.toHaveBeenCalled();
  });
});
