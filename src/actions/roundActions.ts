"use server";

import { ApplicationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireApplicationFreelancer, requireApplicationOwner } from "@/lib/authz";
import { assertApplicationTransition } from "@/lib/lifecycle";
import { mergeRoundProgress, roundDeadlinePassed } from "@/lib/rounds";
import {
  getApplicationCoverLetterText,
  getProjectMetadataDirect,
  parseApplicationMetadata,
  roundRuntimeMode,
  roundScoreCategory,
  serializeApplicationMetadata,
  type ApplicationWorkflowData,
  type RecruitmentRound,
} from "@/lib/workflowHelpers";

/* ============================================================================
   SELECTION ROUND RUNTIME

   Every round type the wizard offers is executed here. What a round does is
   decided by its runtime mode:

     APPLICATION      — the answers came in with the apply wizard; the
                        recruiter only reviews.
     REVIEW_ONLY      — opens straight into review; nothing is asked of the
                        candidate.
     CANDIDATE_SUBMIT — opens for the candidate, who returns a written response
                        and/or links before the deadline.
     LIVE_SESSION     — opens with a schedule and joining link; the candidate
                        confirms attendance and the recruiter records the
                        outcome afterwards.

   Failing a round rejects the application; clearing one shortlists it. Both go
   through the same lifecycle guard the rest of the hiring flow uses.
   ========================================================================= */

export type RoundActionResult = { success: boolean; error?: string };

function projectRounds(description: string): RecruitmentRound[] {
  return getProjectMetadataDirect(description).rounds ?? [];
}

async function saveMeta(
  applicationId: string,
  coverLetter: string,
  meta: ApplicationWorkflowData,
  status?: ApplicationStatus,
) {
  await db.application.update({
    where: { id: applicationId },
    data: {
      coverLetter: serializeApplicationMetadata(getApplicationCoverLetterText(coverLetter), meta),
      ...(status ? { status } : {}),
    },
  });
  revalidatePath("/company/applicants");
  revalidatePath(`/company/applicants/${applicationId}`);
  revalidatePath("/freelancer/applications");
  revalidatePath(`/freelancer/applications/${applicationId}`);
}

function pipelineEvent(
  meta: ApplicationWorkflowData,
  stage: string,
  notes: string,
  actorName: string,
) {
  meta.pipelineHistory = [
    ...meta.pipelineHistory,
    { stage, timestamp: new Date().toISOString(), notes, recruiterName: actorName },
  ];
}

async function notify(userId: string, title: string, message: string) {
  await db.notification.create({ data: { userId, title, message } });
}

/* ------------------------------------------------------------- recruiter --- */

/**
 * Open one round for one candidate. CANDIDATE_SUBMIT rounds wait on the
 * candidate; LIVE_SESSION rounds are scheduled; REVIEW_ONLY rounds go straight
 * to the reviewer because they ask the candidate for nothing.
 */
