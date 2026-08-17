"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ApplicationStatus, ProjectStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  parseCompanyMetadata,
  serializeCompanyMetadata,
  parseFreelancerMetadata,
  serializeFreelancerMetadata,
  getFreelancerBioText,
  parseApplicationMetadata,
  serializeApplicationMetadata,
  ApplicationWorkflowData,
  CompanyOnboardingData,
  FreelancerOnboardingData,
  ApplicationPipelineEvent,
  getProjectMetadataDirect,
  serializeProjectMetadata,
  PaymentCategory,
  DEFAULT_CURRENCY,
  NonMonetaryBenefit,
} from "@/lib/workflowHelpers";
import {
  requireApplicationOwner,
  requireApplicationParty,
  requireProjectOwner,
  requireRole,
  requireUser,
  callerIpAddress,
} from "@/lib/authz";
import {
  assertApplicationTransition,
  assertProjectTransition,
  assertProjectMutable,
  getCapacity,
  buildContractMilestones,
} from "@/lib/lifecycle";

/**
 * COMP-011 — the contract payment schedule, derived from configured data
 * rather than the fabricated 30/40/30 split of the project budget that used to
 * be injected at two separate call sites.
 *
 * Priority: the application's configured payment items, then a single
 * full-value milestone. An offer's own agreed milestones take precedence and
 * are passed in directly by the offer-acceptance path.
 */
