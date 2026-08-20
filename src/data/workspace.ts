import type {
  LedgerEntry,
  Meeting,
  Message,
  PaymentItem,
  ProjectUpdate,
  SharedFile,
  StipendPeriod,
  Task,
  WorkLog,
} from "@/lib/types";
import { APPLICATIONS } from "./applications";
import { FREELANCER_BY_ID } from "./freelancers";
import { COMPANY_BY_ID } from "./companies";
import { PROJECT_BY_ID } from "./projects";
import { PORTFOLIO_SHOTS, pickFrom } from "@/lib/media";

const now = Date.now();
const iso = (days: number, hours = 0, minutes = 0) =>
  new Date(now + days * 86_400_000 + hours * 3_600_000 + minutes * 60_000).toISOString();

const hiredOn = (projectId: string) =>
  APPLICATIONS.filter((a) => a.projectId === projectId && a.status === "HIRED");

const appFor = (projectId: string, freelancerId: string) =>
  APPLICATIONS.find((a) => a.projectId === projectId && a.freelancerId === freelancerId)!;

/* ============================================================================
   PAYMENT STAGES (FIXED / MILESTONE projects)
   ========================================================================= */

interface StageSeed {
  projectId: string;
  freelancerId: string;
  title: string;
  description: string;
  amount: number;
  status: PaymentItem["status"];
  funded?: number;
  released?: number;
  dueInDays: number;
  revisions?: number;
  submissionNote?: string;
  reviewNote?: string;
}

const STAGE_SEEDS: StageSeed[] = [
  {
    projectId: "pr-observability",
    freelancerId: "fl-mei",
    title: "Stage 1 — Token layer & table primitive",
    description:
      "Design tokens defined in one file, the table primitive rebuilt against them, and both shipped behind a flag on the two lowest-traffic views.",
    amount: 12000,
    status: "RELEASED",
    funded: 12000,
    released: 12000,
    dueInDays: -18,
  },
  {
    projectId: "pr-observability",
    freelancerId: "fl-mei",
    title: "Stage 2 — Dashboard & alerts surfaces",
    description:
      "Both surfaces migrated onto the new system, Storybook coverage for every component introduced, and a performance report against the agreed baseline.",
    amount: 14000,
    status: "SUBMITTED",
    funded: 14000,
    released: 0,
    dueInDays: 4,
    submissionNote:
      "Both surfaces are migrated and behind the flag at 25% rollout. p95 on the dashboard is 168ms against a 340ms baseline — the report is attached as a deliverable. Two components (the trace timeline and the alert rule editor) needed more prop surface than the original spec assumed; both are documented in the migration guide.",
  },
  {
    projectId: "pr-observability",
    freelancerId: "fl-mei",
    title: "Stage 3 — Traces & settings migration",
    description:
      "The remaining two surfaces, including the JavaScript-to-TypeScript conversion on settings and billing.",
    amount: 14000,
    status: "FUNDED",
    funded: 6000,
    released: 0,
    dueInDays: 38,
  },
  {
    projectId: "pr-observability",
    freelancerId: "fl-mei",
    title: "Stage 4 — Documentation & handover",
    description:
      "Migration guide covering every retired pattern, contribution docs, and two handover sessions with the in-house team.",
    amount: 8000,
    status: "PENDING",
    funded: 0,
    released: 0,
    dueInDays: 72,
  },
  {
    projectId: "pr-docs-platform",
    freelancerId: "fl-lena",
    title: "Milestone 1 — Audit & information architecture",
    description: "Full content audit, the new task-oriented structure, and a redirect map.",
    amount: 4200,
    status: "RELEASED",
    funded: 4200,
    released: 4200,
    dueInDays: -24,
  },
  {
    projectId: "pr-docs-platform",
    freelancerId: "fl-lena",
    title: "Milestone 2 — Quickstart & core guides",
    description: "One canonical quickstart, tested cold, plus the six core task guides.",
    amount: 5600,
    status: "APPROVED",
    funded: 5600,
    released: 0,
    dueInDays: -2,
    revisions: 1,
    submissionNote:
      "Quickstart is rewritten and was tested by two people who had never used the product — both completed in under nine minutes. Six core guides are done. I filed four bugs against behaviour that did not match the old docs; three are already fixed.",
    reviewNote:
      "Approved. The quickstart is a genuine improvement. Please fold the fourth filed bug into milestone 3 rather than leaving it open.",
  },
  {
    projectId: "pr-docs-platform",
    freelancerId: "fl-lena",
    title: "Milestone 3 — API reference regeneration",
    description: "Reference regenerated from the deployed schema, with hand-written overviews per resource.",
    amount: 4400,
    status: "CHANGES_REQUESTED",
    funded: 4400,
    released: 0,
    dueInDays: 12,
    revisions: 1,
    submissionNote: "Reference is regenerated and the resource overviews are drafted.",
    reviewNote:
      "The generated reference is right, but four resource overviews still describe the v1 pagination behaviour. Please correct those and resubmit.",
  },
  {
    projectId: "pr-docs-platform",
    freelancerId: "fl-lena",
    title: "Milestone 4 — Style guide & contribution process",
    description: "Style guide, contribution guide, and a working session with the engineering team.",
    amount: 2600,
    status: "PENDING",
    funded: 0,
    released: 0,
    dueInDays: 28,
  },
  {
    projectId: "pr-clinical-ux",
    freelancerId: "fl-emma",
    title: "Research phase — protocol, fieldwork & findings",
    description: "Ethics pack, twelve contextual enquiry sessions, and the findings report.",
    amount: 19000,
    status: "RELEASED",
    funded: 19000,
    released: 19000,
    dueInDays: -12,
  },
  {
    projectId: "pr-clinical-ux",
    freelancerId: "fl-aisha",
    title: "Design phase — consultation surface redesign",
    description: "Redesigned consultation flow plus two rounds of usability testing.",
    amount: 13000,
    status: "FUNDED",
    funded: 13000,
    released: 0,
    dueInDays: 22,
  },
  {
    projectId: "pr-mobile-intake",
    freelancerId: "fl-carlos",
    title: "Milestone 1 — Sync architecture & spike",
    description: "Conflict resolution design, proven against a simulated field dataset.",
    amount: 8000,
    status: "RELEASED",
    funded: 8000,
    released: 8000,
    dueInDays: -158,
  },
  {
    projectId: "pr-mobile-intake",
    freelancerId: "fl-carlos",
    title: "Milestone 2 — Intake forms & offline store",
    description: "Full form runtime with an offline-first local store.",
    amount: 11000,
    status: "RELEASED",
    funded: 11000,
    released: 11000,
    dueInDays: -128,
  },
  {
    projectId: "pr-mobile-intake",
    freelancerId: "fl-carlos",
    title: "Milestone 3 — Sync engine",
    description: "Deterministic sync with conflict resolution and retry.",
    amount: 12000,
    status: "RELEASED",
    funded: 12000,
    released: 12000,
    dueInDays: -96,
  },
  {
    projectId: "pr-mobile-intake",
    freelancerId: "fl-carlos",
    title: "Milestone 4 — Field testing & remediation",
    description: "Two rounds of field testing across both regions, plus fixes.",
    amount: 6000,
    status: "RELEASED",
    funded: 6000,
    released: 6000,
    dueInDays: -70,
  },
  {
    projectId: "pr-mobile-intake",
    freelancerId: "fl-carlos",
    title: "Milestone 5 — Clinical sign-off & handover",
    description: "Safety board submission, documentation and handover.",
    amount: 4000,
    status: "RELEASED",
    funded: 4000,
    released: 4000,
    dueInDays: -52,
  },
  {
    projectId: "pr-design-system-audit",
    freelancerId: "fl-aisha",
    title: "Audit & remediation — full engagement",
    description: "74 components audited against WCAG 2.2 AA and remediated.",
    amount: 9600,
    status: "RELEASED",
    funded: 9600,
    released: 9600,
    dueInDays: -110,
  },
];

