import type { Application, ContractStatus, PipelineEvent } from "@/lib/types";
import { FREELANCER_BY_ID } from "./freelancers";
import { PROJECT_BY_ID } from "./projects";
import { SCORE_WEIGHTS } from "@/lib/constants";

const now = Date.now();
const iso = (days: number, hours = 0) =>
  new Date(now + days * 86_400_000 + hours * 3_600_000).toISOString();

/* ---------------------------------------------------------- scoring (§21.10) */

export function computeScore(projectId: string, freelancerId: string) {
  const project = PROJECT_BY_ID.get(projectId);
  const freelancer = FREELANCER_BY_ID.get(freelancerId);
  if (!project || !freelancer)
    return {
      aiScore: 0,
      breakdown: {
        skillMatch: 0,
        experienceMatch: 0,
        ratingMatch: 0,
        completionRateMatch: 0,
        priorityMatch: 0,
      },
    };

  const projectSkills = project.requiredSkills.map((s) => s.trim().toLowerCase());
  const mine = new Set(freelancer.skills.map((s) => s.trim().toLowerCase()));
  const skillMatch = projectSkills.length
    ? (projectSkills.filter((s) => mine.has(s)).length / projectSkills.length) * 100
    : 100;

  const required = project.experienceRequired;
  const experienceMatch =
    required <= 0 || freelancer.experienceYears >= required
      ? 100
      : (freelancer.experienceYears / required) * 100;

  const ratingMatch = (freelancer.rating / 5) * 100;
  const completionRateMatch = freelancer.completionRate;

  const priorityMatch =
    project.priority === "HIGH"
      ? freelancer.rating >= 4.3 && freelancer.completionRate >= 92
        ? 100
        : 70
      : project.priority === "MEDIUM"
        ? 90
        : 80;

  const score =
    skillMatch * SCORE_WEIGHTS.skillMatch +
    experienceMatch * SCORE_WEIGHTS.experienceMatch +
    ratingMatch * SCORE_WEIGHTS.ratingMatch +
    completionRateMatch * SCORE_WEIGHTS.completionRateMatch +
    priorityMatch * SCORE_WEIGHTS.priorityMatch;

  return {
    aiScore: Math.round(score * 10) / 10,
    breakdown: {
      skillMatch: Math.round(skillMatch * 10) / 10,
      experienceMatch: Math.round(experienceMatch * 10) / 10,
      ratingMatch: Math.round(ratingMatch * 10) / 10,
      completionRateMatch: Math.round(completionRateMatch * 10) / 10,
      priorityMatch,
    },
  };
}

/* ------------------------------------------------------------------- seeds -- */

interface Seed {
  projectId: string;
  freelancerId: string;
  status: Application["status"];
  roleIndex?: number;
  apprentice?: boolean;
  daysAgo: number;
  cover: string;
  stage?: string;
  teamConfirmed?: boolean;
  offer?: {
    status: "PENDING" | "NEGOTIATING" | "ACCEPTED" | "DECLINED";
    amount: number;
    negotiated?: { amount: number; message: string; outcome?: "ACCEPTED" | "REJECTED" };
  };
  contract?: { freelancer: boolean; client: boolean; status: ContractStatus };
  interview?: { inDays: number; status: "SCHEDULED" | "RESCHEDULED" | "CANCELLED" };
}

