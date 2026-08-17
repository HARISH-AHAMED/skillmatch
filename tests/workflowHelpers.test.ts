import { describe, it, expect } from "vitest";
import {
  serializeProjectMetadata,
  getProjectDescriptionText,
  getProjectMetadataDirect,
  stripGeneratedSections,
  parseProjectMetadata,
} from "@/lib/workflowHelpers";

const baseMeta = () => parseProjectMetadata("");

/**
 * ARCH-002 — Project.description grew without bound on every save, because the
 * generated "Objectives:" line was carried into the next serialization.
 *
 * Audit "Validate": repeated saves must not accumulate generated sections.
 */
describe("ARCH-002: description does not grow on repeated saves", () => {
  it("does not accumulate Objectives lines across repeated save cycles", () => {
    const meta = { ...baseMeta(), objectives: ["Ship it", "Ship it well"] };

    let description = "A real project description written by the company.";
    for (let i = 0; i < 25; i++) {
      description = serializeProjectMetadata(getProjectDescriptionText(description), meta);
    }

    const occurrences = (description.match(/Objectives:/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it("keeps the description stable in length after the first save", () => {
    const meta = { ...baseMeta(), objectives: ["Alpha", "Beta"] };

    const first = serializeProjectMetadata("Original prose.", meta);
    const second = serializeProjectMetadata(getProjectDescriptionText(first), meta);
    const third = serializeProjectMetadata(getProjectDescriptionText(second), meta);

    expect(second).toBe(third);
    expect(second.length).toBe(first.length);
  });

  it("preserves the company's original prose exactly", () => {
    const meta = { ...baseMeta(), objectives: ["Do the thing"] };
    const prose = "We are building a platform.\n\nIt has several paragraphs.";
    const saved = serializeProjectMetadata(prose, meta);
    expect(getProjectDescriptionText(saved)).toBe(prose);
  });

  it("repairs a row that already accumulated generated lines", () => {
    const corrupted =
      "Real description." +
      "\n\nObjectives: A. B" +
      "\n\nObjectives: A. B" +
      "\n\nObjectives: A. B";
    expect(stripGeneratedSections(corrupted)).toBe("Real description.");
    expect(getProjectDescriptionText(corrupted)).toBe("Real description.");
  });

  it("does not damage a description that legitimately mentions objectives mid-text", () => {
    // Only a trailing generated block is stripped; prose is left alone.
    const prose = "Objectives: are discussed below.\n\nMore detail here.";
    const meta = { ...baseMeta(), objectives: ["X"] };
    const saved = serializeProjectMetadata(prose, meta);
    expect(getProjectDescriptionText(saved)).toBe(prose);
  });

  it("still round-trips the metadata payload intact", () => {
    const meta = {
      ...baseMeta(),
      objectives: ["One", "Two"],
      compensationType: "FIXED" as const,
      currency: "INR",
    };
    let description = serializeProjectMetadata("Prose.", meta);
    description = serializeProjectMetadata(getProjectDescriptionText(description), meta);

    const parsed = getProjectMetadataDirect(description);
    expect(parsed.compensationType).toBe("FIXED");
    expect(parsed.currency).toBe("INR");
    expect(parsed.objectives).toEqual(["One", "Two"]);
  });
});
