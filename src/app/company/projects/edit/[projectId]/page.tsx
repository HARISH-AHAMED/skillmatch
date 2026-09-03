import { notFound } from "next/navigation";
import { requireCompanyViewer } from "@/data/server/context";
import { getProject, hiredApplications } from "@/data/server/entities";
import { db } from "@/lib/db";
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

  /*
   * `project.bannerUrl` is never empty — the adapter substitutes generated
   * artwork when a listing has none, which is right for display but wrong for
   * an editor: it would show a placeholder as if it were an upload, and saving
   * would write that stand-in into the column as real data. The editor gets
   * the stored value instead.
   */
  const stored = await db.project.findUnique({
    where: { id: project.id },
    select: { bannerUrl: true },
  });

  return (
    <EditProjectClient
      project={project}
      hired={hired}
      storedBannerUrl={stored?.bannerUrl ?? null}
    />
  );
}
