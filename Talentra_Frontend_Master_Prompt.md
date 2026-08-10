# Talentra Ultimate Frontend & Workflow Integration Blueprint

This document is the absolute, production-grade master specification and code generation prompt for Claude AI. It describes every frontend page, layout shell, routing guard, component state, form validation schema, and connection to the SQLite database.

---

# SECTION 1: GLOBAL WORKFLOWS & LAYOUT SHELL

## 1.1 Custom Cookie Middleware Routing (`src/middleware.ts`)
Implement standard route guards using cookie validation checks. Do not use NextAuth middleware.
*   **Token Verification**: Read the `"session_token"` cookie from the headers of incoming requests.
*   **Redirect Logic**:
    *   If no cookie is present and the request is for `/home`, `/workspace/*`, `/profile`, `/billing`, `/opportunities/*`, `/applications`, `/company/*`, or `/admin/*` $\rightarrow$ Redirect to `/auth/login`.
    *   If the session cookie exists, fetch user details. If `User.kycStatus === "UNSUBMITTED"` and the request is not for `/onboarding` $\rightarrow$ Redirect to `/onboarding`.
    *   If the session user role is `FREELANCER` and they attempt to access `/company/*` or `/admin/*` $\rightarrow$ Redirect to `/home`.
    *   If the session user role is `COMPANY` and they attempt to access `/admin/*` or freelancer dashboards $\rightarrow$ Redirect to `/company/dashboard`.

## 1.2 Pinned Sidebar & Topbar Shell (`src/components/shell.tsx`)
Implement a fixed layout wrapper with a sidebar and topbar:
*   **Left Navigation Sidebar (64-wide, Fixed)**:
    *   *Header*: Talentra branding with a logo.
    *   *Navigation List*: Icon links with hover animations using Framer Motion. Links dynamically change based on user roles:
        *   *Freelancer*: Home (`/home`), Browse Opportunities (`/search`), Applications (`/applications`), Workspace Directory (`/workspaces`), Portfolio Profile (`/profile`), Billing Settings (`/billing`).
        *   *Company*: Recruiter Dashboard (`/home`), Post Opportunity (`/company/post`), Talent Search Directory (`/search`), Active Pipelines (`/company/applicants`), Team Members (`/company/organization`), Billing (`/billing`).
        *   *Admin*: System Analytics (`/admin`), KYC Verification Queue (`/admin/kyc`), User management database tables.
    *   *Sidebar Pinned Footer*: Displays the logged-in user's profile card, active subscription plan badge (`STARTER`, `PRO`, `ELITE`, `GROWTH`, `SCALE`, `ENTERPRISE`), active KYC status indicator, credits/XP counters, and a "Logout" action button.
*   **Sticky Topbar**: Renders a page title header, a notifications icon displaying unread counts, and a user settings drop-down menu.
*   **Responsive Drawers**: On screens smaller than 768px (mobile devices), collapse the left sidebar into a slide-over drawer triggered by a hamburger button in the topbar.

---

# SECTION 2: AUTHENTICATION & ONBOARDING FRONTEND CHANNELS

Ensure Claude implements fully complete TSX pages, handling form validations and linking with corresponding API endpoints.

## 2.1 Register Screen with Role Toggle (`src/app/auth/register/page.tsx`)
*   **Input Fields**: Name, Email, Password. Include client-side verification to enforce password lengths $\ge 8$ characters.
*   **Account Type Selector**: Render a two-column toggle grid for Account Type:
    *   *Option A (Freelancer)*: Renders a user icon, heading `"Join as Freelancer"`, and description `"Apply to premium corporate projects"`.
    *   *Option B (Company)*: Renders a building icon, heading `"Join as Company"`, and description `"Post listings and hire top talent"`.
    *   Selecting an option updates the local role state (`role` = "FREELANCER" | "COMPANY") with smooth background color highlight transitions.
*   **API Connection**: Submitting form triggers a POST call to `/api/auth/register` using Zod schemas to validate inputs. On success, redirects user to `/onboarding`. On error, displays a rose border alert card with the error message.

## 2.2 Universal Onboarding Forms Wizard (`src/app/onboarding/page.tsx`)
Track step progress locally using state: `const [step, setStep] = useState(1);`.

### STEP 1: Basic Information Setup
*   **Company Inputs**: Legal Business Name, Business Registration Number, Headquarters Address, Contact Email, Contact Phone.
*   **Freelancer Inputs**: Headline (e.g. "Senior React Developer"), Experience Years (numeric input).

