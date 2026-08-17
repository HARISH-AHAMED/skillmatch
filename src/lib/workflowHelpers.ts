// Custom helper functions to serialize/deserialize recruitment workflows
// safely inside the existing database fields.

export interface RecruiterTeamMember {
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Recruiter" | "Finance" | "Viewer";
  designation: string;
  status: "INVITED" | "ACCEPTED";
  joinedAt?: string;
}

export interface CompanyOnboardingData {
  legalBusinessName: string;
  registrationNumber: string;
  gstNumber?: string;
  headquarters: string;
  companyEmail: string;
  businessPhone: string;
  team: RecruiterTeamMember[];
  status: "Pending" | "Verified" | "Rejected" | "Suspended";
  onboardedStep: number;
}

export interface AvailabilitySlot {
  dayOfWeek: string; // e.g. "Monday", "Tuesday"
  slots: string[]; // e.g. ["09:00 - 10:00", "14:00 - 15:00"]
}

export interface FreelancerOnboardingData {
  purpose: "To find a job" | "Compete & Upskill" | "To Host an Event" | "To be a Mentor";
  globalRank: number;
  points: number;
  streaks: { date: string; value: number }[]; // array of daily activity values (0 to 4)
  education: { school: string; degree: string; fieldOfStudy: string; startYear: string; endYear: string }[];
  languages: string[];
  availabilityCalendar: AvailabilitySlot[];
  identityVerified: boolean;
  portfolioVerified: boolean;
  phoneVerified: boolean;
  /**
   * Persisted apprentice reputation, kept separate from Freelancer.rating so the
   * primary score is never affected. Recomputed on each apprentice-work review.
   */
  apprenticeScore?: {
    rating: number;
    reviews: number;
    updatedAt: string;
  };
  /**
   * Direct invitations from companies to apply to a specific listing (proactive
   * sourcing). Stored on the freelancer so the invite survives independently of
   * whether an Application row is ever created.
   */
  projectInvites?: {
    projectId: string;
    projectTitle: string;
    companyId: string;
    companyName: string;
    message?: string;
    /** Role slot the invite targets. Absent for zero-role projects. */
    roleId?: string;
    roleName?: string;
    /** Invited to shadow the role rather than fill a primary slot. */
    isApprentice?: boolean;
    status: "PENDING" | "APPLIED" | "DISMISSED";
    invitedAt: string;
    respondedAt?: string;
  }[];
}

/** Evaluation round types. The first five are the original set and are unchanged. */
export type RecruitmentRoundType =
  | "CV_PITCH"
  | "SCREENING_QUESTIONS"
  | "INTERVIEW"
  | "COGNITIVE_TEST"
  | "TECHNICAL_ASSESSMENT"
  | "VIDEO_INTRODUCTION"
  | "PORTFOLIO_REVIEW"
  | "CUSTOM_MANUAL"
  | "GROUP_TEAM_FIT"
  | "BEHAVIORAL_QUESTIONNAIRE"
  | "DESIGN_CRITIQUE"
  | "BACKGROUND_VERIFICATION"
  | "FINAL_OFFER_CALL";

/** Which config fields a round type exposes, so the editor hides everything else. */
export type RoundConfigField =
  | "instructions"
  | "maxDurationMinutes"
  | "deadline"
  | "submissionRequirements"
  | "referenceUrl"
  | "evaluationCriteria"
  | "useTeamMatchConfirmation"
  | "verificationItems"
  | "reuseProfileVerification";

