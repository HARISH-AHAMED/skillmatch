"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  getProjectMetadataDirect,
  getProjectDescriptionText,
  serializeProjectMetadata,
} from "@/lib/workflowHelpers";

export interface PaymentStageInput {
  id?: string;
  /** Application receiving this stage payment. Omit for legacy unassigned stages. */
  applicationId?: string;
  title: string;
  description?: string;
  amount: number;
}

type Stage = NonNullable<ReturnType<typeof getProjectMetadataDirect>["paymentStages"]>[number];

/** Loads the project after confirming the caller is the owning company. */
async function loadOwnedProject(projectId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    return { error: "Unauthorized" as const };
  }
  const company = await db.company.findUnique({ where: { userId: session.user.id } });
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || !company || project.companyId !== company.id) {
    return { error: "Unauthorized" as const };
  }
  return { project };
}

async function persist(projectId: string, description: string | null, stages: Stage[]) {
  const meta = getProjectMetadataDirect(description);
  await db.project.update({
    where: { id: projectId },
    data: {
      description: serializeProjectMetadata(getProjectDescriptionText(description), {
        ...meta,
        paymentStages: stages,
      }),
    },
  });
  revalidatePath(`/company/projects/${projectId}`);
}

/** Stages currently defined on a Fixed Price project. */
export async function getPaymentStages(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { description: true },
  });
  return getProjectMetadataDirect(project?.description).paymentStages ?? [];
}

/**
 * Adds or updates one stage. The combined value of all stages may never exceed
 * the project budget, and a stage can never shrink below what it has already
 * funded or released.
 */
export async function savePaymentStage(projectId: string, input: PaymentStageInput) {
  const owned = await loadOwnedProject(projectId);
  if ("error" in owned) return { success: false, error: owned.error };
  const { project } = owned;

  const amount = Number(input.amount);
  if (!input.title?.trim()) return { success: false, error: "Stage name is required." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Enter a stage amount greater than zero." };
  }

  // The stage must pay a freelancer actually hired on THIS project.
  let assignee: { applicationId?: string; freelancerName?: string } = {};
  if (input.applicationId) {
    const application = await db.application.findFirst({
      where: { id: input.applicationId, projectId, status: "HIRED" },
      select: { id: true, freelancer: { select: { user: { select: { name: true } } } } },
    });
    if (!application) {
      return { success: false, error: "That freelancer is not hired on this project." };
    }
    assignee = { applicationId: application.id, freelancerName: application.freelancer.user.name || "Freelancer" };
  }

  const meta = getProjectMetadataDirect(project.description);
  const stages: Stage[] = meta.paymentStages ?? [];
  const existing = input.id ? stages.find((s) => s.id === input.id) : undefined;

  if (existing) {
    const committed = Math.max(existing.funded ?? 0, existing.released ?? 0);
    // Reassigning a stage that already holds money would move one freelancer's
    // funds to another, so it is refused outright.
    if (committed > 0 && (assignee.applicationId ?? undefined) !== (existing.applicationId ?? undefined)) {
      return {
        success: false,
        error: "This stage already has money funded or released and cannot be reassigned to another freelancer.",
      };
    }
    if (amount < committed) {
      return {
        success: false,
        error: `This stage already has ${committed.toLocaleString()} funded or released. The amount cannot be lowered below that.`,
      };
    }
  }

  const othersTotal = stages
    .filter((s) => s.id !== input.id)
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  if (othersTotal + amount > project.budget) {
    return {
      success: false,
      error: `Payment stages would total ${(othersTotal + amount).toLocaleString()}, which exceeds the project budget of ${project.budget.toLocaleString()}.`,
    };
  }

  const next: Stage[] = existing
    ? stages.map((s) =>
        s.id === input.id
          ? { ...s, ...assignee, title: input.title.trim(), description: input.description ?? "", amount }
          : s
      )
    : [
        ...stages,
        {
          id: `stage-${Date.now()}`,
          ...assignee,
          title: input.title.trim(),
          description: input.description ?? "",
          amount,
          status: "PENDING" as const,
          funded: 0,
          released: 0,
        },
      ];

  await persist(projectId, project.description, next);
  return { success: true, stages: next };
}