### STEP 2: Experience & invitations
*   **Company Inputs**: Recruiter team seat invitations panel. Render a dynamic table to invite members. Includes text inputs for invitee Email Address and a select dropdown for access roles (`OrgRole` enums: Owner, Admin, Recruiter, Finance, Viewer). Clicking "Invite Member" adds the member row to a local array state, verifying that total rows do not exceed the company's active seat limits.
*   **Freelancer Inputs**: Skill tags selector (users type a skill and press Enter to save to a skills array state). Education forms grid (degree, school, field of study, start/end years). Clicking "Add Education" appends the education item to a local history list.

### STEP 3: Verification Documents & Availability Calendars
*   **KYC Verification Document Upload**:
    *   Dropdown: Select verification document type (Passport, National ID, Tax Certificate).
    *   Uploader: Drag-and-drop area to select files. Serializes the files to Base64 on upload and saves the files to state.
*   **Freelancer Calendar Scheduler**:
    *   Renders a calendar checklist representing Monday to Sunday. Clicking a day displays checkbox options for time intervals (e.g. `09:00 - 12:00`, `14:00 - 17:00`). Checking a slot saves the selection inside the freelancer's availability state.
*   **API Connection**: Clicking "Complete Onboarding" sends document strings and form state arrays to `/api/portfolio` (freelancers) or `/api/org` (companies) via a POST request. Updates the user's `kycStatus` in the database to `PENDING` and redirects them to `/home`.

---

# SECTION 3: HOME DASHBOARDS & OPPORTUNITIES PORTALS

## 3.1 Role-Based Dashboards (`src/app/(app)/home/page.tsx`)
*   **Freelancer Portal dashboard**:
    *   *Profile Stats*: Horizontal grid displaying XP, credits, reputation scores, and monthly earnings charts.
    *   *Streaks Widget*: Renders a grid showing the last 30 days of activity. Highlights days where the user completed milestones.
    *   *AI Matches Feed*: Calls `/api/search` to fetch the top 5 recommended opportunities with AI match scores.
*   **Company Portal Dashboard**:
    *   *Hiring Conversion Pipeline charts*: Displays charts tracking active listings, applicants count, interview counts, and budget escrow balances.
    *   *Pending Applications Panel*: Lists recent applications.

## 3.2 Opportunities Browser (`src/app/(app)/search/page.tsx`)
*   **Sidebar Filter Panel**:
    *   Inputs: Keyword query search, Location input.
    *   Dropdowns: Opportunity Domain (Tech, Creative, Writing), Experience level.
    *   Sliders: Minimum hourly rate range, budget range.
*   **Opportunities Grid**:
    *   Renders list of cards using `opportunity-card.tsx`.
    *   Each card displays title, description snippet, budget, skills tags, and the computed AI matching score badge. Clicking a card opens `/opportunities/[id]`.

## 3.3 Opportunity details & Apply Wizard (`src/app/(app)/opportunities/[id]/page.tsx`)
*   **Discussion Board Panel**:
    *   Lists public Q&A questions.
    *   Freelancers can submit questions via a text field (calls POST `/api/opportunities/[id]/apply`).
    *   If the current user is the poster company Recruiter, render a reply text area on each question card to submit replies (calls PATCH request).
*   **Screening Questions Apply Modal**:
    *   Presents questions required by the recruiter (Yes/No selections, paragraph fields, portfolio URLs, file uploads).
    *   Freelancer inputs answers and clicks `"Submit Application"`. The browser sends the application payload to `/api/opportunities/[id]/apply` (POST), updates the candidate's bid tracker page, and closes the modal.

---

# SECTION 4: CANDIDATE PIPELINES & WORKSPACES

## 4.1 Company Pipeline Board (`src/app/(app)/company/pipeline/[id]/page.tsx`)
Renders candidate cards divided into pipeline lane columns: `Applied`, `Shortlisted`, `Interview`, `Offer`, `Hired`, `Rejected`.
*   **Pipeline Stage Transitions**:
    *   recruiter transitions candidates by dragging cards across columns.
    *   On drop, the client sends a PATCH request to `/api/applications/[id]`, logs application event steps, and updates local board states.
*   **Interview Scheduler Modal**:
    *   Triggered when dragging cards to the `Interview` lane.
    *   Form fields: Date selector, Meeting Link input, meeting description. Submitting sends scheduled updates to the backend.
*   **Offer Creator Modal**:
    *   Triggered when dragging cards to the `Offer` lane.
    *   Form fields: Contract terms document text editor, stipend budget value, milestones list inputs (milestone title, milestone budget). Submitting details saves the offer letter payload inside the candidate application.

