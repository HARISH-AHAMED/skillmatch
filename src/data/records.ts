import type { AppNotification, Certificate, Review } from "@/lib/types";
import { COMPANY_BY_ID } from "./companies";
import { FREELANCER_BY_ID } from "./freelancers";
import { PROJECT_BY_ID } from "./projects";

const now = Date.now();
const iso = (days: number, hours = 0) =>
  new Date(now + days * 86_400_000 + hours * 3_600_000).toISOString();

/* ============================================================================
   CERTIFICATES (§17)
   ========================================================================= */

interface CertSeed {
  projectId: string;
  freelancerId: string;
  roleTitle: string;
  skills: string[];
  duration: string;
  summary: string;
  publicId: string;
  daysAgo: number;
  revoked?: string;
  hidden?: boolean;
}

const CERT_SEEDS: CertSeed[] = [
  {
    projectId: "pr-mobile-intake",
    freelancerId: "fl-carlos",
    roleTitle: "Lead Mobile Engineer",
    skills: ["react native", "typescript", "swift", "offline sync"],
    duration: "4 months",
    summary:
      "Delivered an offline-first patient intake application across five funded milestones, now live with 340 community health workers across two regions. Owned the sync architecture end to end and presented to the clinical safety board.",
    publicId: "K7MPQ-3XR9T",
    daysAgo: 48,
  },
  {
    projectId: "pr-design-system-audit",
    freelancerId: "fl-aisha",
    roleTitle: "Project Contributor",
    skills: ["design systems", "figma", "ui design", "accessibility"],
    duration: "6 weeks",
    summary:
      "Audited 74 components against WCAG 2.2 AA, remediated every failure, and established an accessibility check in the component review process.",
    publicId: "H4NDW-8YKV2",
    daysAgo: 104,
  },
  {
    projectId: "pr-mobile-intake",
    freelancerId: "fl-aisha",
    roleTitle: "Product Designer",
    skills: ["figma", "prototyping", "ux research"],
    duration: "6 weeks",
    summary:
      "Designed the intake form runtime and the offline state language used across the application.",
    publicId: "R2TQX-6MJH5",
    daysAgo: 52,
    hidden: true,
  },
];

export const CERTIFICATES: Certificate[] = CERT_SEEDS.map((c, i) => {
  const project = PROJECT_BY_ID.get(c.projectId)!;
  const company = COMPANY_BY_ID.get(project.companyId)!;
  const freelancer = FREELANCER_BY_ID.get(c.freelancerId)!;
  return {
    id: `cert-${i + 1}`,
    publicId: c.publicId,
    projectId: c.projectId,
    freelancerId: c.freelancerId,
    companyId: company.id,
    roleTitle: c.roleTitle,
    skills: c.skills,
    durationText: c.duration,
    summary: c.summary,
    issuerName: company.companyName,
    issuerLogo: company.logoUrl,
    recipientName: freelancer.name,
    projectTitle: project.title,
    issuedAt: iso(-c.daysAgo),
    signer1Name: project.certificate.signatoryName,
    signer1Title: project.certificate.signatoryDesignation,
    signer2Name: company.teamMembers[1]?.name,
    signer2Title: company.teamMembers[1]?.title,
    revokedAt: c.revoked ? iso(-c.daysAgo + 10) : undefined,
    revokeReason: c.revoked,
    hidden: c.hidden,
    config: project.certificate,
  };
});

export const CERTIFICATE_BY_PUBLIC_ID = new Map(CERTIFICATES.map((c) => [c.publicId, c]));

/* ============================================================================
   REVIEWS (§11.11 / §22.6)
   ========================================================================= */

interface ReviewSeed {
  projectId: string;
  direction: "COMPANY_TO_FREELANCER" | "FREELANCER_TO_COMPANY";
  freelancerId: string;
  rating: number;
  comment: string;
  sub?: [number, number, number];
  daysAgo: number;
}

