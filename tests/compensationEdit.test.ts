import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma, ProjectPriority } from "@prisma/client";
import { createDbMock, sessionState, setSession, COMPANY_A } from "./helpers/mocks";
import { METADATA_MARKER } from "@/lib/workflowHelpers";

/**
 * M-06 — editProject rewrote ProjectCompensation from the submitted description
 * with no reconciliation against records already standing against it. A company
 * could drop the budget below money already committed, switch MILESTONE to
 * HOURLY and orphan every PaymentItem, or re-denominate a project whose stages
 * keep their original currency — which then failed checkSaveItem's equality
 * test and left the project unable to add stages at all.
 *
 * M-01 — the same path is where stipendPeriods and maxHours must survive an
 * edit rather than being dropped.
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
vi.mock("@/services/aiRecommendation", () => ({
  recalculateRecommendationsForProject: vi.fn(),
}));

const { editProject } = await import("@/actions/projectActions");

function describeWith(meta: Record<string, unknown>) {
  return `A project${METADATA_MARKER}${JSON.stringify(meta)}`;
}

const FORM = {
  title: "Test project",
  priority: ProjectPriority.MEDIUM,
  requiredSkills: ["React"],
  experienceRequired: 2,
};

/** Existing committed state on the project being edited. */
function arrange(opts: {
  current?: Record<string, unknown>;
  items?: { fundedAmount: Prisma.Decimal; releasedAmount: Prisma.Decimal }[];
  ledger?: { amount: Prisma.Decimal }[];
  releasedPeriods?: number;
} = {}) {
  db.company.findUnique.mockResolvedValue({ id: "company-a", userId: COMPANY_A!.id });
  db.project.findUnique.mockResolvedValue({
    id: "p1",
    companyId: "company-a",
    status: "IN_PROGRESS",
  });
  db.projectCompensation.findUnique.mockResolvedValue(
    opts.current === undefined
      ? { type: "MILESTONE", currency: "USD", totalBudget: new Prisma.Decimal(10000) }
      : opts.current
  );
  db.paymentItem.findMany.mockResolvedValue(opts.items ?? []);
  db.paymentTransaction.findMany.mockResolvedValue(opts.ledger ?? []);
  db.stipendPeriod.count.mockResolvedValue(opts.releasedPeriods ?? 0);
  db.project.update.mockResolvedValue({ id: "p1", description: "", budget: 10000 });
  db.projectCompensation.upsert.mockResolvedValue({});
}

const edit = (meta: Record<string, unknown>, budget = 10000) =>
  editProject("p1", { ...FORM, budget, description: describeWith(meta) });

const MILESTONE_USD = { compensationType: "MILESTONE", currency: "USD" };

