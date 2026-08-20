import { notFound } from "next/navigation";
import { requireCompanyViewer } from "@/data/server/context";
import { getProject, hiredApplications } from "@/data/server/entities";
import { CertificateDesignerClient } from "./CertificateDesignerClient";

export default async function CertificateDesignerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await requireCompanyViewer(`/company/projects/${id}/certificate`);

  const project = await getProject(id);
  if (!project || project.companyId !== company.id) notFound();

  const hired = await hiredApplications(project.id);

  return <CertificateDesignerClient project={project} hired={hired} />;
}
