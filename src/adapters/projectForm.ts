import {
  serializeProjectMetadata,
  type CertificateConfig as BackendCertificateConfig,
  type ProjectWizardData,
  type RecruitmentRound,
  type RecruitmentRoundType,
} from "@/lib/workflowHelpers";
import type { CompensationType, ScreeningQuestion, Visibility } from "@/lib/types";

/* ============================================================================
   PROJECT FORM ADAPTER

   The wizard collects far more than the Project row holds. Everything beyond
   the columns — objectives, deliverables, timing, rounds, the certificate
   template, the compensation terms — is written into the metadata block the
   backend already parses out of `Project.description`, using the backend's own
   serializer. `createProject` / `editProject` then derive the canonical
   ProjectCompensation row from that same string.
   ========================================================================= */

export interface ProjectFormValues {
  title: string;
  category: string;
  subcategory: string;
  visibility: Visibility;
  freelancersLimit: string;
  preferredGender: string;

  description: string;
  objectives: string[];
  deliverables: string[];
  responsibilities: string[];
  dailyTasks: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequired: string;
  faq: { question: string; answer: string }[];

  compensationType: CompensationType;
  currency: string;
  budget: string;
  budgetNegotiable: boolean;
  hourlyRate: string;
  estimatedHours: string;
  maxHours: string;
  stipendAmount: string;
  stipendFrequency: string;
  stipendPeriods: string;
  benefits: string[];
  benefitDetail: string;
  workingDays: string;
  timingType: string;
  priority: string;
  duration: string;
  applicationDeadline: string;
  projectStart: string;
  expectedCompletion: string;

  rounds: string[];
  questions: ScreeningQuestion[];
  certificateEnabled: boolean;
  signatoryName: string;
  signatoryTitle: string;
  domain?: string;
  bannerUrl?: string | null;
}

/** Total contract value, derived the same way the wizard displays it. */
export function budgetFor(values: ProjectFormValues): number {
  if (values.compensationType === "UNPAID") return 0;
  if (values.compensationType === "HOURLY") {
    return (Number(values.hourlyRate) || 0) * (Number(values.estimatedHours) || 0);
  }
  if (values.compensationType === "STIPEND") {
    return (Number(values.stipendAmount) || 0) * (Number(values.stipendPeriods) || 1);
  }
  return Number(values.budget) || 0;
}

function certificateConfig(values: ProjectFormValues): BackendCertificateConfig | undefined {
  if (!values.certificateEnabled) return undefined;
  return {
    logoUrl: null,
    title: "Certificate",
    subtitle: "of Completion",
    achievementText: "This certificate is proudly presented to",
    signatoryName: values.signatoryName,
    signatoryDesignation: values.signatoryTitle,
    footerText: "Issued via FRIVVO",
    layout: "CLASSIC",
    logoPosition: "CENTER",
    textAlign: "CENTER",
    accentColor: "#06C755",
    borderStyle: "SOLID",
    certificateIdPrefix: "FRV",
  };
}

function toRounds(values: ProjectFormValues): RecruitmentRound[] {
  return values.rounds.map((type, index) => ({
    id: `round-${index}`,
    name: type
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" "),
    type: type as RecruitmentRoundType,
    description: "",
    // Only the screening round collects answers today, so it is the only one
    // that carries questions.
    questions: type === "SCREENING_QUESTIONS" ? values.questions : undefined,
  }));
}

/** The wizard's state as the metadata block the backend reads back. */
export function toWizardData(values: ProjectFormValues): ProjectWizardData {
  const nonEmpty = (list: string[]) => list.map((v) => v.trim()).filter(Boolean);

  return {
    objectives: nonEmpty(values.objectives),
    deliverables: nonEmpty(values.deliverables),
    responsibilities: nonEmpty(values.responsibilities),
    dailyTasks: nonEmpty(values.dailyTasks),
    preferredSkills: values.preferredSkills,
    faq: values.faq.filter((f) => f.question.trim()),
    timeline: {
      applicationDeadline: values.applicationDeadline,
      projectStart: values.projectStart,
      expectedCompletion: values.expectedCompletion,
    },
    stipendType:
      values.compensationType === "UNPAID"
        ? "Unpaid"
        : values.compensationType === "STIPEND"
          ? "Stipend"
          : "Paid",
    compensationType: values.compensationType,
    currency: values.currency,
    paymentCategory:
      values.compensationType === "UNPAID"
        ? "NON_MONETARY"
        : values.compensationType === "HOURLY"
          ? "HOURLY"
          : values.compensationType === "STIPEND"
            ? "MONTHLY"
            : values.compensationType === "MILESTONE"
              ? "MILESTONE"
              : "FIXED",
    paymentRate:
      values.compensationType === "HOURLY"
        ? Number(values.hourlyRate) || 0
        : values.compensationType === "STIPEND"
          ? Number(values.stipendAmount) || 0
          : budgetFor(values),
    estimatedHours: Number(values.estimatedHours) || undefined,
    stipendFrequency: values.stipendFrequency as ProjectWizardData["stipendFrequency"],
    budgetNegotiable: values.budgetNegotiable,
    certificateIncluded: values.certificateEnabled,
    certificate: certificateConfig(values),
    nonMonetaryBenefits: values.benefits as ProjectWizardData["nonMonetaryBenefits"],
    nonMonetaryDetails: values.benefitDetail || undefined,
    workingDays: values.workingDays,
    timingType: values.timingType,
    screeningQuestions: values.questions,
    visibility: values.visibility,
    category: values.category,
    subcategory: values.subcategory || undefined,
    duration: values.duration || undefined,
    rounds: toRounds(values),
  };
}

/** The `description` string createProject / editProject expect. */
export function toDescription(values: ProjectFormValues): string {
  return serializeProjectMetadata(values.description, toWizardData(values));
}

/** The column fields, shared by create, edit and draft-save. */
export function toProjectColumns(values: ProjectFormValues) {
  return {
    title: values.title.trim(),
    description: toDescription(values),
    budget: budgetFor(values),
    priority: values.priority as "LOW" | "MEDIUM" | "HIGH",
    requiredSkills: values.requiredSkills,
    experienceRequired: Number(values.experienceRequired) || 0,
    freelancersLimit: Number(values.freelancersLimit) || 1,
    preferredGender: values.preferredGender,
    domain: values.domain ?? values.category,
    bannerUrl: values.bannerUrl ?? null,
  };
}