## 4.2 Workspace Tab Controllers (`src/components/WorkspaceView.tsx`)
Renders the six tab panels of the real-time shared workspace:

### 4.2.1 Tab 1: Overview
*   **escrow budget status radial chart**: Gauge showing total budget, locked escrow funds, and released funds. Parses milestone budget values inside titles (looks for regex strings like `[Value: 500]` or `$500`) to compute progress metrics.
*   **Project update announcements feed**: Displays chronological updates. Recruiter has a form containing text inputs (Title, Description, Status tags PENDING/IN_PROGRESS/COMPLETED) to post announcements (calls POST `/api/workspaces/[id]`).

### 4.2.2 Tab 2: Messages (Voice Visualizer players & DMs)
*   **Side channel navigation menu**: Toggles `# group`, `# freelancers`, DMs. Displays unread count notifications indicators next to channels.
*   **Audio Notes Recorder**:
    *   Clicking `Mic` starts recording. Sets `isRecordingVoice` to true.
    *   Runs interval timer tracking seconds.
    *   Generates a state array of 15 index wave heights updated every second with random integers (4-32) to animate waves.
    *   Stopping recording saves message input payloads formatted as: `[VOICE:voice_file.mp3|duration:M:SS]`. Posts payload to `/api/workspaces/[id]`.
*   **Audio Visualizer player**:
    *   Identifies voice message formats inside threads.
    *   Renders a play toggle button, a duration counter, and dynamic colored CSS bars representing the soundwave:
        ```tsx
        const isPlayed = index <= Math.floor(playbackProgress * totalBars);
        ```
    *   Playing visually animates waves, shifting colors from gray to highlighted red.
*   **AI Auditor chat companion**:
    *   Renders floating auditor panel. Users submit questions.
    *   Displays typing indicators (`isAITyping`) and returns markdown auditor replies outlining tasks counts, budgets breakdown, or timelines.

### 4.2.3 Tab 3: Deliverables Submissions
*   **Freelancer submission panel**: Drag-and-drop file uploader. Uploading logs deliverables entries in the files table with status `PENDING` (stored inside serialized `FileRecord.fileSize` JSON strings).
*   **Recruiter reviews panel**: Recruiter reviews files and selects "Approve" (calls milestone escrow release Server Actions) or "Request Changes" (triggers modal to log change request feedback).

### 4.2.4 Tab 4: Draggable Kanban Tasks
*   Renders lanes (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`).
*   Tasks are draggable across columns. On drop, the client sends updates to `/api/workspaces/[id]/tasks` (PATCH) to sync database columns.
*   Double-clicking cards opens details modals with inputs for assignees, priority, due dates, and descriptions.

### 5.4.5 Tab 5: Team Members Directory
*   Displays workspace members profiles, response speeds, ratings, and follow/watchlist options.

### 4.2.6 Tab 6: Escrow Milestones Contract signatures
*   **Signatures execution page**: Displays contract terms. Renders signed statuses (with logged IP addresses and timestamps). Transition to `ACTIVE` requires signature approval from both parties.
*   **Escrow releases widget**: Recruiter funds milestones (updates status to `ESCROWED`) and releases funds to freelancer payout balances (updates status to `RELEASED`).
*   **Time sheets log sheet**: Freelancers input weekly timesheets. Recruiter has buttons next to log rows to approve/reject hours. Approved hours release payments: $\text{Hours} \times \text{Freelancer hourly rate}$.

---

# SECTION 5: FRONTEND CODE GENERATION STEPS

Instruct Claude to follow this sequence when writing code:
1.  **Layouts & Shell Navs**: Set up `src/components/shell.tsx` and custom cookie auth state middleware rules.
2.  **Universal UI Design system**: Create `src/components/ui.tsx` design components.
3.  **Onboarding Portal**: Program the multi-step forms inside `src/app/onboarding/page.tsx` and bind it to profiles database tables.
4.  **Recruitment Pipeline view**: Program `src/app/(app)/company/pipeline/[id]/page.tsx` with drag-and-drop columns, scheduling interview calendars, and DMs.
5.  **Workspace Controller**: Implement `/workspace/[id]/page.tsx` loading all 6 collaborative tabs: Overview feeds, chat panels with voice visuals, deliverables histories, Kanban tasks columns, and milestones contracts.
6.  **Verify & Connect**: Test API connections, ensuring all state changes trigger corresponding SQLite mutations.