const REVIEW_SEEDS: ReviewSeed[] = [
  {
    projectId: "pr-mobile-intake",
    direction: "COMPANY_TO_FREELANCER",
    freelancerId: "fl-carlos",
    rating: 5,
    comment:
      "Carlos delivered the hardest part of this engagement — deterministic offline sync — without ever making it sound harder than it was. He flagged the two decisions that would be expensive to reverse in week one rather than week ten, which is the single most useful thing a contractor has done for us this year. He also stayed for the clinical safety board and answered questions directly rather than deferring to us.",
    daysAgo: 46,
  },
  {
    projectId: "pr-mobile-intake",
    direction: "FREELANCER_TO_COMPANY",
    freelancerId: "fl-carlos",
    rating: 5,
    comment:
      "Lumen are the most organised client I have worked with. Milestones were funded before I started each one, reviews came back within two days every time, and nobody tried to expand scope inside a fixed stage. The clinical context was explained properly at the start, which saved weeks.",
    sub: [5, 5, 5],
    daysAgo: 45,
  },
  {
    projectId: "pr-design-system-audit",
    direction: "COMPANY_TO_FREELANCER",
    freelancerId: "fl-aisha",
    rating: 5,
    comment:
      "Aisha found 41 failures we did not know we had and fixed all of them inside the original six weeks. What we did not expect was the review checklist she left behind — it has already caught three regressions since handover. She was also candid when two of our components needed redesigning rather than patching, and she was right.",
    daysAgo: 102,
  },
  {
    projectId: "pr-design-system-audit",
    direction: "FREELANCER_TO_COMPANY",
    freelancerId: "fl-aisha",
    rating: 4,
    comment:
      "Good engagement with a clear scope and prompt payment. The only friction was access — it took eight days to get me into the component repository, which ate into a six-week timeline. Everything after that was smooth and the team engaged seriously with the findings.",
    sub: [4, 5, 4],
    daysAgo: 100,
  },
];

export const REVIEWS: Review[] = REVIEW_SEEDS.map((r, i) => {
  const project = PROJECT_BY_ID.get(r.projectId)!;
  const company = COMPANY_BY_ID.get(project.companyId)!;
  const freelancer = FREELANCER_BY_ID.get(r.freelancerId)!;
  const lead = company.teamMembers[0];
  const c2f = r.direction === "COMPANY_TO_FREELANCER";
  return {
    id: `rev-${i + 1}`,
    projectId: r.projectId,
    projectTitle: project.title,
    reviewerId: c2f ? company.id : freelancer.id,
    reviewerName: c2f ? company.companyName : freelancer.name,
    reviewerAvatar: c2f ? (lead?.avatarUrl ?? "") : freelancer.avatarUrl,
    reviewerRole: c2f ? "COMPANY" : "FREELANCER",
    revieweeId: c2f ? freelancer.id : company.id,
    revieweeName: c2f ? freelancer.name : company.companyName,
    rating: r.rating,
    comment: r.comment,
    communicationScore: r.sub?.[0],
    paymentReliabilityScore: r.sub?.[1],
    projectClarityScore: r.sub?.[2],
    createdAt: iso(-r.daysAgo),
  };
});

/* ============================================================================
   NOTIFICATIONS (§13.3)
   ========================================================================= */

interface NotifSeed {
  userId: string;
  title: string;
  message: string;
  kind: AppNotification["kind"];
  href: string;
  minutesAgo: number;
  read?: boolean;
}