export const ROUND_TYPE_CATALOG: {
  value: RecruitmentRoundType;
  label: string;
  description: string;
  icon: string;
  fields: RoundConfigField[];
}[] = [
  { value: "SCREENING_QUESTIONS", label: "Screening Questionnaire", description: "Custom technical/domain questions answered during application.", icon: "ClipboardList", fields: [] },
  { value: "CV_PITCH", label: "CV Screening / Profile Review", description: "Review of cover letter, profile and resume.", icon: "FileText", fields: ["instructions"] },
  { value: "INTERVIEW", label: "Recruiter Panel Interview", description: "Live 1-on-1 or panel interview with recruiters.", icon: "Users", fields: ["instructions", "deadline"] },
  { value: "COGNITIVE_TEST", label: "Cognitive Skill Assessment", description: "Aptitude and reasoning assessment.", icon: "Brain", fields: ["instructions", "deadline"] },
  { value: "TECHNICAL_ASSESSMENT", label: "Technical Coding Assessment", description: "Hands-on coding or technical task.", icon: "Code", fields: ["instructions", "deadline", "evaluationCriteria"] },
  { value: "VIDEO_INTRODUCTION", label: "Video Introduction", description: "Candidate records a short video answer instead of a live call — screening at scale.", icon: "Video", fields: ["instructions", "maxDurationMinutes", "deadline"] },
  { value: "PORTFOLIO_REVIEW", label: "Portfolio / Work Sample Review", description: "Review of actual candidate work — distinct from CV screening.", icon: "FolderOpen", fields: ["instructions", "submissionRequirements", "referenceUrl", "deadline"] },
  { value: "CUSTOM_MANUAL", label: "Custom Manual Round", description: "Freely defined round with your own name and instructions.", icon: "Pencil", fields: ["instructions"] },
  { value: "GROUP_TEAM_FIT", label: "Group / Team Fit Session", description: "Shortlisted freelancer meets the assembling team before final confirmation.", icon: "Users", fields: ["instructions", "useTeamMatchConfirmation", "deadline"] },
  { value: "BEHAVIORAL_QUESTIONNAIRE", label: "Behavioral / Culture Fit Questionnaire", description: "Work style, communication, availability and collaboration — scored separately from technical screening.", icon: "MessageCircle", fields: ["instructions", "deadline"] },
  { value: "DESIGN_CRITIQUE", label: "Design Critique / Whiteboard", description: "Live problem-solving session observing how the candidate reasons.", icon: "PenTool", fields: ["instructions", "evaluationCriteria", "deadline"] },
  { value: "BACKGROUND_VERIFICATION", label: "Background / Identity Verification", description: "Project-specific verification request — not the platform Identity Verified badge.", icon: "ShieldCheck", fields: ["verificationItems", "reuseProfileVerification", "deadline"] },
  { value: "FINAL_OFFER_CALL", label: "Final Offer Review Call", description: "Closing call for terms, availability and compensation — not a screening stage.", icon: "PhoneCall", fields: ["instructions", "deadline"] },
];

/** Behavioural rounds score on their own track; technical scoring is untouched. */
export function roundScoreCategory(type: RecruitmentRoundType): "TECHNICAL" | "BEHAVIORAL" | "NONE" {
  if (type === "BEHAVIORAL_QUESTIONNAIRE" || type === "GROUP_TEAM_FIT") return "BEHAVIORAL";
  if (type === "CUSTOM_MANUAL" || type === "BACKGROUND_VERIFICATION" || type === "FINAL_OFFER_CALL") return "NONE";
  return "TECHNICAL";
}

export interface RecruitmentRound {
  id: string;
  name: string;
  type: RecruitmentRoundType;
  description: string;
  /**
   * Type-specific settings. Every field is optional so existing rounds — which
   * carry none of this — keep deserialising and behaving exactly as before.
   */
  config?: {
    instructions?: string;
    maxDurationMinutes?: number;
    deadline?: string;
    submissionRequirements?: string;
    referenceUrl?: string;
    evaluationCriteria?: string;
    /** Group / Team Fit reuses the project's existing team-match confirmation state. */
    useTeamMatchConfirmation?: boolean;
    /** Project-scoped verification request — distinct from the platform Identity Verified badge. */
    verificationItems?: string;
    reuseProfileVerification?: boolean;
    /** Behavioural scores are tracked apart from technical/skill screening. */
    scoreCategory?: "TECHNICAL" | "BEHAVIORAL" | "NONE";
  };
  questions?: {
    id: string;
    type: "MULTIPLE_CHOICE" | "YES_NO" | "PARAGRAPH" | "PORTFOLIO" | "VIDEO_INTRO" | "CODING_ASSESSMENT" | "ASSIGNMENT";
    question: string;
    options?: string[];
    required: boolean;
  }[];
}

/**
 * Currencies offered across the platform. Codes are ISO 4217 so amounts can be
 * handed to payment providers or Intl.NumberFormat without translation.
 */
export const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "CN¥", name: "Chinese Yuan" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "QAR", symbol: "QAR", name: "Qatari Riyal" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "ARS", symbol: "ARS$", name: "Argentine Peso" },
  { code: "CLP", symbol: "CLP$", name: "Chilean Peso" },
  { code: "COP", symbol: "COP$", name: "Colombian Peso" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "PKR", symbol: "Rs", name: "Pakistani Rupee" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
  { code: "NPR", symbol: "Rs", name: "Nepalese Rupee" },
];

/**
 * How many revision rounds a client may request on a single deliverable before
 * they must either approve it or renegotiate. Surfaced to both sides so the
 * limit is visible throughout, not discovered at the moment it blocks someone.
 */
export const DELIVERABLE_REVISION_CAP = 2;

/** Platform default when a project or offer predates currency support. */
export const DEFAULT_CURRENCY = "USD";

export function getCurrencySymbol(code?: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "$";
}

/**
 * Render an amount with its currency and billing-period suffix,
 * e.g. formatMoney(50, "EUR", "HOURLY") -> "€50/hr".
 */
