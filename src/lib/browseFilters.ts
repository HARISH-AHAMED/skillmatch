import type { Prisma } from "@prisma/client";

/**
 * PERF-002 — the browse screen used to fetch every matching project and then
 * drop the ones whose `paymentCategory`, parsed out of the description JSON,
 * did not match the reward filter. Compensation now lives in its own table, so
 * the same choice is expressed as a relation filter and resolved by the
 * database before any row is returned.
 *
 * Semantics are carried over unchanged:
 *   ALL           — no constraint.
 *   NON_MONETARY  — unpaid work only. The old code compared the metadata
 *                   category to "NON_MONETARY"; that value is stored as the
 *                   UNPAID compensation type.
 *   PAID          — anything cash-bearing, i.e. everything that is not unpaid.
 *                   A project with no compensation row is included, matching
 *                   the old `paymentCategory || "FIXED"` default.
 *
 * HYBRID was retired: it was a filter option the project wizard could not
 * produce and no project used, and `ProjectCompensation` has no way to
 * represent it (`normaliseType` maps it onto FIXED). Keeping the option would
 * have meant either returning every fixed-price project under it or returning
 * nothing — both worse than removing a dead control.
 */
export type RewardFilter = "ALL" | "PAID" | "NON_MONETARY";

export function rewardWhere(reward: string | undefined): Prisma.ProjectWhereInput | undefined {
  switch (reward) {
    case "NON_MONETARY":
      return { compensation: { is: { type: "UNPAID" } } };
    case "PAID":
      return {
        OR: [
          { compensation: { is: { type: { not: "UNPAID" } } } },
          // No compensation row: previously defaulted to FIXED, i.e. paid.
          { compensation: { is: null } },
        ],
      };
    default:
      // "ALL", absent, or any unrecognised value — unfiltered, as before.
      return undefined;
  }
}
