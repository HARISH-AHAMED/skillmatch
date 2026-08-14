import React from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";
import { CertificatePreview, CertificateDynamicData } from "@/components/CertificateConfigurator";
import { getProjectMetadataDirect, defaultCertificateConfig } from "@/lib/workflowHelpers";
import { CertificateDownload } from "../CertificateDownload";

interface PageProps {
  params: Promise<{ publicId: string }>;
}

export default async function FreelancerCertificateViewPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { publicId } = await params;

  const certificate = await db.certificate.findUnique({
    where: { publicId },
    include: { freelancer: true, project: { select: { description: true, requiredSkills: true } } },
  });

  if (!certificate) notFound();
  // A freelancer may only open their own certificate here; the public verify
  // page remains the shareable, unauthenticated view.
  if (certificate.freelancer.userId !== session.user.id) redirect("/freelancer/certificates");

  const meta = getProjectMetadataDirect(certificate.project.description);
  const config = meta.certificate ?? defaultCertificateConfig();

  const data: CertificateDynamicData = {
    freelancerName: certificate.recipientName,
    projectName: certificate.projectTitle,
    role: certificate.roleTitle,
    skills: certificate.skills.slice(0, 6),
    completionDate: new Date(certificate.issuedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    certificateId: certificate.publicId,
    companyName: certificate.issuerName,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/freelancer/certificates"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B6272] hover:text-[#1A1D29]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All certificates
        </Link>
        <CertificateDownload fileName={`certificate-${certificate.publicId}`} />
      </div>

      <Card className="bg-[#F0F3F9] p-3 sm:p-6 print:bg-white print:p-0">
        <CertificatePreview config={config} data={data} />
      </Card>

      <p className="text-[11px] text-[#5B6272] print:hidden">
        Verifiable at <span className="font-mono">/verify/{certificate.publicId}</span>
      </p>
    </div>
  );
}
