/**
 * Transactional plumbing for financial mutations.
 *
 * ARCH-001 — replaces the read-JSON → mutate-in-memory → write-whole-column
 * pattern, where two concurrent operations both read the same JSON and the
 * second write silently discarded the first.
 *
 * Every mutation follows one shape:
 *   1. Lock the target row (SELECT … FOR UPDATE) inside an interactive
 *      transaction, so a concurrent mutation on the same item blocks until
 *      commit rather than racing.
 *   2. Validate against the freshly-locked state, never a stale read.
 *   3. Append a ledger entry whose unique idempotencyKey rejects replays.
 *   4. Update the cached aggregate in the same transaction.
 *
 * Generalises the one correct precedent already in the codebase,
 * saveProjectRoles (roleActions.ts).
 */

import { Prisma, LedgerEntryType } from "@prisma/client";
import { db } from "@/lib/db";
import { D, type Dec } from "@/lib/paymentRules";

export type Tx = Prisma.TransactionClient;

/** Postgres unique-violation code — how a replayed idempotencyKey surfaces. */
const UNIQUE_VIOLATION = "P2002";

export class LedgerReplayError extends Error {
  constructor() {
    super("This operation has already been recorded.");
    this.name = "LedgerReplayError";
  }
}

/**
 * Row-level lock on a payment item, scoped to its project.
 *
 * FOR UPDATE is preferred over a Serializable transaction here: the contended
 * set is a single row, so it needs no retry loop. Returning null covers both
 * "no such item" and "not in this project" — the caller must not distinguish
 * them (record scoping, per the Phase 1 Class B sweep).
 */
export async function lockPaymentItem(tx: Tx, itemId: string, projectId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "PaymentItem"
    WHERE "id" = ${itemId} AND "projectId" = ${projectId}
    FOR UPDATE`;
  if (rows.length === 0) return null;
  return tx.paymentItem.findUnique({ where: { id: itemId } });
}

/** Locks every payment item on a project, for aggregate checks against budget. */
export async function lockProjectItems(tx: Tx, projectId: string) {
  await tx.$queryRaw`
    SELECT "id" FROM "PaymentItem" WHERE "projectId" = ${projectId} FOR UPDATE`;
  return tx.paymentItem.findMany({ where: { projectId } });
}

export interface LedgerInput {
  projectId: string;
  applicationId: string;
  paymentItemId?: string | null;
  workLogId?: string | null;
  stipendPeriodId?: string | null;
  type: LedgerEntryType;
  /** Unsigned magnitude; the sign is applied from `type`. */
  amount: Dec;
  currency: string;
  actorUserId: string;
  idempotencyKey: string;
  note?: string;
}

/**
 * Append one ledger entry. Never updates, never deletes — a correction is a new
 * compensating entry.
 *
 * Throws LedgerReplayError when the idempotency key already exists, which is
 * how a double-submitted mutation is rejected even if both callers read the
 * same pre-state.
 */
export async function appendLedger(tx: Tx, input: LedgerInput) {
  // RELEASE moves value out; FUND and REFUND move it in.
  const signed = input.type === "RELEASE" ? input.amount.negated() : input.amount;
  try {
    return await tx.paymentTransaction.create({
      data: {
        projectId: input.projectId,
        applicationId: input.applicationId,
        paymentItemId: input.paymentItemId ?? null,
        workLogId: input.workLogId ?? null,
        stipendPeriodId: input.stipendPeriodId ?? null,
        type: input.type,
        amount: signed,
        currency: input.currency,
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        note: input.note,
      },
    });
  } catch (err: any) {
    if (err?.code === UNIQUE_VIOLATION) throw new LedgerReplayError();
    throw err;
  }
}

/** Runs a financial mutation inside a transaction with a sane timeout. */
export async function inFinancialTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.$transaction(fn, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    timeout: 10_000,
  });
}

/** Sum of an item list's amounts, excluding one id (for edit-in-place checks). */
export function sumAmounts(items: { id: string; amount: Prisma.Decimal }[], excludeId?: string): Dec {
  return items
    .filter((i) => i.id !== excludeId)
    .reduce((total, i) => total.plus(i.amount), D(0));
}

export function sumFunded(items: { fundedAmount: Prisma.Decimal }[]): Dec {
  return items.reduce((total, i) => total.plus(i.fundedAmount), D(0));
}

/**
 * Reconciliation: the cached aggregates on PaymentItem must always equal the
 * ledger's view. Exposed so a test can assert it rather than letting drift
 * silently become the new truth.
 */
export async function reconcileItem(itemId: string) {
  const [item, entries] = await Promise.all([
    db.paymentItem.findUnique({ where: { id: itemId } }),
    db.paymentTransaction.findMany({ where: { paymentItemId: itemId } }),
  ]);
  if (!item) return null;
  const funded = entries
    .filter((e) => e.type === "FUND")
    .reduce((t, e) => t.plus(e.amount), D(0));
  const released = entries
    .filter((e) => e.type === "RELEASE")
    .reduce((t, e) => t.plus(e.amount.abs()), D(0));
  return {
    itemId,
    cachedFunded: item.fundedAmount,
    ledgerFunded: funded,
    cachedReleased: item.releasedAmount,
    ledgerReleased: released,
    consistent: item.fundedAmount.equals(funded) && item.releasedAmount.equals(released),
  };
}
