"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ProjectStatus } from "@prisma/client";
import { recalculateRecommendationsForFreelancer } from "@/services/aiRecommendation";
import { revalidatePath } from "next/cache";
import {
  parseFreelancerMetadata,
  serializeFreelancerMetadata,
  getFreelancerBioText,
  getProjectMetadataDirect,
} from "@/lib/workflowHelpers";
import { issueProjectCertificates } from "@/actions/certificateActions";
import { requireProjectOwner, requireProjectParty } from "@/lib/authz";

/**
 * Whether the project's existing compensation workflow has reached a state that
 * allows completion. Reads only existing stored state — no new payment rules.
 */
export async function getProjectCompletionReadiness(projectId: string) {
  // SEC-016 — this was an exported server action with no auth at all, leaking
  // payment state ("3 payment stage(s) awaiting release") for any project id.
  const party = await requireProjectParty(projectId);
  if (!party.ok) return { ready: false, reason: party.error };

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { description: true, status: true },
  });
  const hiredApps = await db.application.findMany({
    where: { projectId, status: "HIRED" },
    select: { id: true },
  });
  const hiredIds = hiredApps.map((x) => x.id);
  if (!project) return { ready: false, reason: "Project not found." };
  if (project.status === ProjectStatus.COMPLETED) {
    return { ready: false, completed: true, reason: "This project is already completed." };
  }

  const meta = getProjectMetadataDirect(project.description);
  const type = meta.compensationType || "MILESTONE";

  if (type === "UNPAID") return { ready: true };

  if (type === "FIXED" || type === "MILESTONE") {
    const stages = meta.paymentStages ?? [];
    if (stages.length === 0) return { ready: true };
    const open = stages.filter((s) => s.status !== "RELEASED").length;
    return open === 0
      ? { ready: true }
      : { ready: false, reason: `${open} payment stage(s) are still awaiting release.` };
  }

  if (type === "HOURLY") {
    const logs = meta.hourlyLogs ?? [];
    const pays = meta.hourlyPayments ?? [];
    const rate = meta.paymentRate ?? 0;
    const pending = logs.filter((l) => l.status === "PENDING").length;
    if (pending > 0) return { ready: false, reason: `${pending} work log(s) are still pending review.` };
    // Every hired freelancer must be settled, not just the selected one.
    const unpaid = hiredIds.filter((id) => {
      const approved =
        logs.filter((l) => l.applicationId === id && l.status === "APPROVED").reduce((t, l) => t + (l.hours || 0), 0) * rate;
      const paid = pays.filter((p) => p.applicationId === id).reduce((t, p) => t + (p.amount || 0), 0);
      return approved - paid > 0;
    }).length;
    return unpaid === 0
      ? { ready: true }
      : { ready: false, reason: `${unpaid} freelancer(s) have unpaid approved hours.` };
  }

  if (type === "STIPEND") {
    const paidApps = new Set((meta.stipendPayments ?? []).map((p) => p.applicationId));
    const unpaid = hiredIds.filter((id) => !paidApps.has(id)).length;
    if (hiredIds.length === 0) return { ready: true };
    return unpaid === 0
      ? { ready: true }
      : { ready: false, reason: `${unpaid} freelancer(s) have no stipend released yet.` };
  }

  return { ready: true };
}

// COMPLETE PROJECT (company-only)

export async function completeProject(projectId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) throw new Error("Unauthorized");
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { company: true, applications: { where: { status: "HIRED" }, include: { freelancer: { include: { user: true } } } } },
  });
  if (!project) throw new Error("Project not found.");
  if (project.company.userId !== session.user.id) throw new Error("Not your project.");
  if (project.status === ProjectStatus.COMPLETED) return { success: true, alreadyDone: true };
  // Project-level gate: one completion state for the whole project.
  const readiness = await getProjectCompletionReadiness(projectId);
  if (!readiness.ready) throw new Error(readiness.reason || "Project cannot be completed yet.");
  await db.project.update({ where: { id: projectId }, data: { status: ProjectStatus.COMPLETED } });
  await Promise.all([
    ...project.applications.map((app) =>
      db.notification.create({ data: { userId: app.freelancer.userId, title: "Project Completed!", message: `"${project.title}" has been marked complete. Please leave a review for ${project.company.companyName}.` } })
    ),
    db.notification.create({ data: { userId: session.user.id, title: "Project Marked Complete", message: `"${project.title}" is complete. Review your freelancers to seal the contract.` } }),
  ]);
  // Certificates are issued here, never at project creation. If the company
  // enabled certificates but never designed one, nudge them instead.
  const { issued, needsDesign } = await issueProjectCertificates(projectId);
  if (needsDesign) {
    await db.notification.create({
      data: {
        userId: session.user.id,
        title: "Design your certificate",
        message: `"${project.title}" is complete but its certificate has not been designed yet. Design it so your freelancers receive it.`,
      },
    });
  }

  revalidatePath("/workspace");
  revalidatePath("/company/projects");
  revalidatePath("/freelancer/applications");
  revalidatePath("/freelancer/certificates");
  return { success: true, certificatesIssued: issued, certificateNeedsDesign: needsDesign };
}

