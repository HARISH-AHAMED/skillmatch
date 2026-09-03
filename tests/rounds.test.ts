import { describe, it, expect } from "vitest";
import {
  mergeRoundProgress,
  roundDeadlinePassed,
  seedRoundProgress,
} from "@/lib/rounds";
import {
  roundRuntimeMode,
  ROUND_TYPE_CATALOG,
  type ApplicationRoundProgress,
  type RecruitmentRound,
  type RecruitmentRoundType,
} from "@/lib/workflowHelpers";

const round = (
  id: string,
  type: RecruitmentRoundType,
  config?: RecruitmentRound["config"],
): RecruitmentRound => ({
  id,
  name: "",
  type,
  description: "",
  ...(config ? { config } : {}),
});

/**
 * Every round type the wizard offers has a runtime that executes it. The mode
 * is what decides which one, so the mapping must be total: a type without a
 * mode would be configuration that never reaches anybody.
 */
describe("every configurable round type has a runtime", () => {
  it("maps all catalog types to a runtime mode", () => {
    for (const entry of ROUND_TYPE_CATALOG) {
      expect(roundRuntimeMode(entry.value)).toBeTruthy();
    }
  });

  it("collects screening answers with the application and asks for the rest later", () => {
    expect(roundRuntimeMode("SCREENING_QUESTIONS")).toBe("APPLICATION");
    expect(roundRuntimeMode("INTERVIEW")).toBe("LIVE_SESSION");
    expect(roundRuntimeMode("PORTFOLIO_REVIEW")).toBe("CANDIDATE_SUBMIT");
    expect(roundRuntimeMode("CV_PITCH")).toBe("REVIEW_ONLY");
  });
});

describe("seeding an application's rounds", () => {
  it("opens the screening round for review and leaves the others waiting", () => {
    const seeded = seedRoundProgress([
      round("round-0", "SCREENING_QUESTIONS"),
      round("round-1", "TECHNICAL_ASSESSMENT"),
    ]);

    expect(seeded[0].status).toBe("SUBMITTED");
    expect(seeded[0].submission?.submittedAt).toBeTruthy();
    expect(seeded[1].status).toBe("PENDING");
    expect(seeded[1].submission).toBeUndefined();
  });

  it("carries the round's configured instructions and deadline", () => {
    const [entry] = seedRoundProgress([
      round("round-0", "VIDEO_INTRODUCTION", {
        instructions: "Two minutes, camera on.",
        deadline: "2030-01-01",
      }),
    ]);

    expect(entry.instructions).toBe("Two minutes, camera on.");
    expect(entry.deadline).toBe("2030-01-01");
  });
});

describe("merging stored progress with the project's current rounds", () => {
  const stored: ApplicationRoundProgress[] = [
    {
      roundId: "round-0",
      roundType: "PORTFOLIO_REVIEW",
      roundName: "Portfolio",
      status: "PASSED",
      requestedAt: "2026-01-01T00:00:00.000Z",
      instructions: "As requested at the time.",
      review: {
        outcome: "PASSED",
        scoreCategory: "TECHNICAL",
        reviewerName: "Acme",
        reviewedAt: "2026-01-02T00:00:00.000Z",
      },
    },
  ];

  it("adds rounds configured after the application was submitted", () => {
    const merged = mergeRoundProgress(
      [round("round-0", "PORTFOLIO_REVIEW"), round("round-1", "INTERVIEW")],
      stored,
    );

    expect(merged).toHaveLength(2);
    expect(merged[1].roundId).toBe("round-1");
    expect(merged[1].status).toBe("PENDING");
  });

  it("keeps a recorded review even when the round is removed from the project", () => {
    const merged = mergeRoundProgress([round("round-1", "INTERVIEW")], stored);

    expect(merged.map((r) => r.roundId)).toContain("round-0");
    expect(merged.find((r) => r.roundId === "round-0")?.review?.outcome).toBe("PASSED");
  });

  it("does not rewrite the instructions a candidate was already given", () => {
    const merged = mergeRoundProgress(
      [round("round-0", "PORTFOLIO_REVIEW", { instructions: "Edited afterwards." })],
      stored,
    );

    expect(merged[0].instructions).toBe("As requested at the time.");
  });

  it("does apply an edit to a round nobody has been asked to do yet", () => {
    const untouched: ApplicationRoundProgress[] = [
      {
        roundId: "round-0",
        roundType: "PORTFOLIO_REVIEW",
        roundName: "Portfolio",
        status: "PENDING",
      },
    ];
    const merged = mergeRoundProgress(
      [round("round-0", "PORTFOLIO_REVIEW", { instructions: "Edited before opening." })],
      untouched,
    );

    expect(merged[0].instructions).toBe("Edited before opening.");
  });
});

describe("round deadlines are enforced, not decorative", () => {
  it("treats the deadline day itself as still open", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(roundDeadlinePassed(today)).toBe(false);
  });

  it("closes the round after the deadline day", () => {
    expect(roundDeadlinePassed("2020-01-01")).toBe(true);
  });

  it("never closes a round that has no deadline", () => {
    expect(roundDeadlinePassed(undefined)).toBe(false);
    expect(roundDeadlinePassed("not a date")).toBe(false);
  });
});