export function formatMoney(
  amount: number,
  currencyCode?: string,
  category?: PaymentCategory
): string {
  // A non-monetary engagement has no cash figure — rendering "$0" would read as
  // a payment of zero rather than compensation of a different kind.
  if (isNonMonetary(category)) return "No cash payment";
  const symbol = getCurrencySymbol(currencyCode ?? DEFAULT_CURRENCY);
  return `${symbol}${amount.toLocaleString()}${getPaymentUnitLabel(category)}`;
}

/**
 * Currency a project is denominated in, read from its serialized metadata.
 * `project.budget` is a bare numeric column with no currency of its own, so
 * anything rendering it must pair it with this.
 */
export function getProjectCurrency(description?: string | null): string {
  if (!description) return DEFAULT_CURRENCY;
  return getProjectMetadataDirect(description).currency || DEFAULT_CURRENCY;
}

/**
 * Format a project's budget in the currency the company posted it with.
 * Use this instead of writing `${project.budget}` by hand.
 */
export function formatProjectBudget(project: {
  budget: number;
  description?: string | null;
}): string {
  return formatMoney(project.budget, getProjectCurrency(project.description));
}

/**
 * Billing model for an engagement.
 *  FIXED     — one agreed sum for the whole project
 *  MILESTONE — split into deliverable-based payments
 *  MONTHLY   — recurring monthly retainer
 *  HOURLY    — billed per hour worked
 */
export type PaymentCategory =
  | "FIXED"
  | "MILESTONE"
  | "MONTHLY"
  | "HOURLY"
  | "NON_MONETARY"
  | "HYBRID";

export const PAYMENT_CATEGORIES: { value: PaymentCategory; label: string; hint: string; unit: string }[] = [
  { value: "FIXED", label: "Fixed Price", hint: "One agreed sum for the entire project", unit: "total" },
  { value: "MILESTONE", label: "Milestone Based", hint: "Released as each deliverable is approved", unit: "total" },
  { value: "MONTHLY", label: "Monthly Retainer", hint: "Recurring monthly payment", unit: "per month" },
  { value: "HOURLY", label: "Hourly Rate", hint: "Billed per hour worked", unit: "per hour" },
  {
    value: "NON_MONETARY",
    label: "Non-Monetary Only",
    hint: "No cash payment — compensated through certificates, recognition, referrals or similar",
    unit: "none",
  },
  {
    value: "HYBRID",
    label: "Cash + Non-Monetary",
    hint: "A cash component plus additional non-monetary benefits",
    unit: "total",
  },
];

/**
 * Compensation model a company offers. Sits alongside the older
 * `paymentCategory` billing field and is what the browse UI renders.
 * Undefined on projects posted before this field existed.
 */
export type CompensationType = "FIXED" | "HOURLY" | "MILESTONE" | "STIPEND" | "UNPAID";

export const COMPENSATION_TYPES: { value: CompensationType; label: string; hint: string }[] = [
  { value: "FIXED", label: "Fixed Price", hint: "One agreed total for the whole project" },
  { value: "HOURLY", label: "Hourly", hint: "Billed per hour worked" },
  { value: "MILESTONE", label: "Milestone-based", hint: "Total derives from the milestone values" },
  { value: "STIPEND", label: "Stipend", hint: "A recurring or one-time stipend" },
  { value: "UNPAID", label: "Unpaid / Volunteer", hint: "No monetary compensation" },
];

export type StipendFrequency = "ONE_TIME" | "WEEKLY" | "MONTHLY";

export const STIPEND_FREQUENCIES: { value: StipendFrequency; label: string; suffix: string }[] = [
  { value: "ONE_TIME", label: "One-time", suffix: "" },
  { value: "WEEKLY", label: "Weekly", suffix: "/week" },
  { value: "MONTHLY", label: "Monthly", suffix: "/month" },
];

/**
 * Human-readable compensation line for a project card, e.g. "$25,000 Fixed"
 * or "$500/hr". Projects predating compensation types fall back to the plain
 * budget rendering so nothing regresses.
 */
export function formatCompensation(project: { budget: number; description?: string | null }): string {
  const meta = getProjectMetadataDirect(project.description || "");
  const symbol = getCurrencySymbol(meta.currency || DEFAULT_CURRENCY);
  const amount = (n: number) => `${symbol}${(n || 0).toLocaleString()}`;

  switch (meta.compensationType) {
    case "UNPAID":
      return "Unpaid / Volunteer";
    case "MILESTONE":
      return "Milestone-based";
    case "HOURLY":
      return `${amount(meta.paymentRate ?? project.budget)}/hr`;
    case "STIPEND": {
      const suffix = STIPEND_FREQUENCIES.find((f) => f.value === (meta.stipendFrequency || "MONTHLY"))?.suffix ?? "";
      return `${amount(meta.paymentRate ?? project.budget)}${suffix} Stipend`;
    }
    case "FIXED":
      return meta.budgetNegotiable
        ? `${amount(project.budget)} Fixed (Negotiable)`
        : `${amount(project.budget)} Fixed`;
    default:
      return formatProjectBudget(project);
  }
}

