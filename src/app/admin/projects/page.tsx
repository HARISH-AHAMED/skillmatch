import { requireViewer } from "@/data/server/context";
import { allProjects } from "@/data/server/entities";
import { platformStats } from "@/data/server/stats";
import { financialSummaries } from "@/data/server/workspace";
import { ProjectsClient } from "./ProjectsClient";

export default async function AdminProjectsPage() {
  await requireViewer("ADMIN", "/admin/projects");

  const [projects, stats] = await Promise.all([allProjects(), platformStats()]);
  const summaries = await financialSummaries(projects.map((p) => p.id));

  return (
    <ProjectsClient
      projects={projects}
      stats={stats}
      summaries={Object.fromEntries(summaries)}
    />
  );
}