const NOTIF_SEEDS: NotifSeed[] = [
  // Company — Northwind
  { userId: "u-co-northwind", title: "New Application Received", message: "Samuel Adeyemi applied to 'Observability Console — Frontend Rebuild'. AI Match Score: 62%.", kind: "application", href: "/company/applicants", minutesAgo: 95 },
  { userId: "u-co-northwind", title: "Stage submitted for review", message: "Mei Chen submitted 'Stage 2 — Dashboard & alerts surfaces' for review.", kind: "money", href: "/workspace/app-1?tab=milestones", minutesAgo: 240 },
  { userId: "u-co-northwind", title: "Group Chat Update", message: "Mei Chen: Most of it is the table virtualisation. The token work barely…", kind: "message", href: "/workspace/app-1?tab=messages", minutesAgo: 165 },
  { userId: "u-co-northwind", title: "New Application Received", message: "Carlos Mendes applied to 'Observability Console — Frontend Rebuild'. AI Match Score: 71%.", kind: "application", href: "/company/applicants", minutesAgo: 1400, read: true },
  { userId: "u-co-northwind", title: "Team Member Confirmed", message: "Mei Chen confirmed their placement on Lead Frontend Engineer.", kind: "team", href: "/company/projects/pr-observability", minutesAgo: 9800, read: true },
  { userId: "u-co-northwind", title: "New Company Review", message: "Lena Fischer left a review on 'Developer Documentation Overhaul'.", kind: "system", href: "/company/reviews", minutesAgo: 14000, read: true },
  { userId: "u-co-northwind", title: "New meeting scheduled", message: '"Trace timeline API review" is confirmed for Thursday.', kind: "meeting", href: "/workspace/app-1?tab=meetings", minutesAgo: 400, read: true },
  { userId: "u-co-northwind", title: "Design your certificate", message: "'Developer Documentation Overhaul' has certificates enabled but no template designed yet.", kind: "certificate", href: "/company/projects/pr-docs-platform/certificate", minutesAgo: 2000, read: true },

  // Freelancer — Mei Chen
  { userId: "u-fl-mei", title: "Escrow Funds Released", message: "USD 12,000.00 released for 'Stage 1 — Token layer & table primitive'.", kind: "money", href: "/workspace/app-1?tab=milestones", minutesAgo: 24000, read: true },
  { userId: "u-fl-mei", title: "New Task Assigned", message: "You were assigned 'Trace timeline component API review'.", kind: "team", href: "/workspace/app-1?tab=tasks", minutesAgo: 300 },
  { userId: "u-fl-mei", title: "Deliverable Update: Approved", message: "'component-library-v3.fig.pdf' was approved.", kind: "message", href: "/workspace/app-1?tab=deliverables", minutesAgo: 2800, read: true },
  { userId: "u-fl-mei", title: "Deliverable Update: Revision Requested", message: "'migration-guide-draft.pdf' needs a revision. 1 of 2 used.", kind: "message", href: "/workspace/app-1?tab=deliverables", minutesAgo: 7100, read: true },
  { userId: "u-fl-mei", title: "New meeting scheduled", message: 'Northwind Labs scheduled "Trace timeline API review" for Observability Console.', kind: "meeting", href: "/workspace/app-1?tab=meetings", minutesAgo: 420 },
  { userId: "u-fl-mei", title: "Hired — confirm your team", message: "You were hired onto 'Open Curriculum Platform' as Resource Library Lead. Confirm your placement to meet the team.", kind: "team", href: "/freelancer/applications", minutesAgo: 14400, read: true },
  { userId: "u-fl-mei", title: "New Match Found", message: "'Brand Identity System for a Series-A Fintech' matches 3 of your skills.", kind: "application", href: "/freelancer/projects/pr-brand-system", minutesAgo: 7200, read: true },
  { userId: "u-fl-mei", title: "Group Chat Update", message: "Daniel Osei: p95 at 168ms against a 340ms baseline is a genuinely good…", kind: "message", href: "/workspace/app-1?tab=messages", minutesAgo: 180 },

  // Freelancer — Samuel (apprentice)
  { userId: "u-fl-samuel", title: "Hired — confirm your team", message: "You were hired onto 'Open Curriculum Platform' as an apprentice on Lesson Builder Lead.", kind: "team", href: "/freelancer/applications", minutesAgo: 15800, read: true },
  { userId: "u-fl-samuel", title: "Stipend released", message: "USD 1,200.00 released for stipend period 2.", kind: "money", href: "/workspace/app-12?tab=milestones", minutesAgo: 7200, read: true },
  { userId: "u-fl-samuel", title: "New Task Assigned", message: "You were assigned 'Lesson builder — version history'.", kind: "team", href: "/workspace/app-12?tab=tasks", minutesAgo: 4300, read: true },
  { userId: "u-fl-samuel", title: "Application Update", message: "Your application to 'Observability Console — Frontend Rebuild' is still in screening.", kind: "application", href: "/freelancer/applications", minutesAgo: 900 },

  // Admin
  { userId: "u-admin", title: "New Company Review", message: "A review was flagged for moderation on 'Design System Audit'.", kind: "system", href: "/admin/reviews", minutesAgo: 620 },
  { userId: "u-admin", title: "System Settings", message: "Message retention job completed. 412 messages older than 7 days removed.", kind: "system", href: "/admin/settings", minutesAgo: 1440, read: true },
];

export const NOTIFICATIONS: AppNotification[] = NOTIF_SEEDS.map((n, i) => ({
  id: `notif-${i + 1}`,
  userId: n.userId,
  title: n.title,
  message: n.message,
  read: Boolean(n.read),
  createdAt: iso(0, -n.minutesAgo / 60),
  href: n.href,
  kind: n.kind,
}));