/**
 * V1 certificate template configuration. Stored on the project alongside the
 * other metadata so it can be reused each time a certificate is issued.
 * Only the presentation is configurable — every factual value (freelancer,
 * role, skills, dates, certificate id) is filled from Talentra data at issue time.
 */
export interface CertificateConfig {
  logoUrl: string | null;
  title: string;
  subtitle: string;
  achievementText: string;
  signatoryName: string;
  signatoryDesignation: string;
  /** Optional co-signatory, mirroring the dual-signature convention on printed certificates. */
  signatory2Name?: string;
  signatory2Designation?: string;
  footerText: string;
  layout: "CLASSIC" | "MODERN" | "MINIMAL";
  logoPosition: "LEFT" | "CENTER" | "RIGHT";
  textAlign: "LEFT" | "CENTER" | "RIGHT";
  accentColor: string;
  borderStyle: "SOLID" | "DOUBLE" | "NONE";
  /** Stable prefix for every certificate issued from this project. */
  certificateIdPrefix: string;
}

export const CERTIFICATE_LAYOUTS: { value: CertificateConfig["layout"]; label: string }[] = [
  { value: "CLASSIC", label: "Classic" },
  { value: "MODERN", label: "Modern" },
  { value: "MINIMAL", label: "Minimal" },
];

export const CERTIFICATE_BORDERS: { value: CertificateConfig["borderStyle"]; label: string }[] = [
  { value: "SOLID", label: "Solid" },
  { value: "DOUBLE", label: "Double" },
  { value: "NONE", label: "None" },
];

