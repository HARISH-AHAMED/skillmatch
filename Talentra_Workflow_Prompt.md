# Talentra Blueprint & Generation Prompt (For Claude AI)

This document is a comprehensive, highly-detailed specification and prompt designed to guide **Claude AI** in regenerating the entire **Talentra** application from scratch. Talentra is a next-gen collaborative freelance marketplace that connects top companies with premium freelancers using AI matching algorithms and a shared real-time workspace.

---

## 1. Project Overview & Architecture
Talentra is built on a role-based structure featuring distinct portals for **Freelancers**, **Companies**, and **Admins**. It combines a robust SQL database (Prisma + PostgreSQL) with a flexible JSON metadata serialization pattern within text columns, allowing the platform to store rich, complex workflow objects (like multi-round recruitment setups, digital contracts, and task histories) directly within existing records without bloating the database schema.

### Tech Stack Blueprint
*   **Framework**: Next.js (App Router, Server Actions)
*   **Language**: TypeScript
*   **Database ORM**: Prisma + PostgreSQL (or SQLite/MongoDB/MySQL)
*   **Authentication**: NextAuth.js (supporting Credentials provider and oauth)
*   **Styling**: CSS / TailwindCSS (v4 preferred)
*   **State & Animations**: Framer Motion for premium transitions, Lucide React for iconography.

---

## 2. Database Schema (Prisma Blueprint)
Here is the exact database schema including all relations, enums, indexes, and custom JSON/text columns used for metadata. Use this to construct your models.

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

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(FREELANCER)
  passwordHash  String?   // For Credentials Login
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