export const PAYMENT_ITEMS: PaymentItem[] = STAGE_SEEDS.map((s, i) => {
  const app = appFor(s.projectId, s.freelancerId);
  const freelancer = FREELANCER_BY_ID.get(s.freelancerId)!;
  const project = PROJECT_BY_ID.get(s.projectId)!;
  return {
    id: `pay-${i + 1}`,
    projectId: s.projectId,
    applicationId: app.id,
    assigneeName: freelancer.name,
    assigneeAvatar: freelancer.avatarUrl,
    title: s.title,
    description: s.description,
    sortOrder: i,
    amount: s.amount,
    currency: project.compensation.currency,
    status: s.status,
    dueDate: iso(s.dueInDays),
    fundedAmount: s.funded ?? 0,
    releasedAmount: s.released ?? 0,
    submissionNote: s.submissionNote,
    reviewNote: s.reviewNote,
    revisionCount: s.revisions ?? 0,
    submittedAt: s.submissionNote ? iso(s.dueInDays - 2) : undefined,
    reviewedAt: s.reviewNote ? iso(s.dueInDays - 1) : undefined,
    releasedAt: s.status === "RELEASED" ? iso(s.dueInDays + 1) : undefined,
    createdAt: iso(s.dueInDays - 30),
  };
});

/* ============================================================================
   WORK LOGS (HOURLY projects)
   ========================================================================= */

const WORKLOG_DESCRIPTIONS = [
  "Instrumented the carrier ingest stage — per-carrier counters, latency histograms and a drop reason label.",
  "Traced the drop path on the three highest-volume carriers. Two are silent JSON schema drifts; one is a genuine timeout.",
  "Built the dead-letter queue and wired the drop reason through to it.",
  "Backpressure implementation on the ingest workers, with a load test to prove the shape.",
  "Replay tooling — first pass. Reprocesses a time window from the dead-letter queue idempotently.",
  "Operator UI for replay: window picker, dry-run count, and a confirmation step.",
  "Alerting rules and thresholds, tuned against three weeks of historical data to avoid a noisy first week.",
  "Runbook for the on-call rotation, walked through with two engineers.",
  "Schema drift detection on carrier payloads, so the next drift is an alert rather than a mystery.",
  "Reviewed the week's drop rate: 0.04% sustained against the 0.05% target.",
];