/** Unique, human-readable certificate identifier prefix for a project. */
export function generateCertificateIdPrefix(): string {
  return "TAL-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** The single professional default template a company starts from. */
export function defaultCertificateConfig(): CertificateConfig {
  return {
    logoUrl: null,
    title: "Certificate",
    subtitle: "of Completion",
    achievementText: "This certificate is proudly presented to",
    signatoryName: "",
    signatoryDesignation: "",
    signatory2Name: "",
    signatory2Designation: "",
    footerText: "Issued via Talentra",
    layout: "CLASSIC",
    logoPosition: "CENTER",
    textAlign: "CENTER",
    accentColor: "#1968E5",
    borderStyle: "SOLID",
    certificateIdPrefix: generateCertificateIdPrefix(),
  };
}

/** Estimated total for an hourly engagement. Zero when either input is missing. */
export function estimatedHourlyTotal(rate?: number, hours?: number): number {
  return (rate || 0) * (hours || 0);
}

/** True when the compensation model needs no cash amount at all. */
export function isUnpaidCompensation(type?: CompensationType): boolean {
  return type === "UNPAID";
}

/** True when the category involves no cash at all, so amount inputs should be hidden. */
export function isNonMonetary(category?: PaymentCategory): boolean {
  return category === "NON_MONETARY";
}

/** True when the engagement carries non-monetary benefits (alone or alongside cash). */
export function supportsBenefits(category?: PaymentCategory): boolean {
  return category === "NON_MONETARY" || category === "HYBRID";
}

/**
 * Non-cash compensation a company can offer. Modelled as a multi-select because
 * real listings almost always combine several (e.g. certificate + LOR + credit).
 */
export type NonMonetaryBenefit =
  | "CERTIFICATE"
  | "LETTER_OF_RECOMMENDATION"
  | "RECOGNITION"
  | "PORTFOLIO_RIGHTS"
  | "TESTIMONIAL"
  | "MENTORSHIP"
  | "TRAINING"
  | "ACADEMIC_CREDIT"
  | "JOB_REFERRAL"
  | "FULL_TIME_CONSIDERATION"
  | "NETWORKING"
  | "EQUITY"
  | "REVENUE_SHARE"
  | "PRIZE"
  | "SWAG"
  | "EXPENSES_COVERED";

export const NON_MONETARY_BENEFITS: {
  value: NonMonetaryBenefit;
  label: string;
  hint: string;
  /** Verifiable credentials the platform could later issue and validate. */
  credential?: boolean;
}[] = [
  { value: "CERTIFICATE", label: "Certificate of Completion", hint: "Verifiable certificate issued on successful delivery", credential: true },
  { value: "LETTER_OF_RECOMMENDATION", label: "Letter of Recommendation", hint: "Written, signed recommendation from the company", credential: true },
  { value: "RECOGNITION", label: "Public Recognition / Credit", hint: "Named credit on the product, site or release notes" },
  { value: "PORTFOLIO_RIGHTS", label: "Portfolio Rights", hint: "Permission to publicly showcase the work" },
  { value: "TESTIMONIAL", label: "Platform Testimonial", hint: "Written review on the freelancer's Talentra profile", credential: true },
  { value: "MENTORSHIP", label: "1:1 Mentorship", hint: "Structured guidance from a senior team member" },
  { value: "TRAINING", label: "Training / Course Access", hint: "Paid course, licence or learning material provided" },
  { value: "ACADEMIC_CREDIT", label: "Academic Credit", hint: "Counts toward university coursework or internship credit", credential: true },
  { value: "JOB_REFERRAL", label: "Job Referral", hint: "Referral into the company's or partners' hiring pipeline" },
  { value: "FULL_TIME_CONSIDERATION", label: "Full-Time Consideration", hint: "Priority consideration for a paid role afterwards" },
  { value: "NETWORKING", label: "Network & Event Access", hint: "Invitations to community, events or private groups" },
  { value: "EQUITY", label: "Equity / Stock Options", hint: "Ownership stake instead of or alongside cash" },
  { value: "REVENUE_SHARE", label: "Revenue Share", hint: "Agreed percentage of revenue generated" },
  { value: "PRIZE", label: "Prize / Award", hint: "Competition prize or award pool" },
  { value: "SWAG", label: "Swag / Merchandise", hint: "Branded merchandise or hardware" },
  { value: "EXPENSES_COVERED", label: "Expenses Covered", hint: "Tools, hosting, travel or other costs reimbursed" },
];

export function getBenefitLabel(value: NonMonetaryBenefit): string {
  return NON_MONETARY_BENEFITS.find((b) => b.value === value)?.label ?? value;
}

/** Suffix for displaying an amount in a given category, e.g. "$50 /hr". */
export function getPaymentUnitLabel(category?: PaymentCategory): string {
  switch (category) {
    case "HOURLY":
      return "/hr";
    case "MONTHLY":
      return "/mo";
    default:
      return "";
  }
}

export function getPaymentCategoryLabel(category?: PaymentCategory): string {
  return PAYMENT_CATEGORIES.find((c) => c.value === category)?.label ?? "Fixed Price";
}

export interface ProjectWizardData {
  objectives: string[];
  deliverables: string[];
  responsibilities: string[];
  dailyTasks: string[];
  preferredSkills: string[];
  faq: { question: string; answer: string }[];
  timeline: {
    applicationDeadline: string;
    projectStart: string;
    expectedCompletion: string;
  };
  stipendType: "Unpaid" | "Paid" | "Stipend";
  stipendDetails?: string; // e.g., "$500 - $1000/Month"
  /**
   * How the engagement is billed. Mirrors the models used by mainstream
   * freelance marketplaces so offers and invoices can be derived from it.
   * Undefined on projects posted before this field existed — treat as FIXED.
   */
  paymentCategory?: PaymentCategory;
  /**
   * Rate matching the category: per hour for HOURLY, per month for MONTHLY,
   * total contract value for FIXED and MILESTONE.
   */
  paymentRate?: number;
  /** ISO 4217 code. Undefined on projects posted before this field existed. */
  currency?: string;
  /** Compensation model. Undefined on projects posted before this field existed. */
  compensationType?: CompensationType;
  /** Optional funding units for a FIXED engagement. Separate from milestones. */
  paymentStages?: {
    id: string;
    /** Application the stage pays. Absent on legacy single-freelancer stages. */
    applicationId?: string;
    freelancerName?: string;
    title: string;
    description?: string;
    amount: number;
    status?: "PENDING" | "FUNDED" | "SUBMITTED" | "APPROVED" | "RELEASED";
    submissionNote?: string;
    funded?: number;
    released?: number;
  }[];
  /** Funded and released totals for HOURLY work. Absent on other types. */
  hourlyFunding?: { funded: number; released: number };
  /** One entry per hourly release. Newest entries are appended. */
  hourlyPayments?: {
    id: string;
    /** Application paid. Absent on legacy single-freelancer payment rows. */
    applicationId?: string;
    date: string;
    amount: number;
    companyName: string;
    freelancerName: string;
    note?: string;
  }[];
  /** Freelancer work logs for an HOURLY engagement. Absent on other types. */
  hourlyLogs?: {
    id: string;
    /** Application the log belongs to, so hours never mix between freelancers. */
    applicationId?: string;
    freelancerUserId: string;
    freelancerName: string;
    date: string;
    hours: number;
    description: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    reviewedAt?: string;
  }[];
  /** Estimated hours for an HOURLY engagement, used to derive a total. */
  estimatedHours?: number;
  /** Payout cadence for a STIPEND engagement. */
  stipendFrequency?: StipendFrequency;
  /** Actual stipend payouts. One row per released period per application. */
  stipendPayments?: {
    id: string;
    applicationId: string;
    freelancerName: string;
    periodIndex: number;
    amount: number;
    date: string;
    companyName: string;
  }[];
  /** Company signalled the fixed budget is open to negotiation. */
  budgetNegotiable?: boolean;
  /** Certificate is issued on completion. Independent of the compensation type. */
  certificateIncluded?: boolean;
  /** Template settings used when certificates are issued. Absent when the toggle is off. */
  certificate?: CertificateConfig;
  /** Non-cash compensation offered. Relevant when category is NON_MONETARY or HYBRID. */
  nonMonetaryBenefits?: NonMonetaryBenefit[];
  /** Free-text detail for benefits that need explaining (equity %, prize pool, etc.). */
  nonMonetaryDetails?: string;
  workingDays?: string; // e.g., "5 Days/Week"
  timingType?: string; // e.g., "Full Time", "Part Time"
  screeningQuestions: {
    id: string;
    type: "MULTIPLE_CHOICE" | "YES_NO" | "PARAGRAPH" | "PORTFOLIO" | "VIDEO_INTRO" | "CODING_ASSESSMENT" | "ASSIGNMENT";
    question: string;
    options?: string[]; // only for MCQ
    required: boolean;
  }[];
  visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
  category?: string;
  subcategory?: string;
  duration?: string;
  rounds?: RecruitmentRound[];
}

export interface ApplicationPipelineEvent {
  stage: string;
  timestamp: string;
  notes?: string;
  recruiterId?: string;
  recruiterName?: string;
  meetingLink?: string;
  interviewDate?: string;
}

export interface ApplicationWorkflowData {
  pipelineHistory: ApplicationPipelineEvent[];
  screeningAnswers: Record<string, string>; // questionId -> answer (or fileUrl/text)
  digitalContract?: {
    contractText: string;
    freelancerSigned: boolean;
    freelancerSignedAt?: string;
    freelancerIp?: string;
    clientSigned: boolean;
    clientSignedAt?: string;
    clientIp?: string;
    signedContractText?: string;
    status: "DRAFT" | "SENT" | "SIGNED" | "ACTIVE" | "COMPLETED";
    milestones: { title: string; budget: number; status: "PENDING" | "ESCROWED" | "RELEASED" }[];
  };
  /**
   * DATA-006 — `escrowMilestones` was declared here and never written or read
   * by any code path. Removed rather than left as a field future readers would
   * assume carries state. Payment items are the real store (COMP-010).
   */
  extensionRequests?: {
    requestedDueDate: string;
    reason: string;
    status: "PENDING" | "APPROVED" | "DENIED";
    feedback?: string;
  }[];
  disputes?: {
    reason: string;
    createdAt: string;
    status: "OPEN" | "RESOLVED";
    resolutionNotes?: string;
  }[];
  offerLetter?: {
    offerText: string;
    stipendAmount: number;
    milestones: { title: string; budget: number; status: "PENDING" | "ESCROWED" | "RELEASED" }[];
    /** Billing model offered. Undefined on offers predating this field — treat as FIXED. */
    paymentCategory?: PaymentCategory;
    /** ISO 4217 code the offer is denominated in. Defaults to DEFAULT_CURRENCY. */
    currency?: string;
    /** Non-cash compensation included in this offer. */
    nonMonetaryBenefits?: NonMonetaryBenefit[];
    nonMonetaryDetails?: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "NEGOTIATING";
    reason?: string;
    sentAt: string;
    respondedAt?: string;
    /**
     * Counter-offer raised by the freelancer. The company either accepts it
     * (terms are copied onto the offer and it returns to PENDING for final
     * acceptance) or rejects it (original terms stand). Full history is kept
     * so both sides can see how the terms evolved.
     */
    negotiation?: {
      proposedAmount: number;
      proposedCategory: PaymentCategory;
      proposedCurrency?: string;
      proposedBenefits?: NonMonetaryBenefit[];
      message?: string;
      status: "PENDING" | "ACCEPTED" | "REJECTED";
      requestedAt: string;
      respondedAt?: string;
      responseNote?: string;
      /** Terms in force when this counter-offer was raised. */
      previousAmount: number;
      previousCategory: PaymentCategory;
      previousCurrency?: string;
      previousBenefits?: NonMonetaryBenefit[];
    }[];
  };
}

// ----------------------------------------------------
// Parser & Serializer Functions
// ----------------------------------------------------

/**
 * Safely parse JSON from a string, returning a default fallback object on error.
 */
/** The delimiter every serializer in this module writes. */
export const METADATA_MARKER = "\n\nMETADATA_JSON_BLOCK:";

function safeJsonParse<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    const trimmed = jsonStr.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return JSON.parse(trimmed) as T;
    }
  } catch (e) {
    console.warn("Failed to parse JSON field:", e);
  }
  return fallback;
}

