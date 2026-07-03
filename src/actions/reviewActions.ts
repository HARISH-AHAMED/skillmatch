"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ProjectStatus } from "@prisma/client";
import { recalculateRecommendationsForFreelancer } from "@/services/aiRecommendation";
import { revalidatePath } from "next/cache";

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
  await db.project.update({ where: { id: projectId }, data: { status: ProjectStatus.COMPLETED } });
  await Promise.all([
    ...project.applications.map((app) =>
      db.notification.create({ data: { userId: app.freelancer.userId, title: "Project Completed!", message: `"${project.title}" has been marked complete. Please leave a review for ${project.company.companyName}.` } })
    ),
    db.notification.create({ data: { userId: session.user.id, title: "Project Marked Complete", message: `"${project.title}" is complete. Review your freelancers to seal the contract.` } }),
  ]);
  revalidatePath("/workspace");
  revalidatePath("/company/projects");
  revalidatePath("/freelancer/applications");
  return { success: true };
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
export async function submitReview(projectId: string, revieweeUserId: string, rating: number, comment: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) throw new Error("Unauthorized: Only companies can submit freelancer reviews.");
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");
  const existing = await db.review.findFirst({ where: { projectId, reviewerId: session.user.id, revieweeId: revieweeUserId } });
  if (existing) return { success: true, review: existing, duplicate: true };
  const review = await db.review.create({ data: { projectId, reviewerId: session.user.id, revieweeId: revieweeUserId, rating, comment } });
  const freelancer = await db.freelancer.findUnique({ where: { userId: revieweeUserId } });
  if (freelancer) {
    const allReviews = await db.review.findMany({ where: { revieweeId: revieweeUserId }, select: { rating: true } });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    const updated = await db.freelancer.update({ where: { id: freelancer.id }, data: { rating: Math.round(avg * 10) / 10, completedProjects: freelancer.completedProjects + 1 } });
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
  const freelancer = await db.freelancer.findUnique({ where: { userId: session.user.id } });
  if (!freelancer) throw new Error("Freelancer profile not found.");
  const company = await db.company.findUnique({ where: { id: companyId }, include: { user: true } });
  if (!company) throw new Error("Company not found");
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");
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
