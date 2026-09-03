import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { createDbMock, sessionState, setSession, COMPANY_A } from "./helpers/mocks";
import { METADATA_MARKER } from "@/lib/workflowHelpers";

/**
 * M-05 — releaseMilestonePayment was the last money path that wrote nowhere but
 * prose: it marked a milestone RELEASED inside the application's JSON blob and
 * told the freelancer their money had moved, while writing no ledger entry,
 * checking no budget, requiring no funding and carrying no idempotency key.
 *
 * These tests pin the replacement: a contract milestone is backed by a real
 * PaymentItem, and the FUND and RELEASE entries are appended to the ledger in
 * the same transaction that updates the contract.
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

const ownerResult = {
  ok: true as boolean,
  error: undefined as string | undefined,
  data: { userId: COMPANY_A!.id, company: { id: "company-a" }, application: {} as any },
};
vi.mock("@/lib/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authz")>();
  return { ...actual, requireApplicationOwner: async () => ownerResult };
});

const comp = {
  type: "MILESTONE" as string,
  currency: "USD",
  totalBudget: new Prisma.Decimal(10000),
  budgetNegotiable: false,
  hourlyRate: null,
  estimatedHours: null,
  maxHours: null,
  stipendAmount: null,
  stipendFrequency: null,
  stipendPeriods: null,
  legacy: false,
};
vi.mock("@/lib/compensation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/compensation")>();
  return { ...actual, getProjectCompensation: async () => comp };
});

const { releaseMilestonePayment } = await import("@/actions/workflowActions");

/** An application whose metadata carries a two-milestone signed contract. */
function coverLetterWith(milestones: { title: string; budget: number; status: string }[]) {
  return (
    "Proposal text" +
    METADATA_MARKER +
    JSON.stringify({
      pipelineHistory: [],
      screeningAnswers: {},
      digitalContract: {
        contractText: "c",
        freelancerSigned: true,
        clientSigned: true,
        status: "SIGNED",
        milestones,
      },
    })
  );
}

const TWO_MILESTONES = [
  { title: "Phase one", budget: 3000, status: "ESCROWED" },
  { title: "Phase two", budget: 2000, status: "PENDING" },
];

function paymentItem(over: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    projectId: "p1",
    applicationId: "app-1",
    title: "Phase one",
    amount: new Prisma.Decimal(3000),
    currency: "USD",
    status: "PENDING",
    fundedAmount: new Prisma.Decimal(0),
    releasedAmount: new Prisma.Decimal(0),
    sortOrder: 0,
    ...over,
  };
}

/** Arranges a healthy release of milestone 0. Override pieces per test. */
function arrange(opts: {
  milestones?: { title: string; budget: number; status: string }[];
  items?: unknown[];
  priorReleases?: { amount: Prisma.Decimal }[];
} = {}) {
  const coverLetter = coverLetterWith(opts.milestones ?? TWO_MILESTONES);

  db.application.findUnique.mockResolvedValue({
    id: "app-1",
    projectId: "p1",
    coverLetter,
    project: { id: "p1", title: "Redesign", budget: 10000 },
    freelancer: { user: { id: "freelancer-user-a" } },
  });
  db.paymentTransaction.findMany.mockResolvedValue(opts.priorReleases ?? []);
  db.paymentItem.findMany.mockResolvedValue(opts.items ?? [paymentItem()]);
  db.paymentItem.count.mockResolvedValue(0);
  db.paymentItem.create.mockResolvedValue(paymentItem({ id: "item-new" }));
  db.paymentItem.update.mockResolvedValue({});
  db.paymentTransaction.create.mockImplementation(async ({ data }: any) => ({ id: "ledger-1", ...data }));
  db.application.update.mockResolvedValue({});
  db.notification.create.mockResolvedValue({});
  return coverLetter;
}