// Company Metadata Parser & Serializer
export function parseCompanyMetadata(descriptionField: string | null | undefined): CompanyOnboardingData {
  const fallback: CompanyOnboardingData = {
    legalBusinessName: "",
    registrationNumber: "",
    gstNumber: "",
    headquarters: "",
    companyEmail: "",
    businessPhone: "",
    team: [],
    status: "Pending",
    onboardedStep: 1,
  };
  if (!descriptionField) return fallback;
  if (descriptionField.includes("\n\nMETADATA_JSON_BLOCK:")) {
    const jsonStr = descriptionField.split("\n\nMETADATA_JSON_BLOCK:")[1];
    return safeJsonParse(jsonStr, fallback);
  }
  if (descriptionField.trim().startsWith("{")) {
    return safeJsonParse(descriptionField, fallback);
  }
  return fallback;
}

export function serializeCompanyMetadata(originalDescription: string, data: CompanyOnboardingData): string {
  const cleanDesc = getCompanyDescriptionText(originalDescription);
  return `${cleanDesc}\n\nMETADATA_JSON_BLOCK:${JSON.stringify(data)}`;
}

export function getCompanyDescriptionText(fullDescription: string | null | undefined): string {
  if (!fullDescription) return "";
  if (fullDescription.includes("\n\nMETADATA_JSON_BLOCK:")) {
    return fullDescription.split("\n\nMETADATA_JSON_BLOCK:")[0];
  }
  if (fullDescription.trim().startsWith("{")) {
    return "";
  }
  return fullDescription;
}

