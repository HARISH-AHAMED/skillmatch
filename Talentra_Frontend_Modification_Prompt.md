# Talentra Frontend Code Modification Specification (Claude AI Prompts)

This document provides explicit instructions, code signatures, state requirements, and layout parameters to guide **Claude AI** in modifying the existing **frontend files** of Talentra. It details exactly how to integrate multi-tenant subscription tiers, team member management panels, custom AI matching sliders, time sheets, speech recorder message nodes, and digital signature panels.

---

## 1. Modifying the Sidebar & Dashboard Controls (`src/components/Sidebar.tsx`)

### The Goal
Display active subscription plans, paywall limit counters, and links to KYC (Know Your Customer) upload verification forms.

### Code Modifying Instructions
*   Add a `Subscription` lookup using your react hooks or page props: `planName`, `projectLimit`, `seatLimit`.
*   **For Freelancers**:
    *   *Limit Counter*: Render a progress bar tracking remaining bids/applications: `"Applications: 2 / 5 Bids Used"` (if on Free Tier).
    *   *Upgrade Action*: Render a visual CTA button: `"Upgrade to Pro ($19/mo)"` leading to the Stripe Checkout session.
    *   *KYC Badge Status*: Render status alerts based on `kycVerification` states (`UNSUBMITTED` $\rightarrow$ "Verify Identity", `PENDING` $\rightarrow$ "Pending Verification", `APPROVED` $\rightarrow$ "Verified Profile").
*   **For Companies**:
    *   *Limit Counter*: Render stats showing project allocations: `"Active Listings: 3 / 3 Limits Used"` (if Starter).
    *   *Seats Counter*: Show sub-team seats: `"Seats Used: 2 / 2 Seats"`.
    *   *Upgrade Action*: Render a billing settings link or CTA button: `"Upgrade to Growth/Enterprise Plan"`.

---

## 2. Modifying Company Profile and Invites (`src/app/company/profile/ProfileForm.tsx`)

### The Goal
Add a sub-team seat management panel to invite executives, assign roles, and display statuses.

### Code Modifying Instructions
Add a new form section named **"Organization Sub-Team Members"** inside the settings card.
1.  **State Arrays**: Define local React state hooks to manage list operations:
    ```typescript
    const [team, setTeam] = useState<{name: string, email: string, role: string, designation: string}[]>([]);
    ```
2.  **Invite Form Row Elements**:
    *   Input: `Email Address` (text, required validation).
    *   Input: `Full Name` (text).
    *   Select Dropdown: `Designation / Position` (such as Executive, Recruiter).
    *   Select Dropdown: `Access Permissions` (`OrgRole` enums: Owner, Admin, Recruiter, Finance, Viewer).
    *   Action button: `Add Member Row` (validates email syntax, inserts row to team list state, and disables inputs if maximum subscription seat limits are met).
3.  **Member Table Details**:
    *   Render a list table displaying members, designated roles, and invitation status badges (`INVITED`, `ACCEPTED`, `DECLINED`).
    *   Add a "Delete / Revoke Invitation" button for each member row, triggering server action calls to update the team database metadata.

---

## 3. Modifying Freelancer Profile Settings (`src/app/freelancer/profile/ProfileForm.tsx`)

### The Goal
Integrate the target hourly rate parameters, expectations, and the weekly availability slot scheduler.

### Code Modifying Instructions
1.  **Expectations Block**: Add the following form controls mapping to the JSON experience parameters:
    *   Input: `Expected Hourly Rate ($/hr)` (numeric type, default $50/hr).
    *   Input: `Minimum Budget Expectation ($)` (numeric type).
    *   Select Dropdown: `Remote Preference` (options: Remote, Hybrid, Onsite).
    *   Input: `Primary Timezone Selector` (such as GMT+5:30).
    *   Inputs: `LinkedIn Profile URL`, `GitHub Profile URL`, and `Website link`.
2.  **Weekly Scheduler Grid UI**:
    *   Render a calendar interface showing days (Monday to Sunday).
    *   For each day, display a list of time slot checkboxes (e.g. `09:00 - 10:00`, `14:00 - 15:00`).
    *   Provide states to select multiple slot strings and save the selections inside the `availabilityCalendar` array:
        ```typescript
        interface AvailabilitySlot { dayOfWeek: string; slots: string[] }
        ```

---

## 4. Modifying Project Creator Form (`src/app/company/projects/new/page.tsx`)

### The Goal
Add Category selections and custom Recruitment Round pipeline setups.

### Code Modifying Instructions
Ensure the multi-step project form includes:
1.  **Categories State Dropdowns**:
    *   Select: `Opportunity Domain` (e.g. Tech, Writing, Business).
    *   Select: `Opportunity Category` (filtered based on domain selection).
    *   Select: `Opportunity Subcategory` (filtered based on category selection).
