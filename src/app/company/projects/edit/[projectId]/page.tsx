import { notFound } from "next/navigation";
import { requireCompanyViewer } from "@/data/server/context";
import { getProject, hiredApplications } from "@/data/server/entities";
import { EditProjectClient } from "./EditProjectClient";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { company } = await requireCompanyViewer(`/company/projects/edit/${projectId}`);

  const project = await getProject(projectId);
  if (!project || project.companyId !== company.id) notFound();

  const hired = await hiredApplications(project.id);

  return <EditProjectClient project={project} hired={hired} />;
}
