"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ApplicationStatus, ProjectStatus, Prisma } from "@prisma/client";
import { computeRecommendationScore } from "@/services/aiRecommendation";
import { revalidatePath } from "next/cache";
import {
  serializeApplicationMetadata,
  ApplicationWorkflowData,
  parseFreelancerMetadata,
  serializeFreelancerMetadata,
  getFreelancerBioText,
  getProjectMetadataDirect,
} from "@/lib/workflowHelpers";
import { requireApplicationOwner } from "@/lib/authz";
import {
  getCapacity,
  lockApplicationsForCapacity,
  assertApplicationTransition,
  assertProjectMutable,
} from "@/lib/lifecycle";
import { inFinancialTransaction } from "@/lib/payments";
import { approvedHourlyValue } from "@/lib/paymentRules";

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

  // LIFE-004 — a terminal project takes no applications.
  if (project.status !== "OPEN" && project.status !== "IN_PROGRESS") {
    return { success: false, error: "This project is no longer accepting applications." };
  }

  /**
   * LIFE-005 — visibility was never enforced. `visibility` supports
   * PUBLIC / PRIVATE / INVITE_ONLY and `isVisible` exists on the row, but a
   * freelancer could apply to a private or invite-only listing by id.
   */
  const projectMeta = getProjectMetadataDirect(project.description);
  if (!project.isVisible || projectMeta.visibility === "PRIVATE") {
    return { success: false, error: "This project is not open to applications." };
  }
  if (projectMeta.visibility === "INVITE_ONLY") {
    const invites = parseFreelancerMetadata(freelancer.bio).projectInvites ?? [];
    const invited = invites.some((inv) => inv.projectId === projectId);
    if (!invited) {
      return { success: false, error: "This project is invite-only." };
    }
  }

  /**
   * LIFE-006 — roleId arrived from the client and was written straight through,
   * so a freelancer could attach a ProjectRole belonging to a *different*
   * project, corrupting that role's capacity counts and team roster.
   */
  if (roleId) {
    const role = await db.projectRole.findFirst({
      where: { id: roleId, projectId },
      select: { id: true, allowApprentice: true },
    });
    if (!role) {
      return { success: false, error: "That role does not belong to this project." };
    }
    if (isApprentice && !role.allowApprentice) {
      return { success: false, error: "This role does not accept apprentices." };
    }
  }

  /**
   * LIFE-007 — questions flagged `required` were never enforced server-side;
   * screeningAnswers was accepted as an unvalidated map and stored as-is.
   */
  const requiredQuestions = (projectMeta.rounds ?? [])
    .filter((r) => r.type === "SCREENING_QUESTIONS")
    .flatMap((r) => r.questions ?? [])
    .filter((q) => q.required);
  const missing = requiredQuestions.filter((q) => !screeningAnswers?.[q.id]?.trim());
  if (missing.length > 0) {
    return {
      success: false,
      error: `Please answer the required question: "${missing[0].question}"`,
    };
  }

  // MF-004 / MF-005 — the same authoritative capacity calculation the hire
  // path uses, so the two can no longer disagree about what "full" means.
  const capacity = await getCapacity(db, projectId, roleId);
  if (capacity.projectFull && !isApprentice) {
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

  /**
   * LIFE-002 / LIFE-003 / MF-004 / MF-005 — the authoritative hire transition.
   *
   * This is now the only path that produces HIRED. It runs inside a transaction
   * with the project's application rows locked, so two concurrent hires into the
   * last slot cannot both see room, and it enforces BOTH the project-wide limit
   * and the role limit. Previously only role capacity was checked, so a project
   * with no roles had no limit at all and could hire 50 people into one slot.
   */
  const guard = await inFinancialTransaction(async (tx) => {
    await lockApplicationsForCapacity(tx, projectId);

    const current = await tx.application.findUnique({
      where: { id: applicationId },
      select: { status: true },
    });
    if (!current) return { ok: false as const, error: "Application not found" };

    const move = assertApplicationTransition(current.status, ApplicationStatus.HIRED);
    if (!move.ok) return { ok: false as const, error: move.error };

    const projectState = await tx.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    const live = assertProjectMutable(projectState!.status, "hire on");
    if (!live.ok) return { ok: false as const, error: live.error };

    const capacity = await getCapacity(tx, projectId, application.roleId);
    if (!application.isApprentice) {
      if (capacity.roleFull) {
        return {
          ok: false as const,
          error: "All " + capacity.roleSlots + " slot(s) for this role are already filled. Release a slot before hiring another.",
        };
      }
      if (capacity.projectFull) {
        return {
          ok: false as const,
          error: "This project already has its full complement of " + capacity.projectLimit + " freelancer(s).",
        };
      }
    }

    await tx.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.HIRED },
    });
    return { ok: true as const };
  });

  if (!guard.ok) throw new Error(guard.error);

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

  // 2. MF-004 — the same capacity calculation the apply path uses. Previously
  // this counted apprentices too, so a project with one apprentice flipped to
  // IN_PROGRESS with a primary slot still open.
  const capacityAfter = await getCapacity(db, projectId);
  const isFilled = capacityAfter.projectFull;

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

  /**
   * MF-006 — removal used to flip the application to REJECTED with no
   * reconciliation. Payment items keyed to that applicationId became invisible
   * to a readiness check that filters on currently-HIRED applications, so the
   * project could complete with money unaccounted for.
   *
   * The ledger is queryable by applicationId regardless of application status,
   * so outstanding value is now detectable — and removal is refused until it is
   * settled rather than silently stranding it.
   */
  const [openItems, unpaidHours] = await Promise.all([
    db.paymentItem.findMany({
      where: { applicationId, status: { notIn: ["RELEASED", "CANCELLED"] } },
      select: { title: true, fundedAmount: true, releasedAmount: true, currency: true },
    }),
    db.workLog.findMany({
      where: { applicationId, status: "APPROVED" },
      select: { hours: true, rateSnapshot: true, status: true },
    }),
  ]);

  const committed = openItems.filter((i) => i.fundedAmount.greaterThan(i.releasedAmount));
  if (committed.length > 0) {
    const total = committed.reduce(
      (sum, i) => sum.plus(i.fundedAmount.minus(i.releasedAmount)),
      new Prisma.Decimal(0)
    );
    throw new Error(
      `This freelancer still has ${committed[0].currency} ${total.toFixed(2)} committed across ${committed.length} payment stage(s). Release or cancel those before removing them.`
    );
  }

  if (unpaidHours.length > 0) {
    const paidEntries = await db.paymentTransaction.findMany({
      where: { applicationId, type: "RELEASE", paymentItemId: null },
      select: { amount: true },
    });
    const approved = approvedHourlyValue(
      unpaidHours.map((l) => ({
        hours: new Prisma.Decimal(l.hours),
        rateSnapshot: new Prisma.Decimal(l.rateSnapshot),
        status: l.status,
      }))
    );
    const paid = paidEntries.reduce(
      (t, p) => t.plus(new Prisma.Decimal(p.amount).abs()),
      new Prisma.Decimal(0)
    );
    if (approved.greaterThan(paid)) {
      throw new Error(
        `This freelancer has ${approved.minus(paid).toFixed(2)} of approved but unpaid hours. Settle them before removing them.`
      );
    }
  }

  // 1. Revert application status to REJECTED so they are no longer marked as hired
  const move = assertApplicationTransition(application.status, ApplicationStatus.REJECTED);
  if (!move.ok) throw new Error(move.error);

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
