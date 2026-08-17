/**
 * Pure financial business rules — no database, no session, no I/O.
 *
 * These are the rules the JSON-era code already enforced correctly and that the
 * storage migration must carry across verbatim (budget caps,
 * no-shrink-below-committed, no-release-before-funded, no-double-release,
 * per-application isolation), plus the specific gaps the audit identified.
 *
 * Keeping them pure means the money logic is testable without standing up a
 * database, and the transactional wrapper in payments.ts stays thin enough to
 * read in one sitting.
 */

import { Prisma } from "@prisma/client";

export type Dec = Prisma.Decimal;
export const D = (v: Prisma.Decimal.Value): Dec => new Prisma.Decimal(v);
export const ZERO = () => D(0);

export type ItemStatus =
  | "PENDING"
  | "FUNDED"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "RELEASED"
  | "CANCELLED";

export interface RuleResult {
  ok: boolean;
  error?: string;
}

const ok: RuleResult = { ok: true };
const fail = (error: string): RuleResult => ({ ok: false, error });

/**
 * COMP-004 — how many times a deliverable may be sent back before the company
 * must either approve it or renegotiate. The constant already existed
 * (workflowHelpers.DELIVERABLE_REVISION_CAP) but was never enforced for
 * payment items.
 */
export const REVISION_CAP = 2;

/** Valid status transitions. Anything not listed here is rejected. */
const TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  PENDING: ["FUNDED", "CANCELLED"],
  FUNDED: ["FUNDED", "SUBMITTED", "CANCELLED"], // FUNDED->FUNDED = incremental top-up
  SUBMITTED: ["APPROVED", "CHANGES_REQUESTED"],
  CHANGES_REQUESTED: ["SUBMITTED", "FUNDED", "CANCELLED"],
  APPROVED: ["RELEASED"],
  RELEASED: [],
  CANCELLED: [],
};

export function assertTransition(from: ItemStatus, to: ItemStatus): RuleResult {
  if (!TRANSITIONS[from]?.includes(to)) {
    return fail(`Cannot move a ${from.toLowerCase().replace("_", " ")} item to ${to.toLowerCase().replace("_", " ")}.`);
  }
  return ok;
}

export interface ItemSnapshot {
  id: string;
  applicationId: string;
  amount: Dec;
  fundedAmount: Dec;
  releasedAmount: Dec;
  status: ItemStatus;
  revisionCount: number;
  currency: string;
}

/**
 * Creating or editing an item. Carried over unchanged from the JSON era:
 * the combined value of all items may never exceed the project budget, and an
 * item may never shrink below what it has already committed.
 */
export function checkSaveItem(params: {
  amount: Dec;
  title: string;
  currency: string;
  projectCurrency: string;
  projectBudget: Dec;
  otherItemsTotal: Dec;
  existing?: Pick<ItemSnapshot, "fundedAmount" | "releasedAmount" | "applicationId">;
  targetApplicationId: string;
}): RuleResult {
  const { amount, title, currency, projectCurrency, projectBudget, otherItemsTotal, existing } = params;

  if (!title?.trim()) return fail("Stage name is required.");
  if (!amount.isFinite() || amount.lte(0)) {
    return fail("Enter a stage amount greater than zero.");
  }
  // DATA-003 — an amount is meaningless without agreeing on its currency.
  if (currency !== projectCurrency) {
    return fail(`This project is denominated in ${projectCurrency}.`);
  }

  if (existing) {
    const committed = Prisma.Decimal.max(existing.fundedAmount, existing.releasedAmount);
    if (committed.gt(0) && existing.applicationId !== params.targetApplicationId) {
      return fail(
        "This stage already has money funded or released and cannot be reassigned to another freelancer."
      );
    }
    if (amount.lt(committed)) {
      return fail(
        `This stage already has ${committed.toFixed(2)} funded or released. The amount cannot be lowered below that.`
      );
    }
  }

  const projectedTotal = otherItemsTotal.plus(amount);
  if (projectedTotal.gt(projectBudget)) {
    return fail(
      `Payment stages would total ${projectedTotal.toFixed(2)}, which exceeds the project budget of ${projectBudget.toFixed(2)}.`
    );
  }
  return ok;
}

