# Talentra: Complete Application Generation Specification (Master Prompt)

This document is the absolute, production-grade master blueprint designed for **Claude AI** to build and implement the **entire** Talentra application. It leaves zero gaps, forbids placeholders, and details every database model, backend API route, frontend page controller, custom component, auth helper, and design pattern.

---

# SECTION 1: GLOBAL STACK & ARCHITECTURE SPECIFICATIONS
*   **Framework**: Next.js App Router (Turbopack supported).
*   **Database**: SQLite via Prisma ORM (`prisma/schema.prisma` with 23 models).
*   **Authentication**: Cookie-based session authentication using `bcryptjs` and a custom JWT-like session token cookie. No NextAuth.js or external providers.
*   **Styling**: Tailwind CSS with custom fonts (Outfit/Inter). Emerald primary color theme with slate neutrals and amber/blue/rose/violet accents.
*   **Animations**: Framer Motion for modals, Kanban drag indicators, sliders, alerts, and state transitions.
*   **Validation**: `zod` schema definitions for all forms and request payloads.

---

# SECTION 2: THE 23-MODEL SQLite PRISMA SCHEMA (`prisma/schema.prisma`)

Implement this exact SQLite database schema. It maps all relationships, enums, indices, and fields.

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

// ----------------------------------------------------
// Users, Sessions & Subscriptions
// ----------------------------------------------------

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  passwordHash  String
  role          String    @default("FREELANCER") // FREELANCER | COMPANY | ADMIN
  plan          String    @default("STARTER")    // Freelancer: STARTER/PRO/ELITE | Company: GROWTH/SCALE/ENTERPRISE
  kycStatus     String    @default("UNSUBMITTED") // UNSUBMITTED | PENDING | APPROVED | REJECTED
  kycDetails    String?   // Serialized KYC document upload metadata
  xp            Int       @default(0)
  credits       Int       @default(10)
  reputation    Int       @default(100)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions       Session[]
  billingRecords BillingRecord[]
  orgMemberships OrgMember[]
  opportunities  Opportunity[]     // Posted by company user
  applications   Application[]     // Submitted by freelancer
  savedItems     SavedItem[]
  workspaceLinks WorkspaceMember[]
  reviewsWritten Review[]          @relation("ReviewsWritten")
  reviewsReceived Review[]         @relation("ReviewsReceived")
  notifications  Notification[]
  certificates   Certificate[]
  portfolioItems PortfolioItem[]
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model BillingRecord {
  id        String   @id @default(cuid())
  userId    String
  amount    Float
  planName  String
  status    String   // PAID | FAILED | PENDING
  invoiceUrl String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ----------------------------------------------------
// Organizations & Team Members
// ----------------------------------------------------

model Organization {
  id          String   @id @default(cuid())
  companyName String
  description String?
  industry    String?
  website     String?
  location    String?
  logoUrl     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members OrgMember[]
}

model OrgMember {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           String       @default("VIEWER") // OWNER | ADMIN | RECRUITER | FINANCE | VIEWER
  status         String       @default("PENDING") // PENDING | ACTIVE | DECLINED
  invitedBy      String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
}

// ----------------------------------------------------
// Opportunities (Project Listings)
// ----------------------------------------------------

model Opportunity {
  id                 String   @id @default(cuid())
  companyId          String   // Maps to User.id of role COMPANY
  title              String
  description        String   // Serialized ProjectWizardData metadata inside
  budget             Float
  priority           String   @default("MEDIUM") // LOW | MEDIUM | HIGH
  requiredSkills     String   // Comma-separated tags
  experienceRequired Int      @default(0)
  status             String   @default("OPEN") // OPEN | IN_PROGRESS | COMPLETED | CLOSED
  freelancersLimit   Int      @default(1)
  isVisible          Boolean  @default(true)
  domain             String?  @default("Other")
  preferredGender    String?  @default("ANY") // ANY | MALE | FEMALE
  dueDate            DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  company            User                @relation(fields: [companyId], references: [id], onDelete: Cascade)
  screeningQuestions ScreeningQuestion[]
  pipelineStages     PipelineStage[]
  applications       Application[]
  savedItems         SavedItem[]
  workspaces         Workspace[]
}

model ScreeningQuestion {
  id            String      @id @default(cuid())
  opportunityId String
  question      String
  type          String      // MULTIPLE_CHOICE | YES_NO | PARAGRAPH | PORTFOLIO | VIDEO_INTRO
  options       String?     // Comma-separated for MCQ
  required      Boolean     @default(true)

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
}

model PipelineStage {
  id            String      @id @default(cuid())
  opportunityId String
  name          String      // Applied | Shortlisted | Interview | Offer | Hired | Rejected
  order         Int         @default(0)

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
}

// ----------------------------------------------------
// Applications & Recruitment History
// ----------------------------------------------------

model Application {
  id            String   @id @default(cuid())
  opportunityId String
  freelancerId  String   // User ID
  coverLetter   String   // Serialized ApplicationWorkflowData inside
  aiScore       Float    @default(0.0)
  status        String   @default("PENDING") // PENDING | SHORTLISTED | REJECTED | HIRED
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  opportunity Opportunity        @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  freelancer  User               @relation(fields: [freelancerId], references: [id], onDelete: Cascade)
  events      ApplicationEvent[]

  @@unique([opportunityId, freelancerId])
}

model ApplicationEvent {
  id            String   @id @default(cuid())
  applicationId String
  stageName     String
  timestamp     DateTime @default(now())
  notes         String?
  actorId       String?  // Recruiter user ID who transitioned the stage

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model SavedItem {
  id            String   @id @default(cuid())
  userId        String
  opportunityId String
  savedAt       DateTime @default(now())

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  @@unique([userId, opportunityId])
}

// ----------------------------------------------------
// Project Workspace Collaboration
// ----------------------------------------------------

model Workspace {
  id            String   @id @default(cuid())
  opportunityId String
  title         String
  status        String   @default("ACTIVE") // ACTIVE | COMPLETED | DISPUTED
  escrowBalance Float    @default(0.0)
  contractTerms String?  @db.Text
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  opportunity Opportunity       @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  members     WorkspaceMember[]
  tasks       Task[]
  milestones  Milestone[]
  messages    Message[]
  files       FileRecord[]
  meetings    Meeting[]
}

model WorkspaceMember {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  joinedAt    DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
}

model Task {
  id          String    @id @default(cuid())
  workspaceId String
  title       String
  description String?
  status      String    @default("TODO") // TODO | IN_PROGRESS | REVIEW | DONE
  priority    String    @default("MEDIUM") // LOW | MEDIUM | HIGH
  dueDate     DateTime?
  assignedTo  String?   // User ID
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

model Milestone {
  id          String    @id @default(cuid())
  workspaceId String
  title       String
  budget      Float
  status      String    @default("PENDING") // PENDING | ESCROWED | RELEASED | REVISION_REQUESTED
  dueDate     DateTime?
  feedback    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

model Message {
  id          String   @id @default(cuid())
  workspaceId String
  senderId    String
  senderName  String
  senderImage String?
  content     String   // Supports voice rec [VOICE:file.mp3|duration:1:35]
  channel     String   @default("group") // group | freelancers | custom DM key
  createdAt   DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

model FileRecord {
  id          String   @id @default(cuid())
  workspaceId String
  uploadedBy  String
  fileName    String
  fileUrl     String
  fileSize    String?  // Serialized DeliverableMeta JSON string inside
  channel     String   @default("group")
  uploadedAt  DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

model Meeting {
  id          String   @id @default(cuid())
  workspaceId String
  title       String
  dateTime    DateTime
  duration    Int      @default(30) // Duration in minutes
  link        String
  agenda      String?
  createdAt   DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

// ----------------------------------------------------
// Extra Profile Metrics
// ----------------------------------------------------

model Certificate {
  id          String   @id @default(cuid())
  userId      String
  name        String
  issuer      String
  yearIssued  Int
  fileUrl     String?
  isVerified  Boolean  @default(false)
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PortfolioItem {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  projectUrl  String?
  imageUrl    String?
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Review {
  id          String   @id @default(cuid())
  reviewerId  String
  revieweeId  String
  rating      Int      // 1 to 5
  comment     String
  createdAt   DateTime @default(now())

  reviewer User @relation("ReviewsWritten", fields: [reviewerId], references: [id], onDelete: Cascade)
  reviewee User @relation("ReviewsReceived", fields: [revieweeId], references: [id], onDelete: Cascade)
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

# SECTION 3: UTILITIES & SYSTEM LIBS

## 3.1 Custom Cookie Authentication (`src/lib/auth.ts`)
Implement session validations using standard signed cookie checks. Do not install `@auth/core` or `next-auth`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "./db";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days expiration
  await db.session.create({
    data: {
      sessionToken: token,
      userId,
      expires,
    },
  });
  return token;
}

export async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!session || session.expires.getTime() < Date.now()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}
```

## 3.2 AI Core Matching engine (`src/lib/matchEngine.ts`)
Compute recommendation scores between opportunities and freelancers out of 100:

```typescript
import { User, Opportunity } from "@prisma/client";

export function calculateMatchScore(freelancer: any, opportunity: Opportunity): number {
  // 1. Skills match (50%)
  const reqSkills = opportunity.requiredSkills.split(",").map(s => s.toLowerCase().trim()).filter(Boolean);
  const freelancerSkills = freelancer.skills ? freelancer.skills : [];
  const matchedSkills = reqSkills.filter(s => freelancerSkills.includes(s.toLowerCase().trim()));
  const skillScore = reqSkills.length > 0 ? (matchedSkills.length / reqSkills.length) * 50 : 50;

  // 2. Experience match (20%)
  const expReq = opportunity.experienceRequired;
  const expFreelancer = freelancer.experienceYears || 0;
  const expScore = expReq > 0 ? Math.min((expFreelancer / expReq) * 20, 20) : 20;

  // 3. Ratings match (15%)
  const ratingScore = ((freelancer.rating || 0.0) / 5.0) * 15;

  // 4. Completion Rate match (10%)
  const completionScore = ((freelancer.completionRate || 100) / 100) * 10;

  // 5. Priority match (5%)
  let priorityScore = 4;
  if (opportunity.priority === "HIGH") {
    priorityScore = (freelancer.rating >= 4.3 && freelancer.completionRate >= 92) ? 5 : 3.5;
  } else if (opportunity.priority === "MEDIUM") {
    priorityScore = 4.5;
  }

  const finalScore = skillScore + expScore + ratingScore + completionScore + priorityScore;
  return Math.round(finalScore * 10) / 10; // Round to 1 decimal place
}
```

---

# SECTION 4: UNIFIED DESIGN KIT (`src/components/ui.tsx`)

Build the entire visual interface using the following Emerald & Slate Design Kit. Do not import Tailwind dependencies outside of this kit.

```tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

// 1. Button Component
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
  }
>(({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
  const baseStyle = "inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/10",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/55",
    ghost: "bg-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-700",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/50",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4.5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };
  return (
    <button
      ref={ref}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = "Button";

// 2. Input component
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(({ className = "", label, error, ...props }, ref) => (
  <div className="w-full space-y-1.5 text-left">
    {label && <label className="block text-xs font-bold text-slate-600 tracking-wide">{label}</label>}
    <input
      ref={ref}
      className={`w-full px-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 placeholder-slate-400 ${className}`}
      {...props}
    />
    {error && <p className="text-[10px] font-bold text-rose-500">{error}</p>}
  </div>
));
Input.displayName = "Input";

// 3. Card wrapper
export const Card = ({
  className = "",
  children,
  hoverable = true,
}: {
  className?: string;
  children: React.ReactNode;
  hoverable?: boolean;
}) => (
  <div
    className={`bg-white border border-slate-100 rounded-2xl p-6 shadow-sm ${
      hoverable ? "hover:shadow-md hover:border-slate-200/40 transition-all duration-300" : ""
    } ${className}`}
  >
    {children}
  </div>
);

// 4. Badge indicator
export const Badge = ({
  variant = "primary",
  children,
}: {
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
  children: React.ReactNode;
}) => {
  const styles = {
    primary: "bg-emerald-50 text-emerald-700 border-emerald-100",
    success: "bg-teal-50 text-teal-700 border-teal-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-rose-50 text-rose-700 border-rose-100",
    neutral: "bg-slate-50 text-slate-600 border-slate-200/60",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${styles[variant]}`}>
      {children}
    </span>
  );
};

// 5. Spring Modal
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-white border border-slate-200/50 rounded-3xl overflow-hidden shadow-2xl p-6 relative"
      >
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-sm">✕</button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto pr-1">{children}</div>
      </motion.div>
    </div>
  );
};
```

---

# SECTION 5: MASTER FRONTEND SCREEN ACTIONS SPEC

Ensure Claude implements these screens exactly as described, writing out full component implementations.

## 5.1 Real-Time Collaborative Workspace Tab Control (`src/components/WorkspaceView.tsx`)

This component controls the project workspace. Implement all six tabs without shortcuts:

1.  **Overview Tab**:
    *   *Escrow Budget tracker*: Regex-parses value strings (like `[Value: 500]` or `$500`) inside milestone titles to aggregate and display funded escrow balance, paid milestones, and pending milestones.
    *   *Updates timelines*: Displays chronological announcements. Recruiters can post updates using a text form (Title, Description, Status tag PENDING/IN_PROGRESS/COMPLETED).
2.  **Messages Tab (Audio Recorder Wave visualizer)**:
    *   *Channels list pane*: Renders `# group`, `# freelancers`, and user DM threads.
    *   *Direct Voice Notes widget*: Render a `Mic` icon. Clicking starts a timer and updates a visual soundwave state mapping:
        ```typescript
        const [voiceWave, setVoiceWave] = useState<number[]>([]);
        ```
        Updates wave column heights dynamically (using random integers 4-32) every second. On stop, posts message structured as: `[VOICE:voice_file.mp3|duration:M:SS]`.
    *   *Audio Player Bubble*: Chat messages containing voice parameters are parsed and rendered with audio player bars that shift colors from gray to highlighted red on click.
    *   *Seen Alerts*: Channels display unread notifications until clicked.
3.  **Deliverables Tab**:
    *   Freelancers submit version files. Recruiters approve drafts (which changes milestone escrow states to `RELEASED`) or request revisions.
4.  **Tasks Tab**:
    *   Renders Kanban lanes: `To Do`, `In Progress`, `Under Review`, `Done`. Includes details modals (assigned assignee selection dropdown, due calendars, priority badges).
5.  **Team Tab**:
    *   Renders contact directories showing profiles, response rates, ratings, and watchlist options.
6.  **Milestones Tab (Escrow Contract Agreement)**:
    *   *Signature execution panel*: Displays the digital agreement, tracking signers' IP log data and timestamps. Transitions to `ACTIVE` when signed by both parties.
    *   *Time Logs sheet*: Freelancers enter hours worked, and recruiters can click "Approve" next to time log rows to calculate payments: $\text{Approved Hours} \times \text{Hourly Rate}$.
7.  **AI Assistant panel**:
    *   Floating chatbot sidebar that scans project parameters: "task" returns tasks counts, "budget" returns milestones escrow balance totals, and "timeline" reports project dates.

## 5.2 Recruiter Pipeline Funnel (`src/app/(app)/company/pipeline/[id]/page.tsx`)
*   Renders horizontal columns for candidate stages: `Applied`, `Shortlisted`, `Interview`, `Offer`, `Hired`, `Rejected`.
*   *Funnel transition controllers*: Recruiters click buttons to shortlist, reject, or schedule virtual interview dates (scheduling prompts modal with date picker and meeting link fields).
*   *Direct Messaging*: Embedded Chat panels load candidates' message logs.

## 5.3 Onboarding flow setup (`src/app/onboarding/page.tsx`)
*   **For Companies**: Captures business registrations, HQ addresses, phone numbers, and invites sub-team executives (grid inputs to specify invited user email and `OrgRole` permissions Owner/Admin/Recruiter/Viewer).
*   **For Freelancers**: Headline settings, career history lists arrays, certificates credentials lists, expectations (timezone, rate), and a weekly availability slot scheduler.

---

# SECTION 6: SAAS CONTROLS & API ENDPOINTS

Implement the API route controllers mapping the SQLite database.

1.  **KYC Document Queue (`src/app/api/kyc/route.ts`)**:
    *   `POST`: Freelancer uploads ID papers, shifting status in `User.kycStatus` to `PENDING`.
    *   `GET` (Admin role checked): Displays a queue of pending verifications inside the Admin dashboard.
    *   `PATCH` (Admin review): Sets status to `APPROVED` (adds verified profile badge) or `REJECTED` (with feedback reason).
2.  **Stripe/Billing Mock webhook (`src/app/api/billing/route.ts`)**:
    *   Allows users to mock plan selections (Starter, Pro, Elite for Freelancers; Growth, Scale, Enterprise for Companies). Updates the user's limits and platform commission rates.
3.  **Project Discussion board (`src/app/api/opportunities/[id]/route.ts`)**:
    *   `POST`: Allows freelancers to submit public questions on the opportunity view board before applying.
    *   `PATCH`: Allows company recruiters to reply to questions, appending FAQs to the serialized project description text field.

---

# SECTION 7: CHRONOLOGICAL ACTION CHECKLIST FOR CLAUDE AI

Claude must implement the application components in this order. Do not skip components or leave placeholder files:

1.  **Phase 1: DB Config**: Setup dev SQLite database using Section 2's Prisma schema.
2.  **Phase 3: Serializers**: Program `src/lib/workflowHelpers.ts` matching Section 3's parsers.
3.  **Phase 3: Auth & UI Design Kit**: Implement cookie session management inside `src/lib/auth.ts` and components design kit in `src/components/ui.tsx`.
4.  **Phase 4: Server API routes**: Code `src/app/api/auth/register`, `login`, `logout` and matchEngine recommendation systems.
5.  **Phase 5: Onboarding & Portals**: Program multi-step onboarding forms (`/onboarding`), dashboards (`/home`), pipelines (`/company/pipeline/[id]`), and talent browser routes.
6.  **Phase 6: Shared Collaborative Workspace**: Implement `/workspace/[id]` tabs controls, including voice notes Visual Wave player components, Kanban boards, milestones contract signings, and the AI Assistant Auditor chatbot.
