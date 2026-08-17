import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const db = { $transaction: vi.fn() };
vi.mock("@/lib/db", () => ({ db }));

const { appendLedger, LedgerReplayError, sumAmounts, sumFunded } = await import("@/lib/payments");

const D = (v: any) => new Prisma.Decimal(v);

function txWithCreate(impl: (args: any) => any) {
  return { paymentTransaction: { create: vi.fn(impl) } } as any;
}

const base = {
  projectId: "p1",
  applicationId: "a1",
  currency: "USD",
  actorUserId: "u1",
  idempotencyKey: "item:i1:release:1000.00",
};

beforeEach(() => vi.clearAllMocks());

/**
 * ARCH-001 — the ledger's unique idempotencyKey is what closes the
 * double-release race. A status check alone cannot: two concurrent callers both
 * read the same pre-state, both see a valid transition, and both proceed.
 */
describe("ledger idempotency", () => {
  it("rejects a replayed key as LedgerReplayError, not a raw Prisma error", async () => {
    const seen = new Set<string>();
    const tx = txWithCreate(({ data }: any) => {
      if (seen.has(data.idempotencyKey)) {
        const err: any = new Error("Unique constraint failed");
        err.code = "P2002";
        throw err;
      }
      seen.add(data.idempotencyKey);
      return { id: "tx1", ...data };
    });

    await appendLedger(tx, { ...base, type: "RELEASE", amount: D(1000) });
    // A double-clicked release derives the same key and must not create a
    // second movement.
    await expect(
      appendLedger(tx, { ...base, type: "RELEASE", amount: D(1000) })
    ).rejects.toBeInstanceOf(LedgerReplayError);

    expect(tx.paymentTransaction.create).toHaveBeenCalledTimes(2);
    expect(seen.size).toBe(1);
  });

  it("allows a genuinely different operation through", async () => {
    const seen = new Set<string>();
    const tx = txWithCreate(({ data }: any) => {
      if (seen.has(data.idempotencyKey)) {
        const err: any = new Error("dup");
        err.code = "P2002";
        throw err;
      }
      seen.add(data.idempotencyKey);
      return { id: "tx", ...data };
    });

    await appendLedger(tx, { ...base, type: "FUND", amount: D(500), idempotencyKey: "item:i1:fund:500.00" });
    await appendLedger(tx, { ...base, type: "FUND", amount: D(500), idempotencyKey: "item:i1:fund:1000.00" });
    expect(seen.size).toBe(2);
  });

  it("does not swallow errors that are not unique-constraint violations", async () => {
    const tx = txWithCreate(() => {
      throw new Error("connection lost");
    });
    await expect(
      appendLedger(tx, { ...base, type: "RELEASE", amount: D(10) })
    ).rejects.toThrow("connection lost");
  });

  it("signs the amount from the entry type", async () => {
    const captured: any[] = [];
    const tx = txWithCreate(({ data }: any) => {
      captured.push(data);
      return { id: "tx", ...data };
    });

    await appendLedger(tx, { ...base, type: "FUND", amount: D(100), idempotencyKey: "k1" });
    await appendLedger(tx, { ...base, type: "RELEASE", amount: D(100), idempotencyKey: "k2" });
    await appendLedger(tx, { ...base, type: "REFUND", amount: D(100), idempotencyKey: "k3" });

    expect(captured[0].amount.toFixed(2)).toBe("100.00"); // funds in
    expect(captured[1].amount.toFixed(2)).toBe("-100.00"); // value out
    expect(captured[2].amount.toFixed(2)).toBe("100.00"); // returned
  });

  it("is append-only — no update or delete path is exposed", async () => {
    const tx = txWithCreate(({ data }: any) => ({ id: "tx", ...data }));
    await appendLedger(tx, { ...base, type: "FUND", amount: D(1) });
    expect(Object.keys(tx.paymentTransaction)).toEqual(["create"]);
  });
});

describe("aggregate helpers", () => {
  it("sums amounts excluding the item being edited", () => {
    const items = [
      { id: "a", amount: D(100) },
      { id: "b", amount: D(250) },
      { id: "c", amount: D(50) },
    ];
    expect(sumAmounts(items).toFixed(2)).toBe("400.00");
    expect(sumAmounts(items, "b").toFixed(2)).toBe("150.00");
  });

  it("sums funded amounts across items", () => {
    expect(
      sumFunded([{ fundedAmount: D("10.10") }, { fundedAmount: D("20.20") }]).toFixed(2)
    ).toBe("30.30");
  });
});
