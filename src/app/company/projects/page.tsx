import { requireCompanyViewer } from "@/data/server/context";
import { projectsForCompany } from "@/data/server/entities";
import { pendingApplicantCounts } from "@/data/server/stats";
import { financialSummaries } from "@/data/server/workspace";
import { ProjectsClient } from "./ProjectsClient";

export default async function CompanyProjectsPage() {
  const { company } = await requireCompanyViewer("/company/projects");

  const projects = await projectsForCompany(company.id);
  const projectIds = projects.map((p) => p.id);

  const [summaries, pending] = await Promise.all([
    financialSummaries(projectIds),
    pendingApplicantCounts(projectIds),
  ]);

  return (
    <ProjectsClient
      projects={projects}
      summaries={Object.fromEntries(summaries)}
      pendingCounts={Object.fromEntries(pending)}
    />
  );
}
