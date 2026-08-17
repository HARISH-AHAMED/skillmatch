import { describe, it, expect } from "vitest";
import { getProjectDescriptionText, DEFAULT_CURRENCY } from "@/lib/workflowHelpers";

/**
 * Proves the harness itself works before any remediation test relies on it:
 * the runner executes, and the `@/*` path alias resolves into src/.
 * Deliberately asserts on pure helpers only — no DB, no auth.
 */
describe("test harness", () => {
  it("resolves the @/ alias into src/", () => {
    expect(DEFAULT_CURRENCY).toBe("USD");
  });

  it("runs assertions against real project code", () => {
    expect(getProjectDescriptionText("Plain description")).toBe("Plain description");
    expect(getProjectDescriptionText("Body\n\nMETADATA_JSON_BLOCK:{}")).toBe("Body");
  });
});