model Freelancer {
  id                String   @id @default(cuid())
  userId            String   @unique
  bio               String?  @db.Text // Serialized FreelancerOnboardingData inside
  skills            String[] // Array of lowercase skills for indexing
  experienceYears   Int      @default(0)
  portfolioUrl      String?
  resumeUrl         String?
  rating            Float    @default(0.0)
  completedProjects Int      @default(0)
  completionRate    Float    @default(100.0) // Percentage (0-100)

  // Extra Profile Fields
  domain               String?   @default("Other")
  professionalHeadline String?
  experience           Json?     // Array of Experience: { id, title, company, startDate, endDate, current, description }
  certifications       Json?     // Array of Certification: { id, name, issuer, year }
  portfolioItems       Json?     // Array of PortfolioItem: { id, title, description, type, url, fileUrl }
  responseTime         String?   @default("Within 24 hours")
  availabilityStatus   String?   @default("AVAILABLE") // AVAILABLE, BUSY, UNAVAILABLE
  gender               String?   @default("ANY")
  verificationBadges   String[]  @default([])

  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  applications    Application[]
  recommendations Recommendation[]
  savedByCompanies SavedFreelancer[]
  savedProjects   SavedProject[]
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

  // Extra Profile Fields
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
  teamMembers        Json?     @default("[]") // Array of { name, role, photoUrl }
  verificationBadges String[]  @default([]) // e.g. ["ONBOARDING_COMPLETED", "Business Verified"]
  trustScore         Int       @default(90)
  reputationScore    Int       @default(90)
  sentimentAnalysis  String?   @db.Text @default("")
  completionRate     Float     @default(100.0)
  retentionRate      Float     @default(100.0)
  paymentReliability Float     @default(100.0)
  avgResponseTime    String?   @default("Within 24 hours")
  avgTimeToHire      String?   @default("14 days")
  hiringSuccessRate  Float     @default(100.0)
  followers          String[]  @default([]) // User IDs of followers
  watchlistUsers     String[]  @default([]) // User IDs watchlisting
  talentCommunity    String[]  @default([]) // User IDs in talent community
  jobAlertsUsers     String[]  @default([]) // User IDs subscribed to job alerts

  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  projects          Project[]
  savedFreelancers  SavedFreelancer[]
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
  rating      Int      // 1 to 5
  comment     String   @db.Text
  createdAt   DateTime @default(now())

  // Sub-scores for company reviews by freelancers
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
  channel       String   @default("group") // "group", "freelancers", or "dm:userId1:userId2"
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
  channel       String   @default("group") // "group", "freelancers", or "dm:userId1:userId2"
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
  status        String   // "PENDING", "IN_PROGRESS", "COMPLETED"
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
  status        String    @default("TODO") // TODO, IN_PROGRESS, REVIEW, DONE
  priority      String    @default("MEDIUM") // LOW, MEDIUM, HIGH
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
```

---

## 3. Metadata Serialization Details (`workflowHelpers.ts`)
To store dynamic parameters, Talentra uses a serialization helper structure. JSON objects are appended to simple SQL text fields via an identifiable separator: `\n\nMETADATA_JSON_BLOCK:`.
Here are the interfaces for metadata records:

### Company Onboarding Metadata
Stores company details serialized inside the `Company.description` column:
```typescript
interface CompanyOnboardingData {
  legalBusinessName: string;
  registrationNumber: string;
  gstNumber?: string;
  headquarters: string;
  companyEmail: string;
  businessPhone: string;
  team: {
    name: string;
    email: string;
    role: "Owner" | "Admin" | "Recruiter" | "Finance" | "Viewer";
    designation: string;
    status: "INVITED" | "ACCEPTED";
    joinedAt?: string;
  }[];
  status: "Pending" | "Verified" | "Rejected" | "Suspended";
  onboardedStep: number;
}
```

### Freelancer Onboarding Metadata
Stores freelancer details serialized inside the `Freelancer.bio` column:
```typescript
interface FreelancerOnboardingData {
  purpose: "To find a job" | "Compete & Upskill" | "To Host an Event" | "To be a Mentor";
  globalRank: number;
  points: number;
  streaks: { date: string; value: number }[]; // daily activity tracker log values (0 to 4)
  education: { school: string; degree: string; fieldOfStudy: string; startYear: string; endYear: string }[];
  languages: string[];
  availabilityCalendar: { dayOfWeek: string; slots: string[] }[]; // e.g., ["09:00 - 10:00"]
  identityVerified: boolean;
  portfolioVerified: boolean;
  phoneVerified: boolean;
}
```

### Project Custom Pipeline Metadata
Stores project parameters and custom recruitment stages inside the `Project.description` column:
```typescript
interface ProjectWizardData {
  objectives: string[];
  deliverables: string[];
  responsibilities: string[];
  dailyTasks: string[];
  preferredSkills: string[];
  faq: { question: string; answer: string }[]; // discussion board FAQ storage
  timeline: {
    applicationDeadline: string;
    projectStart: string;
    expectedCompletion: string;
  };
  stipendType: "Unpaid" | "Paid" | "Stipend";
  stipendDetails?: string; 
  workingDays?: string; // e.g. "5 Days/Week"
  timingType?: string; // e.g. "Full Time", "Part Time"
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
  rounds: {
    id: string;
    name: string;
    type: "CV_PITCH" | "SCREENING_QUESTIONS" | "INTERVIEW" | "COGNITIVE_TEST" | "TECHNICAL_ASSESSMENT";
    description: string;
    questions?: any[];
  }[];
}
```

### Application Stage & Offer Metadata
Stores application workflow logs, digital contracts, and milestones inside the `Application.coverLetter` column:
```typescript
interface ApplicationWorkflowData {
  pipelineHistory: {
    stage: string; // "Applied", "Shortlisted", "Interview Scheduled", "Interview Rescheduled", "Interview Conducted", "Interview Cancelled", "Hired", "Rejected"
    timestamp: string;
    notes?: string;
    recruiterId?: string;
    recruiterName?: string;
    meetingLink?: string;
    interviewDate?: string;
  }[];
  screeningAnswers: Record<string, string>; // questionId -> answer (text or file upload URL)
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
```

---

## 4. Key Workflows & Business Logic

### AI Matching & Recommendation Algorithm
When a freelancer applies to a project, a match rating is computed. The total recommendation score is calculated out of 100 based on these exact weights:
1.  **Skills Match (50%)**: Proportion of required skills matched.
2.  **Experience Match (20%)**: Years of experience compared to requirements.
3.  **Past Ratings Match (15%)**: Out of 5.0 (scaled to 100).
4.  **Completion Rate (10%)**: Freelancer's historical completion rate (0-100%).
5.  **Project Priority Match (5%)**:
    *   **High Priority**: If freelancer has Rating $\ge 4.3$ and Completion Rate $\ge 92\%$, score is $100$, else $70$.
    *   **Medium Priority**: Score is $90$.
    *   **Low Priority**: Score is $80$.

**Formula**:
$$\text{Score} = (SkillMatch \times 0.50) + (ExperienceMatch \times 0.20) + (RatingMatch \times 0.15) + (CompletionRateMatch \times 0.10) + (PriorityMatch \times 0.05)$$

Triggers automatically recalculate the Top 10 Recommended cache table (`Recommendation`) whenever:
*   A new project is published (open status).
*   A freelancer updates their skills, portfolio, or experience years.

---

## 5. Main Interfaces & Inputs Specification

### A. Auth & Registration Gateway (`/register` & `/login`)
*   **Fields**: Name, Email, Password, Account Type Selection Toggle (Freelancer vs. Company).
*   **Auto-flow**: Account registration automatically triggers credential verification signing, updates session variables, and redirects based on user roles.

### B. Company Profile Wizard (`/company/profile`)
A multi-tab dashboard form capturing:
*   **Base Company Info**: Company Name, Industry, Website URL, Headquarters/Locations, LinkedIn, Company Size dropdown (10-50, 50-200, 200+ employees), Contact Email, Contact Phone.
*   **Culture & Strategy Section**: Text inputs for Mission & Vision, Work Culture, and Hiring Philosophy.
*   **Team Panel**: Multi-row grid inputs to add executives (Name, Role, Email, LinkedIn, Skills tags) and send invitation triggers. Stores status as `INVITED` or `ACCEPTED` with timestamp logs inside metadata.
*   **Media Gallery**: Upload area for banner image, company logos, gallery photo URLs, and videos.

### C. Freelancer Profile Wizard (`/freelancer/profile`)
Allows premium freelancers to configure their workspace settings:
*   **Header Info**: Full Name, Headline, Years of Experience, Portfolio/Resume Uploads.
*   **Resume JSON Nodes**:
    *   *Work Experience List*: Add/Edit experience items (Title, Company, Start Date, End Date or check "Current role", Job Description text).
    *   *Certifications*: Credential Name, Issuer Org, Year Issued.
    *   *Portfolio Items*: Project Title, Description, Type, URL, Thumbnail URL.
*   **Expectations**: Target hourly rate, minimum budget preferences, remote/onsite structures, timezone selectors.
*   **Availability Weekly Calendar**: Selection grid allowing freelancers to toggle active days (Monday-Sunday) and allocate hourly calendar intervals (e.g. `09:00 - 10:00`, `14:00 - 15:00`).

### D. Multi-Step Project Creator Wizard (`/company/projects/new`)
*   **Step 1: Core Details**: Title, Opportunity Domain (e.g., Tech, Design, Writing), Category, Subcategory, Minimum Experience Required, Expected Engagement Duration, Preferred Candidate Gender, Visibility (PUBLIC/PRIVATE).
*   **Step 2: Financials & Tasks**: Compensation Structure (Paid/Unpaid/Stipend), Stipend Range, Estimated Budget, Work Structure (Remote, Hybrid, Onsite), Schedule Structure (Full Time, Part Time), Application Deadline date, Project Start/End dates, Objectives, Deliverables list, Responsibilities list, Required Skills selection tags.
*   **Step 3: Recruitment Workflow Pipeline Editor**: Add customized rounds (e.g., CV review, screening questions, interview panels, coding test). Drag-and-drop ordering.
    *   *Round Questions Builder**: Add custom pre-screening questions, defining prompt text, input response types (Multiple Choice, Text Paragraph, Yes/No, Video Intro, file upload), and marking required attributes.

### E. Applicant detail dashboard (`/company/applicants/[id]`)
Allows companies to manage candidates in tabs:
1.  **Overview**: Detailed profile layout, matching metrics (skills, experience, rating gauges), screening question responses.
    *   *Recruitment pipeline track*: Interactive timeline showing steps passed.
    *   *Status transitions buttons*: "Shortlist", "Reject", "Hire", "Schedule Interview" (triggers overlay modal with Date and Meeting Link inputs), "Conduct Interview" (logs notes & completion).
2.  **Chat**: Live direct messaging panel between candidate and recruiter. Supports message editing, deletion, seen states, and unread count alerts.
3.  **Offer**: Offer details editor (Text content, stipend, milestones). Triggers pending contract status when sent.

### F. Discussion Board Q&A Forum (`/freelancer/projects/[id]`)
*   Public project detail page displays a Q&A board.
*   Freelancers can submit public questions before applying.
*   Company recruiters can submit replies to questions, which save directly into the FAQ array of `ProjectWizardData`.

---

## 6. Collaborative Project Workspace (`/workspace/[applicationId]`)
Once a freelancer accepts an offer letter, this central workspace is unlocked. The layout is shared by the Company and the Freelancer and comprises six main tabs:

### 1. Overview Tab
*   **Deliverable Checklists**: Progress bar tracking approved deliverables.
*   **Timeline Roadmap**: Renders deadlines, kick-off dates, and remaining duration.
*   **Project Update Feed**: Chronological announcement log. Hired users or company managers can publish updates with title, description, and status tags (PENDING, IN_PROGRESS, COMPLETED).

### 2. Messages (Collaboration Communication & Chats)
*   **Group Chat**: General thread where the client and all hired freelancers converse.
*   **Freelancers Only**: Exclusive channel for hired freelancers to align on details.
*   **Direct Message (DM) Threads**: Individual channels to text collaborators directly.
*   *Interactive Chat Features*:
    *   *File Upload Attachments*: Drag & drop or select documents, saving size parameters.
    *   *Message Actions*: Edit text content and delete sent messages.
    *   *Voice Message Notes Recorder*: Play/record simulated voice logs. Records an audio wave representation (randomized heights array) and outputs file references formatted as `[VOICE:voice_rec_timestamp.mp3|duration:1:35]`. Renders play buttons and active sound wave bars.
    *   *Seen Track*: Unread message indicators.

### 3. Deliverables Archive
*   **Submission Cards**: Grid tracking submitted files. Shows filename, size, date, and uploader profile.
*   **Deliverables Metadata**: The size column stores JSON matching `DeliverableMeta` (size, status: PENDING/APPROVED/REVISION_REQUESTED, feedback, version number).
*   **Approval Pipeline**: Hired freelancers can upload version drafts. The client company can:
    *   "Approve Deliverable": Releases specific milestone escrows (if attached).
    *   "Request Changes / Reject": Submits text feedback, changing file status to "REVISION_REQUESTED".

### 4. Collaborative Tasks Board (Kanban structure)
*   **Interactive Cards**: Columns representing `TODO`, `IN_PROGRESS`, `REVIEW`, and `DONE`.
*   **Task Details**: Add task modal (Title, Description, Assignee selector, Priority level - LOW/MEDIUM/HIGH, Due Date calendar).
*   **Control Flow**: Drag actions or button triggers to transition tasks across lanes, update parameters, or delete tasks.

### 5. Team Tab
*   **Directory Grid**: Details of workspace members (client representative, project owner, freelancers).
*   **Profiles Info**: Bio headline summary, responsive times, availability metrics, verification badges, rating summaries, follow/watchlist options.

### 6. Milestones (Digital Escrow Contract)
*   **Contract Sign-off Area**: Displays contract text details. Requires IP validation logging, signing status (`freelancerSigned`, `clientSigned`), signing timestamps, and signatures from both parties. Transition to ACTIVE unlocks payments.
*   **Escrow Milestones Tracker**: Parses values formatted like `[Value: 500]` inside title strings using regex to extract budgets. Tracks funding milestones (PENDING $\rightarrow$ FUNDED $\rightarrow$ APPROVED $\rightarrow$ RELEASED). The client can deposit funds into escrow, and release them to the freelancer.
*   **Extension Request Controls**: Freelancers can submit a form requesting due date extensions or budget changes, detailing the reasoning. The client reviews and selects "Approve" or "Deny".
*   **Dispute Center**: If conflict arises, either user can trigger a dispute, logging arguments. Locks release features until resolution notes are submitted.

### 7. AI Assistant Auditor Chatbot
*   Interactive side panel to converse with the project companion.
*   Audits project parameters using keyword handlers:
    *   *Tasks / To-do / Kanban*: returns tasks count sorted by status columns.
    *   *Budget / Escrow / Money*: Regex-parses value annotations (e.g. `[Value: 1000]`) in project milestones and reports active balance, released funds, and pending deposits.
    *   *Deadline / Date / Timeline*: reports scheduled deadlines.
    *   *Deliverables / Files*: reports approved vs pending documents.
    *   *Draft*: creates communication templates.

---

## 7. Project Closure & Peer Reviews (`/freelancer/reviews` & `/company/reviews`)
*   **Project Closure Action**: When the client triggers completion, the workspace updates to closed.
*   **Review Submission Form**:
    *   *Freelancer Reviews Client*: Rating (1-5), Comment feedback, and detailed sub-scores (Communication, Payment Reliability, Project Description Clarity).
    *   *Client Reviews Freelancer*: Rating (1-5), Comment feedback (rating updates the freelancer's global score profile).

---

## 8. Generation Steps for Claude AI
When coding this application, perform the steps in this sequence:
1.  **Configure Database Schema**: Setup PostgreSQL databases using the Prisma schema detailed in Section 2. Seed default roles (ADMIN, COMPANY, FREELANCER).
2.  **Define Serializer Helpers**: Create utilities to parse and serialize metadata in text columns safely, preventing JSON errors and maintaining fallback structs.
3.  **Build Server Actions**: Implement actions for Onboarding, Project posting, Application stages, Collaboration workspace features (Messages, Tasks, Deliverables, Milestones), and Peer reviews.
4.  **Create Frontend Portals**:
    *   *Landing & Search Page*: Interactive, rich presentation layout detailing search filters.
    *   *Onboarding Wizards*: Interactive components with state tracking.
    *   *Workspace View*: Complex layout showing all 6 workspace tabs.
5.  **Inject Premium Styling & Design Elements**: Use beautiful color gradients, dark/light themes, subtle hover animations, and intuitive indicators for statuses, metrics, and activities.