// Freelancer Metadata Parser & Serializer
export function parseFreelancerMetadata(bioField: string | null | undefined): FreelancerOnboardingData {
  const fallback: FreelancerOnboardingData = {
    purpose: "To find a job",
    globalRank: 1832289,
    points: 20,
    streaks: [],
    education: [],
    languages: [],
    availabilityCalendar: [],
    identityVerified: false,
    portfolioVerified: false,
    phoneVerified: false,
  };
  if (!bioField) return fallback;
  if (bioField.includes("\n\nMETADATA_JSON_BLOCK:")) {
    const jsonStr = bioField.split("\n\nMETADATA_JSON_BLOCK:")[1];
    return safeJsonParse(jsonStr, fallback);
  }
  if (bioField.trim().startsWith("{")) {
    return safeJsonParse(bioField, fallback);
  }
  return fallback;
}

export function serializeFreelancerMetadata(originalBio: string, data: FreelancerOnboardingData): string {
  const cleanBio = getFreelancerBioText(originalBio);
  return `${cleanBio}\n\nMETADATA_JSON_BLOCK:${JSON.stringify(data)}`;
}

export function getFreelancerBioText(fullBio: string | null | undefined): string {
  if (!fullBio) return "";
  if (fullBio.includes("\n\nMETADATA_JSON_BLOCK:")) {
    return fullBio.split("\n\nMETADATA_JSON_BLOCK:")[0];
  }
  if (fullBio.trim().startsWith("{")) {
    return "";
  }
  return fullBio;
}

// Project Metadata Parser & Serializer
export function parseProjectMetadata(descriptionField: string | null | undefined): ProjectWizardData {
  const fallback: ProjectWizardData = {
    objectives: [],
    deliverables: [],
    responsibilities: [],
    dailyTasks: [],
    preferredSkills: [],
    faq: [],
    timeline: {
      applicationDeadline: "",
      projectStart: "",
      expectedCompletion: "",
    },
    stipendType: "Paid",
    stipendDetails: "",
    workingDays: "5 Days/Week",
    timingType: "Full Time",
    screeningQuestions: [],
    visibility: "PUBLIC",
    // LEG-002 — deliberately absent, not []. An empty array here would be
    // indistinguishable from a project that configured zero rounds on purpose,
    // which is exactly the distinction the default-seeding below depends on.
  };

  /**
   * LEG-003 — this detected metadata by sniffing for the literal {"objectives"
   * substring, so it depended on JSON.stringify key ordering. Any refactor that
   * reordered ProjectWizardData would silently orphan every project s metadata,
   * resetting all payment state to defaults.
   *
   * The explicit marker is now checked first, and the substring sniff is kept
   * only as a fallback for rows written before the marker existed.
   */
  let parsed = fallback;
  if (descriptionField?.includes(METADATA_MARKER)) {
    parsed = safeJsonParse(descriptionField.split(METADATA_MARKER)[1], fallback);
  } else if (descriptionField) {
    const startIdx = descriptionField.indexOf("{");
    if (startIdx !== -1) {
      parsed = safeJsonParse(descriptionField.substring(startIdx), fallback);
    }
  }

  /**
   * LEG-002 — this injected three default rounds into ANY project whose rounds
   * array was empty, on every read. A company that deliberately configured zero
   * rounds got three back, and because it happened at parse time the next write
   * persisted them.
   *
   * Defaults are now applied only when the field is genuinely absent (a project
   * predating the feature), never when it is present and deliberately empty.
   */
  if (parsed.rounds === undefined) {
    parsed.rounds = [
      {
        id: "r-cv",
        name: "CV Pitch & Profile Review",
        type: "CV_PITCH",
        description: "Initial application screening round where candidates submit cover letters, profiles, and resumes."
      },
      {
        id: "r-questions",
        name: "Screening Questionnaire",
        type: "SCREENING_QUESTIONS",
        description: "Required pre-screening questions round to evaluate basic domain knowledge.",
        questions: parsed.screeningQuestions || []
      },
      {
        id: "r-interview",
        name: "Recruiter Interview Round",
        type: "INTERVIEW",
        description: "1-on-1 online face-to-face evaluation round with recruiter panel."
      }
    ];
  }
  
  return parsed;
}