export async function requestRound(
  applicationId: string,
  roundId: string,
  input: {
    instructions?: string;
    deadline?: string;
    scheduledAt?: string;
    meetingLink?: string;
  } = {},
): Promise<RoundActionResult> {
  const owned = await requireApplicationOwner(applicationId);
  if (!owned.ok) return { success: false, error: owned.error };
  const { application, company } = owned.data;

  if (application.status === ApplicationStatus.REJECTED) {
    return { success: false, error: "This application has been rejected." };
  }

  const meta = parseApplicationMetadata(application.coverLetter);
  const progress = mergeRoundProgress(
    projectRounds(application.project.description),
    meta.roundProgress ?? [],
  );
  const entry = progress.find((r) => r.roundId === roundId);
  if (!entry) return { success: false, error: "That round is not configured on this project." };
  if (entry.status === "PASSED" || entry.status === "FAILED") {
    return { success: false, error: "That round has already been reviewed." };
  }

  const mode = roundRuntimeMode(entry.roundType);
  if (mode === "APPLICATION") {
    return { success: false, error: "Screening answers are collected with the application." };
  }
  if (mode === "LIVE_SESSION" && !input.scheduledAt) {
    return { success: false, error: "Pick a date and time for the session." };
  }

  const now = new Date().toISOString();
  entry.status = mode === "REVIEW_ONLY" ? "SUBMITTED" : "AWAITING_CANDIDATE";
  entry.requestedAt = now;
  if (input.instructions?.trim()) entry.instructions = input.instructions.trim();
  if (input.deadline) entry.deadline = input.deadline;
  if (input.scheduledAt) {
    const when = new Date(input.scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return { success: false, error: "That session date is not valid." };
    }
    entry.scheduledAt = when.toISOString();
  }
  if (input.meetingLink?.trim()) entry.meetingLink = input.meetingLink.trim();
  if (mode === "REVIEW_ONLY") {
    entry.submission = {
      text: "No candidate action required — reviewed from the profile and application.",
      submittedAt: now,
    };
  }

  meta.roundProgress = progress;
  pipelineEvent(
    meta,
    `Round opened: ${entry.roundName}`,
    input.instructions?.trim() || `${entry.roundName} was opened for this candidate.`,
    company.companyName,
  );

  const nextStatus =
    application.status === ApplicationStatus.PENDING &&
    assertApplicationTransition(application.status, ApplicationStatus.SHORTLISTED).ok
      ? ApplicationStatus.SHORTLISTED
      : undefined;

  await saveMeta(applicationId, application.coverLetter, meta, nextStatus);

  if (mode !== "REVIEW_ONLY") {
    const freelancer = await db.freelancer.findUnique({
      where: { id: application.freelancerId },
      select: { userId: true },
    });
    if (freelancer) {
      await notify(
        freelancer.userId,
        mode === "LIVE_SESSION"
          ? `Session scheduled: ${entry.roundName}`
          : `Action required: ${entry.roundName}`,
        mode === "LIVE_SESSION"
          ? `${application.project.title} — ${entry.roundName} is scheduled for ${new Date(entry.scheduledAt!).toLocaleString()}. Confirm your attendance from your application.`
          : `${application.project.title} — you have been asked to complete "${entry.roundName}". Open your application to respond.`,
      );
    }
  }

  return { success: true };
}

/** Record the verdict on a round. Failing one rejects the application. */
export async function reviewRound(
  applicationId: string,
  roundId: string,
  input: { outcome: "PASSED" | "FAILED"; score?: number; notes?: string },
): Promise<RoundActionResult> {
  const owned = await requireApplicationOwner(applicationId);
  if (!owned.ok) return { success: false, error: owned.error };
  const { application, company } = owned.data;

  if (input.score !== undefined && (!Number.isFinite(input.score) || input.score < 0 || input.score > 100)) {
    return { success: false, error: "Score must be between 0 and 100." };
  }

  const meta = parseApplicationMetadata(application.coverLetter);
  const progress = mergeRoundProgress(
    projectRounds(application.project.description),
    meta.roundProgress ?? [],
  );
  const entry = progress.find((r) => r.roundId === roundId);
  if (!entry) return { success: false, error: "That round is not configured on this project." };
  if (entry.status === "PENDING") {
    return { success: false, error: "Open the round for this candidate before reviewing it." };
  }
  if (entry.status === "AWAITING_CANDIDATE") {
    return { success: false, error: "The candidate has not responded to this round yet." };
  }

  entry.status = input.outcome;
  entry.review = {
    outcome: input.outcome,
    score: input.score,
    scoreCategory: roundScoreCategory(entry.roundType),
    notes: input.notes?.trim() || undefined,
    reviewerName: company.companyName,
    reviewedAt: new Date().toISOString(),
  };
  meta.roundProgress = progress;

  let nextStatus: ApplicationStatus | undefined;
  if (input.outcome === "FAILED") {
    if (assertApplicationTransition(application.status, ApplicationStatus.REJECTED).ok) {
      nextStatus = ApplicationStatus.REJECTED;
    }
    pipelineEvent(
      meta,
      "Rejected",
      input.notes?.trim() || `Did not clear ${entry.roundName}.`,
      company.companyName,
    );
  } else {
    pipelineEvent(
      meta,
      `Round cleared: ${entry.roundName}`,
      input.notes?.trim() || `${entry.roundName} was cleared.`,
      company.companyName,
    );
    if (
      application.status === ApplicationStatus.PENDING &&
      assertApplicationTransition(application.status, ApplicationStatus.SHORTLISTED).ok
    ) {
      nextStatus = ApplicationStatus.SHORTLISTED;
    }
  }

  await saveMeta(applicationId, application.coverLetter, meta, nextStatus);

  const freelancer = await db.freelancer.findUnique({
    where: { id: application.freelancerId },
    select: { userId: true },
  });
  if (freelancer) {
    await notify(
      freelancer.userId,
      input.outcome === "PASSED" ? `Round cleared: ${entry.roundName}` : "Application closed",
      input.outcome === "PASSED"
        ? `You cleared "${entry.roundName}" for ${application.project.title}.`
        : `Your application for ${application.project.title} did not progress past "${entry.roundName}".`,
    );
  }

  return { success: true };
}

