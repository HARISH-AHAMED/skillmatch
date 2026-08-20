/* ============================================================================
   FRIVVO — DOMAIN TYPES
   Mirrors the data model in the master specification (§5). UI-only for now;
   these shapes are what the persistence layer will be built against later.
   ========================================================================= */

export type Role = "ADMIN" | "COMPANY" | "FREELANCER";

export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH";

export type ProjectStatus =
  | "DRAFT"
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED"
  | "CANCELLED"
  | "ARCHIVED";

export type ApplicationStatus = "PENDING" | "SHORTLISTED" | "REJECTED" | "HIRED";

export type CompensationType = "FIXED" | "HOURLY" | "MILESTONE" | "STIPEND" | "UNPAID";

export type StipendFrequency = "ONE_TIME" | "WEEKLY" | "MONTHLY";

export type PaymentItemStatus =
  | "PENDING"
  | "FUNDED"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "RELEASED"
  | "CANCELLED";

export type WorkLogStatus = "PENDING" | "APPROVED" | "REJECTED";

export type LedgerEntryType = "FUND" | "RELEASE" | "REFUND" | "ADJUSTMENT";

export type MeetingStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

export type MeetingAttendeeStatus = "INVITED" | "ACCEPTED" | "DECLINED";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

export type Visibility = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";

export type AvailabilityStatus = "AVAILABLE" | "BUSY" | "UNAVAILABLE";

export type OfferStatus = "PENDING" | "NEGOTIATING" | "ACCEPTED" | "DECLINED";

export type ContractStatus = "DRAFT" | "SENT" | "SIGNED" | "ACTIVE" | "COMPLETED";

export type DeliverableStatus = "PENDING" | "APPROVED" | "REVISION_REQUESTED";

/* ------------------------------------------------------------------ user --- */

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: Role;
  createdAt: string;
}

/* ------------------------------------------------------------ freelancer --- */

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  field?: string;
  startYear: string;
  endYear?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
  tags: string[];
}

export interface ProjectInvite {
  projectId: string;
  projectTitle: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  message?: string;
  roleId?: string;
  roleName?: string;
  isApprentice?: boolean;
  status: "PENDING" | "APPLIED" | "DISMISSED";
  invitedAt: string;
  respondedAt?: string;
}

export interface Freelancer {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  bannerUrl: string;
  professionalHeadline: string;
  bio: string;
  location: string;
  domain: string;
  skills: string[];
  experienceYears: number;
  rating: number;
  reviewCount: number;
  completedProjects: number;
  completionRate: number;
  responseTime: string;
  availabilityStatus: AvailabilityStatus;
  hourlyRate?: number;
  currency: string;
  languages: { name: string; level: string }[];
  verificationBadges: string[];
  portfolioUrl?: string;
  resumeUrl?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  portfolioItems: PortfolioItem[];
  invites: ProjectInvite[];
  totalEarnings: number;
  gender: "ANY" | "MALE" | "FEMALE";
  apprenticeScore?: { rating: number; reviews: number };
  /** Set when the list was scored against a project, as on Project. */
  matchScore?: number;
}

/* --------------------------------------------------------------- company --- */

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  linkedin?: string;
}

export interface Company {
  id: string;
  userId: string;
  companyName: string;
  email: string;
  logoUrl: string;
  bannerUrl: string;
  description: string;
  industry: string;
  website?: string;
  location: string;
  officeLocations: string[];
  companySize: string;
  foundedYear: number;
  linkedin?: string;
  phone?: string;
  missionVision: string;
  workCulture: string;
  hiringPhilosophy: string;
  galleryPhotos: string[];
  galleryVideos: string[];
  benefits: string[];
  teamMembers: TeamMember[];
  verificationBadges: string[];
  trustScore: number;
  reputationScore: number;
  completionRate: number;
  retentionRate: number;
  paymentReliability: number;
  avgResponseTime: string;
  avgTimeToHire: string;
  hiringSuccessRate: number;
  rating: number;
  reviewCount: number;
  followers: string[];
  totalHires: number;
  totalSpend: number;
}

/* --------------------------------------------------------------- project --- */

export interface ProjectRole {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  slots: number;
  allowApprentice: boolean;
  sortOrder: number;
  hiredCount: number;
  apprenticeCount: number;
}

export interface ScreeningQuestion {
  id: string;
  question: string;
  type:
    | "MULTIPLE_CHOICE"
    | "YES_NO"
    | "PARAGRAPH"
    | "PORTFOLIO"
    | "VIDEO_INTRO"
    | "CODING_ASSESSMENT"
    | "ASSIGNMENT";
  options?: string[];
  required: boolean;
}