export const WORK_LOGS: WorkLog[] = (() => {
  const logs: WorkLog[] = [];
  const configs = [
    { projectId: "pr-freight-pipeline", freelancerId: "fl-arjun", rate: 90, count: 10 },
    { projectId: "pr-data-warehouse", freelancerId: "fl-arjun", rate: 75, count: 8 },
  ];
  let n = 0;
  for (const cfg of configs) {
    const app = appFor(cfg.projectId, cfg.freelancerId);
    const freelancer = FREELANCER_BY_ID.get(cfg.freelancerId)!;
    const project = PROJECT_BY_ID.get(cfg.projectId)!;
    for (let i = 0; i < cfg.count; i++) {
      n++;
      const daysAgo = -(cfg.count - i) * 2 - 1;
      const status: WorkLog["status"] = i >= cfg.count - 2 ? "PENDING" : i === 2 ? "REJECTED" : "APPROVED";
      logs.push({
        id: `wl-${n}`,
        projectId: cfg.projectId,
        applicationId: app.id,
        freelancerName: freelancer.name,
        freelancerAvatar: freelancer.avatarUrl,
        workDate: iso(daysAgo).slice(0, 10),
        hours: [6, 7.5, 8, 5.5, 8, 6.5, 7, 4, 8, 6][i % 10],
        description:
          cfg.projectId === "pr-freight-pipeline"
            ? WORKLOG_DESCRIPTIONS[i % WORKLOG_DESCRIPTIONS.length]
            : [
                "Mapped every existing definition of 'active store' across the three teams and where each is computed.",
                "Staging models for orders, stores and sessions with tests on every primary key.",
                "First pass at the metrics layer — six of twelve metrics defined and tested.",
                "Definition sign-off session with growth, finance and product. Four metrics agreed, two escalated.",
                "Remaining six metrics modelled, including the two escalated definitions as agreed.",
                "Wired the metrics layer into the BI tool and rebuilt the three most-used dashboards on it.",
                "Backfill and reconciliation against the legacy numbers — within 1.8% on every metric.",
                "Documentation pass and the handover workshop deck.",
              ][i % 8],
        status,
        rateSnapshot: cfg.rate,
        currency: project.compensation.currency,
        reviewNote:
          status === "REJECTED"
            ? "This overlaps with the entry from the previous day — please split the hours across the two dates that the work actually happened on and resubmit."
            : undefined,
        reviewedAt: status !== "PENDING" ? iso(daysAgo + 1) : undefined,
        createdAt: iso(daysAgo),
      });
    }
  }
  return logs;
})();

/* ============================================================================
   STIPEND PERIODS
   ========================================================================= */

export const STIPEND_PERIODS: StipendPeriod[] = (() => {
  const out: StipendPeriod[] = [];
  const project = PROJECT_BY_ID.get("pr-curriculum-platform")!;
  const hired = hiredOn("pr-curriculum-platform");
  let n = 0;
  for (const app of hired) {
    for (let p = 1; p <= 4; p++) {
      n++;
      const released = p <= 2;
      out.push({
        id: `sp-${n}`,
        projectId: project.id,
        applicationId: app.id,
        freelancerName: app.freelancer.name,
        periodIndex: p,
        periodStart: iso(-30 * (3 - p)),
        periodEnd: iso(-30 * (3 - p) + 29),
        amount: project.compensation.stipendAmount ?? 1200,
        currency: project.compensation.currency,
        status: released ? "RELEASED" : "PENDING",
        releasedAt: released ? iso(-30 * (3 - p) + 30) : undefined,
      });
    }
  }
  return out;
})();

/* ============================================================================
   LEDGER (append-only)
   ========================================================================= */

export const LEDGER: LedgerEntry[] = (() => {
  const rows: LedgerEntry[] = [];
  let n = 0;

  for (const item of PAYMENT_ITEMS) {
    const project = PROJECT_BY_ID.get(item.projectId)!;
    const company = COMPANY_BY_ID.get(project.companyId)!;
    if (item.fundedAmount > 0) {
      n++;
      rows.push({
        id: `led-${n}`,
        projectId: item.projectId,
        applicationId: item.applicationId,
        paymentItemId: item.id,
        type: "FUND",
        amount: item.fundedAmount,
        currency: item.currency,
        actorName: company.companyName,
        note: `Funded "${item.title}"`,
        idempotencyKey: `item:${item.id}:fund`,
        createdAt: item.createdAt,
      });
    }
    if (item.releasedAmount > 0) {
      n++;
      rows.push({
        id: `led-${n}`,
        projectId: item.projectId,
        applicationId: item.applicationId,
        paymentItemId: item.id,
        type: "RELEASE",
        amount: -item.releasedAmount,
        currency: item.currency,
        actorName: company.companyName,
        note: `Released "${item.title}" to ${item.assigneeName}`,
        idempotencyKey: `item:${item.id}:release`,
        createdAt: item.releasedAt ?? item.createdAt,
      });
    }
  }

  // Hourly releases carry no paymentItemId (§10.4 / §24.4).
  const hourlyPaid = [
    { projectId: "pr-freight-pipeline", freelancerId: "fl-arjun", amount: 4230, days: -12 },
    { projectId: "pr-freight-pipeline", freelancerId: "fl-arjun", amount: 3150, days: -5 },
    { projectId: "pr-data-warehouse", freelancerId: "fl-arjun", amount: 3562.5, days: -9 },
  ];
  for (const h of hourlyPaid) {
    n++;
    const project = PROJECT_BY_ID.get(h.projectId)!;
    const company = COMPANY_BY_ID.get(project.companyId)!;
    const app = appFor(h.projectId, h.freelancerId);
    rows.push({
      id: `led-${n}`,
      projectId: h.projectId,
      applicationId: app.id,
      type: "RELEASE",
      amount: -h.amount,
      currency: project.compensation.currency,
      actorName: company.companyName,
      note: "Approved hours released",
      idempotencyKey: `hourly:${app.id}:release:${n}`,
      createdAt: iso(h.days),
    });
  }

  // Stipend releases.
  for (const p of STIPEND_PERIODS.filter((s) => s.status === "RELEASED")) {
    n++;
    rows.push({
      id: `led-${n}`,
      projectId: p.projectId,
      applicationId: p.applicationId,
      type: "RELEASE",
      amount: -p.amount,
      currency: p.currency,
      actorName: "BrightPath Education",
      note: `Stipend period ${p.periodIndex} released to ${p.freelancerName}`,
      idempotencyKey: `stipend:${p.applicationId}:${p.periodIndex}`,
      createdAt: p.releasedAt ?? iso(-30),
    });
  }

  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
})();

/* ============================================================================
   TASKS (kanban)
   ========================================================================= */