/** An item holding committed money cannot be deleted. */
export function checkDeleteItem(item: Pick<ItemSnapshot, "fundedAmount" | "releasedAmount">): RuleResult {
  const committed = Prisma.Decimal.max(item.fundedAmount, item.releasedAmount);
  if (committed.gt(0)) {
    return fail(
      `This stage already has ${committed.toFixed(2)} funded or released and cannot be deleted. Release or reverse the funds first.`
    );
  }
  return ok;
}

/**
 * Funding. Cannot exceed the item's own amount, nor the project budget in
 * aggregate, nor touch an already-released item.
 */
export function checkFund(params: {
  item: ItemSnapshot;
  value: Dec;
  projectBudget: Dec;
  projectFundedTotal: Dec;
}): RuleResult {
  const { item, value, projectBudget, projectFundedTotal } = params;

  if (!value.isFinite() || value.lte(0)) {
    return fail("Enter a funding amount greater than zero.");
  }
  if (item.status === "RELEASED") {
    return fail("This stage has already been released and cannot be funded again.");
  }
  if (item.status === "CANCELLED") {
    return fail("This stage has been cancelled.");
  }
  if (item.fundedAmount.plus(value).gt(item.amount)) {
    return fail(
      `Funding ${value.toFixed(2)} would exceed this stage's amount of ${item.amount.toFixed(2)}.`
    );
  }
  const remainingBudget = projectBudget.minus(projectFundedTotal);
  if (value.gt(remainingBudget)) {
    return fail(
      `Only ${remainingBudget.toFixed(2)} of the project budget remains available to fund.`
    );
  }
  return ok;
}

/** Only the assigned freelancer may submit, and only a funded item. */
export function checkSubmit(item: ItemSnapshot, callerApplicationId: string): RuleResult {
  if (item.applicationId !== callerApplicationId) {
    return fail("This payment stage belongs to another freelancer.");
  }
  if (item.status !== "FUNDED" && item.status !== "CHANGES_REQUESTED") {
    return fail("Only a funded stage can be submitted for review.");
  }
  return ok;
}

/** COMP-004 — approving, or sending back with a reason under a revision cap. */
export function checkReview(item: ItemSnapshot, approve: boolean): RuleResult {
  if (item.status !== "SUBMITTED") {
    return fail("Only a submitted stage can be reviewed.");
  }
  if (!approve && item.revisionCount >= REVISION_CAP) {
    return fail(
      `Revision limit reached (${REVISION_CAP} of ${REVISION_CAP} used). Approve the stage or agree new terms with the freelancer.`
    );
  }
  return ok;
}

/**
 * Release. Must be approved, fully funded, and never release more than remains.
 * COMP-003 — a partial release is now expressible; omitting `requested`
 * releases the full outstanding amount, which is the previous behaviour.
 */
export function checkRelease(item: ItemSnapshot, requested?: Dec): { ok: false; error: string } | { ok: true; amount: Dec } {
  if (item.status !== "APPROVED") {
    return { ok: false, error: "This stage must be approved before its payment can be released." };
  }
  if (item.fundedAmount.lt(item.amount)) {
    return {
      ok: false,
      error: `This stage is only funded to ${item.fundedAmount.toFixed(2)} of ${item.amount.toFixed(2)}. Fund it in full before releasing.`,
    };
  }
  const outstanding = item.amount.minus(item.releasedAmount);
  if (outstanding.lte(0)) {
    return { ok: false, error: "This stage has already been released in full." };
  }
  const amount = requested ?? outstanding;
  if (!amount.isFinite() || amount.lte(0)) {
    return { ok: false, error: "Enter a release amount greater than zero." };
  }
  if (amount.gt(outstanding)) {
    return { ok: false, error: `Only ${outstanding.toFixed(2)} remains to be released on this stage.` };
  }
  if (item.releasedAmount.plus(amount).gt(item.fundedAmount)) {
    return { ok: false, error: "Cannot release more than the amount funded for this stage." };
  }
  return { ok: true, amount };
}

/* ── Hourly ────────────────────────────────────────────────────────────────*/

/** A single day of logged work may not exceed this. Carried over unchanged. */
export const MAX_DAILY_HOURS = 16;