const SEEDS: Seed[] = [
  /* --- Observability console (Northwind) --------------------------------- */
  {
    projectId: "pr-observability",
    freelancerId: "fl-mei",
    status: "HIRED",
    roleIndex: 0,
    daysAgo: 8,
    teamConfirmed: true,
    stage: "Hired",
    cover:
      "I have run this exact migration twice — once on a 60-component library at a logistics company, once on a smaller analytics console. Both times the hard part was not the components, it was sequencing the cutover so the in-house team never had two systems to reason about at once.\n\nMy proposal for your four stages: start with the table and the token layer together, because everything else depends on both. Ship those behind a flag on the two lowest-traffic views first, then move outward by traffic. That way the riskiest component gets the most soak time.\n\nI test with a screen reader before I open a PR, which matters here because an observability console is a keyboard-heavy surface.",
    offer: { status: "ACCEPTED", amount: 48000 },
    contract: { freelancer: true, client: true, status: "ACTIVE" },
  },
  {
    projectId: "pr-observability",
    freelancerId: "fl-tomas",
    status: "SHORTLISTED",
    roleIndex: 1,
    daysAgo: 6,
    stage: "Interview",
    cover:
      "Nine years of production Next.js and Postgres, four products taken from prototype to paying users. I read your job description twice because the honesty about it being a third code-reading caught my attention — most listings pretend otherwise.\n\nI would want two weeks before committing to a stage plan. I have been burned by scoping a migration off a repo tour rather than off the code.",
    interview: { inDays: 2, status: "SCHEDULED" },
    offer: { status: "PENDING", amount: 21000 },
  },
  {
    projectId: "pr-observability",
    freelancerId: "fl-carlos",
    status: "PENDING",
    roleIndex: 1,
    daysAgo: 4,
    stage: "Screening",
    cover:
      "My background is mobile-first but the last two years have been React and TypeScript on the web. I am applying because the offline-sync work I do maps unexpectedly well onto observability UIs — both are about presenting state that is always slightly stale and being honest about it.",
  },
  {
    projectId: "pr-observability",
    freelancerId: "fl-samuel",
    status: "PENDING",
    roleIndex: 1,
    apprentice: true,
    daysAgo: 3,
    stage: "Applied",
    cover:
      "Applying as an apprentice on the Frontend Engineer role. Eighteen months in, five shipped engagements, three of them as an apprentice. I have not done a migration at this scale and I am not going to claim otherwise — what I can offer is that I ship reviewed work weekly and I ask questions early.\n\nI have read your public component library and I have opinions about two of the table props, which I would rather discuss than write here.",
  },
  {
    projectId: "pr-observability",
    freelancerId: "fl-james",
    status: "REJECTED",
    roleIndex: 0,
    daysAgo: 7,
    stage: "Screening",
    cover:
      "Ten years of infrastructure work, and I am trying to move toward full-stack product engineering. I would be learning on this one.",
  },

  /* --- Clinical UX (Lumen) ----------------------------------------------- */
  {
    projectId: "pr-clinical-ux",
    freelancerId: "fl-emma",
    status: "HIRED",
    roleIndex: 0,
    daysAgo: 30,
    teamConfirmed: true,
    stage: "Hired",
    cover:
      "I have run contextual enquiry in clinical settings four times, twice with ethics submissions I wrote myself. The protocol design is the part that determines whether the findings are usable, and it is the part most engagements rush.\n\nEleven minutes to six is an aggressive target. I would want to know early whether the five minutes are in the interface or in the clinical reasoning, because if it is the latter, no redesign fixes it. That question is answerable in week one.",
    offer: { status: "ACCEPTED", amount: 19000 },
    contract: { freelancer: true, client: true, status: "ACTIVE" },
  },
  {
    projectId: "pr-clinical-ux",
    freelancerId: "fl-aisha",
    status: "HIRED",
    roleIndex: 1,
    daysAgo: 29,
    teamConfirmed: true,
    stage: "Hired",
    cover:
      "Product designer, eight years, most of it on dense B2B surfaces where the user is doing a job under time pressure — which is exactly the shape of a consultation screen.\n\nI would want to be in at least four of the research sessions rather than receiving findings second-hand. Designers who only read the report design for the report.",
    offer: { status: "ACCEPTED", amount: 13000 },
    contract: { freelancer: true, client: true, status: "ACTIVE" },
  },
  {
    projectId: "pr-clinical-ux",
    freelancerId: "fl-nadia",
    status: "REJECTED",
    daysAgo: 33,
    stage: "Shortlisted",
    cover:
      "Product management rather than research, but I have commissioned and run discovery of this shape repeatedly.",
  },

  /* --- Freight pipeline (Atlas) ------------------------------------------ */
  {
    projectId: "pr-freight-pipeline",
    freelancerId: "fl-arjun",
    status: "HIRED",
    daysAgo: 19,
    teamConfirmed: true,
    stage: "Hired",
    cover:
      "I have owned a pipeline of almost exactly this shape — carrier integrations, high fan-in, silent drops that only surfaced as customer complaints. The instinct is to start fixing the loudest integration. That is usually wrong: you cannot tell which integration is loudest until you have per-stage metrics, and you cannot get those without a week of unglamorous instrumentation work.\n\nI would spend the first 40 hours on visibility and nothing else, and I would want us both comfortable with that before I start.",
    offer: { status: "ACCEPTED", amount: 36000 },
    contract: { freelancer: true, client: true, status: "ACTIVE" },
  },
  {
    projectId: "pr-freight-pipeline",
    freelancerId: "fl-marcus",
    status: "SHORTLISTED",
    daysAgo: 17,
    stage: "Shortlisted",
    cover:
      "Eleven years on systems that have to stay up, including a freight tracking pipeline that had this exact failure mode. Happy to talk about what we got wrong there before what we got right.",
  },
  {
    projectId: "pr-freight-pipeline",
    freelancerId: "fl-james",
    status: "PENDING",
    daysAgo: 12,
    stage: "Applied",
    cover:
      "Infrastructure and cost engineering background. The replay tooling and the backpressure work are squarely in my area; the carrier-specific data modelling less so.",
  },

  /* --- Curriculum platform (BrightPath) ---------------------------------- */
  {
    projectId: "pr-curriculum-platform",
    freelancerId: "fl-tomas",
    status: "HIRED",
    roleIndex: 0,
    daysAgo: 12,
    teamConfirmed: true,
    stage: "Hired",
    cover:
      "I want the mentoring half of this as much as the building half. I have been the senior on three engagements with juniors attached and I got it wrong the first time by doing too much of the work myself.\n\nMy commitment: my apprentice ships the lesson builder's version history themselves, with me reviewing, not writing.",
    offer: { status: "ACCEPTED", amount: 4800 },
    contract: { freelancer: true, client: true, status: "ACTIVE" },
  },
  {
    projectId: "pr-curriculum-platform",
    freelancerId: "fl-samuel",
    status: "HIRED",
    roleIndex: 0,
    apprentice: true,
    daysAgo: 11,
    teamConfirmed: true,
    stage: "Hired",
    cover:
      "Applying as the apprentice on the Lesson Builder role. I have shipped React and TypeScript on five engagements and I have never worked on an editor surface, which is exactly why I want this one.",
    offer: { status: "ACCEPTED", amount: 4800 },
    contract: { freelancer: true, client: true, status: "ACTIVE" },
  },
  {
    projectId: "pr-curriculum-platform",
    freelancerId: "fl-mei",
    status: "HIRED",
    roleIndex: 1,
    daysAgo: 10,
    stage: "Hired",
    cover:
      "Resource library lead. Search, tagging and a media pipeline are well inside what I have shipped, and the mentoring structure is why I applied rather than despite it.",
    offer: { status: "ACCEPTED", amount: 4800 },
    contract: { freelancer: true, client: false, status: "SENT" },
  },
  {
    projectId: "pr-curriculum-platform",
    freelancerId: "fl-carlos",
    status: "SHORTLISTED",
    roleIndex: 2,
    daysAgo: 9,
    stage: "Interview",
    cover:
      "Platform engineering role. Auth, permissions and sharing are bread and butter; the deployment story I would want to talk through.",
    interview: { inDays: 4, status: "SCHEDULED" },
  },
  {
    projectId: "pr-curriculum-platform",
    freelancerId: "fl-lena",
    status: "PENDING",
    roleIndex: 2,
    apprentice: true,
    daysAgo: 6,
    stage: "Applied",
    cover:
      "Technical writer moving toward platform work. Applying as an apprentice because I want the pairing, not despite it.",
  },

  /* --- Brand system (Verdant) -------------------------------------------- */
  {
    projectId: "pr-brand-system",
    freelancerId: "fl-yuki",
    status: "SHORTLISTED",
    daysAgo: 4,
    stage: "Interview",
    cover:
      "Seven years building identity systems that engineering teams can actually implement. The line in your brief about six different greens is the whole problem in one sentence — that is a colour architecture failure, not a palette failure.\n\nI would deliver the colour system as tokens with documented semantic roles, not as swatches.",
    interview: { inDays: 3, status: "SCHEDULED" },
    offer: { status: "NEGOTIATING", amount: 18500, negotiated: { amount: 21500, message: "The illustration library as scoped is closer to six weeks than four in my experience. I would rather price it honestly now than run over. Everything else in the brief I am happy with as written." } },
  },
  {
    projectId: "pr-brand-system",
    freelancerId: "fl-sofia",
    status: "PENDING",
    daysAgo: 3,
    stage: "Applied",
    cover:
      "Motion and 3D generalist with brand experience. I would be strongest on the motion principles and illustration language, and honest that the type system is not my deepest area.",
  },
  {
    projectId: "pr-brand-system",
    freelancerId: "fl-aisha",
    status: "PENDING",
    daysAgo: 2,
    stage: "Screening",
    cover:
      "Product designer applying slightly outside my usual lane. My design systems work is directly relevant to the documentation and token architecture half of this brief.",
  },

  /* --- Growth attribution (Orbital) -------------------------------------- */
  {
    projectId: "pr-growth-attribution",
    freelancerId: "fl-david",
    status: "SHORTLISTED",
    daysAgo: 2,
    stage: "Shortlisted",
    cover:
      "I have done the reconcile-then-audit sequence four times and the finding is nearly always the same: two channels are being credited for demand they did not create. The work is 30% modelling and 70% getting people to accept the answer.\n\nI would want the audit findings presented to the whole growth team at once rather than pre-briefed, so the discussion happens in one room.",
    offer: { status: "PENDING", amount: 22000 },
  },
  {
    projectId: "pr-growth-attribution",
    freelancerId: "fl-arjun",
    status: "PENDING",
    daysAgo: 1,
    stage: "Applied",
    cover:
      "Data engineer rather than marketer. I would be strong on the reconciliation and the reporting layer, weaker on the channel strategy recommendations.",
  },

  /* --- Docs overhaul (Northwind) ----------------------------------------- */
  {
    projectId: "pr-docs-platform",
    freelancerId: "fl-lena",
    status: "HIRED",
    daysAgo: 38,
    teamConfirmed: true,
    stage: "Hired",
    cover:
      "Ten years of developer documentation, and I read the source before I write the page. Four getting-started guides with two of them wrong is a symptom — usually of nobody owning the docs rather than nobody writing them. I would want to fix the ownership question as part of the engagement, not just the pages.",
    offer: { status: "ACCEPTED", amount: 16800 },
    contract: { freelancer: true, client: true, status: "ACTIVE" },
  },

  /* --- Warehouse modelling (Orbital) ------------------------------------- */
  {
    projectId: "pr-data-warehouse",
    freelancerId: "fl-arjun",
    status: "HIRED",
    daysAgo: 44,
    teamConfirmed: true,
    stage: "Hired",
    cover:
      "Three teams and three definitions of active store — the modelling is the easy half. I run definition sign-off as a single session with everyone in the room and a written decision at the end, because asynchronous consensus on metrics never converges.",
    offer: { status: "ACCEPTED", amount: 19200 },
    contract: { freelancer: true, client: true, status: "ACTIVE" },
  },

  /* --- Completed engagements --------------------------------------------- */
  {
    projectId: "pr-mobile-intake",
    freelancerId: "fl-carlos",
    status: "HIRED",
    daysAgo: 180,
    teamConfirmed: true,
    stage: "Hired",
    cover:
      "Offline sync in low-connectivity field conditions is the specific problem I have spent four years on.",
    offer: { status: "ACCEPTED", amount: 41000 },
    contract: { freelancer: true, client: true, status: "COMPLETED" },
  },
  {
    projectId: "pr-design-system-audit",
    freelancerId: "fl-aisha",
    status: "HIRED",
    daysAgo: 138,
    teamConfirmed: true,
    stage: "Hired",
    cover: "Accessibility remediation across a 74-component library is a scoped, finite piece of work I enjoy.",
    offer: { status: "ACCEPTED", amount: 9600 },
    contract: { freelancer: true, client: true, status: "COMPLETED" },
  },

  /* --- Volunteer localisation (BrightPath) ------------------------------- */
  {
    projectId: "pr-open-source-docs",
    freelancerId: "fl-david",
    status: "HIRED",
    daysAgo: 15,
    teamConfirmed: true,
    stage: "Hired",
    cover: "Volunteering on the Swahili localisation. Native Yoruba and English, working Swahili.",
  },
  {
    projectId: "pr-open-source-docs",
    freelancerId: "fl-omar",
    status: "PENDING",
    daysAgo: 5,
    stage: "Applied",
    cover: "Volunteering on the French localisation. Clear that this is unpaid and applying anyway.",
  },
];

