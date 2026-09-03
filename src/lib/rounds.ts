import type { Tone } from "./constants";
import {
  roundRuntimeMode,
  roundTypeLabel,
  type ApplicationRoundProgress,
  type RecruitmentRound,
} from "./workflowHelpers";

/* ============================================================================
   SELECTION ROUND STATE

   Pure helpers shared by the round actions and the two panels that render
   them. Progress lives in the application's workflow metadata block — one
   entry per configured round — so every round type has somewhere to record its
   request, the candidate's submission and the reviewer's verdict.
   ========================================================================= */

/** A fresh entry for a round nobody has acted on yet. */
export function seedRoundEntry(round: RecruitmentRound): ApplicationRoundProgress {
  const mode = roundRuntimeMode(round.type);
  return {
    roundId: round.id,
    roundType: round.type,
    roundName: round.name || roundTypeLabel(round.type),
    // Screening answers arrive with the application itself, so that round is
    // waiting on the reviewer from the moment it exists.
    status: mode === "APPLICATION" ? "SUBMITTED" : "PENDING",
    instructions: round.config?.instructions,
    deadline: round.config?.deadline,
    ...(mode === "APPLICATION"
      ? {
          submission: {
            text: "Answered in the application.",
            submittedAt: new Date().toISOString(),
          },
        }
      : {}),
  };
}

/** Progress entries for a brand-new application. */
export function seedRoundProgress(rounds: RecruitmentRound[]): ApplicationRoundProgress[] {
  return rounds.map(seedRoundEntry);
}

/**
 * Stored progress, extended with any round configured after this application
 * was submitted. Entries for rounds since removed from the project are kept at
 * the end, so a recorded review is never silently discarded.
 */
export function mergeRoundProgress(
  rounds: RecruitmentRound[],
  stored: ApplicationRoundProgress[],
): ApplicationRoundProgress[] {
  const byId = new Map(stored.map((entry) => [entry.roundId, entry]));
  const merged = rounds.map((round) => {
    const existing = byId.get(round.id);
    byId.delete(round.id);
    if (!existing) return seedRoundEntry(round);
    return {
      ...existing,
      roundName: round.name || existing.roundName,
      // Configuration edits reach rounds that have not been opened yet.
      instructions: existing.requestedAt ? existing.instructions : round.config?.instructions,
      deadline: existing.requestedAt ? existing.deadline : round.config?.deadline,
    };
  });
  return [...merged, ...byId.values()];
}

/** True once the deadline day has fully elapsed. */
export function roundDeadlinePassed(deadline?: string): boolean {
  if (!deadline || Number.isNaN(Date.parse(deadline))) return false;
  const due = new Date(deadline);
  due.setHours(23, 59, 59, 999);
  return Date.now() > due.getTime();
}

export const ROUND_STATUS_LABEL: Record<ApplicationRoundProgress["status"], string> = {
  PENDING: "Not started",
  AWAITING_CANDIDATE: "Awaiting candidate",
  SUBMITTED: "Ready for review",
  PASSED: "Cleared",
  FAILED: "Not cleared",
};

export function roundStatusTone(
  status: ApplicationRoundProgress["status"],
): Tone {
  switch (status) {
    case "AWAITING_CANDIDATE":
      return "warning";
    case "SUBMITTED":
      return "info";
    case "PASSED":
      return "success";
    case "FAILED":
      return "error";
    default:
      return "neutral";
  }
}