async function contractMilestonesFor(
  applicationId: string,
  projectId: string,
  fallbackTotal: number,
  projectTitle: string
) {
  const items = await db.paymentItem.findMany({
    where: { projectId, applicationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { title: true, amount: true },
  });
  return buildContractMilestones({
    configuredItems: items,
    fallbackTotal,
    projectTitle,
  });
}

/**
 * 1. Submit Company Onboarding Data
 */
export async function submitCompanyOnboarding(formData: {
  legalBusinessName: string;
  registrationNumber: string;
  gstNumber?: string;
  headquarters: string;
  companyEmail: string;
  businessPhone: string;
  companyName: string;
  industry: string;
  website: string;
  location: string;
  companySize?: string;
  foundedYear?: number;
  aboutText?: string;
  mission?: string;
  workCulture?: string;
  hiringPhilosophy?: string;
  benefits?: string[];
  teamMembers?: { name: string; email: string; role: any; designation: string }[];
  step: number;
  completeOnboarding?: boolean;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // Check duplicate company based on legal name or registration number
  if (formData.registrationNumber) {
    const allCompanies = await db.company.findMany();
    for (const c of allCompanies) {
      if (c.userId === userId) continue; // Skip self
      const meta = parseCompanyMetadata(c.description);
      if (
        (meta.registrationNumber && meta.registrationNumber.trim().toLowerCase() === formData.registrationNumber.trim().toLowerCase()) ||
        (meta.legalBusinessName && meta.legalBusinessName.trim().toLowerCase() === formData.legalBusinessName.trim().toLowerCase())
      ) {
        throw new Error(`A company with the legal name "${formData.legalBusinessName}" or registration number "${formData.registrationNumber}" is already registered.`);
      }
    }
  }

  // Fetch or create company record
  let company = await db.company.findUnique({
    where: { userId },
  });

  if (!company) {
    company = await db.company.create({
      data: {
        userId,
        companyName: formData.companyName,
        industry: formData.industry,
        website: formData.website,
        location: formData.location,
      },
    });
  }

  // Update company base fields
  const updatedData: Record<string, any> = {
    companyName: formData.companyName,
    industry: formData.industry,
    website: formData.website,
    location: formData.location,
  };

  if (formData.companySize) updatedData.companySize = formData.companySize;
  if (formData.foundedYear) updatedData.foundedYear = Number(formData.foundedYear);
  if (formData.aboutText) updatedData.description = formData.aboutText;
  if (formData.mission) updatedData.missionVision = formData.mission;
  if (formData.workCulture) updatedData.workCulture = formData.workCulture;
  if (formData.hiringPhilosophy) updatedData.hiringPhilosophy = formData.hiringPhilosophy;
  if (formData.benefits) updatedData.benefits = formData.benefits;

  // Retrieve current serialized metadata or build new
  const currentMeta = parseCompanyMetadata(company.description);
  const newMeta: CompanyOnboardingData = {
    legalBusinessName: formData.legalBusinessName || currentMeta.legalBusinessName,
    registrationNumber: formData.registrationNumber || currentMeta.registrationNumber,
    gstNumber: formData.gstNumber || currentMeta.gstNumber,
    headquarters: formData.headquarters || currentMeta.headquarters,
    companyEmail: formData.companyEmail || currentMeta.companyEmail,
    businessPhone: formData.businessPhone || currentMeta.businessPhone,
    team: (formData.teamMembers || currentMeta.team).map(t => ({
      name: t.name,
      email: t.email,
      role: t.role,
      designation: t.designation,
      status: "ACCEPTED",
    })),
    status: currentMeta.status || "Pending",
    onboardedStep: formData.step,
  };

  // Check if onboarding is complete
  let badges = company.verificationBadges || [];
  if (formData.completeOnboarding) {
    if (!badges.includes("ONBOARDING_COMPLETED")) {
      badges = [...badges, "ONBOARDING_COMPLETED", "Business Verified"];
    }
    newMeta.status = "Verified";
  }

  // Update description with serialized onboarding details
  updatedData.description = serializeCompanyMetadata(formData.aboutText || "", newMeta);
  updatedData.verificationBadges = badges;

  const result = await db.company.update({
    where: { id: company.id },
    data: updatedData,
  });

  revalidatePath("/company/dashboard");
  return { success: true, company: result };
}

/**
 * 2. Update Freelancer Calendar and Onboarding Info
 */
export async function updateFreelancerCalendarAndProfile(formData: {
  purpose: "To find a job" | "Compete & Upskill" | "To Host an Event" | "To be a Mentor";
  languages: string[];
  education: { school: string; degree: string; fieldOfStudy: string; startYear: string; endYear: string }[];
  availabilityCalendar: { dayOfWeek: string; slots: string[] }[];
  bioText?: string;
  professionalHeadline?: string;
  experienceYears?: number;
  portfolioUrl?: string;
  resumeUrl?: string;
  skills?: string[];
  hourlyRate?: string;
  expectedBudget?: string;
  remotePreference?: string;
  timezone?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  completeOnboarding?: boolean;
  gender?: string;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  let freelancer = await db.freelancer.findUnique({
    where: { userId },
  });

  if (!freelancer) {
    freelancer = await db.freelancer.create({
      data: {
        userId,
        bio: "",
        skills: ["react", "typescript"],
        experienceYears: 1,
      },
    });
  }

  // Prepare profile fields
  const updatedData: Record<string, any> = {};
  if (formData.professionalHeadline) updatedData.professionalHeadline = formData.professionalHeadline;
  if (formData.experienceYears !== undefined) updatedData.experienceYears = Number(formData.experienceYears);
  if (formData.portfolioUrl) updatedData.portfolioUrl = formData.portfolioUrl;
  if (formData.resumeUrl) updatedData.resumeUrl = formData.resumeUrl;
  if (formData.skills) updatedData.skills = formData.skills.map(s => s.toLowerCase().trim()).filter(Boolean);
  if (formData.availabilityCalendar) updatedData.availabilityStatus = "AVAILABLE";
  if (formData.gender) updatedData.gender = formData.gender;

  const currentMeta = parseFreelancerMetadata(freelancer.bio);
  
  // Update serialized FreelancerOnboardingData inside the bio field
  const newMeta: FreelancerOnboardingData = {
    purpose: formData.purpose || currentMeta.purpose,
    globalRank: currentMeta.globalRank || 1832289,
    points: currentMeta.points || 20,
    streaks: currentMeta.streaks || [
      { date: new Date().toISOString().split("T")[0], value: 2 }
    ],
    education: formData.education || currentMeta.education,
    languages: formData.languages || currentMeta.languages,
    availabilityCalendar: formData.availabilityCalendar || currentMeta.availabilityCalendar,
    identityVerified: currentMeta.identityVerified || !!formData.resumeUrl,
    portfolioVerified: currentMeta.portfolioVerified || !!formData.portfolioUrl,
    phoneVerified: currentMeta.phoneVerified || true,
  };

  let badges = freelancer.verificationBadges || [];
  if (formData.completeOnboarding) {
    if (!badges.includes("ONBOARDING_COMPLETED")) {
      badges = [...badges, "ONBOARDING_COMPLETED", "Verified Freelancer", "Rising Talent"];
    }
  }

  // Custom portfolio item JSON parsing logic can go to portfolioItems json column
  if (formData.portfolioUrl) {
    updatedData.portfolioItems = [
      { id: "1", title: "Featured Portfolio Site", description: "Personal website & work highlights", type: "url", url: formData.portfolioUrl }
    ];
  }

  updatedData.bio = serializeFreelancerMetadata(formData.bioText || getFreelancerBioText(freelancer.bio), newMeta);
  updatedData.verificationBadges = badges;

  // Let's store expected budget, rates, timezone, preferenced info inside the experience JSON column
  updatedData.experience = {
    hourlyRate: formData.hourlyRate || "50",
    expectedBudget: formData.expectedBudget || "5000",
    remotePreference: formData.remotePreference || "Remote",
    timezone: formData.timezone || "GMT+5:30",
    github: formData.githubUrl || "",
    linkedin: formData.linkedinUrl || "",
    website: formData.websiteUrl || "",
  };

  const result = await db.freelancer.update({
    where: { id: freelancer.id },
    data: updatedData,
  });

  revalidatePath("/freelancer/profile");
  revalidatePath("/freelancer/dashboard");
  return { success: true, freelancer: result };
}

/**
 * 3. Transition Application Stage with recruitment log history
 */
/**
 * SEC-005 — this had no role check and no ownership check, only "is there a
 * session". Because it maps targetStage onto a real ApplicationStatus, any
 * signed-in user — including a freelancer acting on their own application —
 * could set any application on the platform to HIRED, or reject every
 * competing candidate.
 *
 * It is now restricted to the company that owns the project.
 */
export async function transitionApplicationStage(
  applicationId: string,
  targetStage: string,
  notes?: string,
  interviewData?: { date: string; meetingLink: string }
): Promise<{ success: boolean; error?: string }> {
  const owned = await requireApplicationOwner(applicationId);
  if (!owned.ok) throw new Error(owned.error);
  const session = { user: { id: owned.data.userId, name: owned.data.company.companyName } };

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: {
        include: {
          company: {
            select: { id: true, companyName: true, userId: true },
          },
        },
      },
      freelancer: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!app) {
    throw new Error("Application not found");
  }

  // Parse existing workflow metadata
  const meta = parseApplicationMetadata(app.coverLetter);

  // Build the pipeline event log
  const newEvent: ApplicationPipelineEvent = {
    stage: targetStage,
    timestamp: new Date().toISOString(),
    notes: notes || `Moved to ${targetStage}`,
    recruiterId: session.user.id,
    recruiterName: session.user.name || "Recruiter",
    ...(interviewData && {
      interviewDate: interviewData.date,
      meetingLink: interviewData.meetingLink,
    }),
  };

  meta.pipelineHistory = [...meta.pipelineHistory, newEvent];

  // Map to main database ApplicationStatus enum
  let dbStatus: ApplicationStatus = app.status;
  if (
    targetStage === "Shortlisted" ||
    targetStage === "Interview Scheduled" ||
    targetStage === "Interview" ||
    targetStage === "Interview Conducted" ||
    targetStage === "Negotiation" ||
    targetStage === "Offer Sent" ||
    targetStage === "Offer Declined"
  ) {
    dbStatus = ApplicationStatus.SHORTLISTED;
  } else if (targetStage === "Rejected") {
    dbStatus = ApplicationStatus.REJECTED;
  } else if (
    targetStage === "Selected" ||
    targetStage === "Hired" ||
    targetStage === "Accepted" ||
    targetStage === "Offer Accepted" ||
    targetStage === "Project Started"
  ) {
    /**
     * LIFE-002 — this used to write HIRED directly, bypassing every capacity
     * and team-lock guard. Hiring now happens only through hireApplicant, the
     * authoritative path; this pipeline event records the stage but no longer
     * produces the status itself.
     */
    return {
      success: false,
      error: "Use the Hire action to hire this applicant, so capacity and team rules are applied.",
    };
  }

  // LIFE-003 — reject an invalid transition rather than writing it blindly.
  if (dbStatus !== app.status) {
    const move = assertApplicationTransition(app.status, dbStatus);
    if (!move.ok) return { success: false, error: move.error };
  }

  if (targetStage === "Contract Sent") {
    meta.digitalContract = {
      contractText: `Freelancer Services Contract for Project "${app.project.title}". Work deliverables as defined in the posting wizard. Payment upon client milestone release.`,
      freelancerSigned: false,
      clientSigned: true,
      clientSignedAt: new Date().toISOString(),
      clientIp: await callerIpAddress(),
      status: "SENT",
      // COMP-011 — derived from configured data, never a fabricated split.
      milestones: await contractMilestonesFor(app.id, app.projectId, app.project.budget, app.project.title),
    };
  }

  // Save updated application with serialized JSON block
  const originalCoverLetterText = app.coverLetter.includes("\n\nMETADATA_JSON_BLOCK:")
    ? app.coverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : app.coverLetter;

  const newCoverLetter = serializeApplicationMetadata(originalCoverLetterText, meta);

  await db.application.update({
    where: { id: applicationId },
    data: {
      status: dbStatus,
      coverLetter: newCoverLetter,
    },
  });

  // Create real-time notification
  let notificationTitle = `Application Stage Update: ${targetStage}`;
  let notificationMsg = `Your application for "${app.project.title}" has been updated to "${targetStage}".`;

  if ((targetStage === "Interview" || targetStage === "Interview Scheduled") && interviewData) {
    notificationTitle = "Interview Scheduled";
    notificationMsg = `An interview round has been scheduled for "${app.project.title}" on ${new Date(interviewData.date).toLocaleString()}. Meet URL: ${interviewData.meetingLink}`;
  } else if (targetStage === "Interview Conducted") {
    notificationTitle = "Interview Completed";
    notificationMsg = `Your interview round for "${app.project.title}" was marked as conducted. Awaiting recruiter evaluation.`;
  } else if (targetStage === "Offer Sent") {
    notificationTitle = "Job Offer Received";
    notificationMsg = `You have received an official hiring offer for "${app.project.title}". Check your dashboard applications to review details.`;
  }

  await db.notification.create({
    data: {
      userId: app.freelancer.user.id,
      title: notificationTitle,
      message: notificationMsg,
    },
  });

  // Revalidate paths
  revalidatePath("/company/applicants");
  revalidatePath(`/workspace/${applicationId}`);
  revalidatePath("/freelancer/applications");

  return { success: true };
}

/**
 * 4. Bulk transition applications
 */
export async function bulkTransitionApplicants(
  applicationIds: string[],
  targetStage: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  for (const id of applicationIds) {
    try {
      await transitionApplicationStage(id, targetStage, notes);
    } catch (e) {
      console.error(`Failed to transition applicant ${id}:`, e);
    }
  }
  return { success: true };
}

/**
 * 5. Sign Digital Contract
 */
/**
 * SEC-006 — this checked only that a session existed, while the *signing party*
 * and the recorded *IP address* both arrived as caller-supplied arguments. Any
 * user could forge either signature on any contract, with an attacker-chosen IP
 * in the audit trail, and completing both signatures flipped the project to
 * IN_PROGRESS.
 *
 * The signing party is now derived from the session's relationship to the
 * project, and the IP is read from the request headers server-side. The `role`
 * and `ipAddress` parameters are gone.
 */
export async function signDigitalContract(
  applicationId: string
): Promise<{ success: boolean; error?: string }> {
  const party = await requireApplicationParty(applicationId);
  if (!party.ok) return { success: false, error: party.error };

  const role: "FREELANCER" | "CLIENT" = party.data.role === "COMPANY" ? "CLIENT" : "FREELANCER";
  const ipAddress = await callerIpAddress();

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!app) {
    throw new Error("Application not found");
  }

  const meta = parseApplicationMetadata(app.coverLetter);

  if (!meta.digitalContract) {
    // Generate default contract text
    meta.digitalContract = {
      contractText: `Freelancer Services Contract for Project "${app.project.title}". Work deliverables as defined in the posting wizard. Payment upon client milestone release.`,
      freelancerSigned: false,
      clientSigned: false,
      status: "SENT",
      // COMP-011 — see contractMilestonesFor; the same helper as the other site,
      // so the schedule cannot drift between them.
      milestones: await contractMilestonesFor(app.id, app.projectId, app.project.budget, app.project.title),
    };
  }

  if (role === "FREELANCER") {
    meta.digitalContract.freelancerSigned = true;
    meta.digitalContract.freelancerSignedAt = new Date().toISOString();
    meta.digitalContract.freelancerIp = ipAddress;
  } else {
    meta.digitalContract.clientSigned = true;
    meta.digitalContract.clientSignedAt = new Date().toISOString();
    meta.digitalContract.clientIp = ipAddress;
  }

  if (meta.digitalContract.freelancerSigned && meta.digitalContract.clientSigned) {
    meta.digitalContract.status = "SIGNED";
    meta.digitalContract.milestones = meta.digitalContract.milestones.map((m, idx) =>
      idx === 0 ? { ...m, status: "ESCROWED" } : m
    );
    
    // Automatically transition application stage to "Project Started"
    const startEvent: ApplicationPipelineEvent = {
      stage: "Project Started",
      timestamp: new Date().toISOString(),
      notes: "Digital contract fully signed by both parties. Project and workspace milestones kicked off.",
      recruiterName: "System",
    };
    meta.pipelineHistory = [...meta.pipelineHistory, startEvent];
    
    /**
     * MF-002 — the first freelancer to sign used to flip the whole project to
     * IN_PROGRESS, misrepresenting the state for co-hires who had not signed.
     * The project moves only once every hired freelancer has signed, and only
     * from a live state (LIFE-001/LIFE-003).
     */
    const project = await db.project.findUnique({
      where: { id: app.projectId },
      select: { status: true },
    });

    if (project && assertProjectTransition(project.status, ProjectStatus.IN_PROGRESS).ok) {
      const hired = await db.application.findMany({
        where: { projectId: app.projectId, status: ApplicationStatus.HIRED },
        select: { id: true, coverLetter: true },
      });
      const allSigned = hired.every((h) => {
        if (h.id === app.id) return true; // this one has just been signed
        const c = parseApplicationMetadata(h.coverLetter).digitalContract;
        return !!c?.freelancerSigned && !!c?.clientSigned;
      });

      if (allSigned) {
        await db.project.update({
          where: { id: app.projectId },
          data: { status: ProjectStatus.IN_PROGRESS },
        });
      }
    }
  }

  const originalCoverLetterText = app.coverLetter.includes("\n\nMETADATA_JSON_BLOCK:")
    ? app.coverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : app.coverLetter;

  await db.application.update({
    where: { id: applicationId },
    data: {
      coverLetter: serializeApplicationMetadata(originalCoverLetterText, meta),
    },
  });

  revalidatePath(`/workspace/${applicationId}`);
  revalidatePath("/freelancer/applications");
  revalidatePath("/company/applicants");

  return { success: true };
}

/**
 * 6. Release Milestone Escrow Funds
 */
/**
 * SEC-007 — role was checked, ownership was not, so any COMPANY user could
 * release another company's milestones; releasing the last one also forced
 * that company's project to COMPLETED.
 *
 * Ownership is now enforced. The project-completion side effect is addressed
 * separately under LIFE-001/MF-001, which make completeProject the sole writer
 * of ProjectStatus.COMPLETED.
 */
export async function releaseMilestonePayment(
  applicationId: string,
  milestoneIndex: number
): Promise<{ success: boolean; error?: string }> {
  const owned = await requireApplicationOwner(applicationId);
  if (!owned.ok) throw new Error(owned.error);

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: true,
      freelancer: {
        include: {
          user: { select: { id: true } },
        },
      },
    },
  });

  if (!app) {
    throw new Error("Application not found");
  }

  const meta = parseApplicationMetadata(app.coverLetter);
  // Bounds-check the caller-supplied index rather than trusting it to address
  // a real element (COMP-012).
  if (
    !meta.digitalContract ||
    !Number.isInteger(milestoneIndex) ||
    milestoneIndex < 0 ||
    milestoneIndex >= meta.digitalContract.milestones.length
  ) {
    throw new Error("Milestone not found");
  }

  const milestone = meta.digitalContract.milestones[milestoneIndex];
  // Idempotency: releasing the same index twice re-ran the whole side-effect
  // chain, including a duplicate payout notification (COMP-012).
  if (milestone.status === "RELEASED") {
    return { success: false, error: "This milestone has already been released." };
  }
  milestone.status = "RELEASED";

  // Lock in next milestone as Escrowed if it exists
  if (meta.digitalContract.milestones[milestoneIndex + 1]) {
    meta.digitalContract.milestones[milestoneIndex + 1].status = "ESCROWED";
  } else {
    // All milestones released -> Mark contract completed!
    meta.digitalContract.status = "COMPLETED";
    
    // Auto-transition pipeline to "Payment Released" & "Completed"
    meta.pipelineHistory = [
      ...meta.pipelineHistory,
      {
        stage: "Payment Released",
        timestamp: new Date().toISOString(),
        notes: `Final milestone payment of $${milestone.budget} released successfully.`,
        recruiterName: "Finance Portal",
      },
      {
        stage: "Completed",
        timestamp: new Date().toISOString(),
        notes: "All milestones released and deliverables accepted. Gig contract officially completed.",
        recruiterName: "System",
      }
    ];

    /**
     * LIFE-001 / MF-001 — this used to set ProjectStatus.COMPLETED here.
     * Milestones are per-application, so on a multi-freelancer project the
     * first freelancer's final release completed the project for everyone,
     * stranding co-hires' outstanding milestones and skipping certificate
     * issuance entirely (which only runs via completeProject).
     *
     * completeProject is now the sole writer of COMPLETED. Releasing a payment
     * records the release and nothing more; the company completes the project
     * once every hired freelancer is settled.
     */
  }

  const originalCoverLetterText = app.coverLetter.includes("\n\nMETADATA_JSON_BLOCK:")
    ? app.coverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : app.coverLetter;

  await db.application.update({
    where: { id: applicationId },
    data: {
      coverLetter: serializeApplicationMetadata(originalCoverLetterText, meta),
    },
  });

  // Notify freelancer
  await db.notification.create({
    data: {
      userId: app.freelancer.user.id,
      title: "Escrow Funds Released",
      message: `The client has released $${milestone.budget} for milestone "${milestone.title}".`,
    },
  });

  revalidatePath(`/workspace/${applicationId}`);
  revalidatePath("/company/applicants");

  return { success: true };
}