interface TaskSeed {
  projectId: string;
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  assignee?: string;
  dueInDays: number;
  labels: string[];
}

const TASK_SEEDS: TaskSeed[] = [
  { projectId: "pr-observability", title: "Convert settings surface to TypeScript", description: "The last JavaScript surface. Convert file by file, keeping the flag intact.", status: "TODO", priority: "MEDIUM", assignee: "fl-mei", dueInDays: 21, labels: ["stage-3", "migration"] },
  { projectId: "pr-observability", title: "Trace timeline component API review", description: "The prop surface grew past the original spec. Agree the final API before it lands in the library.", status: "REVIEW", priority: "HIGH", assignee: "fl-mei", dueInDays: 3, labels: ["stage-2", "design-system"] },
  { projectId: "pr-observability", title: "Alert rule editor — keyboard navigation", description: "Full keyboard path through rule creation, tested with a screen reader.", status: "IN_PROGRESS", priority: "HIGH", assignee: "fl-mei", dueInDays: 5, labels: ["a11y", "stage-2"] },
  { projectId: "pr-observability", title: "Token layer documentation", description: "Every semantic token documented with its intended use and a counter-example.", status: "DONE", priority: "MEDIUM", assignee: "fl-mei", dueInDays: -14, labels: ["stage-1", "docs"] },
  { projectId: "pr-observability", title: "Baseline performance capture", description: "Record p50/p95/p99 on the ten highest-traffic views before any migration lands.", status: "DONE", priority: "HIGH", assignee: "fl-mei", dueInDays: -22, labels: ["stage-1", "perf"] },
  { projectId: "pr-observability", title: "Dashboard rollout to 50%", description: "Move the flag from 25% to 50% once the alert-editor a11y work is merged.", status: "TODO", priority: "MEDIUM", dueInDays: 8, labels: ["rollout"] },
  { projectId: "pr-observability", title: "Migration guide — retired patterns", description: "One entry per retired pattern with the replacement and a codemod where possible.", status: "TODO", priority: "LOW", assignee: "fl-mei", dueInDays: 40, labels: ["stage-4", "docs"] },
  { projectId: "pr-observability", title: "Review in-house PRs against the new system", description: "Standing task. Two reviews a week minimum.", status: "IN_PROGRESS", priority: "MEDIUM", assignee: "fl-mei", dueInDays: 30, labels: ["standing"] },

  { projectId: "pr-clinical-ux", title: "Ethics submission — partner practice 4", description: "The fourth practice needs its own local governance sign-off.", status: "IN_PROGRESS", priority: "HIGH", assignee: "fl-emma", dueInDays: 4, labels: ["research", "compliance"] },
  { projectId: "pr-clinical-ux", title: "Synthesis workshop with clinical team", description: "Half-day session to pressure-test the findings before they go to the board.", status: "TODO", priority: "HIGH", assignee: "fl-emma", dueInDays: 9, labels: ["research"] },
  { projectId: "pr-clinical-ux", title: "Consultation flow — v2 prototype", description: "Second iteration incorporating round-one test findings.", status: "IN_PROGRESS", priority: "HIGH", assignee: "fl-aisha", dueInDays: 7, labels: ["design"] },
  { projectId: "pr-clinical-ux", title: "Time-on-task instrumentation spec", description: "Define exactly what we measure so the before/after comparison is honest.", status: "DONE", priority: "MEDIUM", assignee: "fl-emma", dueInDays: -16, labels: ["research", "data"] },
  { projectId: "pr-clinical-ux", title: "Round-two usability test plan", description: "Twelve participants, same protocol as round one so results are comparable.", status: "REVIEW", priority: "MEDIUM", assignee: "fl-aisha", dueInDays: 2, labels: ["design", "research"] },

  { projectId: "pr-freight-pipeline", title: "Schema drift alerting for carrier payloads", description: "Alert on unexpected fields or type changes rather than discovering them via drops.", status: "IN_PROGRESS", priority: "HIGH", assignee: "fl-arjun", dueInDays: 6, labels: ["reliability"] },
  { projectId: "pr-freight-pipeline", title: "Replay operator UI — dry run mode", description: "Show the count that would be reprocessed before anything is written.", status: "REVIEW", priority: "MEDIUM", assignee: "fl-arjun", dueInDays: 3, labels: ["tooling"] },
  { projectId: "pr-freight-pipeline", title: "On-call runbook walkthrough", description: "Session with the two engineers who carry the pager.", status: "TODO", priority: "MEDIUM", assignee: "fl-arjun", dueInDays: 14, labels: ["handover"] },
  { projectId: "pr-freight-pipeline", title: "Per-stage metrics dashboard", description: "One dashboard, per-carrier attribution, drop reason breakdown.", status: "DONE", priority: "HIGH", assignee: "fl-arjun", dueInDays: -11, labels: ["observability"] },

  { projectId: "pr-curriculum-platform", title: "Lesson builder — version history", description: "Owned by the apprentice, reviewed by the primary. Draft/publish with a diff view.", status: "IN_PROGRESS", priority: "HIGH", assignee: "fl-samuel", dueInDays: 10, labels: ["apprentice-owned", "editor"] },
  { projectId: "pr-curriculum-platform", title: "Resource library — tag taxonomy", description: "Agree the taxonomy with two practising teachers before building search on it.", status: "TODO", priority: "MEDIUM", assignee: "fl-mei", dueInDays: 12, labels: ["library"] },
  { projectId: "pr-curriculum-platform", title: "Editor autosave & conflict handling", description: "Two teachers editing the same lesson should not silently overwrite each other.", status: "REVIEW", priority: "HIGH", assignee: "fl-tomas", dueInDays: 4, labels: ["editor"] },
  { projectId: "pr-curriculum-platform", title: "Contributor onboarding guide", description: "A volunteer should be able to run the project locally in under an hour.", status: "TODO", priority: "LOW", dueInDays: 30, labels: ["docs"] },
  { projectId: "pr-curriculum-platform", title: "Weekly cohort call — week 6", description: "Apprentices present what they shipped. Primaries listen more than they talk.", status: "DONE", priority: "LOW", dueInDays: -3, labels: ["cohort"] },

  { projectId: "pr-docs-platform", title: "Correct v1 pagination in four resource overviews", description: "Raised at milestone 3 review. Blocking resubmission.", status: "IN_PROGRESS", priority: "HIGH", assignee: "fl-lena", dueInDays: 3, labels: ["milestone-3"] },
  { projectId: "pr-docs-platform", title: "Style guide draft", description: "Voice, terminology, code sample conventions.", status: "TODO", priority: "MEDIUM", assignee: "fl-lena", dueInDays: 18, labels: ["milestone-4"] },
  { projectId: "pr-docs-platform", title: "Redirect map for retired URLs", description: "Every retired page mapped to its replacement.", status: "DONE", priority: "HIGH", assignee: "fl-lena", dueInDays: -20, labels: ["milestone-1"] },

  { projectId: "pr-data-warehouse", title: "Reconcile legacy dashboard numbers", description: "Within 2% on every metric or explain the gap.", status: "REVIEW", priority: "HIGH", assignee: "fl-arjun", dueInDays: 2, labels: ["data"] },
  { projectId: "pr-data-warehouse", title: "Handover workshop", description: "Two hours with the analytics team, recorded.", status: "TODO", priority: "MEDIUM", assignee: "fl-arjun", dueInDays: 16, labels: ["handover"] },
];

