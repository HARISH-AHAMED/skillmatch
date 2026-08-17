"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ApplicationStatus, ProjectStatus } from "@prisma/client";
import { computeRecommendationScore } from "@/services/aiRecommendation";
import { revalidatePath } from "next/cache";
import {
  serializeApplicationMetadata,
  ApplicationWorkflowData,
  parseFreelancerMetadata,
  serializeFreelancerMetadata,
  getFreelancerBioText,
} from "@/lib/workflowHelpers";
import { requireApplicationOwner } from "@/lib/authz";

export async function applyToProject(
  projectId: string,
  coverLetter: string,
  screeningAnswers?: Record<string, string>,
  /** Role slot being applied for. Omitted on listings that do not use roles. */
  roleId?: string,
  /** Applying to shadow the role rather than fill it. */
  isApprentice?: boolean
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    return { success: false, error: "Unauthorized: Only freelancers can apply to projects." };
  }

  const freelancer = await db.freelancer.findUnique({
    where: { userId: session.user.id },
  });

  if (!freelancer) {
    return { success: false, error: "Please complete your freelancer profile before applying." };
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      company: {
        include: {
          user: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!project) {
    return { success: false, error: "Project not found." };
  }

  if (project.status !== "OPEN" && project.status !== "IN_PROGRESS") {
    return { success: false, error: "This project is no longer accepting applications." };
  }

  // Count the number of currently hired freelancers for this project
  const hiredCount = await db.application.count({
    where: {
      projectId,
      status: ApplicationStatus.HIRED,
      // Apprentices shadow a role rather than filling a slot, so they must not
      // consume project capacity. Non-role projects have no apprentices, so this
      // is a no-op for them.
      isApprentice: false,
    },
  });

  if (hiredCount >= project.freelancersLimit) {
    return { success: false, error: "This project has already reached its hiring limit." };
  }

  // Calculate matching score
  const aiScore = computeRecommendationScore(freelancer, project);

  const meta: ApplicationWorkflowData = {
    pipelineHistory: [
      {
        stage: "Applied",
        timestamp: new Date().toISOString(),
        notes: "Freelancer submitted proposal and answered screening questionnaire.",
        recruiterName: "System",
      }
    ],
    screeningAnswers: screeningAnswers || {},
  };
  const serializedCoverLetter = serializeApplicationMetadata(coverLetter, meta);

  /**
   * SEC-017 — there was no duplicate check here at all; a second application
   * raised an unhandled Prisma P2002 on the @@unique([projectId, freelancerId])
   * constraint, which surfaced to the user as a 500.
   *
   * Pre-checking alone would still race, so the constraint stays the real
   * guarantee and the violation is translated into a friendly message.
   */
  const alreadyApplied = await db.application.findUnique({
    where: { projectId_freelancerId: { projectId, freelancerId: freelancer.id } },
    select: { id: true },
  });
  if (alreadyApplied) {
    return { success: false, error: "You have already applied to this project." };
  }

  let application;
  try {
    application = await db.application.create({
      data: {
        projectId,
        freelancerId: freelancer.id,
        coverLetter: serializedCoverLetter,
        aiScore,
        status: ApplicationStatus.PENDING,
        ...(roleId ? { roleId } : {}),
        ...(isApprentice ? { isApprentice: true } : {}),
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return { success: false, error: "You have already applied to this project." };
    }
    throw err;
  }

  // Notify the company user
  await db.notification.create({
    data: {
      userId: project.company.user.id,
      title: "New Application Received",
      message: `${session.user.name} applied to '${project.title}'. AI Match Score: ${aiScore}%.`,
    },
  });

  // If this application came from a company invitation, close that invite out so
  // it stops showing as an outstanding action on the freelancer's dashboard.
  const inviteMeta = parseFreelancerMetadata(freelancer.bio);
  const openInvite = inviteMeta.projectInvites?.find(
    (inv) => inv.projectId === projectId && inv.status === "PENDING"
  );
  if (openInvite) {
    openInvite.status = "APPLIED";
    openInvite.respondedAt = new Date().toISOString();
    await db.freelancer.update({
      where: { id: freelancer.id },
      data: { bio: serializeFreelancerMetadata(getFreelancerBioText(freelancer.bio), inviteMeta) },
    });
  }

  revalidatePath("/freelancer/applications");
  revalidatePath("/freelancer/projects");
  revalidatePath("/freelancer/dashboard");
  revalidatePath("/company/applicants");
  revalidatePath("/company/dashboard");

  return { success: true, application };
}

/**
 * SEC-004 — shortlist/reject/hire/remove all verified the caller's *role* but
 * never that the caller owns the project the application belongs to. Any
 * COMPANY user holding an application id from another company could hire,
 * reject, or remove that company's freelancers.
 *
 * Each now goes through requireApplicationOwner(), which resolves the caller's
 * company and confirms `application.project.companyId` matches before anything
 * else happens. Guard failures still throw, preserving the existing caller
 * contract in ApplicantsList.tsx and ApplicantDetailView.tsx.
 */
async function ownedApplicationOrThrow(applicationId: string) {
  const owned = await requireApplicationOwner(applicationId);
  if (!owned.ok) throw new Error(owned.error);

  // Re-read with the relations these actions need for notifications.
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: true,
      freelancer: { include: { user: { select: { id: true } } } },
    },
  });
  if (!application) throw new Error("Application not found");
  return application;
}