beforeEach(() => {
  Object.values(db).forEach((m: any) => {
    if (typeof m === "function") m.mockReset?.();
    else Object.values(m).forEach((f: any) => f.mockReset?.());
  });
  db.$transaction.mockImplementation(async (ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : (ops as (tx: unknown) => unknown)(db)
  );
  db.$queryRaw.mockResolvedValue([]);
  setSession(COMPANY_A);
  ownerResult.ok = true;
  comp.type = "MILESTONE";
  comp.totalBudget = new Prisma.Decimal(10000);
});

/** Every ledger entry written during the call. */
function ledgerCalls() {
  return db.paymentTransaction.create.mock.calls.map((c: any) => c[0].data);
}

describe("M-05: a milestone release reaches the ledger", () => {
  it("writes matching FUND and RELEASE entries for an unfunded milestone", async () => {
    arrange();
    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(true);

    const entries = ledgerCalls();
    expect(entries).toHaveLength(2);

    const fund = entries.find((e: any) => e.type === "FUND");
    const release = entries.find((e: any) => e.type === "RELEASE");
    expect(fund).toBeDefined();
    expect(release).toBeDefined();

    // FUND is positive, RELEASE is stored negated by appendLedger.
    expect(Number(fund.amount)).toBe(3000);
    expect(Number(release.amount)).toBe(-3000);
    expect(fund.currency).toBe("USD");
    expect(release.paymentItemId).toBe("item-1");
    expect(release.applicationId).toBe("app-1");
    expect(release.actorUserId).toBe(COMPANY_A!.id);
  });

  it("funds only the shortfall when the stage is already partly funded", async () => {
    arrange({ items: [paymentItem({ fundedAmount: new Prisma.Decimal(1200) })] });
    await releaseMilestonePayment("app-1", 0);

    const fund = ledgerCalls().find((e: any) => e.type === "FUND");
    expect(Number(fund.amount)).toBe(1800); // 3000 − 1200
  });

  it("writes no FUND entry when the stage is already fully funded", async () => {
    arrange({ items: [paymentItem({ fundedAmount: new Prisma.Decimal(3000) })] });
    await releaseMilestonePayment("app-1", 0);

    const entries = ledgerCalls();
    expect(entries.filter((e: any) => e.type === "FUND")).toHaveLength(0);
    expect(entries.filter((e: any) => e.type === "RELEASE")).toHaveLength(1);
  });

  it("leaves the cached amounts equal to the ledger it just wrote", async () => {
    arrange();
    await releaseMilestonePayment("app-1", 0);

    const update = db.paymentItem.update.mock.calls[0][0];
    expect(Number(update.data.fundedAmount)).toBe(3000);
    expect(Number(update.data.releasedAmount)).toBe(3000);
    expect(update.data.status).toBe("RELEASED");
    expect(update.data.releasedAt).toBeInstanceOf(Date);
  });

  it("creates a PaymentItem when the contract used the fallback schedule", async () => {
    arrange({ items: [] }); // no configured stages for this application
    db.paymentItem.count.mockResolvedValue(4);

    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(true);

    const created = db.paymentItem.create.mock.calls[0][0].data;
    expect(created.projectId).toBe("p1");
    expect(created.applicationId).toBe("app-1");
    expect(created.title).toBe("Phase one");
    expect(Number(created.amount)).toBe(3000);
    expect(created.currency).toBe("USD");
    // Appended after the project's existing stages rather than colliding at 0.
    expect(created.sortOrder).toBe(4);
  });

  it("carries the idempotency keys that make a replay a no-op", async () => {
    arrange();
    await releaseMilestonePayment("app-1", 0);

    const entries = ledgerCalls();
    const keys = entries.map((e: any) => e.idempotencyKey);
    expect(keys).toContain("milestone:app-1:fund:0");
    expect(keys).toContain("milestone:app-1:release:0");
    // Distinct per index, so milestone 1 is not blocked by milestone 0.
    expect(new Set(keys).size).toBe(2);
  });

  it("runs inside a transaction that locks the application and the stages", async () => {
    arrange();
    await releaseMilestonePayment("app-1", 0);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    // Two FOR UPDATE locks: the application row and the project's stages.
    expect(db.$queryRaw.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("M-05: releases that must be refused", () => {
  it("refuses a milestone already marked released in the contract", async () => {
    arrange({
      milestones: [{ title: "Phase one", budget: 3000, status: "RELEASED" }],
    });
    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already been released/i);
    expect(db.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("refuses when the backing stage already carries the released amount", async () => {
    arrange({ items: [paymentItem({ releasedAmount: new Prisma.Decimal(3000) })] });
    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already been released/i);
    expect(db.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("refuses a release that would exceed the project budget", async () => {
    // 8500 already paid out of a 10000 budget leaves 1500 for a 3000 milestone.
    arrange({ priorReleases: [{ amount: new Prisma.Decimal(-8500) }] });
    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/exceed the project budget/i);
    expect(res.error).toMatch(/1500\.00 remains/);
    expect(db.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("refuses a zero-value milestone", async () => {
    arrange({ milestones: [{ title: "Freebie", budget: 0, status: "ESCROWED" }] });
    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no payable amount/i);
  });

  it("refuses an out-of-range index rather than addressing a missing element", async () => {
    arrange();
    for (const idx of [-1, 2, 1.5, NaN]) {
      const res = await releaseMilestonePayment("app-1", idx);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/milestone not found/i);
    }
    expect(db.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("refuses on an unpaid engagement", async () => {
    arrange();
    comp.type = "UNPAID";
    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unpaid engagement/i);
    expect(db.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("refuses a caller who does not own the application", async () => {
    arrange();
    ownerResult.ok = false;
    ownerResult.error = "Not found, or you do not have access to it.";
    await expect(releaseMilestonePayment("app-1", 0)).rejects.toThrow(/not found|access/i);
    expect(db.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("translates a replayed ledger key into a refusal, not a crash", async () => {
    arrange();
    const { LedgerReplayError } = await import("@/lib/payments");
    db.paymentTransaction.create.mockRejectedValue(new LedgerReplayError());

    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already been released/i);
  });

  it("writes no notification when the release is refused", async () => {
    arrange({ priorReleases: [{ amount: new Prisma.Decimal(-9999) }] });
    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(false);
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});

describe("M-05: contract and ledger stay consistent", () => {
  it("advances the next milestone to escrowed and notifies once", async () => {
    arrange();
    await releaseMilestonePayment("app-1", 0);

    const written = db.application.update.mock.calls[0][0].data.coverLetter as string;
    const meta = JSON.parse(written.split(METADATA_MARKER)[1]);
    expect(meta.digitalContract.milestones[0].status).toBe("RELEASED");
    expect(meta.digitalContract.milestones[1].status).toBe("ESCROWED");
    expect(meta.digitalContract.status).not.toBe("COMPLETED");
    expect(db.notification.create).toHaveBeenCalledTimes(1);
  });

  it("completes the contract on the final milestone without completing the project", async () => {
    arrange({
      milestones: [{ title: "Only", budget: 3000, status: "ESCROWED" }],
    });
    await releaseMilestonePayment("app-1", 0);

    const written = db.application.update.mock.calls[0][0].data.coverLetter as string;
    const meta = JSON.parse(written.split(METADATA_MARKER)[1]);
    expect(meta.digitalContract.status).toBe("COMPLETED");
    // LIFE-001 / MF-001 — completeProject stays the sole writer of COMPLETED.
    expect(db.project.update).not.toHaveBeenCalled();
  });

  it("re-reads the contract inside the lock rather than trusting the earlier fetch", async () => {
    arrange();
    // The row the transaction reads has already been released by someone else.
    db.application.findUnique.mockImplementation(async (args: any) =>
      args.select?.coverLetter
        ? { coverLetter: coverLetterWith([{ title: "Phase one", budget: 3000, status: "RELEASED" }]) }
        : {
            id: "app-1",
            projectId: "p1",
            coverLetter: coverLetterWith(TWO_MILESTONES),
            project: { id: "p1", title: "Redesign", budget: 10000 },
            freelancer: { user: { id: "freelancer-user-a" } },
          }
    );

    const res = await releaseMilestonePayment("app-1", 0);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already been released/i);
    expect(db.paymentTransaction.create).not.toHaveBeenCalled();
  });
});