export const TASKS: Task[] = TASK_SEEDS.map((t, i) => {
  const freelancer = t.assignee ? FREELANCER_BY_ID.get(t.assignee) : undefined;
  const project = PROJECT_BY_ID.get(t.projectId)!;
  const company = COMPANY_BY_ID.get(project.companyId)!;
  return {
    id: `task-${i + 1}`,
    projectId: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: iso(t.dueInDays),
    assignedToId: freelancer?.userId,
    assignedToName: freelancer?.name,
    assignedToAvatar: freelancer?.avatarUrl,
    createdByName: company.teamMembers[0]?.name ?? company.companyName,
    createdAt: iso(t.dueInDays - 14),
    labels: t.labels,
  };
});

/* ============================================================================
   MESSAGES
   ========================================================================= */

interface MsgSeed {
  projectId: string;
  channel: string;
  from: string; // freelancer id or "company"
  content: string;
  minutesAgo: number;
}

const MSG_SEEDS: MsgSeed[] = [
  { projectId: "pr-observability", channel: "group", from: "company", content: "Morning all. Stage 2 is submitted and in review — I'll have feedback back before end of day Thursday. Nothing is blocked on my side.", minutesAgo: 620 },
  { projectId: "pr-observability", channel: "group", from: "fl-mei", content: "Thanks. One thing worth flagging before the review: the trace timeline needed four more props than the original spec assumed. I've documented why in the migration guide but I'd rather we agree the final API before it hardens in the library.", minutesAgo: 580 },
  { projectId: "pr-observability", channel: "group", from: "company", content: "Agreed. Let's do it live rather than in comments — I've put 30 minutes in for Thursday. Ingrid will join.", minutesAgo: 545 },
  { projectId: "pr-observability", channel: "group", from: "fl-mei", content: "Perfect. I'll bring the before/after prop table and the two call sites that forced the change.", minutesAgo: 520 },
  { projectId: "pr-observability", channel: "group", from: "company", content: "p95 at 168ms against a 340ms baseline is a genuinely good result. I've shared the report with the leadership team.", minutesAgo: 180 },
  { projectId: "pr-observability", channel: "group", from: "fl-mei", content: "Most of it is the table virtualisation. The token work barely moved the needle on latency — it just made the next three surfaces cheap to build.", minutesAgo: 165 },
  { projectId: "pr-observability", channel: "freelancers", from: "fl-mei", content: "For anyone joining on stage 3 — read the migration guide before the codebase. The guide explains the sequencing decisions; the code only shows the outcome.", minutesAgo: 400 },

  { projectId: "pr-clinical-ux", channel: "group", from: "fl-emma", content: "Practice 4's local governance came back — approved with one condition: no recording in consultation rooms, notes only. That's workable, it just means I need a second observer for two of the sessions.", minutesAgo: 300 },
  { projectId: "pr-clinical-ux", channel: "group", from: "company", content: "Take Aisha as the second observer if that works for both of you. Better than bringing in someone cold.", minutesAgo: 280 },
  { projectId: "pr-clinical-ux", channel: "group", from: "fl-aisha", content: "Works for me — I wanted to be in the sessions anyway rather than reading the report second-hand.", minutesAgo: 265 },
  { projectId: "pr-clinical-ux", channel: "group", from: "fl-emma", content: "Early signal from the first six sessions: a meaningful chunk of the eleven minutes isn't interface at all, it's clinicians re-reading history because the summary isn't trustworthy. That's a content problem before it's a layout problem.", minutesAgo: 120 },
  { projectId: "pr-clinical-ux", channel: "freelancers", from: "fl-aisha", content: "That finding changes the design brief quite a lot. Worth us aligning before Thursday's synthesis so we present one view.", minutesAgo: 110 },
  { projectId: "pr-clinical-ux", channel: "freelancers", from: "fl-emma", content: "Agreed. Free tomorrow 14:00?", minutesAgo: 95 },

  { projectId: "pr-freight-pipeline", channel: "group", from: "fl-arjun", content: "Drop rate for the last seven days is 0.04% sustained. That's under the 0.05% target. Two of the three original failure modes are closed; the third (carrier 17's timeout) is upstream of us and I've documented it rather than papering over it.", minutesAgo: 220 },
  { projectId: "pr-freight-pipeline", channel: "group", from: "company", content: "That's the number we wanted. Can you write the carrier 17 issue up in a form we can send to them directly?", minutesAgo: 200 },
  { projectId: "pr-freight-pipeline", channel: "group", from: "fl-arjun", content: "Yes — I'll include the request/response traces and the p99 timings. It'll be in the workspace files by tomorrow.", minutesAgo: 190 },

  { projectId: "pr-curriculum-platform", channel: "group", from: "company", content: "Week six cohort call is done. Both apprentices presented shipped work, which is exactly what we hoped for at this point.", minutesAgo: 2600 },
  { projectId: "pr-curriculum-platform", channel: "group", from: "fl-tomas", content: "Samuel built the version history diff view himself. I reviewed three PRs and wrote none of it, which was the commitment I made at the start.", minutesAgo: 2580 },
  { projectId: "pr-curriculum-platform", channel: "group", from: "fl-samuel", content: "The conflict handling took me three attempts. First two were wrong in ways I didn't understand until Tomás asked me to explain what happens when two saves land in the same second.", minutesAgo: 2550 },
  { projectId: "pr-curriculum-platform", channel: "freelancers", from: "fl-samuel", content: "Question for the other apprentices — how are you keeping your learning logs? Mine has turned into a list of things I got wrong, which is useful but a bit demoralising to read back.", minutesAgo: 1400 },
  { projectId: "pr-curriculum-platform", channel: "freelancers", from: "fl-mei", content: "Add a line for what you'd do differently next time. Turns the same entry from a record into a decision.", minutesAgo: 1380 },
];

