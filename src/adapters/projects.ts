import type {
  CertificateConfig,
  CompensationType,
  FaqEntry,
  Project,
  ProjectCompensation,
  ProjectRole,
  ScreeningQuestion,
  ScreeningRound,
  StipendFrequency,
  Visibility,
} from "@/lib/types";
import {
  DEFAULT_CURRENCY,
  defaultCertificateConfig,
  getProjectDescriptionText,
  getProjectMetadataDirect,
  roundTypeLabel,
  type CertificateConfig as BackendCertificateConfig,
  type ProjectWizardData,
} from "@/lib/workflowHelpers";
import type { CompanyExtras } from "./profiles";
import { toCompanySummary } from "./profiles";
import type { ProjectRow } from "./include";
import { dec, iso, isoOrUndefined, opt, str } from "./scalars";

/* ============================================================================
   PROJECT ADAPTER

   A listing is assembled from three places, all of them existing backend state:
     • the Project row               — title, status, skills, dates, counters
     • ProjectCompensation           — the authoritative money record
     • the wizard metadata block     — objectives, deliverables, FAQ, rounds,
                                       certificate template, timing
   ========================================================================= */

/** Counts the listing carries that live on other tables. */
export interface ProjectExtras {
  hiredCount?: number;
  companyRating?: number;
  matchScore?: number;
}

/* ------------------------------------------------------------ discussion --- */

const DISCUSSION_TAG = /^\[Discussion Question by (.+?)\]:\s*/;

/**
 * Pre-application questions are stored in the same FAQ array as the company's
 * own entries, tagged with the asker's name. Unpick the tag so the UI can tell
 * a company FAQ from a freelancer question.
 */
function toFaqEntry(
  raw: { question: string; answer: string },
  index: number,
  projectCreatedAt: string,
): FaqEntry {
  const match = raw.question.match(DISCUSSION_TAG);
  return {
    id: "faq-" + index,
    question: match ? raw.question.replace(DISCUSSION_TAG, "") : raw.question,
    answer: raw.answer || undefined,
    askedBy: match ? match[1] : undefined,
    askedAt: match ? projectCreatedAt : undefined,
    answeredAt: match && raw.answer ? projectCreatedAt : undefined,
  };
}

/* --------------------------------------------------------------- rounds --- */

function toQuestion(
  raw: NonNullable<ProjectWizardData["screeningQuestions"]>[number],
): ScreeningQuestion {
  return {
    id: raw.id,
    question: raw.question,
    type: raw.type,
    options: raw.options,
    required: raw.required,
  };
}

/**
 * Rounds are the current representation; listings created before rounds existed
 * carry a flat `screeningQuestions` array instead. Present both as one round
 * list so the applicant flow has a single shape to render.
 */
function toRounds(meta: ProjectWizardData): ScreeningRound[] {
  if (meta.rounds?.length) {
    return meta.rounds.map((round, index) => ({
      id: round.id,
      type: round.type,
      name: round.name || roundTypeLabel(round.type),
      description: round.description || undefined,
      sortOrder: index,
      questions: (round.questions ?? []).map(toQuestion),
      // Only SCREENING_QUESTIONS is wired end-to-end in the backend; the rest
      // are configurable but not yet collectable, and the design already has a
      // "coming soon" treatment for exactly this case.
      comingSoon: round.type !== "SCREENING_QUESTIONS",
    }));
  }

  if (!meta.screeningQuestions?.length) return [];

  return [
    {
      id: "round-screening",
      type: "SCREENING_QUESTIONS",
      name: "Screening Questions",
      sortOrder: 0,
      questions: meta.screeningQuestions.map(toQuestion),
    },
  ];
}

/* ---------------------------------------------------------- certificate --- */

export function toCertificateConfig(
  raw: BackendCertificateConfig | undefined,
  enabled: boolean,
): CertificateConfig {
  const config = raw ?? defaultCertificateConfig();
  return {
    enabled,
    logoUrl: config.logoUrl ?? undefined,
    title: config.title,
    subtitle: config.subtitle,
    achievementText: config.achievementText,
    signatoryName: config.signatoryName,
    signatoryDesignation: config.signatoryDesignation,
    signatureUrl: config.signatureUrl ?? undefined,
    signatory2Name: config.signatory2Name || undefined,
    signatory2Designation: config.signatory2Designation || undefined,
    signature2Url: config.signature2Url ?? undefined,
    footerText: config.footerText,
    layout: config.layout,
    logoPosition: config.logoPosition,
    textAlign: config.textAlign,
    accentColor: config.accentColor,
    borderStyle: config.borderStyle,
    certificateIdPrefix: config.certificateIdPrefix,
  };
}

/* --------------------------------------------------------- compensation --- */

/**
 * ProjectCompensation is authoritative (the financial rebuild moved money out
 * of the metadata blob). Listings that predate that table still carry their
 * terms in the wizard metadata, so fall back to it rather than showing zero.
 */