beforeEach(() => {
  Object.values(db).forEach((m: any) => {
    if (typeof m === "function") m.mockReset?.();
    else Object.values(m).forEach((f: any) => f.mockReset?.());
  });
  db.$transaction.mockImplementation(async (ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : (ops as (tx: unknown) => unknown)(db)
  );
  setSession(COMPANY_A);
});

describe("M-06: a project with no financial history stays fully editable", () => {
  it("allows a compensation type change before any money moves", async () => {
    arrange();
    await expect(edit({ compensationType: "HOURLY", currency: "USD", paymentRate: 80 })).resolves.toMatchObject({
      success: true,
    });
    expect(db.projectCompensation.upsert).toHaveBeenCalled();
  });

  it("allows a currency change and a budget reduction before any money moves", async () => {
    arrange();
    await expect(edit({ compensationType: "MILESTONE", currency: "INR" }, 500)).resolves.toMatchObject({
      success: true,
    });
  });

  it("treats stages that exist but hold nothing as no history", async () => {
    arrange({
      items: [{ fundedAmount: new Prisma.Decimal(0), releasedAmount: new Prisma.Decimal(0) }],
    });
    await expect(edit({ compensationType: "HOURLY", currency: "USD", paymentRate: 80 })).resolves.toMatchObject({
      success: true,
    });
  });
});

describe("M-06: terms freeze once value has moved", () => {
  const FUNDED = {
    items: [{ fundedAmount: new Prisma.Decimal(4000), releasedAmount: new Prisma.Decimal(0) }],
  };

  it("refuses a compensation type change", async () => {
    arrange(FUNDED);
    await expect(edit({ compensationType: "HOURLY", currency: "USD", paymentRate: 80 })).rejects.toThrow(
      /compensation type can no longer be changed/i
    );
    expect(db.projectCompensation.upsert).not.toHaveBeenCalled();
  });

  it("refuses a currency change", async () => {
    arrange(FUNDED);
    await expect(edit({ compensationType: "MILESTONE", currency: "INR" })).rejects.toThrow(
      /denominated in USD/i
    );
    expect(db.projectCompensation.upsert).not.toHaveBeenCalled();
  });

  it("refuses a budget below what is already committed", async () => {
    arrange(FUNDED);
    await expect(edit(MILESTONE_USD, 3000)).rejects.toThrow(/4000\.00 is already committed/i);
    expect(db.project.update).not.toHaveBeenCalled();
  });

  it("allows a budget at or above the committed floor", async () => {
    arrange(FUNDED);
    await expect(edit(MILESTONE_USD, 4000)).resolves.toMatchObject({ success: true });
  });

  it("counts released ledger value toward the floor", async () => {
    arrange({ ledger: [{ amount: new Prisma.Decimal(-6000) }] });
    await expect(edit(MILESTONE_USD, 5000)).rejects.toThrow(/6000\.00 is already committed/i);
  });

  it("treats a released stipend period as history", async () => {
    arrange({ current: { type: "STIPEND", currency: "USD", totalBudget: new Prisma.Decimal(10000) }, releasedPeriods: 1 });
    await expect(edit({ compensationType: "FIXED", currency: "USD" })).rejects.toThrow(
      /compensation type can no longer be changed/i
    );
  });

  it("still allows edits that do not touch the frozen terms", async () => {
    arrange(FUNDED);
    const res = await edit(MILESTONE_USD, 12000); // raising the budget is fine
    expect(res.success).toBe(true);
    expect(db.project.update).toHaveBeenCalled();
  });
});

describe("M-01: an edit persists the period count and hour ceiling", () => {
  it("carries stipendPeriods through the upsert", async () => {
    arrange({ current: { type: "STIPEND", currency: "USD", totalBudget: new Prisma.Decimal(6000) } });
    await edit(
      { compensationType: "STIPEND", currency: "USD", paymentRate: 1000, stipendFrequency: "MONTHLY", stipendPeriods: 6 },
      6000
    );
    const data = db.projectCompensation.upsert.mock.calls[0][0].update;
    expect(data.stipendPeriods).toBe(6);
    expect(Number(data.stipendAmount)).toBe(1000);
  });

  it("carries maxHours through the upsert", async () => {
    arrange({ current: { type: "HOURLY", currency: "USD", totalBudget: new Prisma.Decimal(8000) } });
    await edit({ compensationType: "HOURLY", currency: "USD", paymentRate: 80, maxHours: 100 }, 8000);
    const data = db.projectCompensation.upsert.mock.calls[0][0].update;
    expect(data.maxHours).toBe(100);
  });

  it("writes the same shape on create and update branches", async () => {
    arrange({ current: { type: "STIPEND", currency: "USD", totalBudget: new Prisma.Decimal(6000) } });
    await edit(
      { compensationType: "STIPEND", currency: "USD", paymentRate: 1000, stipendFrequency: "MONTHLY", stipendPeriods: 6 },
      6000
    );
    const call = db.projectCompensation.upsert.mock.calls[0][0];
    expect(Object.keys(call.update).sort()).toEqual(
      Object.keys(call.create).filter((k) => k !== "projectId").sort()
    );
  });
});

describe("M-06: a terminal project is not editable at all", () => {
  it("refuses an edit to a completed project before touching compensation", async () => {
    arrange();
    db.project.findUnique.mockResolvedValue({ id: "p1", companyId: "company-a", status: "COMPLETED" });
    await expect(edit(MILESTONE_USD)).rejects.toThrow(/complete/i);
    expect(db.projectCompensation.upsert).not.toHaveBeenCalled();
  });

  it("refuses an edit from another company", async () => {
    arrange();
    db.project.findUnique.mockResolvedValue({ id: "p1", companyId: "company-b", status: "OPEN" });
    await expect(edit(MILESTONE_USD)).rejects.toThrow(/unauthorized/i);
  });
});
