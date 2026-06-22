"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ApplicationStatus, ProjectStatus } from "@prisma/client";
import { computeRecommendationScore } from "@/services/aiRecommendation";
import { revalidatePath } from "next/cache";

export async function applyToProject(projectId: string, coverLetter: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    throw new Error("Unauthorized: Only freelancers can apply to projects.");
  }

  const freelancer = await db.freelancer.findUnique({
    where: { userId: session.user.id },
  });

  if (!freelancer) {
    throw new Error("Please complete your freelancer profile before applying.");
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

  if (!project || project.status !== "OPEN") {
    throw new Error("This project is no longer accepting applications.");
  }

  // Calculate matching score
  const aiScore = computeRecommendationScore(freelancer, project);

  const application = await db.application.create({
    data: {
      projectId,
      freelancerId: freelancer.id,
      coverLetter,
      aiScore,
      status: ApplicationStatus.PENDING,
    },
  });

  // Notify the company user
  await db.notification.create({
    data: {
      userId: project.company.user.id,
      title: "New Application Received",
      message: `${session.user.name} applied to '${project.title}'. AI Match Score: ${aiScore}%.`,
    },
  });

  revalidatePath("/freelancer/applications");
  revalidatePath("/freelancer/projects");
  revalidatePath("/company/applicants");
  revalidatePath("/company/dashboard");

  return { success: true, application };
}

export async function shortlistApplicant(applicationId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const application = await db.application.findUnique({
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

  if (!application) {
    throw new Error("Application not found");
  }

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
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const application = await db.application.findUnique({
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

  if (!application) {
    throw new Error("Application not found");
  }

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
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const application = await db.application.findUnique({
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

  if (!application) {
    throw new Error("Application not found");
  }

  const projectId = application.projectId;

  // 1. Mark this application as HIRED
  await db.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.HIRED },
  });

  // 2. Count the number of currently hired freelancers for this project
  const hiredCount = await db.application.count({
    where: {
      projectId,
      status: ApplicationStatus.HIRED,
    },
  });

  const freelancersLimit = application.project.freelancersLimit;
  const isFilled = hiredCount >= freelancersLimit;

  if (isFilled) {
    // Update project status to IN_PROGRESS and reject other candidates
    await db.$transaction([
      db.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.IN_PROGRESS },
      }),
      db.application.updateMany({
        where: {
          projectId,
          status: { notIn: [ApplicationStatus.HIRED, ApplicationStatus.REJECTED] },
        },
        data: { status: ApplicationStatus.REJECTED },
      }),
    ]);

    // Send notifications to rejected applicants
    const rejectedApps = await db.application.findMany({
      where: {
        projectId,
        status: ApplicationStatus.REJECTED,
      },
      include: {
        freelancer: {
          include: {
            user: { select: { id: true } },
          },
        },
      },
    });

    for (const app of rejectedApps) {
      await db.notification.create({
        data: {
          userId: app.freelancer.user.id,
          title: "Project Filled",
          message: `The project '${application.project.title}' has been filled by other candidates.`,
        },
      });
    }
  }

  // 3. Notify newly hired freelancer
  await db.notification.create({
    data: {
      userId: application.freelancer.user.id,
      title: "Hired!",
      message: `Congratulations! You have been hired for the project '${application.project.title}'.`,
    },
  });

  revalidatePath("/company/applicants");
  revalidatePath("/company/dashboard");
  revalidatePath("/company/projects");
  revalidatePath("/freelancer/applications");
  revalidatePath("/freelancer/dashboard");

  return { success: true };
}