/* --------------------------------------------------------------- builders -- */

function pipeline(seed: Seed): PipelineEvent[] {
  const stages: { stage: string; note: string; recruiter: string }[] = [
    { stage: "Applied", note: "Application received.", recruiter: "System" },
  ];
  const target = seed.stage ?? "Applied";
  const order = ["Applied", "Screening", "Shortlisted", "Interview", "Offer", "Hired"];
  const idx = order.indexOf(target);
  const recruiters = ["Daniel Osei", "Tom Bradbury", "Nguyen Minh Anh", "Samuel Otieno", "Kai Andersen"];
  const recruiter = recruiters[seed.freelancerId.length % recruiters.length];

  for (let i = 1; i <= idx; i++) {
    stages.push({
      stage: order[i],
      note:
        order[i] === "Screening"
          ? "Screening answers reviewed."
          : order[i] === "Shortlisted"
            ? "Moved to shortlist after profile and screening review."
            : order[i] === "Interview"
              ? "Interview scheduled with the hiring panel."
              : order[i] === "Offer"
                ? "Offer letter sent."
                : "Hired and added to the project roster.",
      recruiter,
    });
  }
  if (seed.status === "REJECTED") {
    stages.push({
      stage: "Not selected",
      note: "Closed out — the role was filled by another candidate.",
      recruiter,
    });
  }

  return stages.map((s, i) => ({
    id: `${seed.projectId}-${seed.freelancerId}-ev-${i}`,
    stage: s.stage,
    note: s.note,
    recruiterName: s.recruiter,
    createdAt: iso(-seed.daysAgo + i, i * 3),
  }));
}

