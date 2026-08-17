import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseProjectMetadata,
  isMetadataCorrupt,
  METADATA_MARKER,
} from "@/lib/workflowHelpers";

afterEach(() => vi.restoreAllMocks());

/**
 * LEG-004 — a corrupted metadata block was swallowed by a bare console.warn and
 * the fallback returned, so "no rounds configured" and "this row is corrupt"
 * were indistinguishable to callers and in logs.
 */
describe("LEG-004: corrupt metadata is distinguishable from absent", () => {
  const corrupt = `Body${METADATA_MARKER}{"objectives":["a"],"currency":`; // truncated

  it("logs an error rather than a warning when a block is present but unparseable", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    parseProjectMetadata(corrupt);
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0][0])).toMatch(/corrupted metadata block/i);
  });

  it("records the payload so callers can detect corruption", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const payload = corrupt.split(METADATA_MARKER)[1];
    parseProjectMetadata(corrupt);
    expect(isMetadataCorrupt(payload)).toBe(true);
  });

  it("still returns usable defaults rather than throwing", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const parsed = parseProjectMetadata(corrupt);
    expect(parsed.objectives).toEqual([]);
    // A corrupt block must not take the page down.
    expect(parsed.visibility).toBe("PUBLIC");
  });

  it("does not treat an absent block as corruption", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    parseProjectMetadata("Just a plain description with no metadata.");
    parseProjectMetadata("");
    expect(spy).not.toHaveBeenCalled();
    expect(isMetadataCorrupt("Just a plain description with no metadata.")).toBe(false);
  });

  it("does not treat valid metadata as corruption", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const good = `Body${METADATA_MARKER}${JSON.stringify({ objectives: ["x"], currency: "EUR" })}`;
    expect(parseProjectMetadata(good).currency).toBe("EUR");
    expect(spy).not.toHaveBeenCalled();
  });
});