/** Deletes a stage, unless money has already been funded or released against it. */
export async function deletePaymentStage(projectId: string, stageId: string) {
  const owned = await loadOwnedProject(projectId);
  if ("error" in owned) return { success: false, error: owned.error };
  const { project } = owned;

  const stages: Stage[] = getProjectMetadataDirect(project.description).paymentStages ?? [];
  const target = stages.find((s) => s.id === stageId);
  if (!target) return { success: false, error: "Stage not found." };

  const committed = Math.max(target.funded ?? 0, target.released ?? 0);
  if (committed > 0) {
    return {
      success: false,
      error: `This stage already has ${committed.toLocaleString()} funded or released and cannot be deleted. Release or reverse the funds first.`,
    };
  }

  const next = stages.filter((s) => s.id !== stageId);
  await persist(projectId, project.description, next);
  return { success: true, stages: next };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Lifecycle: PENDING → FUNDED → SUBMITTED → APPROVED → RELEASED
 * All transitions are validated server-side and persist through the same
 * project-metadata store the stages already use.
 * ──────────────────────────────────────────────────────────────────────────*/

/** Stage totals across the project, used for the available-budget guard. */
function totals(stages: Stage[]) {
  return stages.reduce(
    (acc, s) => ({
      funded: acc.funded + (s.funded ?? 0),
      released: acc.released + (s.released ?? 0),
    }),
    { funded: 0, released: 0 }
  );
}

/** Company funds a stage. Cannot exceed the stage amount or the project budget. */
export async function fundPaymentStage(projectId: string, stageId: string, amount: number) {
  const owned = await loadOwnedProject(projectId);
  if ("error" in owned) return { success: false, error: owned.error };
  const { project } = owned;

  const stages: Stage[] = getProjectMetadataDirect(project.description).paymentStages ?? [];
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) return { success: false, error: "Stage not found." };

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return { success: false, error: "Enter a funding amount greater than zero." };
  }
  // A released stage is closed; funding it again would break released <= funded.
  if (stage.status === "RELEASED") {
    return { success: false, error: "This stage has already been released and cannot be funded again." };
  }

  const alreadyFunded = stage.funded ?? 0;
  if (alreadyFunded + value > (stage.amount || 0)) {
    return {
      success: false,
      error: `Funding ${value.toLocaleString()} would exceed this stage's amount of ${(stage.amount || 0).toLocaleString()}.`,
    };
  }

  const projectFunded = totals(stages).funded;
  if (projectFunded + value > project.budget) {
    return {
      success: false,
      error: `Only ${(project.budget - projectFunded).toLocaleString()} of the project budget remains available to fund.`,
    };
  }

  const next = stages.map((s) =>
    s.id === stageId ? { ...s, funded: alreadyFunded + value, status: "FUNDED" as const } : s
  );
  await persist(projectId, project.description, next);
  return { success: true, stages: next };
}

/** Hired freelancer submits a funded stage for review. */
export async function submitPaymentStage(projectId: string, stageId: string, note?: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const application = await db.application.findFirst({
    where: { projectId, status: "HIRED", freelancer: { userId: session.user.id } },
    select: { id: true },
  });
  if (!application) return { success: false, error: "Only a hired freelancer can submit this stage." };

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return { success: false, error: "Project not found." };

  const stages: Stage[] = getProjectMetadataDirect(project.description).paymentStages ?? [];
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) return { success: false, error: "Stage not found." };
  if (stage.applicationId && stage.applicationId !== application.id) {
    return { success: false, error: "This payment stage belongs to another freelancer." };
  }
  if (stage.status !== "FUNDED") {
    return { success: false, error: "Only a funded stage can be submitted for review." };
  }

  const next = stages.map((s) =>
    s.id === stageId ? { ...s, status: "SUBMITTED" as const, submissionNote: note || "" } : s
  );
  await persist(projectId, project.description, next);
  return { success: true, stages: next };
}

/** Company approves a submitted stage, or sends it back for changes. */
export async function reviewPaymentStage(projectId: string, stageId: string, approve: boolean) {
  const owned = await loadOwnedProject(projectId);
  if ("error" in owned) return { success: false, error: owned.error };
  const { project } = owned;

  const stages: Stage[] = getProjectMetadataDirect(project.description).paymentStages ?? [];
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) return { success: false, error: "Stage not found." };
  if (stage.status !== "SUBMITTED") {
    return { success: false, error: "Only a submitted stage can be reviewed." };
  }

  // Requesting changes returns the stage to FUNDED so it can be resubmitted.
  const next = stages.map((s) =>
    s.id === stageId ? { ...s, status: (approve ? "APPROVED" : "FUNDED") as Stage["status"] } : s
  );
  await persist(projectId, project.description, next);
  return { success: true, stages: next };
}

/** Company releases an approved stage. Never releases more than remains. */
export async function releasePaymentStage(projectId: string, stageId: string) {
  const owned = await loadOwnedProject(projectId);
  if ("error" in owned) return { success: false, error: owned.error };
  const { project } = owned;

  const stages: Stage[] = getProjectMetadataDirect(project.description).paymentStages ?? [];
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) return { success: false, error: "Stage not found." };
  if (stage.status !== "APPROVED") {
    return { success: false, error: "This stage must be approved before its payment can be released." };
  }

  // A partially funded stage cannot be released; it must be funded in full first.
  if ((stage.funded ?? 0) < (stage.amount || 0)) {
    return {
      success: false,
      error: `This stage is only funded to ${(stage.funded ?? 0).toLocaleString()} of ${(stage.amount || 0).toLocaleString()}. Fund it in full before releasing.`,
    };
  }

  const alreadyReleased = stage.released ?? 0;
  const outstanding = (stage.amount || 0) - alreadyReleased;
  if (outstanding <= 0) {
    return { success: false, error: "This stage has already been released in full." };
  }
  if (alreadyReleased + outstanding > (stage.funded ?? 0)) {
    return { success: false, error: "Cannot release more than the amount funded for this stage." };
  }

  const next = stages.map((s) =>
    s.id === stageId
      ? { ...s, released: alreadyReleased + outstanding, status: "RELEASED" as const }
      : s
  );
  await persist(projectId, project.description, next);
  return { success: true, stages: next };
}