function buildApplication(seed: Seed, index: number): Application {
  const project = PROJECT_BY_ID.get(seed.projectId)!;
  const freelancer = FREELANCER_BY_ID.get(seed.freelancerId)!;
  const role = seed.roleIndex !== undefined ? project.roles[seed.roleIndex] : undefined;
  const { aiScore, breakdown } = computeScore(seed.projectId, seed.freelancerId);
  const round = project.rounds.find((r) => r.type === "SCREENING_QUESTIONS");

  const answers = (round?.questions ?? []).map((q) => ({
    questionId: q.id,
    question: q.question,
    answer:
      q.type === "YES_NO"
        ? "Yes"
        : q.type === "PORTFOLIO"
          ? freelancer.portfolioUrl ?? "—"
          : q.question.includes("hours a week")
            ? `${project.timingType.startsWith("Full") ? "40" : "20"} hours a week. I currently have one other engagement running at ${project.timingType.startsWith("Full") ? "8" : "12"} hours, finishing in three weeks.`
            : `The hardest decision on the closest engagement was whether to rewrite or wrap the existing layer. I wrapped it, shipped in six weeks instead of fourteen, and we replaced it properly the following quarter with real usage data behind the decision. I would make the same call again.`,
  }));

  return {
    id: `app-${index + 1}`,
    projectId: seed.projectId,
    project: {
      id: project.id,
      title: project.title,
      bannerUrl: project.bannerUrl,
      status: project.status,
      compensation: project.compensation,
      company: project.company,
      domain: project.domain,
      dueDate: project.dueDate,
    },
    freelancerId: seed.freelancerId,
    freelancer: {
      id: freelancer.id,
      userId: freelancer.userId,
      name: freelancer.name,
      avatarUrl: freelancer.avatarUrl,
      professionalHeadline: freelancer.professionalHeadline,
      skills: freelancer.skills,
      rating: freelancer.rating,
      experienceYears: freelancer.experienceYears,
      location: freelancer.location,
      completedProjects: freelancer.completedProjects,
    },
    roleId: role?.id,
    roleName: role?.name,
    isApprentice: Boolean(seed.apprentice),
    teamConfirmedAt: seed.teamConfirmed ? iso(-seed.daysAgo + 2) : undefined,
    coverLetter: seed.cover,
    screeningAnswers: answers,
    aiScore,
    scoreBreakdown: breakdown,
    status: seed.status,
    pipelineHistory: pipeline(seed),
    offer: seed.offer
      ? {
          id: `offer-${index + 1}`,
          status: seed.offer.status,
          offerText: `We would like to bring you onto "${project.title}" as ${role ? `our ${role.name}` : "a contributor"}. The terms below reflect the scope discussed. Payment follows the project's ${project.compensation.type.toLowerCase()} model, with every movement recorded on the project ledger.`,
          amount: seed.offer.amount,
          currency: project.compensation.currency,
          category: project.compensation.type,
          benefits:
            project.compensation.nonMonetaryBenefits ?? [
              "Certificate of Completion",
              "Portfolio Rights",
            ],
          milestones: [],
          sentAt: iso(-seed.daysAgo + 3),
          respondedAt:
            seed.offer.status === "ACCEPTED" || seed.offer.status === "DECLINED"
              ? iso(-seed.daysAgo + 4)
              : undefined,
          negotiations: seed.offer.negotiated
            ? [
                {
                  id: `neg-${index + 1}`,
                  by: "FREELANCER",
                  proposedAmount: seed.offer.negotiated.amount,
                  proposedCurrency: project.compensation.currency,
                  proposedCategory: project.compensation.type,
                  message: seed.offer.negotiated.message,
                  createdAt: iso(-seed.daysAgo + 4),
                  outcome: seed.offer.negotiated.outcome,
                  previousAmount: seed.offer.amount,
                },
              ]
            : [],
        }
      : undefined,
    contract: seed.contract
      ? {
          id: `contract-${index + 1}`,
          status: seed.contract.status,
          freelancerSigned: seed.contract.freelancer,
          freelancerSignedAt: seed.contract.freelancer ? iso(-seed.daysAgo + 5) : undefined,
          freelancerIp: seed.contract.freelancer ? "203.0.113.42" : undefined,
          clientSigned: seed.contract.client,
          clientSignedAt: seed.contract.client ? iso(-seed.daysAgo + 5, 2) : undefined,
          clientIp: seed.contract.client ? "198.51.100.17" : undefined,
          milestones: [],
          terms: [
            `Engagement scope is limited to the deliverables listed on "${project.title}".`,
            `All amounts are denominated in ${project.compensation.currency} and released through the FRIVVO ledger.`,
            "Intellectual property transfers on final release of payment.",
            "Either party may terminate with 14 days' written notice; funded work already delivered is released in full.",
            "A maximum of two revision rounds applies to each deliverable and each payment stage.",
          ],
        }
      : undefined,
    interview: seed.interview
      ? {
          id: `int-${index + 1}`,
          title: `${project.title} — panel interview`,
          scheduledAt: iso(seed.interview.inDays, 14),
          durationMinutes: 45,
          meetingUrl: "https://meet.frivvo.app/panel-" + (index + 1),
          status: seed.interview.status,
          note: "45 minutes. Two panellists. Bring one piece of work you want to walk through.",
        }
      : undefined,
    createdAt: iso(-seed.daysAgo),
    updatedAt: iso(-Math.max(0, seed.daysAgo - 2)),
  };
}

export const APPLICATIONS: Application[] = SEEDS.map(buildApplication);

export const APPLICATION_BY_ID = new Map(APPLICATIONS.map((a) => [a.id, a]));
