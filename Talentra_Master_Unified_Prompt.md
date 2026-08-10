# Talentra Master Blueprint & Code Generation Specification (Master of Master Prompts)

This document is the absolute, production-grade master specification and code generation blueprint for Talentra. It is designed to prevent code generation shortcuts (such as generating only the admin panel or placeholder routes). It contains granular, file-by-file specifications, exact database structures, metadata serializer rules, and interface elements for every single portal, page, subpage, and modal.

---

# SECTION 1: SYSTEM ARCHITECTURE & FILE STRUCTURE

To regenerate the application, implement the following directory layout:

```text
├── prisma/
│   ├── schema.prisma (Master Database Schema)
│   └── seed.ts (Initial Admin, Company, & Freelancer users)
├── src/
│   ├── actions/ (Server Actions implementing database mutations)
│   │   ├── authActions.ts (Register, Login, Session validations)
│   │   ├── workflowActions.ts (Onboarding steps, Recruitment pipeline transitions)
│   │   ├── companyActions.ts (Company profile settings, followers, Watchlist logs)
│   │   ├── profileActions.ts (Freelancer headlines, experience array updates)
│   │   ├── projectActions.ts (Project CRUD, visibility toggles, close project)
│   │   ├── applicationActions.ts (Project application submissions, screening answers)
│   │   ├── collaborationActions.ts (Kanban tasks, messages, shared files, deliverables)
│   │   ├── notificationActions.ts (Mark read triggers)
│   │   └── reviewActions.ts (Peer reviews, project closures)
│   ├── app/ (Routes & Pages implementing UI portals)
│   │   ├── page.tsx (Public Landing and global Search Interface)
│   │   ├── login/page.tsx (Universal credentials login screen)
│   │   ├── register/page.tsx (Unified registration screen with role toggle)
│   │   ├── admin/ (Admin Hub)
│   │   │   ├── layout.tsx (Admin sidebar navigation structure)
│   │   │   ├── dashboard/page.tsx (Analytics overview & Admin logging panels)
│   │   │   ├── users/page.tsx (User accounts directory, CRUD operations & role controls)
│   │   │   ├── kyc/page.tsx (Identity verification review queue)
│   │   │   └── settings/page.tsx (Global configurations)
│   │   ├── company/ (Company Recruiter Portal)
│   │   │   ├── layout.tsx (Recruiter sidebar navigation)
│   │   │   ├── dashboard/page.tsx (Active projects list & applicant conversions)
│   │   │   ├── profile/page.tsx (Detailed onboarding form & sub-team inviter)
│   │   │   ├── projects/ (Projects post controller)
│   │   │   │   ├── new/page.tsx (3-Step project wizard)
│   │   │   │   ├── edit/[projectId]/page.tsx (Project editing form)
│   │   │   │   └── page.tsx (All recruiter projects manager)
│   │   │   └── applicants/ (Pipelines dashboard)
│   │   │       ├── [id]/page.tsx (Timeline tracks, dm chat box, offer configurator)
│   │   │       └── page.tsx (Hiring funnel filters & conversions)
│   │   ├── freelancer/ (Freelancer Portal)
│   │   │   ├── layout.tsx (Freelancer sidebar navigation)
│   │   │   ├── dashboard/page.tsx (Matching metrics, streaks, recommendations)
│   │   │   ├── profile/page.tsx (Bio details, resumes timeline, availability calendar)
│   │   │   ├── projects/page.tsx (Job browsing dashboard with filters)
│   │   │   └── applications/page.tsx (Bids list, offer letter accept/decline card)
│   │   └── workspace/ (Collaborative Project Workspaces)
│   │       ├── downloads/route.ts (Download handlers)
│   │       └── [applicationId]/page.tsx (6-Tab Shared real-time workspace portal)
│   ├── components/ (Re-usable layout blocks)
│   │   ├── Navbar.tsx (Global navigation bar)
│   │   ├── Sidebar.tsx (Context-aware dashboard sidebar navigation)
│   │   ├── WorkspaceView.tsx (Core workspace controller rendering the 6 tabs)
│   │   ├── AnalyticsChart.tsx (Visual metrics charts)
│   │   └── CompanyOnboardingWizard.tsx (Multi-step company details form)
│   ├── lib/ (Utilities)
│   │   ├── db.ts (Prisma client singleton instance)
│   │   ├── utils.ts (Tailwind merge utilities)
│   │   └── workflowHelpers.ts (Separator-based metadata serializers)
│   └── services/ (AI core services)
│       └── aiRecommendation.ts (Match calculations & caching mechanisms)
```

---

# SECTION 2: PRODUCTION DATABASE SCHEMA (PRISMA ENGINE)