/* ------------------------------------------------------------- candidate --- */

/**
 * The candidate's response to an open round. LIVE_SESSION rounds take an
 * attendance confirmation instead of a submission body.
 */
export async function submitRoundResponse(
  applicationId: string,
  roundId: string,
  input: { text?: string; links?: string[]; attendanceConfirmed?: boolean },
): Promise<RoundActionResult> {
  const owned = await requireApplicationFreelancer(applicationId);
  if (!owned.ok) return { success: false, error: owned.error };
  const { application } = owned.data;

  if (application.status === ApplicationStatus.REJECTED) {
    return { success: false, error: "This application is closed." };
  }

  const meta = parseApplicationMetadata(application.coverLetter);
  const progress = mergeRoundProgress(
    projectRounds(application.project.description),
    meta.roundProgress ?? [],
  );
  const entry = progress.find((r) => r.roundId === roundId);
  if (!entry) return { success: false, error: "That round is not part of this application." };
  if (entry.status !== "AWAITING_CANDIDATE") {
    return { success: false, error: "This round is not open for a response." };
  }

  const mode = roundRuntimeMode(entry.roundType);
  const links = (input.links ?? []).map((l) => l.trim()).filter(Boolean);

  if (mode === "LIVE_SESSION") {
    if (!input.attendanceConfirmed) {
      return { success: false, error: "Confirm your attendance to continue." };
    }
  } else if (!input.text?.trim() && links.length === 0) {
    return { success: false, error: "Add a written response or at least one link." };
  }

  // The deadline is enforced, not decorative: once it passes the round stops
  // accepting a submission and the recruiter decides how to proceed.
  if (roundDeadlinePassed(entry.deadline)) {
    return { success: false, error: "The deadline for this round has passed." };
  }

  entry.submission = {
    text: input.text?.trim() || undefined,
    links: links.length > 0 ? links : undefined,
    attendanceConfirmed: mode === "LIVE_SESSION" ? true : undefined,
    submittedAt: new Date().toISOString(),
  };
  entry.status = "SUBMITTED";
  meta.roundProgress = progress;

  const freelancer = await db.freelancer.findUnique({
    where: { id: application.freelancerId },
    select: { user: { select: { name: true } } },
  });
  const who = freelancer?.user.name || "The candidate";

  pipelineEvent(
    meta,
    mode === "LIVE_SESSION"
      ? `Attendance confirmed: ${entry.roundName}`
      : `Round submitted: ${entry.roundName}`,
    mode === "LIVE_SESSION" ? `${who} confirmed attendance.` : `${who} submitted a response for review.`,
    who,
  );

  await saveMeta(applicationId, application.coverLetter, meta);

  const project = await db.project.findUnique({
    where: { id: application.projectId },
    select: { title: true, company: { select: { userId: true } } },
  });
  if (project) {
    await notify(
      project.company.userId,
      mode === "LIVE_SESSION"
        ? `Attendance confirmed: ${entry.roundName}`
        : `Round response: ${entry.roundName}`,
      `${who} responded to "${entry.roundName}" on ${project.title}.`,
    );
  }

  return { success: true };
}