export function checkAddWorkLog(params: {
  hours: Dec;
  date: string;
  description: string;
  /** COMP-006 — cumulative hours were previously unbounded. */
  alreadyLoggedHours: Dec;
  maxHours?: number | null;
}): RuleResult {
  const { hours, date, description, alreadyLoggedHours, maxHours } = params;
  if (!hours.isFinite() || hours.lte(0)) {
    return fail("Enter a number of hours greater than zero.");
  }
  if (hours.gt(MAX_DAILY_HOURS)) {
    return fail(`A single work log cannot exceed ${MAX_DAILY_HOURS} hours.`);
  }
  if (!date) return fail("Select the date the work was done.");
  if (!description?.trim()) return fail("Describe the work briefly.");

  if (maxHours != null && alreadyLoggedHours.plus(hours).gt(maxHours)) {
    const remaining = D(maxHours).minus(alreadyLoggedHours);
    return fail(
      remaining.lte(0)
        ? `This engagement's ${maxHours}-hour limit has already been reached.`
        : `Only ${remaining.toFixed(2)} of the ${maxHours}-hour limit remains.`
    );
  }
  return ok;
}

/**
 * COMP-007 — payable value uses each log's own rateSnapshot, so changing the
 * project rate cannot retroactively reprice work that was already approved.
 * Per-application by construction (MF isolation).
 */
export function approvedHourlyValue(
  logs: { hours: Dec; rateSnapshot: Dec; status: string }[]
): Dec {
  return logs
    .filter((l) => l.status === "APPROVED")
    .reduce((total, l) => total.plus(l.hours.times(l.rateSnapshot)), ZERO());
}

export function checkHourlyRelease(params: {
  value: Dec;
  approvedValue: Dec;
  alreadyPaid: Dec;
}): RuleResult {
  const { value, approvedValue, alreadyPaid } = params;
  const remaining = approvedValue.minus(alreadyPaid);
  if (!value.isFinite() || value.lte(0)) {
    return fail("Enter a payment amount greater than zero.");
  }
  if (remaining.lte(0)) {
    return fail("This freelancer's approved work has already been paid in full.");
  }
  if (value.gt(remaining)) {
    return fail(`Only ${remaining.toFixed(2)} remains payable for this freelancer's approved work.`);
  }
  return ok;
}

/* ── Stipend ───────────────────────────────────────────────────────────────*/

/**
 * COMP-013 — the payable period count is now bounded. ONE_TIME has exactly one
 * period; otherwise the configured period count applies, defaulting to 1 rather
 * than to unlimited.
 */
export function maxStipendPeriods(frequency: string | null | undefined, configured?: number | null): number {
  if (frequency === "ONE_TIME") return 1;
  if (configured != null && Number.isInteger(configured) && configured > 0) return configured;
  return 1;
}

export function checkStipendRelease(params: {
  periodIndex: number;
  frequency: string | null | undefined;
  configuredPeriods?: number | null;
  amount: Dec;
  /** COMP-014 — cumulative stipend payouts were previously uncapped. */
  alreadyPaidTotal: Dec;
  projectBudget: Dec;
}): RuleResult {
  const { periodIndex, frequency, configuredPeriods, amount, alreadyPaidTotal, projectBudget } = params;

  if (!Number.isInteger(periodIndex) || periodIndex < 1) {
    return fail("Invalid payment period.");
  }
  const max = maxStipendPeriods(frequency, configuredPeriods);
  if (periodIndex > max) {
    return fail(
      max === 1
        ? "A one-time stipend has only a single payment period."
        : `This stipend has ${max} payment period(s).`
    );
  }
  if (!amount.isFinite() || amount.lte(0)) {
    return fail("This project has no stipend amount configured.");
  }
  if (alreadyPaidTotal.plus(amount).gt(projectBudget)) {
    const remaining = projectBudget.minus(alreadyPaidTotal);
    return fail(
      `Paying this period would exceed the project budget. Only ${remaining.toFixed(2)} remains.`
    );
  }
  return ok;
}

/**
 * Idempotency key for a state-transition mutation. A retried or double-clicked
 * operation derives the same key and is rejected by the ledger's unique index —
 * which a status check alone cannot do, because that check reads state a
 * concurrent transaction is changing.
 */
export function transitionKey(scope: string, id: string, operation: string, nonce?: string | number) {
  return nonce == null ? `${scope}:${id}:${operation}` : `${scope}:${id}:${operation}:${nonce}`;
}