// GET REVIEW STATUS
export async function getProjectReviewStatus(projectId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const [project, reviews] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      include: { company: true, applications: { where: { status: "HIRED" }, include: { freelancer: { include: { user: { select: { id: true, name: true, image: true } } } } } } },
    }),
    db.review.findMany({ where: { projectId } }),
  ]);
  if (!project) throw new Error("Project not found.");
  const hiredIds = project.applications.map((a) => a.freelancer.userId);
  const reviewedByCompany = reviews.filter((r) => r.reviewerId === project.company.userId).map((r) => r.revieweeId);
  const reviewedByFreelancer: Record<string, boolean> = {};
  hiredIds.forEach((id) => { reviewedByFreelancer[id] = reviews.some((r) => r.reviewerId === id && r.revieweeId === project.company.userId); });
  const allReviewsDone = hiredIds.length > 0 && hiredIds.every((id) => reviewedByCompany.includes(id)) && hiredIds.every((id) => reviewedByFreelancer[id]);
  return {
    projectStatus: project.status,
    companyUserId: project.company.userId,
    companyId: project.company.id,
    hiredFreelancers: project.applications.map((a) => ({ userId: a.freelancer.userId, name: a.freelancer.user.name, image: a.freelancer.user.image, freelancerId: a.freelancer.id })),
    reviewedByCompany,
    reviewedByFreelancer,
    allReviewsDone,
    currentUserReviewedCompany: reviewedByFreelancer[session.user.id] ?? false,
  };
}

// COMPANY -> FREELANCER
/**
 * SEC-013 — rating bounds. The column is a bare Int, so a value of 1000 or -50
 * was accepted and skewed every aggregate computed from it.
 */
function assertValidRating(rating: number, label = "Rating") {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`${label} must be a whole number between 1 and 5.`);
  }
}

/**
 * SEC-013 — neither review action verified any relationship to the project.
 * Any company could rate any freelancer, and any freelancer any company, with
 * an unbounded rating; both then recomputed platform-wide reputation
 * aggregates. Reputation was effectively attacker-controlled.
 *
 * Reviews now require a real, finished engagement: the caller must own/have
 * worked the project, the counterparty must have been HIRED on it, and the
 * project must be COMPLETED.
 */
export async function submitReview(projectId: string, revieweeUserId: string, rating: number, comment: string) {
  const owned = await requireProjectOwner(projectId);
  if (!owned.ok) throw new Error(owned.error);
  const project = owned.data.project;
  const session = { user: { id: owned.data.userId, name: owned.data.company.companyName } };

  assertValidRating(rating);

  if (project.status !== ProjectStatus.COMPLETED) {
    throw new Error("You can only review freelancers once the project is complete.");
  }

  // The reviewee must actually have been hired on this project.
  const engagement = await db.application.findFirst({
    where: { projectId, status: "HIRED", freelancer: { userId: revieweeUserId } },
    select: { id: true },
  });
  if (!engagement) {
    throw new Error("That freelancer was not hired on this project.");
  }

  const existing = await db.review.findFirst({ where: { projectId, reviewerId: session.user.id, revieweeId: revieweeUserId } });
  if (existing) return { success: true, review: existing, duplicate: true };
  const review = await db.review.create({ data: { projectId, reviewerId: session.user.id, revieweeId: revieweeUserId, rating, comment } });
  const freelancer = await db.freelancer.findUnique({ where: { userId: revieweeUserId } });
  if (freelancer) {
    // Apprentice work is scored separately: reviews earned while shadowing a role
    // must not move the freelancer's primary rating. Derived from the existing
    // Application.isApprentice flag, so no schema change and no new score store.
    const apprenticeApps = await db.application.findMany({
      where: { freelancerId: freelancer.id, isApprentice: true },
      select: { projectId: true },
    });
    const apprenticeProjectIds = new Set(apprenticeApps.map((a) => a.projectId));

    const allReviews = await db.review.findMany({ where: { revieweeId: revieweeUserId }, select: { rating: true, projectId: true } });
    const primaryReviews = allReviews.filter((r) => !apprenticeProjectIds.has(r.projectId));

    // With no apprentice history this is every review — identical to before.
    const isApprenticeWork = apprenticeProjectIds.has(projectId);

    // Persist the apprentice aggregate so other surfaces can reuse it without
    // recomputing. Written only when apprentice work exists, so freelancers with
    // no apprentice history keep an untouched bio and unchanged behaviour.
    if (apprenticeProjectIds.size > 0) {
      const apprenticeReviews = allReviews.filter((r) => apprenticeProjectIds.has(r.projectId));
      const fmeta = parseFreelancerMetadata(freelancer.bio);
      fmeta.apprenticeScore = {
        rating: apprenticeReviews.length
          ? Math.round((apprenticeReviews.reduce((s, r) => s + r.rating, 0) / apprenticeReviews.length) * 10) / 10
          : 0,
        reviews: apprenticeReviews.length,
        updatedAt: new Date().toISOString(),
      };
      await db.freelancer.update({
        where: { id: freelancer.id },
        data: { bio: serializeFreelancerMetadata(getFreelancerBioText(freelancer.bio), fmeta) },
      });
    }
    const updated = primaryReviews.length > 0
      ? await db.freelancer.update({
          where: { id: freelancer.id },
          data: {
            rating: Math.round((primaryReviews.reduce((s, r) => s + r.rating, 0) / primaryReviews.length) * 10) / 10,
            // Apprentice contributions do not count as completed primary gigs.
            completedProjects: isApprenticeWork ? freelancer.completedProjects : freelancer.completedProjects + 1,
          },
        })
      : freelancer;
    await recalculateRecommendationsForFreelancer(updated.id);
  }
  await db.notification.create({ data: { userId: revieweeUserId, title: "New Review Received", message: `${session.user.name} reviewed your work on "${project.title}". Rating: ${rating}/5.` } });
  revalidatePath("/company/reviews"); revalidatePath("/freelancer/reviews"); revalidatePath("/freelancer/dashboard"); revalidatePath("/company/dashboard");
  return { success: true, review };
}