export interface ScreeningRound {
  id: string;
  type: string;
  name: string;
  description?: string;
  sortOrder: number;
  questions: ScreeningQuestion[];
  comingSoon?: boolean;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer?: string;
  askedBy?: string;
  askedByAvatar?: string;
  askedAt?: string;
  answeredAt?: string;
}

export interface ProjectCompensation {
  type: CompensationType;
  currency: string;
  totalBudget: number;
  budgetNegotiable: boolean;
  hourlyRate?: number;
  estimatedHours?: number;
  maxHours?: number;
  stipendAmount?: number;
  stipendFrequency?: StipendFrequency;
  stipendPeriods?: number;
  nonMonetaryBenefits?: string[];
  nonMonetaryDetail?: string;
}

export interface CertificateConfig {
  enabled: boolean;
  logoUrl?: string;
  title: string;
  subtitle: string;
  achievementText: string;
  signatoryName: string;
  signatoryDesignation: string;
  signatureUrl?: string;
  signatory2Name?: string;
  signatory2Designation?: string;
  signature2Url?: string;
  footerText: string;
  layout: "CLASSIC" | "MODERN" | "MINIMAL";
  logoPosition: "LEFT" | "CENTER" | "RIGHT";
  textAlign: "LEFT" | "CENTER" | "RIGHT";
  accentColor: string;
  borderStyle: "SOLID" | "DOUBLE" | "NONE";
  certificateIdPrefix: string;
}

export interface Project {
  id: string;
  companyId: string;
  company: Pick<
    Company,
    "id" | "companyName" | "logoUrl" | "location" | "industry" | "trustScore" | "rating"
  >;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  domain: string;
  bannerUrl: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  visibility: Visibility;
  isVisible: boolean;
  preferredGender: "ANY" | "MALE" | "FEMALE";
  freelancersLimit: number;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequired: number;
  objectives: string[];
  deliverables: string[];
  responsibilities: string[];
  dailyTasks: string[];
  faq: FaqEntry[];
  workingDays: string;
  timingType: string;
  duration: string;
  applicationDeadline?: string;
  projectStart?: string;
  expectedCompletion?: string;
  dueDate?: string;
  compensation: ProjectCompensation;
  roles: ProjectRole[];
  rounds: ScreeningRound[];
  certificate: CertificateConfig;
  applicantCount: number;
  hiredCount: number;
  viewCount: number;
  savedCount: number;
  createdAt: string;
  updatedAt: string;
  matchScore?: number;
}

/* ----------------------------------------------------------- application --- */

export interface PipelineEvent {
  id: string;
  stage: string;
  note?: string;
  recruiterName: string;
  createdAt: string;
}

export interface NegotiationEntry {
  id: string;
  by: "FREELANCER" | "COMPANY";
  proposedAmount: number;
  proposedCurrency: string;
  proposedCategory: string;
  message: string;
  createdAt: string;
  outcome?: "ACCEPTED" | "REJECTED";
  previousAmount?: number;
}

export interface OfferLetter {
  id: string;
  status: OfferStatus;
  offerText: string;
  amount: number;
  currency: string;
  category: string;
  benefits: string[];
  milestones: { title: string; amount: number; dueDate?: string }[];
  sentAt: string;
  respondedAt?: string;
  negotiations: NegotiationEntry[];
}

export interface DigitalContract {
  id: string;
  status: ContractStatus;
  freelancerSigned: boolean;
  freelancerSignedAt?: string;
  freelancerIp?: string;
  clientSigned: boolean;
  clientSignedAt?: string;
  clientIp?: string;
  milestones: { title: string; amount: number; dueDate?: string }[];
  terms: string[];
}

export interface Interview {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl?: string;
  status: "SCHEDULED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED";
  note?: string;
}

