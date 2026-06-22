"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ProjectPriority, ProjectStatus, ApplicationStatus } from "@prisma/client";
import { recalculateRecommendationsForProject } from "@/services/aiRecommendation";
import { revalidatePath } from "next/cache";

export async function createProject(formData: {
  title: string;
  description: string;
  budget: number;
  priority: ProjectPriority;
  requiredSkills: string[];
  experienceRequired: number;
  freelancersLimit?: number;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  // Get company ID
  const company = await db.company.findUnique({
    where: { userId: session.user.id },
  });

  if (!company) {
    throw new Error("Please complete your company profile before posting a project.");
  }

  const skillsCleaned = formData.requiredSkills.map(s => s.toLowerCase().trim()).filter(Boolean);

  const project = await db.project.create({
    data: {
      companyId: company.id,
      title: formData.title,
      description: formData.description,
      budget: formData.budget,
      priority: formData.priority,
      requiredSkills: skillsCleaned,
      experienceRequired: formData.experienceRequired,
      status: ProjectStatus.OPEN,
      freelancersLimit: formData.freelancersLimit ?? 1,
    },
  });

  // Calculate AI Recommendations for this new project
  await recalculateRecommendationsForProject(project.id);

  // Send notifications to highly matched freelancers (skills match count > 0)
  const freelancers = await db.freelancer.findMany({
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  for (const f of freelancers) {
    const matched = f.skills.some(skill => skillsCleaned.includes(skill));
    if (matched) {
      await db.notification.create({
        data: {
          userId: f.user.id,
          title: "New Match Found",
          message: `A new project '${project.title}' matching your skills was posted by ${company.companyName}.`,
        },
      });
    }
  }

  revalidatePath("/company/dashboard");
  revalidatePath("/company/projects");
  revalidatePath("/freelancer/projects");
  revalidatePath("/freelancer/dashboard");

  return { success: true, project };
}

export async function editProject(
  projectId: string,
  formData: {
    title: string;
    description: string;
    budget: number;
    priority: ProjectPriority;
    requiredSkills: string[];
    experienceRequired: number;
    freelancersLimit?: number;
  }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const company = await db.company.findUnique({
    where: { userId: session.user.id },
  });

  const existingProject = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!existingProject || !company || existingProject.companyId !== company.id) {
    throw new Error("Unauthorized project edit");
  }

  const skillsCleaned = formData.requiredSkills.map(s => s.toLowerCase().trim()).filter(Boolean);

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      title: formData.title,
      description: formData.description,
      budget: formData.budget,
      priority: formData.priority,
      requiredSkills: skillsCleaned,
      experienceRequired: formData.experienceRequired,
      freelancersLimit: formData.freelancersLimit ?? 1,
    },
  });

  // Recalculate match recommendations
  await recalculateRecommendationsForProject(project.id);

  revalidatePath(`/company/projects`);
  revalidatePath("/freelancer/projects");

  return { success: true, project };
}

export async function closeProject(projectId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const company = await db.company.findUnique({
    where: { userId: session.user.id },
  });

  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project || !company || project.companyId !== company.id) {
    throw new Error("Unauthorized");
  }

  await db.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.CLOSED },
  });

  revalidatePath("/company/projects");
  return { success: true };
}
