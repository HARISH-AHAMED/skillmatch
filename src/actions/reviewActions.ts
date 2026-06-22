"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ProjectStatus } from "@prisma/client";
import { recalculateRecommendationsForFreelancer } from "@/services/aiRecommendation";
import { revalidatePath } from "next/cache";

export async function submitReview(
  projectId: string,
  revieweeUserId: string,
  rating: number,
  comment: string
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized: Only companies can submit project reviews.");
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Create review
  const review = await db.review.create({
    data: {
      projectId,
      reviewerId: session.user.id,
      revieweeId: revieweeUserId,
      rating,
      comment,
    },
  });

  // Mark project as COMPLETED if it is currently IN_PROGRESS
  if (project.status === ProjectStatus.IN_PROGRESS) {
    await db.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.COMPLETED },
    });
  }

  // Update Freelancer statistics
  const freelancer = await db.freelancer.findUnique({
    where: { userId: revieweeUserId },
  });

  if (freelancer) {
    // Fetch all reviews for this freelancer to get the correct average rating
    const allReviews = await db.review.findMany({
      where: { revieweeId: revieweeUserId },
      select: { rating: true },
    });

    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / allReviews.length;

    // Increment completed projects and update average rating
    const updatedFreelancer = await db.freelancer.update({
      where: { id: freelancer.id },
      data: {
        rating: Math.round(averageRating * 10) / 10,
        completedProjects: freelancer.completedProjects + 1,
        // Optional completion rate adjustments
      },
    });

    // Recalculate AI Recommendation scores based on the new profile statistics
    await recalculateRecommendationsForFreelancer(updatedFreelancer.id);
  }

  // Notify freelancer
  await db.notification.create({
    data: {
      userId: revieweeUserId,
      title: "New Review Received",
      message: `${session.user.name} reviewed you for '${project.title}'. Rating: ${rating}/5.`,
    },
  });

  revalidatePath("/company/reviews");
  revalidatePath("/freelancer/reviews");
  revalidatePath("/freelancer/dashboard");
  revalidatePath("/company/dashboard");

  return { success: true, review };
}

export async function submitCompanyReview(
  projectId: string,
  companyId: string,
  rating: number,
  comment: string,
  communicationScore: number,
  paymentReliabilityScore: number,
  projectClarityScore: number
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    throw new Error("Unauthorized: Only freelancers can review companies.");
  }

  const freelancer = await db.freelancer.findUnique({
    where: { userId: session.user.id },
  });

  if (!freelancer) {
    throw new Error("Freelancer profile not found.");
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    include: { user: true },
  });

  if (!company) {
    throw new Error("Company not found");
  }

  // Create review
  const review = await db.review.create({
    data: {
      projectId,
      reviewerId: session.user.id,
      revieweeId: company.userId,
      rating,
      comment,
      communicationScore,
      paymentReliabilityScore,
      projectClarityScore,
    },
  });

  // Calculate new average metrics for this company
  const companyReviews = await db.review.findMany({
    where: {
      revieweeId: company.userId,
    },
  });

  const totalRating = companyReviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = totalRating / companyReviews.length;

  const totalComm = companyReviews.reduce((sum, r) => sum + (r.communicationScore || rating), 0);
  const avgComm = totalComm / companyReviews.length;

  const totalPayment = companyReviews.reduce((sum, r) => sum + (r.paymentReliabilityScore || rating), 0);
  const avgPayment = totalPayment / companyReviews.length;

  const totalClarity = companyReviews.reduce((sum, r) => sum + (r.projectClarityScore || rating), 0);
  const avgClarity = totalClarity / companyReviews.length;

  const trustScore = Math.min(100, Math.round(((avgComm + avgPayment + avgClarity) / 15) * 100));
  const reputationScore = Math.min(100, Math.round((avgRating / 5) * 100));

  await db.company.update({
    where: { id: companyId },
    data: {
      trustScore,
      reputationScore,
      paymentReliability: Math.min(100, Math.round((avgPayment / 5) * 100)),
    },
  });

  // Notify company
  await db.notification.create({
    data: {
      userId: company.userId,
      title: "New Review Received",
      message: `A freelancer reviewed your company for project feedback. Rating: ${rating}/5.`,
    },
  });

  revalidatePath("/freelancer/reviews");
  revalidatePath("/freelancer/completed-projects");
  revalidatePath(`/companies/${companyId}`);

  return { success: true, review };
}