// FREELANCER -> COMPANY
export async function submitCompanyReview(projectId: string, companyId: string, rating: number, comment: string, communicationScore: number, paymentReliabilityScore: number, projectClarityScore: number) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) throw new Error("Unauthorized: Only freelancers can review companies.");

  // SEC-013: bound every score before it reaches an aggregate.
  assertValidRating(rating);
  assertValidRating(communicationScore, "Communication score");
  assertValidRating(paymentReliabilityScore, "Payment reliability score");
  assertValidRating(projectClarityScore, "Project clarity score");

  const freelancer = await db.freelancer.findUnique({ where: { userId: session.user.id } });
  if (!freelancer) throw new Error("Freelancer profile not found.");
  const company = await db.company.findUnique({ where: { id: companyId }, include: { user: true } });
  if (!company) throw new Error("Company not found");
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  // SEC-013: the reviewer must have actually worked this project, and the
  // project must belong to the company being reviewed.
  if (project.companyId !== companyId) {
    throw new Error("That project does not belong to this company.");
  }
  if (project.status !== ProjectStatus.COMPLETED) {
    throw new Error("You can only review a company once the project is complete.");
  }
  const engagement = await db.application.findFirst({
    where: { projectId, status: "HIRED", freelancerId: freelancer.id },
    select: { id: true },
  });
  if (!engagement) {
    throw new Error("You were not hired on this project.");
  }

  const existing = await db.review.findFirst({ where: { projectId, reviewerId: session.user.id, revieweeId: company.userId } });
  if (existing) return { success: true, review: existing, duplicate: true };
  const review = await db.review.create({ data: { projectId, reviewerId: session.user.id, revieweeId: company.userId, rating, comment, communicationScore, paymentReliabilityScore, projectClarityScore } });
  const companyReviews = await db.review.findMany({ where: { revieweeId: company.userId } });
  const total = companyReviews.length;
  const avgRating = companyReviews.reduce((s, r) => s + r.rating, 0) / total;
  const avgComm = companyReviews.reduce((s, r) => s + (r.communicationScore ?? rating), 0) / total;
  const avgPayment = companyReviews.reduce((s, r) => s + (r.paymentReliabilityScore ?? rating), 0) / total;
  const avgClarity = companyReviews.reduce((s, r) => s + (r.projectClarityScore ?? rating), 0) / total;
  await db.company.update({ where: { id: companyId }, data: { trustScore: Math.min(100, Math.round(((avgComm + avgPayment + avgClarity) / 15) * 100)), reputationScore: Math.min(100, Math.round((avgRating / 5) * 100)), paymentReliability: Math.min(100, Math.round((avgPayment / 5) * 100)) } });
  await db.notification.create({ data: { userId: company.userId, title: "New Company Review", message: `A freelancer reviewed your company for "${project.title}". Rating: ${rating}/5.` } });
  revalidatePath("/freelancer/reviews");
  revalidatePath(`/companies/${companyId}`);
  return { success: true, review };
}