Implement this exact PostgreSQL relational schema. It enforces referential integrity constraints, relational cascade behaviors (`onDelete: Cascade` or `onDelete: SetNull`), and database query indexing.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  COMPANY
  FREELANCER
}

enum OrgRole {
  OWNER
  ADMIN
  RECRUITER
  FINANCE
  VIEWER
}

enum ProjectPriority {
  LOW
  MEDIUM
  HIGH
}

enum ProjectStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CLOSED
}

enum ApplicationStatus {
  PENDING
  SHORTLISTED
  REJECTED
  HIRED
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
  INCOMPLETE
}

enum KYCStatus {
  UNSUBMITTED
  PENDING
  APPROVED
  REJECTED
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(FREELANCER)
  passwordHash  String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  
  freelancerProfile Freelancer?
  companyProfile    Company?
  notifications     Notification[]
  reviewsWritten    Review[]        @relation("ReviewsWritten")
  reviewsReceived   Review[]        @relation("ReviewsReceived")
  adminLogs         AdminLog[]
  messages          Message[]
  sharedFiles       SharedFile[]
  projectUpdates    ProjectUpdate[]
  assignedTasks     Task[]          @relation("AssignedTasks")
  createdTasks      Task[]          @relation("CreatedTasks")
  
  // SaaS Multi-Tenancy & Subscriptions
  subscription      Subscription?
  billingHistory    BillingHistory[]
  kycVerification   KYCVerification?
  orgMemberships    OrgMember[]
}

