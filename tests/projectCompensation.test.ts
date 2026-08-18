import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProjectPriority } from "@prisma/client";
import { createDbMock, sessionState, setSession, COMPANY_A } from "./helpers/mocks";

const db = createDbMock();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/auth", () => ({
  auth: async () => (sessionState.user ? { user: sessionState.user } : null),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/services/aiRecommendation", () => ({
  recalculateRecommendationsForProject: vi.fn(),
}));

const { createProject } = await import("@/actions/projectActions");
const { METADATA_MARKER } = await import("@/lib/workflowHelpers");

/** The wizard serialises compensation into the description; mirror that here. */
function describeWith(meta: Record<string, unknown>) {
  return `A project${METADATA_MARKER}${JSON.stringify(meta)}`;
}

const base = {
  title: "Test project",
  budget: 5000,
  priority: ProjectPriority.MEDIUM,
  requiredSkills: ["React"],
  experienceRequired: 2,
};

async function create(meta: Record<string, unknown>, budget = base.budget) {
  await createProject({ ...base, budget, description: describeWith(meta) });
  const call = db.projectCompensation.create.mock.calls[0]?.[0];
  return call?.data;
}

beforeEach(() => {
  Object.values(db).forEach((m: any) => {
    if (typeof m === "function") m.mockReset?.();
    else Object.values(m).forEach((f: any) => f.mockReset?.());
  });
  db.$transaction.mockImplementation(async (ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : (ops as (tx: unknown) => unknown)(db)
  );
  setSession(COMPANY_A);
  db.company.findUnique.mockResolvedValue({ id: "company-a", userId: COMPANY_A!.id });
  db.project.create.mockResolvedValue({ id: "project-1" });
  db.freelancer.findMany.mockResolvedValue([]);
  db.notification.create.mockResolvedValue({});
});

describe("COMP-016: every new project gets a ProjectCompensation row", () => {
  it("creates the row for a FIXED-price project", async () => {
    const data = await create({ compensationType: "FIXED", currency: "USD" });
    expect(data.projectId).toBe("project-1");
    expect(data.type).toBe("FIXED");
    expect(Number(data.totalBudget)).toBe(5000);
    expect(data.hourlyRate).toBeNull();
    expect(data.stipendAmount).toBeNull();
  });

  it("creates the row for an HOURLY project, carrying rate and estimated hours", async () => {
    const data = await create({
      compensationType: "HOURLY",
      paymentRate: 75,
      estimatedHours: 120,
      currency: "USD",
    });
    expect(data.type).toBe("HOURLY");
    expect(Number(data.hourlyRate)).toBe(75);
    expect(data.estimatedHours).toBe(120);
  });

  it("creates the row for a STIPEND project with its frequency", async () => {
    const data = await create({
      compensationType: "STIPEND",
      paymentRate: 1200,
      stipendFrequency: "MONTHLY",
      currency: "USD",
    });
    expect(data.type).toBe("STIPEND");
    expect(Number(data.stipendAmount)).toBe(1200);
    expect(data.stipendFrequency).toBe("MONTHLY");
  });

  it("creates the row for an UNPAID project", async () => {
    const data = await create({ compensationType: "UNPAID", currency: "USD" });
    expect(data.type).toBe("UNPAID");
    expect(data.hourlyRate).toBeNull();
  });

  it("carries a non-default currency and the negotiable flag", async () => {
    const data = await create({
      compensationType: "FIXED",
      currency: "INR",
      budgetNegotiable: true,
    });
    expect(data.currency).toBe("INR");
    expect(data.budgetNegotiable).toBe(true);
  });

  it("writes the compensation row inside the same transaction as the project", async () => {
    await create({ compensationType: "FIXED", currency: "USD" });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.project.create).toHaveBeenCalledTimes(1);
    expect(db.projectCompensation.create).toHaveBeenCalledTimes(1);
  });

  it("does not regress existing creation behaviour", async () => {
    await create({ compensationType: "FIXED", currency: "USD" });
    const projectData = db.project.create.mock.calls[0][0].data;
    expect(projectData.companyId).toBe("company-a");
    expect(projectData.title).toBe("Test project");
    expect(projectData.status).toBe("OPEN");
    expect(projectData.requiredSkills).toEqual(["react"]);
  });
});