export async function shortlistApplicant(applicationId: string) {
  const application = await ownedApplicationOrThrow(applicationId);

  await db.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.SHORTLISTED },
  });

  // Notify freelancer
  await db.notification.create({
    data: {
      userId: application.freelancer.user.id,
      title: "Application Shortlisted!",
      message: `Your application for '${application.project.title}' has been shortlisted.`,
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath("/freelancer/applications");

  return { success: true };
}

export async function rejectApplicant(applicationId: string) {
  const application = await ownedApplicationOrThrow(applicationId);

  await db.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.REJECTED },
  });

  // Notify freelancer
  await db.notification.create({
    data: {
      userId: application.freelancer.user.id,
      title: "Application Update",
      message: `Your application for '${application.project.title}' was rejected.`,
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath("/freelancer/applications");

  return { success: true };
}

export async function hireApplicant(applicationId: string) {
  const application = await ownedApplicationOrThrow(applicationId);

  const projectId = application.projectId;

  // Role-scoped capacity. Only applies when the listing actually uses roles —
  // projects without them keep the original project-wide limit behaviour.
  if (application.roleId && !application.isApprentice) {
    const role = await db.projectRole.findUnique({
      where: { id: application.roleId },
      include: {
        applications: { where: { status: ApplicationStatus.HIRED, isApprentice: false } },
      },
    });
    if (role && role.applications.length >= role.slots) {
      throw new Error(
        `All ${role.slots} slot(s) for "${role.name}" are already filled. Release a slot before hiring another.`
      );
    }
  }

  // 1. Mark this application as HIRED
  await db.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.HIRED },
  });

  // 1b. Team lock (role-based projects only). Once a role has its full quota of
  // primaries, candidates still in contention for that role can no longer be
  // selected, so close their applications rather than leaving them hanging.
  //
  // Deliberately narrow: scoped to this one role, leaves other roles alone,
  // never touches HIRED/REJECTED rows, and spares apprentice applicants while
  // the role still welcomes an apprentice. updateMany over the two open statuses
  // makes it safe to run repeatedly.
  if (application.roleId) {
    const lockedRole = await db.projectRole.findUnique({
      where: { id: application.roleId },
      select: {
        slots: true,
        allowApprentice: true,
        applications: {
          where: { status: ApplicationStatus.HIRED, isApprentice: false },
          select: { id: true },
        },
      },
    });

    if (lockedRole && lockedRole.applications.length >= lockedRole.slots) {
      await db.application.updateMany({
        where: {
          roleId: application.roleId,
          status: { in: [ApplicationStatus.PENDING, ApplicationStatus.SHORTLISTED] },
          // Apprentices remain in contention while the role accepts one.
          ...(lockedRole.allowApprentice ? { isApprentice: false } : {}),
        },
        data: { status: ApplicationStatus.REJECTED },
      });
    }
  }

  // 2. Count the number of currently hired freelancers for this project
  const hiredCount = await db.application.count({
    where: {
      projectId,
      status: ApplicationStatus.HIRED,
    },
  });

  const freelancersLimit = application.project.freelancersLimit;
  const isFilled = hiredCount >= freelancersLimit;

  if (isFilled && application.project.status === ProjectStatus.OPEN) {
    // Update project status to IN_PROGRESS when filled, but do not auto-reject others
    await db.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.IN_PROGRESS },
    });
  }

  // 3. Notify newly hired freelancer
  await db.notification.create({
    data: {
      userId: application.freelancer.user.id,
      title: application.roleId ? "Hired — confirm your team" : "Hired!",
      message: application.roleId
        ? "Congratulations! You have been hired onto \"" + application.project.title +
          "\". Open Track Applications to meet your teammates and confirm your place on the team."
        : "Congratulations! You have been hired for the project \"" + application.project.title + "\".",
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath("/company/dashboard");
  revalidatePath("/company/projects");
  revalidatePath("/freelancer/applications");
  revalidatePath("/freelancer/dashboard");

  return { success: true };
}

export async function removeFreelancer(applicationId: string) {
  const application = await ownedApplicationOrThrow(applicationId);

  const projectId = application.projectId;

  // 1. Revert application status to REJECTED so they are no longer marked as hired
  await db.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.REJECTED },
  });

  // 2. Count the number of currently hired freelancers for this project
  const hiredCount = await db.application.count({
    where: {
      projectId,
      status: ApplicationStatus.HIRED,
    },
  });

  // 3. Re-open project to OPEN if hiring count falls below limit and status is IN_PROGRESS
  if (hiredCount < application.project.freelancersLimit && application.project.status === ProjectStatus.IN_PROGRESS) {
    await db.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.OPEN },
    });
  }

  // 4. Notify freelancer
  await db.notification.create({
    data: {
      userId: application.freelancer.user.id,
      title: "Removed from Project",
      message: `You have been released/removed from the project '${application.project.title}'.`,
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath("/company/dashboard");
  revalidatePath("/company/projects");
  revalidatePath("/freelancer/applications");
  revalidatePath("/freelancer/dashboard");

  return { success: true };
}
