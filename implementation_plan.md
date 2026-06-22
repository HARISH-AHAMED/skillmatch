# Implementation Plan - Talentra Project Workspace Redesign

Redesign the Talentra freelance workspace into a premium, startup-ready collaboration platform inspired by Linear, Notion, and Fiverr Workspace. This redesign simplifies navigation, removes deprecated views, and introduces modern, highly interactive modules.

---

## User Review Required

> [!IMPORTANT]
> **Database Schema Architecture:**
> During research, we detected that the local Next.js dev server locks the Prisma Query Engine binary (`query_engine-windows.dll.node`). Running Prisma Client generation fails with write permissions error while Node.js processes are active.
> To prevent environment lockouts and keep the application 100% robust and instantly runnable, we will **preserve the Prisma schema** and serialize extra metadata inside existing string fields:
> - **Deliverable Status, Version, and Feedback** will be serialized as a JSON string inside the `SharedFile.fileSize` column (e.g. `{"size":"2.4 MB","status":"APPROVED","feedback":"Nice job","version":2}`).
> - **Milestone Funding Budgets** will be saved inside the `ProjectUpdate.description` or `title` utilizing a simple brackets format (e.g. `[Value: $1500] Landing Page Design`) and extracted programmatically in the frontend.
> This ensures immediate backward-compatibility and zero database sync errors.

---

## Open Questions

We have designed the workspace based on the rules requested. If you have any preferences on:
1. **AI Chat Assistant Model:** We will implement an interactive chat section within the Messages tab. It will parse live project tasks, deliverables, and budgets to respond intelligently. Let us know if you want it to have preset prompt templates.

---

## Proposed Changes

### Core Collaboration Components

We will modify [WorkspaceView.tsx](file:///d:/HARISH-CODES/skillmatch/src/components/WorkspaceView.tsx) to implement the unified workspace layout, including the new Workspace Menu tabs and their responsive views.

#### [MODIFY] [WorkspaceView.tsx](file:///d:/HARISH-CODES/skillmatch/src/components/WorkspaceView.tsx)

We will rewrite `WorkspaceView` from scratch, incorporating:
1. **Modern Layout:** A clean sidebar navigation system with 6 distinct views. Features smooth hover micro-animations (via Framer Motion), vibrant color tags, a collapsible menu for mobile screens, and dark-blue gradient branding.
2. **Overview Tab:**
   - Visual dashboard cards: Title, budget stats, deadline countdown, and a glassmorphic circular progress indicator.
   - Dynamic Activity Feed showing recent updates, tasks created/completed, and file shares.
   - Upcoming Milestone spotlight card.
3. **Messages Tab:**
   - Clean, modern chat window (replaces separate Slack channels).
   - Instant file uploads as chat attachments.
   - **Simulated Voice Messages:** Playback waveform animations and full simulated recording.
   - **AI Chat Assistant:** A sidebar section containing "Ask Talentra AI" where users can query the workspace's state and budget.
4. **Deliverables Tab:**
   - Upload form for file deliverables.
   - Version history listing previous uploads (v1, v2, etc.).
   - Interactive Lightbox File Preview (images, documents, code files).
   - Approval/Revision Flow: Clients can approve work or request revisions with feedback. Freelancers can upload new versions to address revisions.
5. **Tasks Tab:**
   - Redesigned Kanban Board with exactly three columns: "To Do", "In Progress", and "Done".
   - Search bar to filter tasks.
   - Simplified drag-and-drop or card action buttons to cycle statuses.
6. **Payments Tab:**
   - Escrow Wallet showing Funds in Escrow, Released, and Pending.
   - Milestone Payment tracker reflecting the status of the project milestone phases.
   - **Invoice Generator:** Layout modal rendering standard downloadable/printable service invoices.
   - Payment transaction history log.
7. **Team Tab:**
   - Freelancer and Client profile cards showing badges, skills tags, reputation scores, response times, and project reviews.

---

## Verification Plan

### Automated Tests
We will build the next bundle to verify there are no compilation, typing, or linting errors:
```bash
npm run build
```

### Manual Verification
1. Run the Next.js dev server:
   ```bash
   npm run dev
   ```
2. Navigate to a workspace as a Freelancer and Client.
3. Verify page tab changes, chat communication, and custom UI components (voice message, AI chatbot, invoice print, lightbox preview, Kanban status updates).