model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?  @db.Text
  access_token       String?  @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?  @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Subscription {
  id                 String             @id @default(cuid())
  userId             String             @unique
  stripeSubscriptionId String           @unique
  stripePriceId      String
  status             SubscriptionStatus @default(ACTIVE)
  planName           String             // "FREE", "PRO", "ELITE", "GROWTH", "SCALE", "ENTERPRISE"
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean            @default(false)
  projectLimit       Int                @default(3)
  seatLimit          Int                @default(2)
  commissionRate     Float              @default(0.15) // e.g. 0.15 represents 15% platform commission
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model BillingHistory {
  id            String   @id @default(cuid())
  userId        String
  stripeInvoiceId String?
  amount        Float
  currency      String   @default("usd")
  status        String   
  receiptUrl    String?  @db.Text
  createdAt     DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model KYCVerification {
  id               String    @id @default(cuid())
  userId           String    @unique
  documentType     String    // "PASSPORT", "NATIONAL_ID", "TAX_CERTIFICATE"
  documentFileUrl  String    @db.Text
  status           KYCStatus @default(UNSUBMITTED)
  rejectionReason  String?   @db.Text
  reviewedByAdminId String?
  submittedAt      DateTime  @default(now())
  reviewedAt       DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model OrgMember {
  id           String   @id @default(cuid())
  companyId    String
  userId       String
  role         OrgRole  @default(VIEWER)
  status       String   // "PENDING", "ACTIVE", "DECLINED"
  invitedBy    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([companyId, userId])
  @@index([userId])
}

model Freelancer {
  id                String   @id @default(cuid())
  userId            String   @unique
  bio               String?  @db.Text // Serialized FreelancerOnboardingData inside
  skills            String[] 
  experienceYears   Int      @default(0)
  portfolioUrl      String?
  resumeUrl         String?
  rating            Float    @default(0.0)
  completedProjects Int      @default(0)
  completionRate    Float    @default(100.0)

  domain               String?   @default("Other")
  professionalHeadline String?
  experience           Json?     // Array of Experience
  certifications       Json?     // Array of Certification
  portfolioItems       Json?     // Array of PortfolioItem
  responseTime         String?   @default("Within 24 hours")
  availabilityStatus   String?   @default("AVAILABLE")
  gender               String?   @default("ANY")
  verificationBadges   String[]  @default([])

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  applications     Application[]
  recommendations  Recommendation[]
  savedByCompanies SavedFreelancer[]
  savedProjects    SavedProject[]
  timeLogs         TimeLog[]
}

model Company {
  id          String   @id @default(cuid())
  userId      String   @unique
  companyName String
  description String?  @db.Text // Serialized CompanyOnboardingData inside
  industry    String?
  website     String?
  location    String?
  bannerUrl   String?   @default("")
  officeLocations String[] @default([])

  logoUrl            String?   @default("")
  companySize        String?   @default("10-50 employees")
  foundedYear        Int?      @default(2020)
  linkedin           String?   @default("")
  email              String?   @default("")
  phone              String?   @default("")
  missionVision      String?   @db.Text @default("")
  workCulture        String?   @db.Text @default("")
  hiringPhilosophy   String?   @db.Text @default("")
  galleryPhotos      String[]  @default([])
  galleryVideos      String[]  @default([])
  benefits           String[]  @default([])
  verificationBadges String[]  @default([])
  trustScore         Int       @default(90)
  reputationScore    Int       @default(90)
  sentimentAnalysis  String?   @db.Text @default("")
  completionRate     Float     @default(100.0)
  retentionRate      Float     @default(100.0)
  paymentReliability Float     @default(100.0)
  avgResponseTime    String?   @default("Within 24 hours")
  avgTimeToHire      String?   @default("14 days")
  hiringSuccessRate  Float     @default(100.0)
  followers          String[]  @default([])
  watchlistUsers     String[]  @default([])
  talentCommunity    String[]  @default([])
  jobAlertsUsers     String[]  @default([])
  
  // Custom AI matching sliders
  aiWeightSkills     Float?    @default(0.50)
  aiWeightExperience Float?    @default(0.20)
  aiWeightRating     Float?    @default(0.15)
  aiWeightCompletion Float?    @default(0.10)
  aiWeightPriority   Float?    @default(0.05)

  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  projects          Project[]
  savedFreelancers  SavedFreelancer[]
  orgMembers        OrgMember[]
}

model SavedFreelancer {
  id           String   @id @default(cuid())
  companyId    String
  freelancerId String
  savedAt      DateTime @default(now())

  company    Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  freelancer Freelancer @relation(fields: [freelancerId], references: [id], onDelete: Cascade)

  @@unique([companyId, freelancerId])
  @@index([freelancerId])
}

model Project {
  id                 String          @id @default(cuid())
  companyId          String
  title              String
  description        String          @db.Text // Serialized ProjectWizardData inside
  budget             Float
  priority           ProjectPriority @default(MEDIUM)
  requiredSkills     String[]
  experienceRequired Int             @default(0)
  status             ProjectStatus   @default(OPEN)
  freelancersLimit   Int             @default(1)
  isVisible          Boolean         @default(true)
  domain             String?         @default("Other")
  preferredGender    String?         @default("ANY")
  dueDate            DateTime?
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  company         Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  applications    Application[]
  recommendations Recommendation[]
  reviews         Review[]
  savedByFreelancers SavedProject[]
  messages        Message[]
  sharedFiles       SharedFile[]
  projectUpdates  ProjectUpdate[]
  tasks           Task[]
  timeLogs        TimeLog[]

  @@index([companyId])
  @@index([status])
}

model Application {
  id           String            @id @default(cuid())
  projectId    String
  freelancerId String
  coverLetter  String            @db.Text // Serialized ApplicationWorkflowData inside
  aiScore      Float             @default(0.0)
  status       ApplicationStatus @default(PENDING)
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  project    Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  freelancer Freelancer @relation(fields: [freelancerId], references: [id], onDelete: Cascade)

  @@unique([projectId, freelancerId])
  @@index([freelancerId])
  @@index([status])
}

model Recommendation {
  id           String   @id @default(cuid())
  projectId    String
  freelancerId String
  score        Float
  createdAt    DateTime @default(now())

  project    Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  freelancer Freelancer @relation(fields: [freelancerId], references: [id], onDelete: Cascade)

  @@unique([projectId, freelancerId])
  @@index([freelancerId])
}

model Review {
  id          String   @id @default(cuid())
  projectId   String
  reviewerId  String
  revieweeId  String
  rating      Int
  comment     String   @db.Text
  createdAt   DateTime @default(now())

  communicationScore      Int?
  paymentReliabilityScore Int?
  projectClarityScore     Int?

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  reviewer User    @relation("ReviewsWritten", fields: [reviewerId], references: [id], onDelete: Cascade)
  reviewee User    @relation("ReviewsReceived", fields: [revieweeId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([reviewerId])
  @@index([revieweeId])
}

model SavedProject {
  id           String   @id @default(cuid())
  freelancerId String
  projectId    String
  savedAt      DateTime @default(now())

  freelancer Freelancer @relation(fields: [freelancerId], references: [id], onDelete: Cascade)
  project    Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([freelancerId, projectId])
  @@index([projectId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model AdminLog {
  id        String   @id @default(cuid())
  adminId   String
  action    String
  createdAt DateTime @default(now())

  admin User @relation(fields: [adminId], references: [id], onDelete: Cascade)

  @@index([adminId])
}

model Message {
  id            String   @id @default(cuid())
  projectId     String
  senderId      String
  content       String   @db.Text
  channel       String   @default("group")
  seen          Boolean  @default(false)
  createdAt     DateTime @default(now())

  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sender        User     @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([senderId])
}

model SharedFile {
  id            String   @id @default(cuid())
  projectId     String
  uploadedById  String
  fileName      String
  fileUrl       String   @db.Text
  fileSize      String?
  channel       String   @default("group")
  uploadedAt    DateTime @default(now())

  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  uploadedBy    User     @relation(fields: [uploadedById], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([uploadedById])
}

model ProjectUpdate {
  id            String   @id @default(cuid())
  projectId     String
  createdById   String
  title         String
  description   String   @db.Text
  status        String   
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy     User     @relation(fields: [createdById], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([createdById])
}

model Task {
  id            String    @id @default(cuid())
  projectId     String
  title         String
  description   String?   @db.Text
  status        String    @default("TODO") 
  priority      String    @default("MEDIUM") 
  dueDate       DateTime?
  assignedToId  String?
  createdById   String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignedTo    User?     @relation("AssignedTasks", fields: [assignedToId], references: [id], onDelete: SetNull)
  createdBy     User      @relation("CreatedTasks", fields: [createdById], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([assignedToId])
  @@index([createdById])
}

model TimeLog {
  id           String    @id @default(cuid())
  projectId    String
  freelancerId String
  hours        Float
  loggedDate   DateTime
  description  String    @db.Text
  status       String    @default("PENDING") // PENDING, APPROVED, REJECTED
  approvedById String?
  approvedAt   DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  project    Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  freelancer Freelancer @relation(fields: [freelancerId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
  @@index([freelancerId])
}
```

---

# SECTION 3: WORKFLOW HELPER METHODS & SERIALIZATION SPEC

To handle dynamic property additions without modifying database migrations frequently, Talentra serializes complex schemas within target text columns (`Company.description`, `Freelancer.bio`, `Project.description`, and `Application.coverLetter`). The division separator is the string `\n\nMETADATA_JSON_BLOCK:`.

Create a file named `src/lib/workflowHelpers.ts` matching the following helper structure:

```typescript
import { Company, Freelancer, Project, Application } from "@prisma/client";

// Global Serialization Helper
function safeJsonParse<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    const trimmed = jsonStr.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return JSON.parse(trimmed) as T;
    }
  } catch (e) {
    console.warn("Failed to parse JSON block:", e);
  }
  return fallback;
}

// 1. Company Metadata Helpers
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
  return fallback;
}

export function serializeCompanyMetadata(originalDescription: string, data: CompanyOnboardingData): string {
  const cleanDesc = originalDescription.split("\n\nMETADATA_JSON_BLOCK:")[0];
  return `${cleanDesc}\n\nMETADATA_JSON_BLOCK:${JSON.stringify(data)}`;
}

// 2. Freelancer Metadata Helpers
export interface AvailabilitySlot {
  dayOfWeek: string; 
  slots: string[]; 
}

export interface FreelancerOnboardingData {
  purpose: "To find a job" | "Compete & Upskill" | "To Host an Event" | "To be a Mentor";
  globalRank: number;
  points: number;
  streaks: { date: string; value: number }[];
  education: { school: string; degree: string; fieldOfStudy: string; startYear: string; endYear: string }[];
  languages: string[];
  availabilityCalendar: AvailabilitySlot[];
  identityVerified: boolean;
  portfolioVerified: boolean;
  phoneVerified: boolean;
}

export function parseFreelancerMetadata(bioField: string | null | undefined): FreelancerOnboardingData {
  const fallback: FreelancerOnboardingData = {
    purpose: "To find a job",
    globalRank: 1800000,
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
  return fallback;
}

export function serializeFreelancerMetadata(originalBio: string, data: FreelancerOnboardingData): string {
  const cleanBio = originalBio.split("\n\nMETADATA_JSON_BLOCK:")[0];
  return `${cleanBio}\n\nMETADATA_JSON_BLOCK:${JSON.stringify(data)}`;
}

// 3. Project Metadata Helpers
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
  stipendDetails?: string; 
  workingDays?: string; 
  timingType?: string; 
  screeningQuestions: {
    id: string;
    type: "MULTIPLE_CHOICE" | "YES_NO" | "PARAGRAPH" | "PORTFOLIO" | "VIDEO_INTRO" | "CODING_ASSESSMENT" | "ASSIGNMENT";
    question: string;
    options?: string[];
    required: boolean;
  }[];
  visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
  category?: string;
  subcategory?: string;
  duration?: string;
  rounds: RecruitmentRound[];
}

export function parseProjectMetadata(descriptionField: string | null | undefined): ProjectWizardData {
  const fallback: ProjectWizardData = {
    objectives: [],
    deliverables: [],
    responsibilities: [],
    dailyTasks: [],
    preferredSkills: [],
    faq: [],
    timeline: { applicationDeadline: "", projectStart: "", expectedCompletion: "" },
    stipendType: "Paid",
    screeningQuestions: [],
    visibility: "PUBLIC",
    rounds: [],
  };
  if (!descriptionField) return fallback;
  
  let jsonPart = "";
  if (descriptionField.includes("\n\nMETADATA_JSON_BLOCK:")) {
    jsonPart = descriptionField.split("\n\nMETADATA_JSON_BLOCK:")[1];
  } else if (descriptionField.includes('{"objectives"')) {
    jsonPart = descriptionField.substring(descriptionField.indexOf("{"));
  }
  
  const parsed = safeJsonParse(jsonPart, fallback);
  
  // Inject default pipeline rounds if empty
  if (!parsed.rounds || parsed.rounds.length === 0) {
    parsed.rounds = [
      { id: "r-cv", name: "CV Pitch & Resume review", type: "CV_PITCH", description: "Standard screening." },
      { id: "r-questions", name: "Screening Questionnaire", type: "SCREENING_QUESTIONS", description: "Custom responses assessment.", questions: parsed.screeningQuestions || [] },
      { id: "r-interview", name: "Recruiter Interview Round", type: "INTERVIEW", description: "Virtual meeting evaluation." }
    ];
  }
  return parsed;
}

export function serializeProjectMetadata(originalDescription: string, data: ProjectWizardData): string {
  const cleanText = originalDescription.split("\n\nMETADATA_JSON_BLOCK:")[0];
  return `${cleanText}\n\nMETADATA_JSON_BLOCK:${JSON.stringify(data)}`;
}

// 4. Application Stage & Escrow Metadata Helpers
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
  screeningAnswers: Record<string, string>;
  digitalContract?: {
    contractText: string;
    freelancerSigned: boolean;
    freelancerSignedAt?: string;
    freelancerIp?: string;
    clientSigned: boolean;
    clientSignedAt?: string;
    clientIp?: string;
    status: "DRAFT" | "SENT" | "SIGNED" | "ACTIVE" | "COMPLETED";
    milestones: { title: string; budget: number; status: "PENDING" | "ESCROWED" | "RELEASED" }[];
  };
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

export function parseApplicationMetadata(coverLetterField: string | null | undefined): ApplicationWorkflowData {
  const fallback: ApplicationWorkflowData = {
    pipelineHistory: [],
    screeningAnswers: {},
  };
  if (!coverLetterField) return fallback;
  if (coverLetterField.includes("\n\nMETADATA_JSON_BLOCK:")) {
    const jsonStr = coverLetterField.split("\n\nMETADATA_JSON_BLOCK:")[1];
    return safeJsonParse(jsonStr, fallback);
  }
  return fallback;
}

export function serializeApplicationMetadata(originalCoverLetter: string, data: ApplicationWorkflowData): string {
  const cleanText = originalCoverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0];
  return `${cleanText}\n\nMETADATA_JSON_BLOCK:${JSON.stringify(data)}`;
}
```

---

# SECTION 4: SERVER MUTATION ACTIONS (BUSINESS LOGIC API)

Implement all Server Actions in Next.js using `"use server"`. Throw strict authentication/authorization errors where sessions are missing or roles do not match the expected value.

### 4.1 Onboarding and Profiles (`workflowActions.ts`, `companyActions.ts`, `profileActions.ts`)
*   `submitCompanyOnboarding(formData)`:
    *   *Role Enforced*: `COMPANY`.
    *   *Validations*: Confirms legal registration numbers and business names are unique (checks other company serialized JSON metadata blocks).
    *   *Mutations*: Updates company record fields (Name, industry, logoUrl, foundedYear, size). Serializes step progress, GST details, phone numbers, andHQ addresses, and stores them in `Company.description`. Updates the verification badges array to include `"ONBOARDING_COMPLETED"`.
*   `updateFreelancerCalendarAndProfile(formData)`:
    *   *Role Enforced*: `FREELANCER`.
    *   *Mutations*: Updates Headline, experienceYears, resumeUrl, and portfolioUrl. Parses and serializes streaking activity log data, education nodes, language arrays, and availability calendar parameters into `Freelancer.bio`. Stores expectations configurations (timezones, budget requirements, and hourly rates) into the `Freelancer.experience` JSON field.
*   `toggleFollowCompany(companyId)`:
    *   Toggles the current user's ID inside the company's `followers` array.
*   `toggleWatchlist(companyId)`:
    *   Toggles the current user's ID inside the company's `watchlistUsers` array.

### 4.2 Project Posting & Bids (`projectActions.ts`, `applicationActions.ts`)
*   `createProject(formData)`:
    *   *Role Enforced*: `COMPANY`.
    *   *Validations*: Assures company verified badge array contains `"ONBOARDING_COMPLETED"`.
    *   *Mutations*: Inserts a new `Project` record. Formulates the baseline details (Title, budget, priority, requiredSkills) and serializes category tags, Objectives list, Deliverables list, Responsibilities list, screening question arrays, and custom recruitment Rounds arrays into the description text field.
*   `applyToProject(projectId, coverLetter, screeningAnswers)`:
    *   *Role Enforced*: `FREELANCER`.
    *   *Validations*: Assures freelancer profile has skills. Verifies project status is `OPEN` and candidate count is less than `freelancersLimit`.
    *   *Execution*: Calculates the AI Matching Recommendation score based on the algorithm specified in Section 8. Creates the `Application` record with status `PENDING`, serializing answers and pipeline logs inside `Application.coverLetter`. Sends a message notification to the recruiter.

### 4.3 Recruitment Funnel transitions (`workflowActions.ts`, `applicationActions.ts`)
*   `transitionApplicationStage(applicationId, targetStage, notes, interviewData)`:
    *   Transitions candidate pipeline stages. Appends events to `pipelineHistory` arrays (tracks dates, interviewer names, links, rescheduling logs). Updates `Application.status` to `SHORTLISTED` if stage transitions past screening, or `REJECTED` if transitioned to "Rejected".
*   `sendOfferLetterAction(applicationId, offerText, stipendAmount, milestones)`:
    *   Saves the offer text, payment values, and milestones into `Application.coverLetter`. Triggers notifications for freelancers.
*   `respondToOfferLetterAction(applicationId, response, reason)`:
    *   *Role Enforced*: `FREELANCER`.
    *   *Mutations*: If `response === "ACCEPTED"`, updates offer status to accepted. Updates `Application.status` to `HIRED` and `Project.status` to `IN_PROGRESS`. Initializes the digital contract details inside the coverLetter metadata object. If rejected, updates status to declined, saving the reason text.

### 4.4 Shared Workspace Collaboration (`collaborationActions.ts`, `reviewActions.ts`)
*   `signDigitalContract(applicationId, role)`:
    *   Saves IP address and signing timestamps. When both freelancer and company sign, contract status transitions to `ACTIVE`, initializing escrow milestones logs.
*   `sendMessage(projectId, content, channel)`:
    *   Inserts record in `Message` table. Sets target channels ("group", "freelancers", or custom direct messaging paths).
*   `shareFile(projectId, fileName, fileUrl, metaInfo, channel)`:
    *   Inserts record in `SharedFile` table, saving file properties, uploader details, and initializing deliverable statuses.
*   `createTask(projectId, title, description, status, priority, dueDate, assignedToId)`:
    *   Inserts Kanban tasks in `Task` table.
*   `updateTaskStatus(projectId, taskId, status)`:
    *   Mutates task status column (TODO, IN_PROGRESS, REVIEW, DONE).
*   `releaseMilestonePayment(applicationId, milestoneIndex)`:
    *   Calculates payment distributions (deducts platform fees depending on freelancer subscription tiers). Invokes Stripe payouts and marks the milestone status as `RELEASED`.
*   `completeProject(projectId)`:
    *   Transitions project status to `COMPLETED` and prompts users to submit reviews.

---

# SECTION 5: INTERACTIVE SCREEN-BY-SCREEN UI LAYOUTS SPEC

Build the frontend UI using beautiful layouts, glassmorphism elements, custom scrollbars, and modern typography (e.g. Google Fonts Outfit). Avoid browser defaults.

## 5.1 Landing page & Global Search Portal (`/`)
*   **Hero Section**: Glassmorphism cards. Render a badge styled as `"Next-Gen Talent Matching"` and heading `"Where Talent Meets Opportunity"`.
*   **Search Box**: Displays inputs for `Desired role/skill` and `Location`. Employs animations on focus.
*   **Recommendation Cards Showcase**: Renders mock profiles (such as "Marcus Thorne", "Senior Full-Stack Architect") displaying rating meters, match breakdowns (e.g. 100% Skills, 90% Experience), and tag badges for languages and skills.

## 5.2 Universal Auth Screens (`/login` & `/register`)
*   **Login View**: Forms for email and password. Includes loading icons on submit, field validations, and error messaging alerts.
*   **Register View**: Inputs for name, email, and password. Employs a custom button toggle grid to switch user roles (`Freelancer` vs `Company`) with visual status indicators.

## 5.3 Recruiter Applicant Detail View (`/company/applicants/[id]`)
An interactive candidate management interface containing three tab views:
1.  **Overview Tab**:
    *   *Header*: Candidate name, professional headline, AI match score gauge, response rates, ratings.
    *   *Pipeline Track*: Horizontal step timeline (Applied -> Shortlisted -> Interview Scheduled -> Hired) highlighted based on candidate stages.
    *   *Funnel Controller*: Action buttons to trigger stage changes: "Shortlist", "Reject", "Schedule Interview" (opens calendar date picker & meeting link modal), "Conduct Interview", and "Send Offer".
    *   *Responses*: Lists screening questions and applicant answers.
2.  **Chat Tab**: Embeds the Direct Message panel (Section 5.4.2) for direct communication with the candidate.
3.  **Offer Tab**: Forms to build candidate offers: text editor for terms, stipend range, and milestone creators. Shows statuses (`PENDING`, `ACCEPTED`, `DECLINED`) and logs reasons if declined.

## 5.4 The Six-Tab Collaborative Workspace View (`/workspace/[applicationId]`)
The main shared collaborative environment:
*   **Sidebar Navigation Tab**: Navigation buttons styled with hover states to switch active tabs: `Overview`, `Messages`, `Deliverables`, `Tasks`, `Team`, `Milestones`.

### 5.4.1 Overview Tab
*   **Milestones Progress**: Radial progress indicators tracking approved milestones.
*   **Timeline Chart**: Displays dates (kick-off, expected completion, remaining days).
*   **Announcements Feed**: Message list for project updates. Recruiter has a form to publish updates (Title, Description, and status labels PENDING, IN_PROGRESS, COMPLETED).

### 5.4.2 Messages Tab (Collaborative Communication)
*   **Layout**: Left panel lists active channels (`# group`, `# freelancers`, DMs). Right panel shows the active message thread and message inputs.
*   **Seen Indicators**: Unread tags on channel selectors that clear when clicked.
*   **Message Card**: Shows user avatar, role badge, timestamp, and message bubble. If message was sent by the current user, displays edit/delete buttons on hover.
*   **Audio Notes Visualizer**: Chat bubble displaying dynamic waveforms for voice logs (Section 7). Clicking play runs progress trackers and highlights wave bars.
*   **Workspace AI Assistant**: Floating bot panel (`showAIAssistant`). Collaborators input questions, and the bot runs query parsing (Section 6) to return database metrics.

### 5.4.3 Deliverables Tab
*   **Uploader Portal**: Hired freelancers drag/drop files. Calculates file size and adds versions.
*   **Client Review Panel**: Recruiters review deliverables and select "Approve" (opens confirmation modal to release milestone escrow) or "Request Revision" (opens feedback input modal).

### 5.4.4 Tasks Tab (Kanban Board)
*   **Board Columns**: Four lanes: `To Do`, `In Progress`, `Under Review`, and `Done`.
*   **Task Card**: Displays title, priority badges (Red = High, Yellow = Medium, Blue = Low), due date labels, and assignee avatars.
*   **Task Creator Modals**: Recruiters click "+" to open a modal with fields for Title, description, priority, assignee list, and calendar due date.

### 5.4.5 Team Tab
*   **Directory Grid**: Details of workspace members (client representative, project owner, freelancers).
*   **Profiles Info**: Bio headline summary, responsive times, availability metrics, verification badges, rating summaries, follow/watchlist options.

### 5.4.6 Milestones Tab (Digital Escrow Contract)
*   **Signatures Area**: Renders contract document. Signed status shown as green checkmarks with logged IPs and timestamps.
*   **Milestones list**: Lists milestone titles, budgets, and statuses. Shows a "Deposit Escrow" button for company users and "Request Release" for freelancers.
*   **Extension Form**: Form for freelancers to request due date extensions or budget changes. Recruiter has buttons to accept or reject.
*   **Dispute Console**: Recruiter or freelancer can click "Raise Dispute" to lock milestones and input dispute details.

---

# SECTION 6: SAAS ESCROW & BILLING INTEGRATION (STRIPE)

Subscription upgrades, budget funding, and payout transfers are managed via Stripe Connect.

## 6.1 Webhook Router Logic (`/api/webhooks/stripe`)
All events must validate Stripe webhook secret signatures. Use this event mapping logic:
*   `checkout.session.completed`:
    *   If metadata tags indicate a Subscription Checkout: Create or update `Subscription` model, mapping price IDs to plan tiers, allocating project limits, and configuring corresponding platform commission rates.
    *   If metadata tags indicate Escrow Milestone payment: Update application contract milestones from `PENDING` to `ESCROWED` and notify the freelancer.
*   `invoice.payment_succeeded`: Log entries inside the `BillingHistory` table containing transaction totals and invoice receipt links.
*   `customer.subscription.deleted`: Set company project posting limit, seat count limits, and freelancer application limits back to free basic levels.

## 6.2 Escrow Splits Server Action
When a company releases a funded milestone milestone:
1.  Action reads the milestone budget ($B$) and looks up the hired freelancer's active subscription tier to grab their commission rate ($R_{comm}$).
2.  Calculates platform fee and freelancer payout:
    $$PlatformFee = B \times R_{comm}$$
    $$Payout = B - PlatformFee$$
3.  Calls Stripe Connect transfers API to initiate transfer of $Payout$ to the freelancer's Stripe Express account, and captures $PlatformFee$ inside the company billing balance account.
4.  Updates milestone status in database to `RELEASED`.

---

# SECTION 7: INTERACTIVE VOICE NOTES & AUDIO Visualizer

The direct messaging panel integrates voice message attachments.

## 7.1 Voice Recording Simulation State
When the user clicks the `Mic` icon:
1.  `isRecordingVoice` switches to `true`.
2.  An active interval timer increments `recordingSeconds` every 1000ms.
3.  A state array `voiceWave` of 15 index heights (integers between 4 and 32) is updated dynamically every second using random heights to simulate active audio input waves:
    ```typescript
    setVoiceWave(Array.from({ length: 15 }, () => Math.floor(Math.random() * 28) + 4));
    ```
4.  On clicking "Stop & Send":
    *   Timer clears.
    *   Calculates minutes and seconds.
    *   Saves the message payload inside `Message.content` using the format: `[VOICE:voice_rec_<timestamp>.mp3|duration:M:SS]`.

## 7.2 Wave Player Component (`VoiceMessagePlayer`)
When messages load, the client checks if content starts with `[VOICE:`.
*   **UI layout**: It renders a play/pause button, a timeline tracker, and a sequence of dynamic colored CSS bars representing the soundwave:
    ```tsx
    const isPlayed = index <= Math.floor(playbackProgress * totalBars);
    ```
*   **Visual animations**: When playing, the timer increments playbackProgress, highlights active wave columns, and changes color states from slate to deep navy blue.

---

# SECTION 8: AI MATCHING & RECOMMENDATION ENGINE

Talentra computes a precise recommendation score out of 100 between Freelancers and Projects.

## 8.1 Scoring Algorithm Breakdowns
*   **Skills Match (50%)**: Let $S_f$ be the set of freelancer skills, and $S_p$ be the set of required project skills.
    $$Match_{skills} = \frac{|S_f \cap S_p|}{|S_p|} \times 100$$
*   **Experience Match (20%)**: Let $E_f$ be the freelancer's years of experience, and $E_p$ be the required project years.
    $$Match_{experience} = \begin{cases} 100 & \text{if } E_f \ge E_p \\ \frac{E_f}{E_p} \times 100 & \text{if } E_f < E_p \end{cases}$$
*   **Ratings Match (15%)**: Scaling of freelancer's rating out of 5.0.
    $$Match_{rating} = \frac{\text{Rating}}{5.0} \times 100$$
*   **Completion Rate Match (10%)**: Freelancer's historical completion rate.
    $$Match_{completion} = \text{CompletionRate} \in [0, 100]$$
*   **Project Priority Match (5%)**:
    *   *High Priority Project*: If freelancer rating $\ge 4.3$ and completion rate $\ge 92\%$, score is $100$, else $70$.
    *   *Medium Priority*: Score is $90$.
    *   *Low Priority*: Score is $80$.

## 8.2 Score Sliders (SaaS Growth Override)
Scale and Enterprise companies can override these defaults. Sliders on the dashboard allow setting custom weights: $W_{skills}$, $W_{experience}$, $W_{rating}$, $W_{completion}$, $W_{priority}$. The frontend interface enforces $\sum W_i = 1.0$ before saving parameters to the database:
$$\text{Score}_{custom} = \sum (Match_i \times W_i)$$

## 8.3 Cache Table Triggers
Recommendations are cached in the `Recommendation` model. Background computations recalculate this cache in these scenarios:
1.  A new project is successfully posted (`OPEN` status). Matches are computed against all freelancers to list the top 10 profiles.
2.  A freelancer updates their profile (skills array, rating, experience). Matches are recalculated across all currently open projects.

---

# SECTION 9: STEP-BY-STEP GENERATION ROUTINE FOR CLAUDE AI

Ensure Claude builds the application in the following sequence:

1.  **Phase 1: DB Configuration**: Set up PostgreSQL models, enums, indices, and seed scripts.
2.  **Phase 2: Core Helpers**: Write helper functions in `workflowHelpers.ts` to manage dynamic metadata serialization.
3.  **Phase 3: Server Actions API**: Code the actions for profiles, onboarding, project posting, pipeline transitions, and workspace collaboration.
4.  **Phase 4: SaaS Billing Routes**: Set up Stripe webhooks, Connect splits, and multi-tenant billing controllers.
5.  **Phase 5: Auth & Middleware**: Implement NextAuth configurations and page-level role authorization middleware rules.
6.  **Phase 6: Frontend Pages**: Build the public pages, multi-step wizards, pipeline dashboards, and the shared workspace. Include micro-animations and cohesive design palettes.
