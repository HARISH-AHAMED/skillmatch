import { describe, it, expect } from "vitest";
import {
  TASK_STATUSES,
  TASK_COLUMNS,
  isTaskStatus,
  adjacentTaskStatus,
} from "@/lib/lifecycle";
import { parseProjectMetadata, METADATA_MARKER } from "@/lib/workflowHelpers";

/** KANBAN-002 / KANBAN-003 — REVIEW was orphaned; status was unvalidated. */
describe("KANBAN-002/003: task status is bounded and fully rendered", () => {
  it("renders a column for every status the schema documents", () => {
    // REVIEW previously had no column, so a task in it vanished from the board
    // while still counting in totals, and the detail dropdown could not express
    // its own current value to move it back.
    expect(TASK_COLUMNS.map((c) => c.id)).toEqual([...TASK_STATUSES]);
    expect(TASK_COLUMNS.map((c) => c.id)).toContain("REVIEW");
  });

  it("accepts only the documented statuses", () => {
    for (const s of TASK_STATUSES) expect(isTaskStatus(s)).toBe(true);
    for (const s of ["BOGUS", "todo", "", "DELETED"]) expect(isTaskStatus(s)).toBe(false);
  });

  it("moves a card one column at a time, through REVIEW", () => {
    expect(adjacentTaskStatus("TODO", "forward")).toBe("IN_PROGRESS");
    expect(adjacentTaskStatus("IN_PROGRESS", "forward")).toBe("REVIEW");
    expect(adjacentTaskStatus("REVIEW", "forward")).toBe("DONE");
    expect(adjacentTaskStatus("DONE", "back")).toBe("REVIEW");
  });

  it("clamps at the ends rather than wrapping", () => {
    expect(adjacentTaskStatus("TODO", "back")).toBe("TODO");
    expect(adjacentTaskStatus("DONE", "forward")).toBe("DONE");
  });
});

/** LEG-002 — defaults were injected into any project with an empty rounds list. */
describe("LEG-002: default rounds are not re-injected", () => {
  const withMeta = (data: Record<string, unknown>) =>
    `Description${METADATA_MARKER}${JSON.stringify({ objectives: [], ...data })}`;

  it("respects a deliberately empty rounds list", () => {
    // Previously any empty array was replaced with three defaults on every
    // read, and the next write persisted them.
    const parsed = parseProjectMetadata(withMeta({ rounds: [] }));
    expect(parsed.rounds).toEqual([]);
  });

  it("still seeds defaults when the field is genuinely absent", () => {
    const parsed = parseProjectMetadata(withMeta({}));
    expect(parsed.rounds?.length).toBe(3);
  });

  it("leaves a configured list untouched", () => {
    const rounds = [{ id: "r1", name: "Only round", type: "CV_PITCH", description: "" }];
    const parsed = parseProjectMetadata(withMeta({ rounds }));
    expect(parsed.rounds).toHaveLength(1);
  });
});

/** LEG-003 — detection depended on JSON.stringify key ordering. */
describe("LEG-003: metadata detection does not depend on key order", () => {
  it("parses metadata whose first key is not `objectives`", () => {
    // The old check was `includes('{"objectives"')`, so reordering the type
    // would have silently orphaned every project's metadata and reset all
    // payment state to defaults.
    const reordered = `Body${METADATA_MARKER}${JSON.stringify({
      currency: "INR",
      compensationType: "HOURLY",
      objectives: ["a"],
    })}`;
    const parsed = parseProjectMetadata(reordered);
    expect(parsed.currency).toBe("INR");
    expect(parsed.compensationType).toBe("HOURLY");
    expect(parsed.objectives).toEqual(["a"]);
  });

  it("still reads legacy rows written before the marker existed", () => {
    const legacy = `{"objectives":["legacy"],"currency":"GBP"}`;
    expect(parseProjectMetadata(legacy).currency).toBe("GBP");
  });

  it("falls back safely on prose with no metadata at all", () => {
    const parsed = parseProjectMetadata("Just a plain description.");
    expect(parsed.objectives).toEqual([]);
    expect(parsed.rounds?.length).toBe(3);
  });
});
