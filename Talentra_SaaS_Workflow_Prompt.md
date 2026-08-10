# Talentra SaaS Blueprint & Generation Prompt (For Claude AI)

This document is a comprehensive, production-grade specification and prompt designed to guide **Claude AI** in building or regenerating the **Talentra** platform as a multi-tenant, subscription-based Software-as-a-Service (SaaS) application. It details SaaS tier limitations, Stripe billing/escrow webhooks, fine-grained sub-team roles, Know Your Customer (KYC/KYB) flows, custom AI weights overriding, time tracking, and advanced audit logging.

---

## 1. Multi-Tenant SaaS Tiers & Limits

Talentra monetizes via two parallel subscription structures: **Freelancer Tiers** and **Company Organization Tiers**. The SaaS controller enforces limitations at both page routing levels (middleware) and database execution levels (server actions).

### A. Freelancer SaaS Plans
1.  **Starter (Free)**
    *   *Limit*: Max 5 project applications/bids per month.
    *   *Commission*: 15% platform fee taken from released milestone escrows.
    *   *Features*: Basic search listing visibility, text-only chat.
2.  **Professional ($19/mo)**
    *   *Limit*: Unlimited applications/bids.
    *   *Commission*: 8% platform fee taken from released milestone escrows.
    *   *Features*: Boosted search listing placement, "Verified Pro" visual banner styling badge, file attachment capabilities in chats, up to 5 custom portfolio gallery cards.
3.  **Elite ($49/mo)**
    *   *Limit*: Unlimited applications/bids.
    *   *Commission*: 4% platform fee taken from released milestone escrows.
    *   *Features*: Priority search listing placement, immediate access to instant matching alerts, custom calendar scheduling widgets, premium portfolios (video presentations and file download archives).

### B. Company Organization Plans
1.  **Growth ($79/mo)**
    *   *Limit*: Max 3 concurrent active projects (status `OPEN` or `IN_PROGRESS`). Max 2 team member seats in the organization dashboard.
    *   *Features*: Standard AI candidate recommendations list, text messaging.
2.  **Scale ($199/mo)**
    *   *Limit*: Max 10 concurrent active projects. Max 10 team member seats in the organization.
    *   *Features*: Custom AI matching slider overriding (company can adjust weight factors), screening question templates builder, file attachment sharing, video interview scheduling, standard analytics dashboard.
3.  **Enterprise ($499/mo)**
    *   *Limit*: Unlimited active projects. Unlimited team seats.
    *   *Features*: Custom matching profiles, priority platform advisor access, exportable compliance PDF reports, weekly time logs approvals sheet, custom SLA.

---

## 2. Production Database Schema (Enhanced for SaaS)

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
  
  // Organization Sub-Team Relation
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
  commissionRate     Float              @default(0.15) // Platform fee percentage: e.g. 0.15 for 15%
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
  status        String   // "paid", "failed", "pending"
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
  
  // Custom AI matching sliders (overrides defaults)
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

## 3. Stripe Billing & Webhook Workflow

Building a SaaS requires a robust integration with Stripe for subscription capture and escrow transactions.

### A. Subscription Flow
1.  **Checkout Session creation**: Company/Freelancer requests upgrade. Server Action calls Stripe API to create `checkout.session`, mapping `userId` and `planName` to `metadata` tags.
2.  **Stripe Webhook Listener**: Setup a Route Handler at `/api/webhooks/stripe` validating Stripe signature.
3.  **Webhook Events Matrix**:
    *   `checkout.session.completed`: If session targets a subscription, find or create the `Subscription` record mapping fields. If it targets an Escrow deposit, update milestone statuses to `FUNDED`.
    *   `invoice.payment_succeeded`: Log a entry in the `BillingHistory` table with invoice links and update subscription's `currentPeriodEnd`.
    *   `customer.subscription.updated`: Update plan limits (e.g. seats, projects) and status fields.
    *   `customer.subscription.deleted`: Revert user parameters to the Free tier default setting.

### B. Milestone Escrow Release Flow
1.  **Deposit stage**: Company funds a milestone. Stripe captures funds, firing `checkout.session.completed`. Milestone updates:
    ```json
    { "title": "Setup Authentication", "budget": 1000, "status": "ESCROWED" }
    ```
2.  **Platform Fee Calculation**: Hired Freelancer is looked up. Platform retrieves their `Subscription.commissionRate` (15% for Free, 8% for Pro, 4% for Elite).
3.  **Payout splitting**: When Company clicks "Release Payment":
    *   $\text{Platform Commission} = \text{Budget} \times \text{Freelancer Commission Rate}$
    *   $\text{Freelancer Payout} = \text{Budget} - \text{Platform Commission}$
    *   Platform uses Stripe Connect (Express/Custom accounts) to transfer the `Freelancer Payout` directly to the freelancer's bank account, and keeps the `Platform Commission` in the company Stripe account.

---

## 4. Fine-Grained Organization Roles & Permissions

