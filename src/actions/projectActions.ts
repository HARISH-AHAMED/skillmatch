"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role, ProjectPriority, ProjectStatus, ApplicationStatus } from "@prisma/client";
import { recalculateRecommendationsForProject } from "@/services/aiRecommendation";
import { revalidatePath } from "next/cache";
import { assertProjectTransition, assertProjectMutable } from "@/lib/lifecycle";
import { deriveFromMetadata } from "@/lib/compensation";

/**
 * COMP-016 — the canonical compensation for a project comes from the metadata
 * block serialised into its description. Projects and their ProjectCompensation
 * row are written together so no project can exist without one.
 */
function compensationData(description: string, budget: number) {
  const c = deriveFromMetadata(description, budget);
  return {
    type: c.type,
    currency: c.currency,
    totalBudget: c.totalBudget,
    budgetNegotiable: c.budgetNegotiable,
    hourlyRate: c.hourlyRate,
    estimatedHours: c.estimatedHours,
    stipendAmount: c.stipendAmount,
    stipendFrequency: c.stipendFrequency,
  };
}

export async function createProject(formData: {
  title: string;
  description: string;
  budget: number;
  priority: ProjectPriority;
  requiredSkills: string[];
  experienceRequired: number;
  freelancersLimit?: number;
  isVisible?: boolean;
  preferredGender?: string;
  domain?: string;
  bannerUrl?: string | null;
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

  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
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
        isVisible: formData.isVisible ?? true,
        preferredGender: formData.preferredGender ?? "ANY",
        domain: formData.domain ?? "Other",
        bannerUrl: formData.bannerUrl ?? null,
      },
    });

    // COMP-016 — atomic with the project itself.
    await tx.projectCompensation.create({
      data: { projectId: created.id, ...compensationData(formData.description, formData.budget) },
    });

    return created;
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
    isVisible?: boolean;
    preferredGender?: string;
    domain?: string;
    bannerUrl?: string | null;
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

  // LIFE-001 — a terminal project is read-only.
  const editable = assertProjectMutable(existingProject.status, "edit");
  if (!editable.ok) throw new Error(editable.error);

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
      isVisible: formData.isVisible ?? true,
      preferredGender: formData.preferredGender ?? "ANY",
      domain: formData.domain ?? "Other",
      bannerUrl: formData.bannerUrl ?? null,
    },
  });

  // COMP-016 — an edit can change the compensation metadata, so the canonical
  // row is kept in step with the description it is derived from.
  const comp = compensationData(formData.description, formData.budget);
  await db.projectCompensation.upsert({
    where: { projectId },
    create: { projectId, ...comp },
    update: comp,
  });

  // Recalculate match recommendations
  await recalculateRecommendationsForProject(project.id);

  revalidatePath(`/company/projects`);
  revalidatePath("/freelancer/projects");

  return { success: true, project };
}

export async function toggleProjectVisibility(projectId: string) {
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

  const visible = assertProjectMutable(project.status, "change the visibility of");
  if (!visible.ok) throw new Error(visible.error);

  const updatedProject = await db.project.update({
    where: { id: projectId },
    data: { isVisible: !project.isVisible },
  });

  revalidatePath("/company/projects");
  revalidatePath("/freelancer/projects");

  return { success: true, isVisible: updatedProject.isVisible };
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

  // LIFE-001 — CLOSED and COMPLETED are terminal; neither can be reopened or
  // re-closed.
  const move = assertProjectTransition(project.status, ProjectStatus.CLOSED);
  if (!move.ok) throw new Error(move.error);

  await db.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.CLOSED },
  });

  revalidatePath("/company/projects");
  return { success: true };
}

export async function updateProjectDueDate(projectId: string, dueDateString: string | null) {
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

  const datable = assertProjectMutable(project.status, "change the due date of");
  if (!datable.ok) throw new Error(datable.error);

  const updatedProject = await db.project.update({
    where: { id: projectId },
    data: {
      dueDate: dueDateString ? new Date(dueDateString) : null,
    },
  });

  revalidatePath("/company/projects");
  revalidatePath("/freelancer/projects");

  return { success: true, dueDate: updatedProject.dueDate };
}
