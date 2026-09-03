import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
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
  approvedHourlyValue,
  checkAddWorkLog,
  checkHourlyRelease,
  checkStipendRelease,
  maxStipendPeriods,
  REVISION_CAP,
  type ItemSnapshot,
} from "@/lib/paymentRules";

const item = (over: Partial<ItemSnapshot> = {}): ItemSnapshot => ({
  id: "item-1",
  applicationId: "app-1",
  amount: D(1000),
  fundedAmount: D(0),
  releasedAmount: D(0),
  status: "PENDING",
  revisionCount: 0,
  currency: "USD",
  ...over,
});

/** Rules carried over unchanged from the JSON era — these must not regress. */
describe("preserved business rules", () => {
  describe("budget cap", () => {
    it("refuses stages whose combined total exceeds the project budget", () => {
      const res = checkSaveItem({
        amount: D(600),
        title: "Stage",
        currency: "USD",
        projectCurrency: "USD",
        projectBudget: D(1000),
        otherItemsTotal: D(500),
        targetApplicationId: "app-1",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/exceeds the project budget/i);
    });

    it("allows a total exactly equal to the budget", () => {
      expect(
        checkSaveItem({
          amount: D(500),
          title: "Stage",
          currency: "USD",
          projectCurrency: "USD",
          projectBudget: D(1000),
          otherItemsTotal: D(500),
          targetApplicationId: "app-1",
        }).ok
      ).toBe(true);
    });

    it("caps funding at the remaining project budget", () => {
      const res = checkFund({
        item: item({ amount: D(1000) }),
        value: D(400),
        projectBudget: D(1000),
        projectFundedTotal: D(700),
      });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/300\.00 of the project budget remains/i);
    });
  });

  describe("no shrink below committed", () => {
    it("refuses lowering an amount below what is already funded", () => {
      const res = checkSaveItem({
        amount: D(100),
        title: "Stage",
        currency: "USD",
        projectCurrency: "USD",
        projectBudget: D(10_000),
        otherItemsTotal: D(0),
        existing: { fundedAmount: D(400), releasedAmount: D(0), applicationId: "app-1" },
        targetApplicationId: "app-1",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/cannot be lowered/i);
    });

    it("refuses reassigning a stage that already holds money", () => {
      const res = checkSaveItem({
        amount: D(1000),
        title: "Stage",
        currency: "USD",
        projectCurrency: "USD",
        projectBudget: D(10_000),
        otherItemsTotal: D(0),
        existing: { fundedAmount: D(400), releasedAmount: D(0), applicationId: "app-1" },
        targetApplicationId: "app-2",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/cannot be reassigned/i);
    });

    it("allows reassigning a stage holding no money", () => {
      expect(
        checkSaveItem({
          amount: D(1000),
          title: "Stage",
          currency: "USD",
          projectCurrency: "USD",
          projectBudget: D(10_000),
          otherItemsTotal: D(0),
          existing: { fundedAmount: D(0), releasedAmount: D(0), applicationId: "app-1" },
          targetApplicationId: "app-2",
        }).ok
      ).toBe(true);
    });

    it("refuses deleting a stage holding committed money", () => {
      expect(checkDeleteItem({ fundedAmount: D(50), releasedAmount: D(0) }).ok).toBe(false);
      expect(checkDeleteItem({ fundedAmount: D(0), releasedAmount: D(0) }).ok).toBe(true);
    });
  });

  describe("no release before funded, no double release", () => {
    it("refuses releasing a stage that is not approved", () => {
      const res = checkRelease(item({ status: "FUNDED", fundedAmount: D(1000) }));
      expect(res.ok).toBe(false);
    });

    it("refuses releasing a partially funded stage", () => {
      const res = checkRelease(item({ status: "APPROVED", fundedAmount: D(400) }));
      expect(res.ok).toBe(false);
      expect((res as any).error).toMatch(/fund it in full/i);
    });

    it("releases the full outstanding balance by default", () => {
      const res = checkRelease(item({ status: "APPROVED", fundedAmount: D(1000) }));
      expect(res.ok).toBe(true);
      expect((res as any).amount.toFixed(2)).toBe("1000.00");
    });

    it("refuses a second release once fully released", () => {
      const res = checkRelease(
        item({ status: "APPROVED", fundedAmount: D(1000), releasedAmount: D(1000) })
      );
      expect(res.ok).toBe(false);
      expect((res as any).error).toMatch(/already been released in full/i);
    });

    it("refuses releasing more than remains outstanding", () => {
      const res = checkRelease(
        item({ status: "APPROVED", fundedAmount: D(1000), releasedAmount: D(800) }),
        D(300)
      );
      expect(res.ok).toBe(false);
      expect((res as any).error).toMatch(/only 200\.00 remains/i);
    });

    // COMP-003 — partial release had no code path at all before.
    it("supports a partial release within the outstanding balance", () => {
      const res = checkRelease(item({ status: "APPROVED", fundedAmount: D(1000) }), D(250));
      expect(res.ok).toBe(true);
      expect((res as any).amount.toFixed(2)).toBe("250.00");
    });

    it("refuses funding an already-released stage", () => {
      const res = checkFund({
        item: item({ status: "RELEASED", amount: D(1000), fundedAmount: D(1000) }),
        value: D(10),
        projectBudget: D(10_000),
        projectFundedTotal: D(1000),
      });
      expect(res.ok).toBe(false);
    });
  });

  describe("per-application isolation", () => {
    it("refuses a freelancer submitting another freelancer's stage", () => {
      expect(checkSubmit(item({ applicationId: "app-1", status: "FUNDED" }), "app-2").ok).toBe(false);
      expect(checkSubmit(item({ applicationId: "app-1", status: "FUNDED" }), "app-1").ok).toBe(true);
    });

    it("computes approved hourly value only from the supplied application's logs", () => {
      // Callers pass logs already scoped by applicationId; this asserts the
      // rate-snapshot arithmetic rather than the filter.
      const value = approvedHourlyValue([
        { hours: D(3), rateSnapshot: D(50), status: "APPROVED" },
        { hours: D(2), rateSnapshot: D(50), status: "PENDING" },
        { hours: D(4), rateSnapshot: D(25), status: "REJECTED" },
      ]);
      expect(value.toFixed(2)).toBe("150.00");
    });
  });

  describe("currency consistency (DATA-003)", () => {
    it("refuses a stage denominated in a different currency to the project", () => {
      const res = checkSaveItem({
        amount: D(100),
        title: "Stage",
        currency: "EUR",
        projectCurrency: "USD",
        projectBudget: D(1000),
        otherItemsTotal: D(0),
        targetApplicationId: "app-1",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/denominated in USD/i);
    });
  });
});

/** Status machine — invalid transitions were previously unreachable-by-UI only. */
describe("status transitions", () => {
  it("permits the intended lifecycle", () => {
    expect(assertTransition("PENDING", "FUNDED").ok).toBe(true);
    expect(assertTransition("FUNDED", "SUBMITTED").ok).toBe(true);
    expect(assertTransition("SUBMITTED", "APPROVED").ok).toBe(true);
    expect(assertTransition("APPROVED", "RELEASED").ok).toBe(true);
  });

  it("refuses skipping funding, and refuses reviving a released item", () => {
    expect(assertTransition("PENDING", "RELEASED").ok).toBe(false);
    expect(assertTransition("PENDING", "APPROVED").ok).toBe(false);
    expect(assertTransition("RELEASED", "FUNDED").ok).toBe(false);
    expect(assertTransition("RELEASED", "SUBMITTED").ok).toBe(false);
    expect(assertTransition("CANCELLED", "FUNDED").ok).toBe(false);
  });

  it("allows a changes-requested item to be resubmitted", () => {
    expect(assertTransition("CHANGES_REQUESTED", "SUBMITTED").ok).toBe(true);
  });
});

/** COMP-004 — request-changes was previously indistinguishable from unsubmitted. */
describe("COMP-004: revision cap", () => {
  it("refuses reviewing anything not submitted", () => {
    expect(checkReview(item({ status: "FUNDED" }), true).ok).toBe(false);
  });

  it("allows changes to be requested up to the cap", () => {
    expect(checkReview(item({ status: "SUBMITTED", revisionCount: REVISION_CAP - 1 }), false).ok).toBe(true);
  });

  it("refuses a further revision beyond the cap, but still allows approval", () => {
    const atCap = item({ status: "SUBMITTED", revisionCount: REVISION_CAP });
    expect(checkReview(atCap, false).ok).toBe(false);
    expect(checkReview(atCap, true).ok).toBe(true);
  });
});

/** COMP-006 / COMP-009 — cumulative hours were unbounded; dates were unguarded. */
describe("hourly rules", () => {
  it("refuses a single log over the daily maximum", () => {
    const res = checkAddWorkLog({
      hours: D(17),
      date: "2026-08-17",
      description: "work",
      alreadyLoggedHours: D(0),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/cannot exceed 16 hours/i);
  });

  it("enforces the cumulative hour ceiling", () => {
    const res = checkAddWorkLog({
      hours: D(5),
      date: "2026-08-17",
      description: "work",
      alreadyLoggedHours: D(38),
      maxHours: 40,
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/only 2\.00 of the 40-hour limit remains/i);
  });

  it("allows logging when no ceiling is configured", () => {
    expect(
      checkAddWorkLog({
        hours: D(8),
        date: "2026-08-17",
        description: "work",
        alreadyLoggedHours: D(500),
      }).ok
    ).toBe(true);
  });

  it("refuses paying more than the approved-but-unpaid balance", () => {
    const res = checkHourlyRelease({ value: D(200), approvedValue: D(150), alreadyPaid: D(0) });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/only 150\.00 remains payable/i);
  });

  it("refuses paying when the balance is already settled", () => {
    const res = checkHourlyRelease({ value: D(10), approvedValue: D(150), alreadyPaid: D(150) });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/already been paid in full/i);
  });

  it("allows a partial payment of the outstanding balance", () => {
    expect(checkHourlyRelease({ value: D(50), approvedValue: D(150), alreadyPaid: D(0) }).ok).toBe(true);
  });

  /**
   * Hourly was the one model with no budget ceiling — stipend has COMP-014 and
   * stages have their own. Approved hours were the only bound, and an
   * engagement that configured no hour limit had no bound at all.
   */
  it("refuses a payment that would exceed the project budget", () => {
    const res = checkHourlyRelease({
      value: D(400),
      approvedValue: D(1000),
      alreadyPaid: D(0),
      projectBudget: D(1000),
      projectPaidTotal: D(800),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/only 200\.00 remains/i);
  });

  it("refuses any payment once the budget is exhausted", () => {
    const res = checkHourlyRelease({
      value: D(10),
      approvedValue: D(5000),
      alreadyPaid: D(0),
      projectBudget: D(1000),
      projectPaidTotal: D(1000),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/already been paid out in full/i);
  });

  it("allows a payment that fits inside the remaining budget", () => {
    expect(
      checkHourlyRelease({
        value: D(200),
        approvedValue: D(1000),
        alreadyPaid: D(0),
        projectBudget: D(1000),
        projectPaidTotal: D(800),
      }).ok
    ).toBe(true);
  });

  it("keeps the previous behaviour when no budget is supplied", () => {
    expect(checkHourlyRelease({ value: D(50), approvedValue: D(150), alreadyPaid: D(0) }).ok).toBe(
      true
    );
  });
});

/** COMP-013 / COMP-014 — period count was unbounded and payouts uncapped. */
describe("stipend rules", () => {
  it("bounds a one-time stipend to a single period", () => {
    expect(maxStipendPeriods("ONE_TIME", 12)).toBe(1);
    const res = checkStipendRelease({
      periodIndex: 2,
      frequency: "ONE_TIME",
      amount: D(100),
      alreadyPaidTotal: D(0),
      projectBudget: D(10_000),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/single payment period/i);
  });

  it("refuses a period beyond the configured count", () => {
    const res = checkStipendRelease({
      periodIndex: 13,
      frequency: "MONTHLY",
      configuredPeriods: 12,
      amount: D(100),
      alreadyPaidTotal: D(0),
      projectBudget: D(10_000),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/12 payment period/i);
  });

  it("refuses a payout that would exceed the project budget", () => {
    const res = checkStipendRelease({
      periodIndex: 3,
      frequency: "MONTHLY",
      configuredPeriods: 12,
      amount: D(500),
      alreadyPaidTotal: D(9_800),
      projectBudget: D(10_000),
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/only 200\.00 remains/i);
  });

  it("rejects a non-positive or non-integer period index", () => {
    for (const periodIndex of [0, -1, 1.5]) {
      expect(
        checkStipendRelease({
          periodIndex,
          frequency: "MONTHLY",
          configuredPeriods: 12,
          amount: D(100),
          alreadyPaidTotal: D(0),
          projectBudget: D(10_000),
        }).ok
      ).toBe(false);
    }
  });
});

/** ARCH-001 — replaces `${type}-${Date.now()}`, which collided within a ms. */
describe("idempotency keys", () => {
  it("derives the same key for the same logical operation", () => {
    expect(transitionKey("item", "i1", "release", "1000.00")).toBe(
      transitionKey("item", "i1", "release", "1000.00")
    );
  });

  it("derives different keys for different items, operations and amounts", () => {
    const base = transitionKey("item", "i1", "release", "1000.00");
    expect(transitionKey("item", "i2", "release", "1000.00")).not.toBe(base);
    expect(transitionKey("item", "i1", "fund", "1000.00")).not.toBe(base);
    expect(transitionKey("item", "i1", "release", "500.00")).not.toBe(base);
  });
});

/** DATA-004 — Float arithmetic drifts; Decimal must not. */
describe("DATA-004: decimal precision", () => {
  it("sums repeated fractional amounts exactly", () => {
    let total = D(0);
    for (let i = 0; i < 10; i++) total = total.plus(D("0.1"));
    expect(total.equals(D(1))).toBe(true);
    // The Float equivalent does not hold:
    expect(Array.from({ length: 10 }).reduce((a: number) => a + 0.1, 0)).not.toBe(1);
  });

  it("makes an exact-equality release guard reliable", () => {
    const amount = D("0.30");
    const released = D("0.10").plus(D("0.20"));
    expect(released.equals(amount)).toBe(true);
    const res = checkRelease(
      { ...item(), status: "APPROVED", amount, fundedAmount: amount, releasedAmount: released }
    );
    expect(res.ok).toBe(false);
    expect((res as any).error).toMatch(/already been released in full/i);
  });
});