Company Organization utilizes a sub-team management framework. When a user creates a company, they become the `Owner` of that Organization. They can invite members (`OrgMember` table) who have specialized policies:

| Action Permission | Owner | Admin | Recruiter | Finance | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Edit Billing & Subscriptions | Yes | No | No | No | No |
| Invite / Remove Team Seats | Yes | Yes | No | No | No |
| Post / Edit Projects | Yes | Yes | Yes | No | No |
| Shortlist / Hire Candidates | Yes | Yes | Yes | No | No |
| Manage Escrow / Release Payments | Yes | Yes | No | Yes | No |
| Request Time Extension Reviews | Yes | Yes | Yes | Yes | No |
| Read Chat / View Workspaces | Yes | Yes | Yes | Yes | Yes |

*Enforcement Mechanism*: All dashboard layouts, buttons, and Server Actions must fetch the user's `OrgMember` role for the parent Company and throw an `Unauthorized` error if validation fails.

---

## 5. KYC & Kyb (Know Your Business) Verification Queue

To protect the marketplace, users must submit details to unlock features like withdrawing money, messaging, or posting high-budget projects.

### A. Document Submission Wizard
Users navigate to a tab in their settings portal:
*   *Freelancer Docs*: Select Document Type (Passport, National ID), input name, upload document file.
*   *Company Docs*: Business registration number, GST/VAT certificate upload, Tax identification.
*   Triggers `KYCVerification` table entry with status `PENDING`.

### B. Admin Moderation Queue (`/admin/kyc`)
An dashboard for Talentra system operators showing:
*   Grid of pending requests with details and image previews.
*   Actions:
    *   *Approve*: Triggers background worker. Sets status to `APPROVED`, appends `"Identity Verified"` or `"Business Verified"` badges to User's arrays.
    *   *Reject*: Triggers modal to type reason. Sets status to `REJECTED`, updates `rejectionReason` column, sends real-time system notification.

---

## 6. SaaS-Enhanced Features & Layouts

### A. Override Default AI Weights (SaaS Slider Interface)
On the Company Applicants portal, Scale and Enterprise subscribers see a slider adjustment module. They can real-align weighting values to customize matching algorithms:
*   *Skills Match Slider*: Weight $W_{skills}$ ($0.0 \rightarrow 1.0$)
*   *Experience Match Slider*: Weight $W_{exp}$ ($0.0 \rightarrow 1.0$)
*   *Rating Match Slider*: Weight $W_{rating}$ ($0.0 \rightarrow 1.0$)
*   *Completion Match Slider*: Weight $W_{comp}$ ($0.0 \rightarrow 1.0$)
*   *Priority Match Slider*: Weight $W_{priority}$ ($0.0 \rightarrow 1.0$)

*Condition Constraint*: Total weights must equal $1.0$ (validated via JS/TS before submitting updates to `Company.aiWeight...` database columns).
*Calculation execution*:
$$\text{Score} = (SkillMatch \times W_{skills}) + (ExperienceMatch \times W_{exp}) + (RatingMatch \times W_{rating}) + (CompletionRateMatch \times W_{comp}) + (PriorityMatch \times W_{priority})$$

### B. Workspace Time Tracking & Log Sheets (`/workspace/[applicationId]`)
An active workspace dashboard for hourly contracts:
1.  **Log Hours Form**: Freelancer inputs hours worked, descriptions, select date, select milestone item. Triggers `TimeLog` creation (`PENDING` status).
2.  **Timesheet Approvals Table**: Client Company views pending logs.
    *   If client clicks "Approve", status switches to `APPROVED`, calculates total accumulated budget: $\text{Hours Approved} \times \text{Hourly Rate}$.
    *   If "Reject", prompts feedback input and marks `REJECTED`.

### C. Advanced Analytics & PDF/CSV Exporting
An analytics dashboard using visual charts tracking:
*   *Company Metrics*: Total subscription billing invoices, escrow money locked vs. paid, sub-team hiring speed, candidates matching statistics.
*   *Freelancer Metrics*: Monthly earnings reports, invoice tax logging, profile view impressions counts, application conversions.
*   *Exports module*: Button to trigger Next.js API endpoints converting datasets into download sheets (CSV/PDF) for reporting.

---

## 7. Generation Steps for Claude AI

Follow this implementation checklist:
1.  **Prisma Models**: Implement the schema in Section 2, verifying constraints and indexes.
2.  **Stripe Hooks & Webhooks Route Handler**: Code Stripe hooks capturing billing changes and escrow deposits.
3.  **Roles Gateways Middleware**: Integrate NextAuth session parameters to check user OrgMembership role permissions before allowing data mutation.
4.  **KYC Upload & Verification Flow**: Build user settings upload areas and admin panel controls.
5.  **Multi-Tenant Dashboards**: Build the complex dashboard wizards (company, freelancer, workspace layout with custom sliders, log sheets, and metrics exporting).
