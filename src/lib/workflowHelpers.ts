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
}

export interface RecruitmentRound {
  id: string;
  name: string;
  type: "CV_PITCH" | "SCREENING_QUESTIONS" | "INTERVIEW" | "COGNITIVE_TEST" | "TECHNICAL_ASSESSMENT";
  description: string;
  questions?: {
    id: string;
    type: "MULTIPLE_CHOICE" | "YES_NO" | "PARAGRAPH" | "PORTFOLIO" | "VIDEO_INTRO" | "CODING_ASSESSMENT" | "ASSIGNMENT";
    question: string;
    options?: string[];
    required: boolean;
  }[];
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
  escrowMilestones?: {
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    status: "PENDING" | "FUNDED" | "APPROVED" | "RELEASED";
  }[];
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
    status: "PENDING" | "ACCEPTED" | "DECLINED";
    reason?: string;
    sentAt: string;
    respondedAt?: string;
  };
}

// ----------------------------------------------------
// Parser & Serializer Functions
// ----------------------------------------------------

/**
 * Safely parse JSON from a string, returning a default fallback object on error.
 */
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
    rounds: [],
  };

  let parsed = fallback;
  if (descriptionField && descriptionField.includes('{"objectives"')) {
    const startIdx = descriptionField.indexOf("{");
    const jsonSub = descriptionField.substring(startIdx);
    parsed = safeJsonParse(jsonSub, fallback);
  }

  // Auto-migrate legacy projects to default recruitment rounds
  if (!parsed.rounds || parsed.rounds.length === 0) {
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

export function serializeProjectMetadata(originalDescription: string, data: ProjectWizardData): string {
  const plainTextSummary = `${originalDescription}\n\nObjectives: ${data.objectives.join(". ")}`;
  return `${plainTextSummary}\n\nMETADATA_JSON_BLOCK:${JSON.stringify(data)}`;
}

export function getProjectDescriptionText(fullDescription: string | null | undefined): string {
  if (!fullDescription) return "";
  if (fullDescription.includes("\n\nMETADATA_JSON_BLOCK:")) {
    return fullDescription.split("\n\nMETADATA_JSON_BLOCK:")[0];
  }
  return fullDescription;
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