export const MESSAGES: Message[] = MSG_SEEDS.map((m, i) => {
  const project = PROJECT_BY_ID.get(m.projectId)!;
  const company = COMPANY_BY_ID.get(project.companyId)!;
  const isCompany = m.from === "company";
  const freelancer = isCompany ? undefined : FREELANCER_BY_ID.get(m.from);
  const lead = company.teamMembers[0];
  return {
    id: `msg-${i + 1}`,
    projectId: m.projectId,
    senderId: isCompany ? company.userId : freelancer!.userId,
    senderName: isCompany ? (lead?.name ?? company.companyName) : freelancer!.name,
    senderAvatar: isCompany ? (lead?.avatarUrl ?? "") : freelancer!.avatarUrl,
    senderRole: isCompany ? "COMPANY" : "FREELANCER",
    content: m.content,
    channel: m.channel,
    seen: m.minutesAgo > 240,
    createdAt: iso(0, 0, -m.minutesAgo),
  };
});

/* ============================================================================
   SHARED FILES & DELIVERABLES
   ========================================================================= */

interface FileSeed {
  projectId: string;
  from: string;
  fileName: string;
  size: string;
  mime: string;
  channel: string;
  daysAgo: number;
  deliverable?: {
    status: SharedFile["meta"]["status"];
    version: number;
    feedback?: string;
    revisionCount: number;
  };
}

const FILE_SEEDS: FileSeed[] = [
  { projectId: "pr-observability", from: "fl-mei", fileName: "stage-2-performance-report.pdf", size: "2.4 MB", mime: "application/pdf", channel: "group", daysAgo: 1, deliverable: { status: "PENDING", version: 1, revisionCount: 0 } },
  { projectId: "pr-observability", from: "fl-mei", fileName: "component-library-v3.fig.pdf", size: "8.1 MB", mime: "application/pdf", channel: "group", daysAgo: 2, deliverable: { status: "APPROVED", version: 2, feedback: "Approved. The prop tables in the appendix are exactly what the in-house team needed.", revisionCount: 1 } },
  { projectId: "pr-observability", from: "fl-mei", fileName: "migration-guide-draft.pdf", size: "1.2 MB", mime: "application/pdf", channel: "group", daysAgo: 5, deliverable: { status: "REVISION_REQUESTED", version: 1, feedback: "Good structure, but every retired pattern needs a codemod or an explicit note saying why one isn't possible. Two of the eleven have neither.", revisionCount: 1 } },
  { projectId: "pr-observability", from: "company", fileName: "brand-tokens-source.pdf", size: "640 KB", mime: "application/pdf", channel: "group", daysAgo: 22 },
  { projectId: "pr-observability", from: "fl-mei", fileName: "table-virtualisation-notes.pdf", size: "310 KB", mime: "application/pdf", channel: "freelancers", daysAgo: 4 },

  { projectId: "pr-clinical-ux", from: "fl-emma", fileName: "research-protocol-v3.pdf", size: "1.8 MB", mime: "application/pdf", channel: "group", daysAgo: 18, deliverable: { status: "APPROVED", version: 3, feedback: "Approved by the clinical safety board. Thank you for turning the two governance conditions around so quickly.", revisionCount: 2 } },
  { projectId: "pr-clinical-ux", from: "fl-emma", fileName: "interim-findings-sessions-1-6.pdf", size: "3.2 MB", mime: "application/pdf", channel: "group", daysAgo: 2, deliverable: { status: "PENDING", version: 1, revisionCount: 0 } },
  { projectId: "pr-clinical-ux", from: "fl-aisha", fileName: "consultation-flow-v2.pdf", size: "12.4 MB", mime: "application/pdf", channel: "group", daysAgo: 3, deliverable: { status: "PENDING", version: 2, revisionCount: 0 } },

  { projectId: "pr-freight-pipeline", from: "fl-arjun", fileName: "pipeline-observability-report.pdf", size: "2.1 MB", mime: "application/pdf", channel: "group", daysAgo: 8, deliverable: { status: "APPROVED", version: 1, feedback: "Approved. The per-carrier attribution is the piece we've wanted for two years.", revisionCount: 0 } },
  { projectId: "pr-freight-pipeline", from: "fl-arjun", fileName: "carrier-17-timeout-evidence.pdf", size: "890 KB", mime: "application/pdf", channel: "group", daysAgo: 1 },

  { projectId: "pr-curriculum-platform", from: "fl-samuel", fileName: "version-history-walkthrough.mp4", size: "18.2 MB", mime: "video/mp4", channel: "group", daysAgo: 2, deliverable: { status: "PENDING", version: 1, revisionCount: 0 } },
  { projectId: "pr-curriculum-platform", from: "fl-tomas", fileName: "editor-architecture-notes.pdf", size: "520 KB", mime: "application/pdf", channel: "group", daysAgo: 12 },

  { projectId: "pr-docs-platform", from: "fl-lena", fileName: "api-reference-milestone-3.pdf", size: "4.6 MB", mime: "application/pdf", channel: "group", daysAgo: 2, deliverable: { status: "REVISION_REQUESTED", version: 1, feedback: "Four resource overviews still describe v1 pagination. Please correct and resubmit.", revisionCount: 1 } },
];