export interface Application {
  id: string;
  projectId: string;
  project: Pick<
    Project,
    "id" | "title" | "bannerUrl" | "status" | "compensation" | "company" | "domain" | "dueDate"
  >;
  freelancerId: string;
  freelancer: Pick<
    Freelancer,
    | "id"
    | "userId"
    | "name"
    | "avatarUrl"
    | "professionalHeadline"
    | "skills"
    | "rating"
    | "experienceYears"
    | "location"
    | "completedProjects"
  >;
  roleId?: string;
  roleName?: string;
  isApprentice: boolean;
  teamConfirmedAt?: string;
  coverLetter: string;
  screeningAnswers: { questionId: string; question: string; answer: string }[];
  aiScore: number;
  scoreBreakdown: {
    skillMatch: number;
    experienceMatch: number;
    ratingMatch: number;
    completionRateMatch: number;
    priorityMatch: number;
  };
  status: ApplicationStatus;
  pipelineHistory: PipelineEvent[];
  offer?: OfferLetter;
  contract?: DigitalContract;
  interview?: Interview;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------- financial --- */

export interface PaymentItem {
  id: string;
  projectId: string;
  applicationId: string;
  assigneeName: string;
  assigneeAvatar: string;
  title: string;
  description?: string;
  sortOrder: number;
  amount: number;
  currency: string;
  status: PaymentItemStatus;
  dueDate?: string;
  fundedAmount: number;
  releasedAmount: number;
  submissionNote?: string;
  reviewNote?: string;
  revisionCount: number;
  submittedAt?: string;
  reviewedAt?: string;
  releasedAt?: string;
  createdAt: string;
}

export interface WorkLog {
  id: string;
  projectId: string;
  applicationId: string;
  freelancerName: string;
  freelancerAvatar: string;
  workDate: string;
  hours: number;
  description: string;
  status: WorkLogStatus;
  rateSnapshot: number;
  currency: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface StipendPeriod {
  id: string;
  projectId: string;
  applicationId: string;
  freelancerName: string;
  periodIndex: number;
  periodStart?: string;
  periodEnd?: string;
  amount: number;
  currency: string;
  status: "PENDING" | "RELEASED";
  releasedAt?: string;
}

export interface LedgerEntry {
  id: string;
  projectId: string;
  applicationId: string;
  paymentItemId?: string;
  type: LedgerEntryType;
  amount: number;
  currency: string;
  actorName: string;
  note?: string;
  idempotencyKey: string;
  createdAt: string;
}

/* --------------------------------------------------------- collaboration --- */

export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: Role;
  content: string;
  channel: string;
  seen: boolean;
  createdAt: string;
  attachment?: { name: string; size: string; type: string };
}

export interface SharedFile {
  id: string;
  projectId: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedByAvatar: string;
  fileName: string;
  fileUrl: string;
  channel: string;
  uploadedAt: string;
  meta: {
    size: string;
    mime: string;
    isDeliverable: boolean;
    status?: DeliverableStatus;
    version?: number;
    feedback?: string;
    revisionCount?: number;
    revisionCap?: number;
    previewUrl?: string;
  };
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  createdById: string;
  createdByName: string;
  createdByAvatar: string;
  title: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: ProjectPriority;
  dueDate?: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedToAvatar?: string;
  createdByName: string;
  createdAt: string;
  labels: string[];
}

export interface MeetingAttendee {
  userId: string;
  name: string;
  avatarUrl: string;
  role: Role;
  status: MeetingAttendeeStatus;
}

export interface Meeting {
  id: string;
  projectId: string;
  organizerUserId: string;
  organizerName: string;
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes: number;
  meetingUrl?: string;
  location?: string;
  status: MeetingStatus;
  attendees: MeetingAttendee[];
}

/* ---------------------------------------------------- certificates/reviews - */

export interface Certificate {
  id: string;
  publicId: string;
  projectId: string;
  freelancerId: string;
  companyId: string;
  roleTitle: string;
  skills: string[];
  durationText?: string;
  summary?: string;
  issuerName: string;
  issuerLogo?: string;
  recipientName: string;
  projectTitle: string;
  issuedAt: string;
  signer1Name?: string;
  signer1Title?: string;
  signer2Name?: string;
  signer2Title?: string;
  revokedAt?: string;
  revokeReason?: string;
  hidden?: boolean;
  config: CertificateConfig;
}

export interface Review {
  id: string;
  projectId: string;
  projectTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string;
  reviewerRole: Role;
  revieweeId: string;
  revieweeName: string;
  rating: number;
  comment: string;
  communicationScore?: number;
  paymentReliabilityScore?: number;
  projectClarityScore?: number;
  createdAt: string;
}

/* --------------------------------------------------------- notifications --- */

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  href?: string;
  kind: "application" | "money" | "message" | "team" | "meeting" | "certificate" | "system";
}

/* ------------------------------------------------------------- workspace --- */

export interface WorkspaceSummary {
  id: string;
  applicationId: string;
  projectId: string;
  label: string;
  company: string;
  companyLogo: string;
  status: ProjectStatus;
  href: string;
  unread: number;
  progress: number;
}