2.  **Recruitment Pipeline Rounds Configurator**:
    *   Create a custom list setup mapping rounds (`RecruitmentRound` structures).
    *   Render action buttons: `"Add Custom Evaluation Round"`. Clicking opens a selector layout choice: `CV_PITCH`, `SCREENING_QUESTIONS`, `INTERVIEW`, `COGNITIVE_TEST`, or `TECHNICAL_ASSESSMENT`.
    *   *Round Questions Editor*: If `SCREENING_QUESTIONS` is added, render a nested form allowing recruiters to create multiple questions (specify text, toggle required switches, and select input types: MCQs, yes/no, or paragraphs).
    *   If MCQ is chosen, display text fields to input up to 4 multiple choice options.

---

## 5. Modifying Workspace Interface (`src/components/WorkspaceView.tsx`)

This is the largest frontend workspace file. Inject these modifications into the matching tab layouts:

### A. Overview Tab: Updates Feed publishing panel
*   Render a radial completion percentage chart representing milestones progress.
*   Render a "Project Announcements & Updates" feed.
*   **For Recruiter**: Render a form containing input elements: `Update Title` (text), `Description` (textarea), and select status badge (`PENDING`, `IN_PROGRESS`, `COMPLETED`). Submitting pushes an announcement update to the project updates timeline list.

### B. Messages Tab: Audio mic and seen trackers
*   Implement channel toggling columns on the left: General Chat (`group`), Freelancers chat (`freelancers`), and individual Direct Message (DM) channels.
*   **Audio Recording Widget**: Render a `Mic` icon button.
    *   Clicking changes state to `isRecordingVoice` and renders a visual waveforms graphic:
        ```tsx
        {isRecordingVoice && (
          <div className="flex items-center gap-1">
            {voiceWave.map((h, i) => (
              <span key={i} className="bg-rose-500 w-1 rounded-full transition-all duration-300" style={{ height: `${h}px` }} />
            ))}
            <span className="text-xs text-rose-500 font-mono ml-2">{recordingSeconds}s</span>
          </div>
        )}
        ```
    *   Provide stop action button calling `stopAndSendVoice` server uploads, and cancel actions to close recording arrays.
*   **Visual Wave Audio Bubble**: In message lists, check if content has audio patterns:
    *   Render custom media bubble cards with play/pause triggers and soundwave progress bar columns that shift colors from gray to highlighted red during playback duration.

### C. Workspace AI Companion Sidebar panel
*   Render a floating chatbot panel: `"Workspace Assistant Auditor"`.
*   Users input query prompts (e.g. `"List tasks"`, `"Show budget escrow details"`).
*   Add typing indicators (`isAITyping`) and render formatted Markdown assistant replies outlining tasks counts, budgets breakdown, or timelines.

### D. Deliverables Tab: Submissions & Version Histories
*   **For Freelancer**: Render file select zone showing progress bars. Displays list rows of uploaded items showing size, date, and status badges.
*   **For Recruiter**: Recruiter has a review card displaying submitted files, version logs, and action items: `"Approve Deliverable"` (opens confirming escrow payment releases modal) and `"Request Changes"` (opens text input area for feedback).

### E. Tasks Tab (Kanban board layout)
*   Define columns list mapping task status: `To Do`, `In Progress`, `Under Review`, and `Done`.
*   Enable drag-and-drop actions on task cards or provide dropdown transition selectors to change task status cards.
*   Clicking a task card opens a task details view modal with inputs: assign user dropdown, due date calendars, description editors, and delete task buttons.

### F. Milestones Tab (Digital Escrow Contracts)
*   **Sign Document panel**: Display standard agreement text. Render validation tick marks showing signed names, IP logs, and date. Green checks highlight signatures.
*   **Time log worksheet sheets**: Render timesheets logs tracking freelancer weekly inputs (Date, hours, descriptions).
    *   *For Freelancer*: Form to log weekly hours.
    *   *For Recruiter*: Approval buttons next to time log rows to approve/reject hours logged.

---

## 6. AI Sliders weights Overrider UI (`src/app/company/applicants/page.tsx`)

*   In company candidate search filters settings, add an accordion section labeled **"Configure Custom AI Matching Weights"**.
*   Render 5 slider controls ($W_i$ coefficients) with default points:
    *   Skills Match Slider (Default 0.50)
    *   Experience Match Slider (Default 0.20)
    *   Ratings Match Slider (Default 0.15)
    *   Completion Rate Slider (Default 0.10)
    *   Project Priority Slider (Default 0.05)
*   **Calculation Constraints**: Ensure changes adjust weights in real-time, enforcing the total matches sum is exactly $1.0$. Render visual error warnings if the sum does not equal $1.0$, disabling the "Save Weights Profile" action button.