export const SHARED_FILES: SharedFile[] = FILE_SEEDS.map((f, i) => {
  const project = PROJECT_BY_ID.get(f.projectId)!;
  const company = COMPANY_BY_ID.get(project.companyId)!;
  const isCompany = f.from === "company";
  const freelancer = isCompany ? undefined : FREELANCER_BY_ID.get(f.from);
  const lead = company.teamMembers[0];
  return {
    id: `file-${i + 1}`,
    projectId: f.projectId,
    uploadedById: isCompany ? company.userId : freelancer!.userId,
    uploadedByName: isCompany ? (lead?.name ?? company.companyName) : freelancer!.name,
    uploadedByAvatar: isCompany ? (lead?.avatarUrl ?? "") : freelancer!.avatarUrl,
    fileName: f.fileName,
    fileUrl: `/uploads/${f.fileName}`,
    channel: f.channel,
    uploadedAt: iso(-f.daysAgo),
    meta: {
      size: f.size,
      mime: f.mime,
      isDeliverable: Boolean(f.deliverable),
      status: f.deliverable?.status,
      version: f.deliverable?.version,
      feedback: f.deliverable?.feedback,
      revisionCount: f.deliverable?.revisionCount,
      revisionCap: 2,
      previewUrl: pickFrom(PORTFOLIO_SHOTS, i),
    },
  };
});

/* ============================================================================
   PROJECT UPDATES (activity feed)
   ========================================================================= */

interface UpdateSeed {
  projectId: string;
  from: string;
  title: string;
  description: string;
  status: ProjectUpdate["status"];
  daysAgo: number;
}

const UPDATE_SEEDS: UpdateSeed[] = [
  { projectId: "pr-observability", from: "fl-mei", title: "Stage 2 submitted for review", description: "Dashboard and alerts are migrated and behind the flag at 25% rollout. Performance report attached. Two components needed a wider prop surface than specified — documented in the migration guide.", status: "COMPLETED", daysAgo: 1 },
  { projectId: "pr-observability", from: "company", title: "Stage 3 partially funded", description: "Funded 6,000 of 14,000 on stage 3 to unblock the settings conversion. The balance follows once stage 2 is approved.", status: "IN_PROGRESS", daysAgo: 2 },
  { projectId: "pr-observability", from: "fl-mei", title: "Stage 1 released", description: "Token layer and table primitive shipped and released in full. Baseline performance captured before any migration landed.", status: "COMPLETED", daysAgo: 17 },
  { projectId: "pr-observability", from: "company", title: "Engagement kicked off", description: "Mei joined as Lead Frontend Engineer. Four stages agreed, each independently shippable behind a flag.", status: "COMPLETED", daysAgo: 30 },

  { projectId: "pr-clinical-ux", from: "fl-emma", title: "Six of twelve sessions complete", description: "Early signal suggests a meaningful share of consultation time is spent re-reading history rather than navigating the interface. This may reshape the design brief.", status: "IN_PROGRESS", daysAgo: 2 },
  { projectId: "pr-clinical-ux", from: "fl-emma", title: "Ethics approval received for all four practices", description: "Practice 4 approved with a notes-only condition. Aisha will act as second observer for the two affected sessions.", status: "COMPLETED", daysAgo: 12 },
  { projectId: "pr-clinical-ux", from: "company", title: "Research phase released in full", description: "19,000 GBP released against the research phase.", status: "COMPLETED", daysAgo: 11 },

  { projectId: "pr-freight-pipeline", from: "fl-arjun", title: "Drop rate under target", description: "0.04% sustained across seven days against a 0.05% target. Two of three failure modes closed; the third is upstream at carrier 17 and documented.", status: "COMPLETED", daysAgo: 1 },
  { projectId: "pr-freight-pipeline", from: "fl-arjun", title: "Replay tooling in review", description: "Dry-run mode shows the count that would be reprocessed before anything writes.", status: "IN_PROGRESS", daysAgo: 4 },

  { projectId: "pr-curriculum-platform", from: "company", title: "Week six cohort call", description: "Both apprentices presented shipped work. Version history diff view was built and owned by the apprentice on the lesson builder role.", status: "COMPLETED", daysAgo: 2 },
  { projectId: "pr-curriculum-platform", from: "company", title: "Stipend period 2 released", description: "Period 2 released to every contributor, primary and apprentice alike.", status: "COMPLETED", daysAgo: 5 },

  { projectId: "pr-docs-platform", from: "company", title: "Milestone 3 returned for revision", description: "Four resource overviews still describe v1 pagination. One revision of two used.", status: "PENDING", daysAgo: 1 },
  { projectId: "pr-docs-platform", from: "fl-lena", title: "Milestone 2 approved", description: "Quickstart tested cold by two people, both completing in under nine minutes.", status: "COMPLETED", daysAgo: 3 },
];