/**
 * 7. Submit Pre-Application Discussion Question
 */
/** SEC-012 — bounds on a write path that any authenticated user can reach. */
const MAX_DISCUSSION_QUESTION_LENGTH = 500;
const MAX_DISCUSSION_QUESTIONS_PER_PROJECT = 100;
const MAX_QUESTIONS_PER_FREELANCER_PER_PROJECT = 5;

/**
 * SEC-012 — this required only a session: no role check, no relationship to the
 * project, no length cap and no rate limit. Any user could append unbounded
 * arbitrary text to any project's description on repeat — the same column that
 * carries the payment metadata — which made it a denial-of-service against a
 * project record as well as a content-injection path.
 */
export async function submitDiscussionQuestion(projectId: string, question: string) {
  const actor = await requireRole(Role.FREELANCER);
  if (!actor.ok) return { success: false, error: actor.error };

  const text = (question ?? "").trim();
  if (!text) {
    return { success: false, error: "Enter a question." };
  }
  if (text.length > MAX_DISCUSSION_QUESTION_LENGTH) {
    return {
      success: false,
      error: `Questions are limited to ${MAX_DISCUSSION_QUESTION_LENGTH} characters.`,
    };
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return { success: false, error: "Project not found" };
  }
  // A closed or completed listing is not taking questions.
  if (project.status !== "OPEN" && project.status !== "IN_PROGRESS") {
    return { success: false, error: "This project is no longer accepting questions." };
  }

  const meta = getProjectMetadataDirect(project.description);

  if (!meta.faq) meta.faq = [];

  // Per-project and per-asker caps, standing in for a real rate limiter.
  const authorTag = `[Discussion Question by ${actor.data.name || "Freelancer"}]`;
  const existingQuestions = meta.faq.filter((f) => f.question.startsWith("[Discussion Question by"));
  if (existingQuestions.length >= MAX_DISCUSSION_QUESTIONS_PER_PROJECT) {
    return { success: false, error: "This project has reached its question limit." };
  }
  const mine = existingQuestions.filter((f) => f.question.startsWith(authorTag));
  if (mine.length >= MAX_QUESTIONS_PER_FREELANCER_PER_PROJECT) {
    return {
      success: false,
      error: `You can ask at most ${MAX_QUESTIONS_PER_FREELANCER_PER_PROJECT} questions on a project.`,
    };
  }

  // Store the pre-application discussion question as a specific FAQ layout format with empty answer
  meta.faq.push({
    question: `${authorTag}: ${text}`,
    answer: "",
  });

  const cleanDescriptionText = project.description.includes("\n\nMETADATA_JSON_BLOCK:")
    ? project.description.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : project.description;

  await db.project.update({
    where: { id: projectId },
    data: {
      description: serializeProjectMetadata(cleanDescriptionText, meta),
    },
  });

  revalidatePath(`/freelancer/projects`);
  return { success: true };
}

