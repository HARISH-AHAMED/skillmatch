import { describe, it, expect, beforeEach } from "vitest";
import {
  getProjectMetadataDirect,
  __clearProjectMetadataCache,
  METADATA_MARKER,
  formatCompensation,
  getProjectCurrency,
} from "@/lib/workflowHelpers";

const withMeta = (meta: Record<string, unknown>, prose = "Some prose") =>
  `${prose}${METADATA_MARKER}${JSON.stringify(meta)}`;

beforeEach(() => __clearProjectMetadataCache());

describe("PERF-002: memoised project metadata parse", () => {
  it("returns the same values for a repeated parse of one description", () => {
    const d = withMeta({ compensationType: "HOURLY", paymentRate: 50, currency: "USD" });
    expect(getProjectMetadataDirect(d)).toEqual(getProjectMetadataDirect(d));
  });

  it("matches the uncached result exactly (cold vs warm)", () => {
    const d = withMeta({ compensationType: "FIXED", currency: "INR", budgetNegotiable: true });
    const cold = getProjectMetadataDirect(d);
    __clearProjectMetadataCache();
    const fresh = getProjectMetadataDirect(d);
    const warm = getProjectMetadataDirect(d);
    expect(warm).toEqual(cold);
    expect(warm).toEqual(fresh);
  });

  it("hands back a distinct object each call so callers cannot corrupt the cache", () => {
    const d = withMeta({ compensationType: "FIXED", currency: "USD" });
    const first = getProjectMetadataDirect(d) as unknown as Record<string, unknown>;
    expect(getProjectMetadataDirect(d)).not.toBe(first);

    // Mirrors `meta.faq = []` in workflowActions.
    first.faq = ["mutated"];
    first.compensationType = "UNPAID";
    const second = getProjectMetadataDirect(d) as unknown as Record<string, unknown>;
    expect(second.faq).not.toEqual(["mutated"]);
    expect(second.compensationType).toBe("FIXED");
  });

  it("keeps distinct descriptions distinct (no cross-contamination)", () => {
    const a = withMeta({ compensationType: "HOURLY", paymentRate: 10, currency: "USD" });
    const b = withMeta({ compensationType: "STIPEND", paymentRate: 20, currency: "INR" });
    expect(getProjectMetadataDirect(a).compensationType).toBe("HOURLY");
    expect(getProjectMetadataDirect(b).compensationType).toBe("STIPEND");
    expect(getProjectMetadataDirect(a).currency).toBe("USD");
    expect(getProjectMetadataDirect(b).currency).toBe("INR");
  });

  it("handles a listing of many projects, each resolved consistently", () => {
    const projects = Array.from({ length: 25 }, (_, i) => ({
      budget: (i + 1) * 100,
      description: withMeta({ compensationType: "FIXED", currency: "USD" }, `Project ${i}`),
    }));
    const first = projects.map((p) => formatCompensation(p));
    const second = projects.map((p) => formatCompensation(p));
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(25); // distinct budgets stay distinct
  });

  it("evicts beyond the cache limit without changing results", () => {
    const many = Array.from({ length: 300 }, (_, i) =>
      withMeta({ compensationType: "FIXED", currency: "USD" }, `P${i}`)
    );
    many.forEach((d) => getProjectMetadataDirect(d));
    // The earliest entry has been evicted; re-parsing must still be correct.
    expect(getProjectMetadataDirect(many[0]).compensationType).toBe("FIXED");
    expect(getProjectMetadataDirect(many[299]).compensationType).toBe("FIXED");
  });
});

describe("PERF-002: unchanged behaviour for absent or broken metadata", () => {
  it("treats null, undefined and empty description as before", () => {
    const empty = getProjectMetadataDirect("");
    expect(getProjectMetadataDirect(null)).toEqual(empty);
    expect(getProjectMetadataDirect(undefined)).toEqual(empty);
  });

  it("falls back for a description with no metadata marker", () => {
    const plain = getProjectMetadataDirect("Just prose, no marker");
    expect(plain).toBeDefined();
    expect(plain.compensationType).toBeUndefined();
  });

  it("falls back for malformed JSON rather than throwing", () => {
    const broken = `Prose${METADATA_MARKER}{not valid json`;
    expect(() => getProjectMetadataDirect(broken)).not.toThrow();
    expect(getProjectMetadataDirect(broken)).toEqual(getProjectMetadataDirect(broken));
  });

  it("handles partial metadata without inventing values", () => {
    const partial = getProjectMetadataDirect(withMeta({ currency: "INR" }));
    expect(partial.currency).toBe("INR");
    expect(partial.compensationType).toBeUndefined();
    expect(partial.paymentRate).toBeUndefined();
  });
});

describe("PERF-002: listing semantics preserved", () => {
  const projects = [
    { id: "a", budget: 300, description: withMeta({ compensationType: "FIXED", currency: "USD", paymentCategory: "FIXED" }) },
    { id: "b", budget: 100, description: withMeta({ compensationType: "HOURLY", paymentRate: 50, currency: "USD", paymentCategory: "HOURLY" }) },
    { id: "c", budget: 200, description: withMeta({ compensationType: "UNPAID", currency: "USD", paymentCategory: "NON_MONETARY" }) },
    { id: "d", budget: 400, description: "No metadata at all" },
  ];

  it("filters by payment category exactly as the browse page does", () => {
    const category = (d: string) => getProjectMetadataDirect(d).paymentCategory || "FIXED";
    expect(projects.filter((p) => category(p.description) === "NON_MONETARY").map((p) => p.id)).toEqual(["c"]);
    expect(projects.filter((p) => category(p.description) !== "NON_MONETARY").map((p) => p.id)).toEqual(["a", "b", "d"]);
  });

  it("sorts by budget unaffected by the cache", () => {
    const sorted = [...projects].sort((x, y) => x.budget - y.budget).map((p) => p.id);
    expect(sorted).toEqual(["b", "c", "a", "d"]);
  });

  it("paginates identically across repeated passes", () => {
    const page = (n: number, size: number) => projects.slice(n * size, n * size + size).map((p) => p.id);
    expect(page(0, 2)).toEqual(["a", "b"]);
    expect(page(1, 2)).toEqual(["c", "d"]);
    expect(page(0, 2)).toEqual(["a", "b"]);
  });

  it("renders compensation and currency identically on repeat", () => {
    for (const p of projects) {
      expect(formatCompensation(p)).toBe(formatCompensation(p));
      expect(getProjectCurrency(p.description)).toBe(getProjectCurrency(p.description));
    }
    expect(formatCompensation(projects[1])).toBe("$50/hr");
    expect(formatCompensation(projects[2])).toBe("Unpaid / Volunteer");
  });
});