export const PROJECT_UPDATES: ProjectUpdate[] = UPDATE_SEEDS.map((u, i) => {
  const project = PROJECT_BY_ID.get(u.projectId)!;
  const company = COMPANY_BY_ID.get(project.companyId)!;
  const isCompany = u.from === "company";
  const freelancer = isCompany ? undefined : FREELANCER_BY_ID.get(u.from);
  const lead = company.teamMembers[0];
  return {
    id: `upd-${i + 1}`,
    projectId: u.projectId,
    createdById: isCompany ? company.userId : freelancer!.userId,
    createdByName: isCompany ? (lead?.name ?? company.companyName) : freelancer!.name,
    createdByAvatar: isCompany ? (lead?.avatarUrl ?? "") : freelancer!.avatarUrl,
    title: u.title,
    description: u.description,
    status: u.status,
    createdAt: iso(-u.daysAgo),
  };
});

/* ============================================================================
   MEETINGS
   ========================================================================= */

interface MeetingSeed {
  projectId: string;
  title: string;
  description: string;
  inDays: number;
  hour: number;
  duration: number;
  status: Meeting["status"];
  rsvp?: Record<string, "INVITED" | "ACCEPTED" | "DECLINED">;
}

const MEETING_SEEDS: MeetingSeed[] = [
  { projectId: "pr-observability", title: "Trace timeline API review", description: "Agree the final prop surface before it hardens in the library. Bring the before/after table.", inDays: 2, hour: 14, duration: 30, status: "SCHEDULED", rsvp: { "fl-mei": "ACCEPTED" } },
  { projectId: "pr-observability", title: "Stage 2 review & sign-off", description: "Walk through the performance report and agree whether stage 2 is approved.", inDays: 4, hour: 10, duration: 45, status: "SCHEDULED", rsvp: { "fl-mei": "INVITED" } },
  { projectId: "pr-observability", title: "Weekly pairing — Ingrid & Mei", description: "Standing session.", inDays: -3, hour: 15, duration: 60, status: "COMPLETED", rsvp: { "fl-mei": "ACCEPTED" } },
  { projectId: "pr-clinical-ux", title: "Synthesis workshop", description: "Half day with the clinical team to pressure-test findings before the board.", inDays: 5, hour: 9, duration: 180, status: "SCHEDULED", rsvp: { "fl-emma": "ACCEPTED", "fl-aisha": "ACCEPTED" } },
  { projectId: "pr-clinical-ux", title: "Design review — consultation flow v2", description: "Second iteration walkthrough.", inDays: 1, hour: 16, duration: 45, status: "SCHEDULED", rsvp: { "fl-aisha": "ACCEPTED", "fl-emma": "INVITED" } },
  { projectId: "pr-clinical-ux", title: "Clinical safety board — interim", description: "Cancelled; moved into the synthesis workshop.", inDays: 3, hour: 11, duration: 60, status: "CANCELLED", rsvp: { "fl-emma": "ACCEPTED" } },
  { projectId: "pr-freight-pipeline", title: "Weekly reliability review", description: "Standing. Drop rate, alert noise, and anything the on-call rotation hit.", inDays: 3, hour: 13, duration: 30, status: "SCHEDULED", rsvp: { "fl-arjun": "ACCEPTED" } },
  { projectId: "pr-curriculum-platform", title: "Cohort call — week 7", description: "Apprentices present. Primaries listen.", inDays: 4, hour: 12, duration: 60, status: "SCHEDULED", rsvp: { "fl-tomas": "ACCEPTED", "fl-samuel": "ACCEPTED", "fl-mei": "INVITED" } },
  { projectId: "pr-docs-platform", title: "Milestone 3 re-review", description: "Once the pagination corrections land.", inDays: 6, hour: 11, duration: 30, status: "SCHEDULED", rsvp: { "fl-lena": "INVITED" } },
];

export const MEETINGS: Meeting[] = MEETING_SEEDS.map((m, i) => {
  const project = PROJECT_BY_ID.get(m.projectId)!;
  const company = COMPANY_BY_ID.get(project.companyId)!;
  const lead = company.teamMembers[0];
  const date = new Date(now + m.inDays * 86_400_000);
  date.setHours(m.hour, 0, 0, 0);

  const attendees: Meeting["attendees"] = [
    {
      userId: company.userId,
      name: lead?.name ?? company.companyName,
      avatarUrl: lead?.avatarUrl ?? "",
      role: "COMPANY",
      status: "ACCEPTED",
    },
    ...Object.entries(m.rsvp ?? {}).map(([flId, status]) => {
      const f = FREELANCER_BY_ID.get(flId)!;
      return {
        userId: f.userId,
        name: f.name,
        avatarUrl: f.avatarUrl,
        role: "FREELANCER" as const,
        status,
      };
    }),
  ];

  return {
    id: `meet-${i + 1}`,
    projectId: m.projectId,
    organizerUserId: company.userId,
    organizerName: lead?.name ?? company.companyName,
    title: m.title,
    description: m.description,
    startsAt: date.toISOString(),
    durationMinutes: m.duration,
    meetingUrl: `https://meet.frivvo.app/${project.id}-${i + 1}`,
    status: m.status,
    attendees,
  };
});