/**
 * 8. Submit Recruiter Reply to Pre-Application Discussion Question
 */
/**
 * SEC-012 (companion) — role was checked but not ownership, so any company
 * could answer questions on another company's listing.
 */
export async function replyToDiscussionQuestion(projectId: string, faqIndex: number, answer: string) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) return { success: false, error: owned.error };
  const project = owned.data.project;

  const meta = getProjectMetadataDirect(project.description);

  if (!meta.faq || !Number.isInteger(faqIndex) || faqIndex < 0 || !meta.faq[faqIndex]) {
    return { success: false, error: "Question not found" };
  }

  meta.faq[faqIndex].answer = answer;

  const cleanDescriptionText = project.description.includes("\n\nMETADATA_JSON_BLOCK:")
    ? project.description.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : project.description;

  await db.project.update({
    where: { id: projectId },
    data: {
      description: serializeProjectMetadata(cleanDescriptionText, meta),
    },
  });

  revalidatePath(`/freelancer/projects`);
  revalidatePath(`/company/projects`);
  return { success: true };
}

/**
 * 13. Send Offer Letter to Shortlisted Candidate
 */
export async function sendOfferLetterAction(
  applicationId: string,
  offerText: string,
  stipendAmount: number,
  milestones: { title: string; budget: number }[],
  paymentCategory: PaymentCategory = "FIXED",
  currency: string = DEFAULT_CURRENCY,
  nonMonetaryBenefits: NonMonetaryBenefit[] = [],
  nonMonetaryDetails?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: { include: { company: { select: { userId: true, companyName: true } } } },
      freelancer: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (!app) return { success: false, error: "Application not found" };
  if (app.project.company.userId !== session.user.id)
    return { success: false, error: "Unauthorized: not your project" };

  const meta = parseApplicationMetadata(app.coverLetter);

  // Build offer letter block
  meta.offerLetter = {
    offerText,
    stipendAmount,
    milestones: milestones.map((m) => ({ ...m, status: "PENDING" as const })),
    paymentCategory,
    currency,
    nonMonetaryBenefits,
    nonMonetaryDetails,
    status: "PENDING",
    sentAt: new Date().toISOString(),
    // Preserve negotiation history across re-sent offers so the audit trail survives.
    negotiation: meta.offerLetter?.negotiation ?? [],
  };

  // Log pipeline event
  meta.pipelineHistory = [
    ...meta.pipelineHistory,
    {
      stage: "Offer Sent",
      timestamp: new Date().toISOString(),
      notes: `Offer letter sent with stipend ₹${stipendAmount}.`,
      recruiterId: session.user.id,
      recruiterName: session.user.name || "Recruiter",
    },
  ];

  const originalText = app.coverLetter.includes("\n\nMETADATA_JSON_BLOCK:")
    ? app.coverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : app.coverLetter;

  await db.application.update({
    where: { id: applicationId },
    data: { coverLetter: serializeApplicationMetadata(originalText, meta) },
  });

  // Notify freelancer
  await db.notification.create({
    data: {
      userId: app.freelancer.user.id,
      title: "You Received a Job Offer",
      message: `You have received an official hiring offer for "${app.project.title}". Log in to review and respond.`,
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath(`/company/applicants/${applicationId}`);
  revalidatePath("/freelancer/applications");
  return { success: true };
}

/**
 * 13b. Freelancer raises a counter-offer on the payment amount and/or category.
 *
 * This does not change the offer terms — it parks the offer in NEGOTIATING
 * until the company accepts or rejects the proposal, so neither side can be
 * bound by terms the other has not agreed to.
 */
export async function negotiateOfferAction(
  applicationId: string,
  proposedAmount: number,
  proposedCategory: PaymentCategory,
  proposedCurrency: string = DEFAULT_CURRENCY,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    throw new Error("Unauthorized");
  }

  // A non-monetary counter-offer legitimately carries no cash figure.
  if (proposedCategory !== "NON_MONETARY" && (!Number.isFinite(proposedAmount) || proposedAmount <= 0)) {
    return { success: false, error: "Proposed amount must be greater than zero." };
  }

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: { select: { title: true, company: { select: { userId: true } } } },
      freelancer: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (!app) return { success: false, error: "Application not found" };
  if (app.freelancer.user.id !== session.user.id)
    return { success: false, error: "Unauthorized: not your application" };

  const meta = parseApplicationMetadata(app.coverLetter);
  const offer = meta.offerLetter;
  if (!offer) return { success: false, error: "No offer letter found" };
  if (offer.status === "ACCEPTED" || offer.status === "DECLINED") {
    return { success: false, error: "This offer has already been closed." };
  }

  const history = offer.negotiation ?? [];
  if (history.some((n) => n.status === "PENDING")) {
    return { success: false, error: "You already have a counter-offer awaiting the company's response." };
  }

  const now = new Date().toISOString();
  const currentCategory = offer.paymentCategory ?? "FIXED";
  const currentCurrency = offer.currency ?? DEFAULT_CURRENCY;

  offer.negotiation = [
    ...history,
    {
      proposedAmount,
      proposedCategory,
      proposedCurrency,
      message,
      status: "PENDING",
      requestedAt: now,
      previousAmount: offer.stipendAmount,
      previousCategory: currentCategory,
      previousCurrency: currentCurrency,
    },
  ];
  offer.status = "NEGOTIATING";

  meta.pipelineHistory = [
    ...meta.pipelineHistory,
    {
      stage: "Offer Negotiation Requested",
      timestamp: now,
      notes: `Freelancer proposed ${proposedCategory} at ${proposedAmount} (was ${currentCategory} at ${offer.stipendAmount}).${message ? ` Note: "${message}"` : ""}`,
      recruiterId: session.user.id,
      recruiterName: session.user.name || "Freelancer",
    },
  ];

  const originalText = app.coverLetter.includes("\n\nMETADATA_JSON_BLOCK:")
    ? app.coverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : app.coverLetter;

  await db.application.update({
    where: { id: applicationId },
    data: { coverLetter: serializeApplicationMetadata(originalText, meta) },
  });

  await db.notification.create({
    data: {
      userId: app.project.company.userId,
      title: "Counter-Offer Received",
      message: `${app.freelancer.user.name || "A freelancer"} proposed new payment terms for "${app.project.title}". Review and respond.`,
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath(`/company/applicants/${applicationId}`);
  revalidatePath("/freelancer/applications");
  return { success: true };
}

/**
 * 13c. Company accepts or rejects the freelancer's counter-offer.
 *
 * Accepting copies the proposed terms onto the offer and returns it to PENDING
 * so the freelancer still has to give final acceptance.
 */
export async function respondToNegotiationAction(
  applicationId: string,
  decision: "ACCEPT" | "REJECT",
  responseNote?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: { select: { title: true, company: { select: { userId: true } } } },
      freelancer: { include: { user: { select: { id: true } } } },
    },
  });

  if (!app) return { success: false, error: "Application not found" };
  if (app.project.company.userId !== session.user.id)
    return { success: false, error: "Unauthorized: not your project" };

  const meta = parseApplicationMetadata(app.coverLetter);
  const offer = meta.offerLetter;
  if (!offer) return { success: false, error: "No offer letter found" };

  const pending = offer.negotiation?.find((n) => n.status === "PENDING");
  if (!pending) return { success: false, error: "No pending counter-offer to respond to." };

  const now = new Date().toISOString();
  pending.respondedAt = now;
  pending.responseNote = responseNote;

  if (decision === "ACCEPT") {
    pending.status = "ACCEPTED";
    offer.stipendAmount = pending.proposedAmount;
    offer.paymentCategory = pending.proposedCategory;
    offer.currency = pending.proposedCurrency ?? offer.currency;

    // Milestone splits are derived from the old total, so they no longer add up.
    // Rescale proportionally rather than silently leaving stale figures.
    const oldTotal = pending.previousAmount;
    if (oldTotal > 0 && offer.milestones?.length) {
      offer.milestones = offer.milestones.map((m) => ({
        ...m,
        budget: Math.round((m.budget / oldTotal) * pending.proposedAmount),
      }));
    }
  } else {
    pending.status = "REJECTED";
  }

  // Either way the ball returns to the freelancer for a final accept/decline.
  offer.status = "PENDING";

  meta.pipelineHistory = [
    ...meta.pipelineHistory,
    {
      stage: decision === "ACCEPT" ? "Negotiation Accepted" : "Negotiation Rejected",
      timestamp: now,
      notes:
        decision === "ACCEPT"
          ? `Company accepted revised terms: ${pending.proposedCategory} at ${pending.proposedAmount}.`
          : `Company kept the original terms: ${pending.previousCategory} at ${pending.previousAmount}.${responseNote ? ` Note: "${responseNote}"` : ""}`,
      recruiterId: session.user.id,
      recruiterName: session.user.name || "Recruiter",
    },
  ];

  const originalText = app.coverLetter.includes("\n\nMETADATA_JSON_BLOCK:")
    ? app.coverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : app.coverLetter;

  await db.application.update({
    where: { id: applicationId },
    data: { coverLetter: serializeApplicationMetadata(originalText, meta) },
  });

  await db.notification.create({
    data: {
      userId: app.freelancer.user.id,
      title: decision === "ACCEPT" ? "Counter-Offer Accepted" : "Counter-Offer Declined",
      message:
        decision === "ACCEPT"
          ? `Your proposed terms for "${app.project.title}" were accepted. Review and confirm the updated offer.`
          : `The company kept the original terms for "${app.project.title}". Review the offer again.`,
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath(`/company/applicants/${applicationId}`);
  revalidatePath("/freelancer/applications");
  return { success: true };
}

/**
 * 14. Freelancer responds to an Offer Letter (Accept / Decline)
 */
export async function respondToOfferLetterAction(
  applicationId: string,
  decision: "ACCEPT" | "DECLINE",
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    throw new Error("Unauthorized");
  }

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: { select: { id: true, title: true, budget: true, status: true, company: { select: { userId: true } } } },
      freelancer: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (!app) return { success: false, error: "Application not found" };
  if (app.freelancer.user.id !== session.user.id)
    return { success: false, error: "Unauthorized: not your application" };

  const meta = parseApplicationMetadata(app.coverLetter);
  if (!meta.offerLetter) return { success: false, error: "No offer letter found" };

  // Terms are still in flux — accepting now would bind the freelancer to figures
  // the company has not agreed to.
  if (meta.offerLetter.negotiation?.some((n) => n.status === "PENDING")) {
    return {
      success: false,
      error: "Your counter-offer is still awaiting the company's response. Withdraw it or wait for their reply.",
    };
  }

  const now = new Date().toISOString();
  meta.offerLetter.respondedAt = now;

  let newDbStatus = app.status;

  if (decision === "DECLINE") {
    meta.offerLetter.status = "DECLINED";
    meta.offerLetter.reason = reason;
    meta.pipelineHistory = [
      ...meta.pipelineHistory,
      {
        stage: "Offer Declined",
        timestamp: now,
        notes: reason ? `Freelancer declined with reason: "${reason}"` : "Freelancer declined the hiring offer.",
        recruiterId: session.user.id,
        recruiterName: session.user.name || "Freelancer",
      },
    ];
  } else {
    /**
     * LIFE-002 / MF-005 — accepting an offer used to set HIRED directly,
     * bypassing role capacity and the project-wide limit entirely. Capacity is
     * now checked here against the same authoritative calculation the hire path
     * uses, so an offer cannot over-fill a project.
     */
    const capacity = await getCapacity(db, app.project.id, app.roleId);
    if (!app.isApprentice && (capacity.roleFull || capacity.projectFull)) {
      return {
        success: false,
        error: "This role has since been filled. Contact the company before accepting.",
      };
    }
    const move = assertApplicationTransition(app.status, ApplicationStatus.HIRED);
    if (!move.ok) return { success: false, error: move.error };

    // ACCEPT
    meta.offerLetter.status = "ACCEPTED";
    meta.pipelineHistory = [
      ...meta.pipelineHistory,
      {
        stage: "Offer Accepted",
        timestamp: now,
        notes: "Freelancer accepted the hiring offer. Project is now active.",
        recruiterId: session.user.id,
        recruiterName: session.user.name || "Freelancer",
      },
    ];

    // Build digital contract from offer milestones
    meta.digitalContract = {
      contractText: `Freelancer Services Contract — Project: "${app.project.title}". Offer accepted on ${new Date(now).toLocaleDateString()}. Payment schedule as per agreed milestones.`,
      freelancerSigned: true,
      freelancerSignedAt: now,
      freelancerIp: "client",
      clientSigned: true,
      clientSignedAt: meta.offerLetter.sentAt,
      clientIp: "server",
      status: "ACTIVE",
      milestones: meta.offerLetter.milestones.map((m) => ({
        title: m.title,
        budget: m.budget,
        status: "PENDING" as const,
      })),
    };

    newDbStatus = ApplicationStatus.HIRED;

    // Kick off project if still OPEN
    if (app.project.status === ProjectStatus.OPEN) {
      await db.project.update({
        where: { id: app.project.id },
        data: { status: ProjectStatus.IN_PROGRESS },
      });
    }

    // Notify company (recruiter)
    await db.notification.create({
      data: {
        userId: app.project.company.userId,
        title: "Offer Accepted — Project Started",
        message: `${app.freelancer.user.name || "The freelancer"} has accepted your offer for "${app.project.title}". The project is now in progress.`,
      },
    });
  }

  const originalText = app.coverLetter.includes("\n\nMETADATA_JSON_BLOCK:")
    ? app.coverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : app.coverLetter;

  await db.application.update({
    where: { id: applicationId },
    data: {
      status: newDbStatus,
      coverLetter: serializeApplicationMetadata(originalText, meta),
    },
  });

  revalidatePath("/freelancer/applications");
  revalidatePath("/company/applicants");
  revalidatePath(`/company/applicants/${applicationId}`);
  return { success: true };
}

/**
 * 15. Send a pre-hire DM message between recruiter and candidate
 */
/**
 * SEC-014 — this required only a session and then wrote a Message plus a
 * Notification for any projectId to any recipientUserId, with no check that
 * either party was connected to the project. It was an open spam channel to
 * every user on the platform.
 *
 * Both ends are now verified: the sender must be a party to the project, and
 * the recipient must be a counterpart on it (the owning company, or a
 * freelancer who has applied to it — this is the pre-hire DM channel, so an
 * applicant is a legitimate counterpart before being hired).
 */
export async function sendDMMessageAction(
  projectId: string,
  recipientUserId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireUser();
  if (!actor.ok) return { success: false, error: actor.error };
  const senderId = actor.data.userId;

  if (!content?.trim()) return { success: false, error: "Message cannot be empty." };
  if (recipientUserId === senderId) {
    return { success: false, error: "You cannot message yourself." };
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      company: { select: { userId: true } },
      applications: { select: { freelancer: { select: { userId: true } } } },
    },
  });
  if (!project) return { success: false, error: "Project not found" };

  const companyUserId = project.company.userId;
  const applicantUserIds = new Set(project.applications.map((a) => a.freelancer.userId));
  const isParty = (id: string) => id === companyUserId || applicantUserIds.has(id);

  if (!isParty(senderId) || !isParty(recipientUserId)) {
    return { success: false, error: "Not found, or you do not have access to it." };
  }

  const ids = [senderId, recipientUserId].sort();
  const channel = `dm:${ids[0]}:${ids[1]}`;

  await db.message.create({
    data: { projectId, senderId, content, channel },
  });

  // Notify recipient
  await db.notification.create({
    data: {
      userId: recipientUserId,
      title: "New Message",
      message: `${actor.data.name || "Someone"} sent you a message.`,
    },
  });

  revalidatePath("/freelancer/applications");
  revalidatePath("/company/applicants");
  return { success: true };
}

/**
 * 16. Fetch DM messages between two users on a project
 */
export async function getDMMessagesAction(
  projectId: string,
  otherUserId: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const ids = [session.user.id, otherUserId].sort();
  const channel = `dm:${ids[0]}:${ids[1]}`;

  const messages = await db.message.findMany({
    where: { projectId, channel },
    include: { sender: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return messages;
}

/**
 * 17. Update / Edit a scheduled interview (company can change date, time, link)
 */
export async function updateInterviewAction(
  applicationId: string,
  newDate: string,
  newTime: string,
  newMeetLink: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) throw new Error("Unauthorized");

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: { include: { company: { select: { userId: true } } } },
      freelancer: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!app) return { success: false, error: "Application not found" };
  if (app.project.company.userId !== session.user.id)
    return { success: false, error: "Unauthorized" };

  const meta = parseApplicationMetadata(app.coverLetter);
  const combinedDateTime = `${newDate}T${newTime}`;

  // Update the most recent interview event in history
  const lastInterviewIdx = [...meta.pipelineHistory]
    .map((e, i) => ({ e, i }))
    .reverse()
    .find(({ e }) => e.meetingLink)?.i;

  if (lastInterviewIdx !== undefined) {
    meta.pipelineHistory[lastInterviewIdx].interviewDate = combinedDateTime;
    meta.pipelineHistory[lastInterviewIdx].meetingLink = newMeetLink;
    meta.pipelineHistory[lastInterviewIdx].notes = notes || `Interview rescheduled to ${newDate} at ${newTime}.`;
  }

  // Log reschedule event
  meta.pipelineHistory.push({
    stage: "Interview Rescheduled",
    timestamp: new Date().toISOString(),
    notes: notes || `Rescheduled to ${newDate} at ${newTime}. New link: ${newMeetLink}`,
    recruiterId: session.user.id,
    recruiterName: session.user.name || "Recruiter",
    interviewDate: combinedDateTime,
    meetingLink: newMeetLink,
  });

  const originalText = app.coverLetter.includes("\n\nMETADATA_JSON_BLOCK:")
    ? app.coverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : app.coverLetter;

  await db.application.update({
    where: { id: applicationId },
    data: { coverLetter: serializeApplicationMetadata(originalText, meta) },
  });

  // Notify freelancer
  await db.notification.create({
    data: {
      userId: app.freelancer.user.id,
      title: "Interview Rescheduled",
      message: `Your interview for "${app.project.title}" has been rescheduled to ${new Date(combinedDateTime).toLocaleString()}. New link: ${newMeetLink}`,
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath(`/company/applicants/${applicationId}`);
  revalidatePath("/freelancer/applications");
  return { success: true };
}

/**
 * 18. Cancel a scheduled interview
 */
export async function cancelInterviewAction(
  applicationId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) throw new Error("Unauthorized");

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: { include: { company: { select: { userId: true } } } },
      freelancer: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!app) return { success: false, error: "Application not found" };
  if (app.project.company.userId !== session.user.id)
    return { success: false, error: "Unauthorized" };

  const meta = parseApplicationMetadata(app.coverLetter);

  // Clear meetingLink from the last interview event
  const lastInterviewIdx = [...meta.pipelineHistory]
    .map((e, i) => ({ e, i }))
    .reverse()
    .find(({ e }) => e.meetingLink)?.i;

  if (lastInterviewIdx !== undefined) {
    meta.pipelineHistory[lastInterviewIdx].meetingLink = undefined;
    meta.pipelineHistory[lastInterviewIdx].interviewDate = undefined;
  }

  // Log cancellation
  meta.pipelineHistory.push({
    stage: "Interview Cancelled",
    timestamp: new Date().toISOString(),
    notes: reason || "Interview session was cancelled by the recruiter.",
    recruiterId: session.user.id,
    recruiterName: session.user.name || "Recruiter",
  });

  const originalText = app.coverLetter.includes("\n\nMETADATA_JSON_BLOCK:")
    ? app.coverLetter.split("\n\nMETADATA_JSON_BLOCK:")[0]
    : app.coverLetter;

  await db.application.update({
    where: { id: applicationId },
    data: { coverLetter: serializeApplicationMetadata(originalText, meta) },
  });

  await db.notification.create({
    data: {
      userId: app.freelancer.user.id,
      title: "Interview Cancelled",
      message: `The scheduled interview for "${app.project.title}" has been cancelled by the recruiter. ${reason ? `Reason: ${reason}` : ""}`,
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath(`/company/applicants/${applicationId}`);
  revalidatePath("/freelancer/applications");
  return { success: true };
}

/**
 * 19. Edit a pre-hire DM message
 */
export async function editDMMessageAction(
  messageId: string,
  newContent: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const message = await db.message.findUnique({
    where: { id: messageId },
  });

  if (!message) return { success: false, error: "Message not found" };
  if (message.senderId !== session.user.id) {
    return { success: false, error: "You can only edit your own messages" };
  }

  await db.message.update({
    where: { id: messageId },
    data: { content: newContent },
  });

  revalidatePath("/freelancer/applications");
  revalidatePath("/company/applicants");
  return { success: true };
}

/**
 * 20. Delete a pre-hire DM message
 */
export async function deleteDMMessageAction(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const message = await db.message.findUnique({
    where: { id: messageId },
  });

  if (!message) return { success: false, error: "Message not found" };
  if (message.senderId !== session.user.id) {
    return { success: false, error: "You can only delete your own messages" };
  }

  await db.message.delete({
    where: { id: messageId },
  });

  revalidatePath("/freelancer/applications");
  revalidatePath("/company/applicants");
  return { success: true };
}

/**
 * 21. Mark pre-hire DM messages as seen
 */
export async function markDMMessagesAsSeenAction(
  projectId: string,
  otherUserId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const ids = [session.user.id, otherUserId].sort();
  const channel = `dm:${ids[0]}:${ids[1]}`;

  await db.message.updateMany({
    where: {
      projectId,
      channel,
      senderId: otherUserId,
      seen: false,
    },
    data: {
      seen: true,
    },
  });

  revalidatePath("/freelancer/applications");
  revalidatePath("/company/applicants");
  return { success: true };
}