/**
 * ARCH-002 — `Project.description` grew without bound on every save.
 *
 * `serializeProjectMetadata` appends a generated `Objectives: …` line before the
 * JSON block. Callers pass it `getProjectDescriptionText(description)`, which
 * returns everything before the marker — *including the line appended by the
 * previous save*. Every funding, release, work-log review, stipend payout and
 * FAQ reply therefore added another copy, permanently.
 *
 * This strips any previously-generated trailing sections before re-appending,
 * which both stops the growth and repairs already-affected rows the next time
 * they are written. `serializeProjectMetadata` is the only producer of this
 * line, and it always emits it last, so anchoring to the end of the string
 * cannot eat a description the user actually wrote.
 */
const GENERATED_OBJECTIVES_SUFFIX = /(?:\n\nObjectives:[^\n]*)+$/;

export function stripGeneratedSections(text: string): string {
  return text.replace(GENERATED_OBJECTIVES_SUFFIX, "");
}

export function serializeProjectMetadata(originalDescription: string, data: ProjectWizardData): string {
  const cleanDescription = stripGeneratedSections(originalDescription);
  const plainTextSummary = `${cleanDescription}\n\nObjectives: ${data.objectives.join(". ")}`;
  return `${plainTextSummary}\n\nMETADATA_JSON_BLOCK:${JSON.stringify(data)}`;
}

export function getProjectDescriptionText(fullDescription: string | null | undefined): string {
  if (!fullDescription) return "";
  const beforeMetadata = fullDescription.includes("\n\nMETADATA_JSON_BLOCK:")
    ? fullDescription.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : fullDescription;
  // Rows written before ARCH-002 was fixed carry accumulated generated lines;
  // strip them so the prose reads correctly even before the row is rewritten.
  return stripGeneratedSections(beforeMetadata);
}

export function getProjectMetadataDirect(fullDescription: string | null | undefined): ProjectWizardData {
  if (!fullDescription) return parseProjectMetadata("");
  if (fullDescription.includes("\n\nMETADATA_JSON_BLOCK:")) {
    const jsonStr = fullDescription.split("\n\nMETADATA_JSON_BLOCK:")[1];
    return safeJsonParse(jsonStr, parseProjectMetadata(""));
  }
  return parseProjectMetadata(fullDescription);
}

// Application Metadata Parser & Serializer
export function parseApplicationMetadata(coverLetterField: string | null | undefined): ApplicationWorkflowData {
  const fallback: ApplicationWorkflowData = {
    pipelineHistory: [],
    screeningAnswers: {},
  };

  if (coverLetterField && coverLetterField.includes("\n\nMETADATA_JSON_BLOCK:")) {
    const jsonStr = coverLetterField.split("\n\nMETADATA_JSON_BLOCK:")[1];
    return safeJsonParse(jsonStr, fallback);
  }
  
  return fallback;
}

export function getApplicationCoverLetterText(coverLetterField: string | null | undefined): string {
  if (!coverLetterField) return "";
  if (coverLetterField.includes("\n\nMETADATA_JSON_BLOCK:")) {
    return coverLetterField.split("\n\nMETADATA_JSON_BLOCK:")[0];
  }
  return coverLetterField;
}

export function serializeApplicationMetadata(originalCoverLetter: string, data: ApplicationWorkflowData): string {
  return `${originalCoverLetter}\n\nMETADATA_JSON_BLOCK:${JSON.stringify(data)}`;
}