function toCompensation(row: ProjectRow, meta: ProjectWizardData): ProjectCompensation {
  const comp = row.compensation;

  if (comp) {
    return {
      type: comp.type as CompensationType,
      currency: comp.currency,
      totalBudget: dec(comp.totalBudget),
      budgetNegotiable: comp.budgetNegotiable,
      hourlyRate: comp.hourlyRate === null ? undefined : dec(comp.hourlyRate),
      estimatedHours: comp.estimatedHours ?? undefined,
      maxHours: comp.maxHours ?? undefined,
      stipendAmount: comp.stipendAmount === null ? undefined : dec(comp.stipendAmount),
      stipendFrequency: (comp.stipendFrequency as StipendFrequency | null) ?? undefined,
      stipendPeriods: comp.stipendPeriods ?? undefined,
      nonMonetaryBenefits: meta.nonMonetaryBenefits,
      nonMonetaryDetail: meta.nonMonetaryDetails,
    };
  }

  const type = (meta.compensationType ?? "FIXED") as CompensationType;
  return {
    type,
    currency: meta.currency ?? DEFAULT_CURRENCY,
    totalBudget: row.budget,
    budgetNegotiable: meta.budgetNegotiable ?? false,
    hourlyRate: type === "HOURLY" ? meta.paymentRate : undefined,
    estimatedHours: meta.estimatedHours,
    maxHours: undefined,
    stipendAmount: type === "STIPEND" ? meta.paymentRate : undefined,
    stipendFrequency: meta.stipendFrequency as StipendFrequency | undefined,
    stipendPeriods: undefined,
    nonMonetaryBenefits: meta.nonMonetaryBenefits,
    nonMonetaryDetail: meta.nonMonetaryDetails,
  };
}

/* ---------------------------------------------------------------- roles --- */

/**
 * `hiredCount` / `apprenticeCount` come from the applications on each role.
 * Callers that already hold the hired applications pass them in; the counts
 * default to zero rather than triggering a query per role.
 */
export function toProjectRoles(
  row: ProjectRow,
  hired: { roleId: string | null; isApprentice: boolean }[] = [],
): ProjectRole[] {
  return row.roles.map((role) => ({
    id: role.id,
    projectId: role.projectId,
    name: role.name,
    description: opt(role.description),
    slots: role.slots,
    allowApprentice: role.allowApprentice,
    sortOrder: role.sortOrder,
    hiredCount: hired.filter((a) => a.roleId === role.id && !a.isApprentice).length,
    apprenticeCount: hired.filter((a) => a.roleId === role.id && a.isApprentice).length,
  }));
}

/* -------------------------------------------------------------- project --- */

export function toProject(
  row: ProjectRow,
  extras: ProjectExtras = {},
  hired: { roleId: string | null; isApprentice: boolean }[] = [],
): Project {
  const meta = getProjectMetadataDirect(row.description);
  const createdAt = iso(row.createdAt);
  const companyExtras: CompanyExtras = { rating: extras.companyRating };

  return {
    id: row.id,
    companyId: row.companyId,
    company: toCompanySummary(row.company, companyExtras),
    title: row.title,
    description: getProjectDescriptionText(row.description),
    category: str(meta.category, "General"),
    subcategory: opt(meta.subcategory),
    domain: str(row.domain, "Other"),
    bannerUrl: str(row.bannerUrl),
    status: row.status,
    priority: row.priority,
    visibility: (meta.visibility ?? "PUBLIC") as Visibility,
    isVisible: row.isVisible,
    preferredGender: (row.preferredGender ?? "ANY") as Project["preferredGender"],
    freelancersLimit: row.freelancersLimit,
    requiredSkills: row.requiredSkills,
    preferredSkills: meta.preferredSkills ?? [],
    experienceRequired: row.experienceRequired,
    objectives: meta.objectives ?? [],
    deliverables: meta.deliverables ?? [],
    responsibilities: meta.responsibilities ?? [],
    dailyTasks: meta.dailyTasks ?? [],
    faq: (meta.faq ?? []).map((entry, index) => toFaqEntry(entry, index, createdAt)),
    workingDays: str(meta.workingDays, "5 Days/Week"),
    timingType: str(meta.timingType, "Full Time"),
    duration: str(meta.duration),
    applicationDeadline: opt(meta.timeline?.applicationDeadline),
    projectStart: opt(meta.timeline?.projectStart),
    expectedCompletion: opt(meta.timeline?.expectedCompletion),
    dueDate: isoOrUndefined(row.dueDate),
    compensation: toCompensation(row, meta),
    roles: toProjectRoles(row, hired),
    rounds: toRounds(meta),
    certificate: toCertificateConfig(meta.certificate, Boolean(meta.certificateIncluded)),
    applicantCount: row._count.applications,
    hiredCount: extras.hiredCount ?? hired.filter((a) => !a.isApprentice).length,
    // The schema has no view counter; saves are a real table, so the saved
    // count is real and views report zero rather than inventing a number.
    viewCount: 0,
    savedCount: row._count.savedByFreelancers,
    createdAt,
    updatedAt: iso(row.updatedAt),
    matchScore: extras.matchScore,
  };
}

/** The trimmed project shape embedded in Application.project. */
export function toProjectSummary(row: ProjectRow, extras: ProjectExtras = {}) {
  const meta = getProjectMetadataDirect(row.description);
  return {
    id: row.id,
    title: row.title,
    bannerUrl: str(row.bannerUrl),
    status: row.status,
    compensation: toCompensation(row, meta),
    company: toCompanySummary(row.company, { rating: extras.companyRating }),
    domain: str(row.domain, "Other"),
    dueDate: isoOrUndefined(row.dueDate),
  };
}
