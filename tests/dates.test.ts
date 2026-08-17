import { describe, it, expect } from "vitest";
import {
  toDateKey,
  groupByDateKey,
  sortDateKeysDesc,
  filterDateKeys,
  formatDateKey,
  formatDateKeyShort,
} from "@/lib/dates";

/**
 * TIME-001 — the timeline grouped tasks under a `toLocaleDateString()` string
 * and then fed that display string back into `new Date()` to sort and filter.
 * These tests pin the invariant that broke: keys are data, not display text.
 */
describe("TIME-001: date keys are stable data, not display strings", () => {
  it("produces a sortable ISO key", () => {
    expect(toDateKey(new Date(2026, 7, 17))).toBe("2026-08-17");
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("returns an empty key for an unparseable value rather than NaN", () => {
    expect(toDateKey("not a date")).toBe("");
  });

  it("sorts newest-first without ever parsing a formatted string", () => {
    const keys = ["2026-01-05", "2026-08-17", "2025-12-31", "2026-08-02"];
    expect(sortDateKeysDesc(keys)).toEqual([
      "2026-08-17",
      "2026-08-02",
      "2026-01-05",
      "2025-12-31",
    ]);
  });

  it("sorts by comparing ISO keys, never by parsing a formatted date", () => {
    // The old comparator did `new Date("lundi 17 août 2026").getTime()`, which
    // is NaN outside English, so ordering became arbitrary. Proven here by
    // showing the localised strings the old code compared are unparseable,
    // while the ISO keys sort correctly.
    expect(Number.isNaN(new Date("lundi 17 août 2026").getTime())).toBe(true);
    expect(sortDateKeysDesc(["2026-03-01", "2026-11-30", "2026-07-04"])).toEqual([
      "2026-11-30",
      "2026-07-04",
      "2026-03-01",
    ]);
  });

  it("drops empty keys from the sorted output", () => {
    expect(sortDateKeysDesc(["2026-08-17", "", "2026-08-16"])).toEqual([
      "2026-08-17",
      "2026-08-16",
    ]);
  });

  it("filters to a single day, and matches the date-picker value directly", () => {
    const keys = ["2026-08-17", "2026-08-16"];
    // The picker emits exactly this shape, so no parsing is needed to compare.
    expect(filterDateKeys(keys, "2026-08-17")).toEqual(["2026-08-17"]);
    expect(filterDateKeys(keys, "2026-08-15")).toEqual([]);
  });

  it("treats an empty filter as 'no filter'", () => {
    const keys = ["2026-08-17", "2026-08-16"];
    expect(filterDateKeys(keys, "")).toEqual(keys);
    expect(filterDateKeys(keys, undefined)).toEqual(keys);
  });

  it("groups items under their date key", () => {
    const tasks = [
      { id: "a", due: new Date(2026, 7, 17) },
      { id: "b", due: new Date(2026, 7, 17) },
      { id: "c", due: new Date(2026, 7, 16) },
    ];
    const grouped = groupByDateKey(tasks, (t) => t.due);
    expect(Object.keys(grouped).sort()).toEqual(["2026-08-16", "2026-08-17"]);
    expect(grouped["2026-08-17"].map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("collects undated items under an empty key rather than dropping them", () => {
    const grouped = groupByDateKey([{ id: "a", due: null }], (t) => t.due);
    expect(grouped[""]).toHaveLength(1);
  });
});

/**
 * TIME-002 — a date-only value parsed as UTC midnight renders a day earlier
 * anywhere west of UTC. Verifying the key derivation is timezone-stable.
 */
describe("TIME-002: date-only values do not shift a day", () => {
  it("keys a local date to its own calendar day", () => {
    // Local midnight and local end-of-day must land on the same key.
    expect(toDateKey(new Date(2026, 7, 17, 0, 0, 0))).toBe("2026-08-17");
    expect(toDateKey(new Date(2026, 7, 17, 23, 59, 59))).toBe("2026-08-17");
  });

  it("keys the midday-anchored storage value to the intended day", () => {
    // hourlyLogActions.toWorkDate stores midday UTC precisely so that no
    // timezone within +/-12h can shift the calendar date.
    const stored = new Date(Date.UTC(2026, 7, 17, 12, 0, 0));
    expect(stored.getUTCDate()).toBe(17);
    expect(formatDateKey("2026-08-17")).toBe("August 17, 2026");
  });
});

/**
 * SSR-001 — locale/timezone-dependent formatting during server render of a
 * client component produces different text on each side and a hydration
 * mismatch on every timestamp.
 */
describe("SSR-001: formatting is deterministic", () => {
  it("does not depend on Intl, so server and client cannot disagree", () => {
    // toLocaleDateString renders differently per locale; formatDateKey builds
    // its output from fixed tables, so the same key always yields the same
    // string on both sides of the SSR boundary.
    expect(formatDateKey("2026-08-17", { weekday: true })).toBe("Monday, August 17, 2026");
    expect(new Date(Date.UTC(2026, 7, 17)).toLocaleDateString("de-DE")).not.toBe(
      new Date(Date.UTC(2026, 7, 17)).toLocaleDateString("en-US")
    );
  });

  it("derives the weekday from UTC parts, so it cannot shift with timezone", () => {
    expect(formatDateKey("2026-08-17", { weekday: true })).toMatch(/^Monday, /);
    expect(formatDateKey("2026-08-16", { weekday: true })).toMatch(/^Sunday, /);
  });

  it("preserves the previous visible format", () => {
    // The old call was toLocaleDateString([], { weekday, year, month, day }),
    // which renders as "Monday, August 17, 2026" in the default English locale.
    expect(formatDateKey("2026-08-17", { weekday: true })).toBe("Monday, August 17, 2026");
    expect(formatDateKey("2026-08-17")).toBe("August 17, 2026");
    expect(formatDateKeyShort("2026-08-17")).toBe("17 Aug 2026");
  });

  it("returns the key unchanged when it is not a valid date", () => {
    expect(formatDateKey("")).toBe("");
    expect(formatDateKey("garbage")).toBe("garbage");
  });
});
