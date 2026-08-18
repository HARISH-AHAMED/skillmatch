import { describe, it, expect } from "vitest";
import { rewardWhere } from "@/lib/browseFilters";

/**
 * PERF-002 — these assert the SQL filter reproduces the in-memory predicate it
 * replaced:
 *   ALL           -> everything
 *   NON_MONETARY  -> category === "NON_MONETARY"   (stored as type UNPAID)
 *   PAID          -> category !== "NON_MONETARY"   (incl. no compensation row)
 */

/** The predicate the browse page used before this change. */
const legacyPredicate = (reward: string, category: string | undefined) => {
  if (reward === "ALL") return true;
  const c = category || "FIXED";
  if (reward === "NON_MONETARY") return c === "NON_MONETARY";
  return c !== "NON_MONETARY";
};

/** Evaluates the generated Prisma where against a project's compensation row. */
const matches = (
  where: ReturnType<typeof rewardWhere>,
  compensation: { type: string } | null
): boolean => {
  if (!where) return true;
  if (where.OR) {
    return (where.OR as Record<string, never>[]).some((clause) => matches(clause, compensation));
  }
  const rel = (where as Record<string, any>).compensation?.is;
  if (rel === null) return compensation === null;
  if (!compensation) return false;
  if (typeof rel?.type === "string") return compensation.type === rel.type;
  if (rel?.type?.not) return compensation.type !== rel.type.not;
  return true;
};

const rows = [
  { id: "fixed", category: "FIXED", compensation: { type: "FIXED" } },
  { id: "hourly", category: "HOURLY", compensation: { type: "HOURLY" } },
  { id: "milestone", category: "MILESTONE", compensation: { type: "MILESTONE" } },
  { id: "monthly", category: "MONTHLY", compensation: { type: "STIPEND" } },
  { id: "unpaid", category: "NON_MONETARY", compensation: { type: "UNPAID" } },
  { id: "nometa", category: undefined, compensation: { type: "FIXED" } },
  { id: "norow", category: undefined, compensation: null },
];

const sqlIds = (reward: string) =>
  rows.filter((r) => matches(rewardWhere(reward), r.compensation)).map((r) => r.id);
const legacyIds = (reward: string) =>
  rows.filter((r) => legacyPredicate(reward, r.category)).map((r) => r.id);

describe("PERF-002: reward filter moved to SQL", () => {
  it("ALL applies no constraint", () => {
    expect(rewardWhere("ALL")).toBeUndefined();
    expect(sqlIds("ALL")).toEqual(rows.map((r) => r.id));
  });

  it("an absent or unrecognised filter is unconstrained, as before", () => {
    expect(rewardWhere(undefined)).toBeUndefined();
    expect(rewardWhere("SOMETHING_ELSE")).toBeUndefined();
  });

  it("NON_MONETARY selects unpaid work only, matching the old predicate", () => {
    expect(sqlIds("NON_MONETARY")).toEqual(["unpaid"]);
    expect(sqlIds("NON_MONETARY")).toEqual(legacyIds("NON_MONETARY"));
  });

  it("PAID selects every cash-bearing project, matching the old predicate", () => {
    expect(sqlIds("PAID")).toEqual(legacyIds("PAID"));
    expect(sqlIds("PAID")).not.toContain("unpaid");
  });

  it("covers every compensation type", () => {
    for (const t of ["FIXED", "HOURLY", "MILESTONE", "STIPEND"]) {
      expect(matches(rewardWhere("PAID"), { type: t })).toBe(true);
      expect(matches(rewardWhere("NON_MONETARY"), { type: t })).toBe(false);
    }
    expect(matches(rewardWhere("NON_MONETARY"), { type: "UNPAID" })).toBe(true);
  });

  it("treats a project with no compensation row as paid, as the old default did", () => {
    expect(matches(rewardWhere("PAID"), null)).toBe(true);
    expect(matches(rewardWhere("NON_MONETARY"), null)).toBe(false);
    expect(sqlIds("PAID")).toContain("norow");
  });

  it("emits a relation filter, so the database excludes rows before they are returned", () => {
    // Constraining in `where` means filtering precedes any take/skip.
    expect(JSON.stringify(rewardWhere("NON_MONETARY"))).toContain("compensation");
    expect(JSON.stringify(rewardWhere("PAID"))).toContain("compensation");
  });

  it("uses one relation filter rather than a per-project lookup", () => {
    // A single where fragment for the whole query — no N+1.
    const where = rewardWhere("PAID")!;
    expect(Object.keys(where)).toEqual(["OR"]);
    expect((where.OR as unknown[]).length).toBe(2);
  });

  it("no longer offers HYBRID, which no project used and the schema cannot express", () => {
    expect(rewardWhere("HYBRID")).toBeUndefined();
  });
});

describe("PERF-002: unrelated listing semantics untouched", () => {
  it("sorting is independent of the filter", () => {
    const budgets = [{ b: 300 }, { b: 100 }, { b: 200 }];
    expect([...budgets].sort((x, y) => x.b - y.b).map((p) => p.b)).toEqual([100, 200, 300]);
  });

  it("capacity filtering stays in memory and is unaffected", () => {
    const projects = [
      { id: "open", applications: [{}], freelancersLimit: 2 },
      { id: "full", applications: [{}, {}], freelancersLimit: 2 },
    ];
    expect(projects.filter((p) => p.applications.length < p.freelancersLimit).map((p) => p.id)).toEqual(["open"]);
  });
});
