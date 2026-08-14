import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CertificateDesigner } from "./CertificateDesigner";
import { getProjectMetadataDirect } from "@/lib/workflowHelpers";
import type { CertificateDynamicData } from "@/components/CertificateConfigurator";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CertificateDesignPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPANY") redirect("/login");

  const { id: projectId } = await params;

  const [project, company] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      include: {
        company: { select: { companyName: true } },
        applications: {
          where: { status: "HIRED" },
          take: 1,
          include: {
            freelancer: { include: { user: { select: { name: true } } } },
            role: true,
          },
        },
      },
    }),
    db.company.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!project) redirect("/company/projects");
  if (!company || project.companyId !== company.id) redirect("/company/projects");

  const meta = getProjectMetadataDirect(project.description);
  const hired: any = project.applications[0];

  // A project may have no roles and no hire yet — the company can still design
  // the template, so every dynamic value falls back to a readable placeholder.
  const data: CertificateDynamicData = {
    freelancerName: hired?.freelancer?.user?.name || "Freelancer Name",
    projectName: project.title,
    role: hired?.role?.title || hired?.role?.name || "Project Contributor",
    skills: project.requiredSkills.slice(0, 6),
    completionDate:
      project.status === "COMPLETED"
        ? new Date(project.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : "On completion",
    certificateId: `${meta.certificate?.certificateIdPrefix || "TAL"}-${projectId.slice(-4).toUpperCase()}`,
    companyName: project.company.companyName,
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-[#1A1D29]">Certificate Design</h1>
        <p className="mt-1 text-xs text-[#5B6272]">
          Prepare the certificate template for <strong>{project.title}</strong>. Designing a template does not
          issue any certificate — issuance happens separately once work is completed.
        </p>
      </div>

      <CertificateDesigner
        projectId={project.id}
        initialConfig={meta.certificate ?? null}
        data={data}
      />
    </div>
  );
}
