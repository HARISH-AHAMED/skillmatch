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

type StipendPayment = NonNullable<
  ReturnType<typeof getProjectMetadataDirect>["stipendPayments"]
>[number];

/**
 * Company releases one stipend period to one hired freelancer. Each payout is
 * recorded against that freelancer's application, so balances never mix, and a
 * period can only be paid once.
 */
export async function releaseStipendPayment(
  projectId: string,
  applicationId: string,
  periodIndex: number
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
  if (meta.compensationType !== "STIPEND") {
    return { success: false, error: "This project is not a stipend engagement." };
  }

  const amount = meta.paymentRate ?? project.budget;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "This project has no stipend amount configured." };
  }

  const period = Number(periodIndex);
  if (!Number.isInteger(period) || period < 1) {
    return { success: false, error: "Invalid payment period." };
  }
  // A one-time stipend has exactly one period.
  if ((meta.stipendFrequency || "MONTHLY") === "ONE_TIME" && period > 1) {
    return { success: false, error: "A one-time stipend has only a single payment period." };
  }

  const payments: StipendPayment[] = meta.stipendPayments ?? [];
  const duplicate = payments.some(
    (p) => p.applicationId === applicationId && p.periodIndex === period
  );
  if (duplicate) {
    return { success: false, error: `Period ${period} has already been paid to this freelancer.` };
  }

  const next: StipendPayment[] = [
    ...payments,
    {
      id: `stipend-${Date.now()}`,
      applicationId,
      freelancerName: application.freelancer.user.name || "Freelancer",
      periodIndex: period,
      amount,
      date: new Date().toISOString(),
      companyName: company.companyName,
    },
  ];

  await db.project.update({
    where: { id: projectId },
    data: {
      description: serializeProjectMetadata(getProjectDescriptionText(project.description), {
        ...meta,
        stipendPayments: next,
      }),
    },
  });
  revalidatePath(`/company/projects/${projectId}`);
  return { success: true, payments: next };
}
