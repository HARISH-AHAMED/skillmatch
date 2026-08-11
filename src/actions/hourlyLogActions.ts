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

type WorkLog = NonNullable<ReturnType<typeof getProjectMetadataDirect>["hourlyLogs"]>[number];

/** A single day of logged work may not exceed this. */
const MAX_DAILY_HOURS = 16;

async function persist(projectId: string, description: string | null, logs: WorkLog[]) {
  const meta = getProjectMetadataDirect(description);
  await db.project.update({
    where: { id: projectId },
    data: {
      description: serializeProjectMetadata(getProjectDescriptionText(description), {
        ...meta,
        hourlyLogs: logs,
      }),
    },
  });
  revalidatePath(`/company/projects/${projectId}`);
}

/** Freelancer records a day of work. Only a hired freelancer may log time. */
export async function addWorkLog(
  projectId: string,
  input: { date: string; hours: number; description: string }
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const application = await db.application.findFirst({
    where: { projectId, status: "HIRED", freelancer: { userId: session.user.id } },
    select: { id: true },
  });
  if (!application) {
    return { success: false, error: "Only a hired freelancer can log work on this project." };
  }

  const hours = Number(input.hours);
  if (!Number.isFinite(hours) || hours <= 0) {
    return { success: false, error: "Enter a number of hours greater than zero." };
  }
  if (hours > MAX_DAILY_HOURS) {
    return { success: false, error: `A single work log cannot exceed ${MAX_DAILY_HOURS} hours.` };
  }
  if (!input.date) return { success: false, error: "Select the date the work was done." };
  if (!input.description?.trim()) {
    return { success: false, error: "Describe the work briefly." };
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return { success: false, error: "Project not found." };

  const logs: WorkLog[] = getProjectMetadataDirect(project.description).hourlyLogs ?? [];
  const next: WorkLog[] = [
    ...logs,
    {
      id: `log-${Date.now()}`,
      applicationId: application.id,
      freelancerUserId: session.user.id,
      freelancerName: session.user.name || "Freelancer",
      date: input.date,
      hours,
      description: input.description.trim(),
      status: "PENDING",
    },
  ];

  await persist(projectId, project.description, next);
  return { success: true, logs: next };
}

/**
 * Company approves or rejects a pending work log. Only the owning company may
 * review, and a log that has already been reviewed cannot be reviewed again.
 */
export async function reviewWorkLog(projectId: string, logId: string, approve: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    return { success: false, error: "Unauthorized" };
  }
  const company = await db.company.findUnique({ where: { userId: session.user.id } });
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || !company || project.companyId !== company.id) {
    return { success: false, error: "Unauthorized" };
  }

  const logs: WorkLog[] = getProjectMetadataDirect(project.description).hourlyLogs ?? [];
  const target = logs.find((l) => l.id === logId);
  if (!target) return { success: false, error: "Work log not found." };
  if (target.status !== "PENDING") {
    return { success: false, error: "This work log has already been reviewed." };
  }

  const next = logs.map((l) =>
    l.id === logId
      ? {
          ...l,
          status: (approve ? "APPROVED" : "REJECTED") as WorkLog["status"],
          reviewedAt: new Date().toISOString(),
        }
      : l
  );

  await persist(projectId, project.description, next);
  return { success: true, logs: next };
}

/** Freelancer deletes their own log, only while it is still pending review. */
export async function deleteWorkLog(projectId: string, logId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return { success: false, error: "Project not found." };

  const logs: WorkLog[] = getProjectMetadataDirect(project.description).hourlyLogs ?? [];
  const target = logs.find((l) => l.id === logId);
  if (!target) return { success: false, error: "Work log not found." };
  if (target.freelancerUserId !== session.user.id) {
    return { success: false, error: "You can only remove your own work logs." };
  }
  if (target.status !== "PENDING") {
    return { success: false, error: "A reviewed work log can no longer be removed." };
  }

  const next = logs.filter((l) => l.id !== logId);
  await persist(projectId, project.description, next);
  return { success: true, logs: next };
}

type Payment = NonNullable<ReturnType<typeof getProjectMetadataDirect>["hourlyPayments"]>[number];

/**
 * Company releases payment for a freelancer's approved hourly work.
 * Only APPROVED logs are payable, and only up to what remains unpaid for that
 * one application — one freelancer's balance can never pay another's.
 */
export async function releaseHourlyPayment(
  projectId: string,
  applicationId: string,
  amount: number
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    return { success: false, error: "Unauthorized" };
  }
  const company = await db.company.findUnique({ where: { userId: session.user.id } });
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || !company || project.companyId !== company.id) {
    return { success: false, error: "Unauthorized" };
  }

  const application = await db.application.findFirst({
    where: { id: applicationId, projectId, status: "HIRED" },
    select: { id: true, freelancer: { select: { user: { select: { name: true } } } } },
  });
  if (!application) {
    return { success: false, error: "That freelancer is not hired on this project." };
  }

  const meta = getProjectMetadataDirect(project.description);
  const rate = meta.paymentRate ?? 0;
  const logs: WorkLog[] = meta.hourlyLogs ?? [];
  const payments: Payment[] = meta.hourlyPayments ?? [];

  const approvedHours = logs
    .filter((l) => l.applicationId === applicationId && l.status === "APPROVED")
    .reduce((t, l) => t + (l.hours || 0), 0);
  const approvedAmount = approvedHours * rate;
  const alreadyPaid = payments
    .filter((p) => p.applicationId === applicationId)
    .reduce((t, p) => t + (p.amount || 0), 0);
  const remainingPayable = approvedAmount - alreadyPaid;

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return { success: false, error: "Enter a payment amount greater than zero." };
  }
  if (remainingPayable <= 0) {
    return { success: false, error: "This freelancer's approved work has already been paid in full." };
  }
  if (value > remainingPayable) {
    return {
      success: false,
      error: `Only ${remainingPayable.toLocaleString()} remains payable for this freelancer's approved work.`,
    };
  }

  const next: Payment[] = [
    ...payments,
    {
      id: `pay-${Date.now()}`,
      applicationId,
      date: new Date().toISOString(),
      amount: value,
      companyName: company.companyName,
      freelancerName: application.freelancer.user.name || "Freelancer",
    },
  ];

  await db.project.update({
    where: { id: projectId },
    data: {
      description: serializeProjectMetadata(getProjectDescriptionText(project.description), {
        ...meta,
        hourlyPayments: next,
      }),
    },
  });
  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, payments: next };
}
