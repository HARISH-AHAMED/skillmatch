import type {
  Application,
  ContractStatus,
  DigitalContract,
  Interview,
  NegotiationEntry,
  OfferLetter,
  OfferStatus,
  PipelineEvent,
  Project,
} from "@/lib/types";
import {
  DEFAULT_CURRENCY,
  getApplicationCoverLetterText,
  parseApplicationMetadata,
  type ApplicationWorkflowData,
} from "@/lib/workflowHelpers";
import {
  calculateExperienceMatch,
  calculatePriorityMatch,
  calculateSkillMatch,
} from "@/services/aiRecommendation";
import type { ApplicationRow } from "./include";
import { toFreelancerSummary } from "./profiles";
import { toProjectSummary } from "./projects";
import { iso, opt } from "./scalars";

/* ============================================================================
   APPLICATION ADAPTER

   Everything the hiring flow accumulates — pipeline history, screening answers,
   the offer letter and its negotiation rounds, the digital contract, interview
   scheduling — lives in the workflow metadata block on Application.coverLetter.
   ========================================================================= */

export interface ApplicationExtras {
  /** Question id → question text, resolved from the project's rounds. */
  questionText?: Map<string, string>;
  companyRating?: number;
}

/* ------------------------------------------------------------- pipeline --- */

function toPipeline(meta: ApplicationWorkflowData): PipelineEvent[] {
  return (meta.pipelineHistory ?? []).map((event, index) => ({
    id: "evt-" + index,
    stage: event.stage,
    note: event.notes,
    recruiterName: event.recruiterName || "Recruiter",
    createdAt: event.timestamp,
  }));
}

/**
 * There is no interview table: scheduling writes the date and joining link onto
 * the pipeline event that records it. The latest such event is the interview
 * currently in force, and a later cancellation stage supersedes it.
 */
function toInterview(meta: ApplicationWorkflowData): Interview | undefined {
  const history = meta.pipelineHistory ?? [];
  const index = [...history].map((e, i) => ({ e, i })).reverse().find(({ e }) => e.meetingLink)?.i;
  if (index === undefined) return undefined;

  const event = history[index];
  const laterStages = history.slice(index + 1).map((e) => e.stage.toLowerCase());
  const cancelled = laterStages.some((s) => s.includes("interview cancel"));
  const rescheduled = event.stage.toLowerCase().includes("reschedul");

  return {
    id: "interview-" + index,
    title: event.stage,
    scheduledAt: event.interviewDate ?? event.timestamp,
    durationMinutes: 30,
    meetingUrl: event.meetingLink,
    status: cancelled ? "CANCELLED" : rescheduled ? "RESCHEDULED" : "SCHEDULED",
    note: event.notes,
  };
}

/* ---------------------------------------------------------------- offer --- */

function toNegotiations(meta: ApplicationWorkflowData): NegotiationEntry[] {
  return (meta.offerLetter?.negotiation ?? []).map((entry, index) => ({
    id: "neg-" + index,
    // Only the freelancer can open a counter-offer; the company's answer is
    // recorded as the outcome on the same entry rather than a separate turn.
    by: "FREELANCER",
    proposedAmount: entry.proposedAmount,
    proposedCurrency: entry.proposedCurrency ?? DEFAULT_CURRENCY,
    proposedCategory: entry.proposedCategory,
    message: entry.message ?? "",
    createdAt: entry.requestedAt,
    outcome: entry.status === "PENDING" ? undefined : entry.status,
    previousAmount: entry.previousAmount,
  }));
}

function toOffer(meta: ApplicationWorkflowData): OfferLetter | undefined {
  const offer = meta.offerLetter;
  if (!offer) return undefined;

  return {
    id: "offer",
    status: offer.status as OfferStatus,
    offerText: offer.offerText,
    amount: offer.stipendAmount,
    currency: offer.currency ?? DEFAULT_CURRENCY,
    category: offer.paymentCategory ?? "FIXED",
    benefits: offer.nonMonetaryBenefits ?? [],
    milestones: (offer.milestones ?? []).map((m) => ({ title: m.title, amount: m.budget })),
    sentAt: offer.sentAt,
    respondedAt: offer.respondedAt,
    negotiations: toNegotiations(meta),
  };
}

/* ------------------------------------------------------------- contract --- */

/**
 * The contract is stored as one block of text. The signing UI lists the clauses
 * separately, so split on blank lines and drop the boilerplate heading.
 */
function toContractTerms(contractText: string): string[] {
  return contractText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !/^#/.test(block));
}

function toContract(meta: ApplicationWorkflowData): DigitalContract | undefined {
  const contract = meta.digitalContract;
  if (!contract) return undefined;

  return {
    id: "contract",
    status: contract.status as ContractStatus,
    freelancerSigned: contract.freelancerSigned,
    freelancerSignedAt: contract.freelancerSignedAt,
    freelancerIp: contract.freelancerIp,
    clientSigned: contract.clientSigned,
    clientSignedAt: contract.clientSignedAt,
    clientIp: contract.clientIp,
    milestones: (contract.milestones ?? []).map((m) => ({ title: m.title, amount: m.budget })),
    terms: toContractTerms(contract.signedContractText || contract.contractText || ""),
  };
}

/* ----------------------------------------------------------- score view --- */

/**
 * The stored `aiScore` is the weighted total. The applicant panel shows how it
 * was reached, so recompute the five components with the same pure helpers the
 * recommendation service uses — read-only, no backend involvement.
 */
export function scoreBreakdown(row: ApplicationRow): Application["scoreBreakdown"] {
  const { freelancer, project } = row;
  return {
    skillMatch: calculateSkillMatch({
      freelancerSkills: freelancer.skills,
      projectSkills: project.requiredSkills,
    }),
    experienceMatch: calculateExperienceMatch(
      freelancer.experienceYears,
      project.experienceRequired,
    ),
    ratingMatch: (freelancer.rating / 5) * 100,
    completionRateMatch: freelancer.completionRate,
    priorityMatch: calculatePriorityMatch(
      project.priority,
      freelancer.rating,
      freelancer.completionRate,
    ),
  };
}

/**
 * Question ids are all the answers store. Build the id → text map once per
 * project so every application on it can label its answers.
 */
export function questionTextMap(rounds: Project["rounds"]): Map<string, string> {
  const map = new Map<string, string>();
  for (const round of rounds) {
    for (const question of round.questions) map.set(question.id, question.question);
  }
  return map;
}

/* ---------------------------------------------------------- application --- */

export function toApplication(row: ApplicationRow, extras: ApplicationExtras = {}): Application {
  const meta = parseApplicationMetadata(row.coverLetter);

  return {
    id: row.id,
    projectId: row.projectId,
    project: toProjectSummary(row.project, { companyRating: extras.companyRating }),
    freelancerId: row.freelancerId,
    freelancer: toFreelancerSummary(row.freelancer),
    roleId: opt(row.roleId),
    roleName: row.role?.name,
    isApprentice: row.isApprentice,
    teamConfirmedAt: row.teamConfirmedAt ? iso(row.teamConfirmedAt) : undefined,
    coverLetter: getApplicationCoverLetterText(row.coverLetter),
    screeningAnswers: Object.entries(meta.screeningAnswers ?? {}).map(([questionId, answer]) => ({
      questionId,
      question: extras.questionText?.get(questionId) ?? "Screening question",
      answer,
    })),
    aiScore: row.aiScore,
    scoreBreakdown: scoreBreakdown(row),
    status: row.status,
    pipelineHistory: toPipeline(meta),
    offer: toOffer(meta),
    contract: toContract(meta),
    interview: toInterview(meta),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}
