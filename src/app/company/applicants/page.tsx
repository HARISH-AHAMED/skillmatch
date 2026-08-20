import { requireCompanyViewer } from "@/data/server/context";
import { applicationsForCompany, projectsForCompany } from "@/data/server/entities";
import { ApplicantsClient } from "./ApplicantsClient";

export default async function CompanyApplicantsPage() {
  const { company } = await requireCompanyViewer("/company/applicants");

  const [applications, projects] = await Promise.all([
    applicationsForCompany(company.id),
    projectsForCompany(company.id),
  ]);

  // Capacity is checked again server-side by hireApplicant; this is only so the
  // UI can explain a full role before the request is made.
  const hiredByProject: Record<string, { roleId?: string; isApprentice: boolean }[]> = {};
  for (const a of applications) {
    if (a.status !== "HIRED") continue;
    (hiredByProject[a.projectId] ??= []).push({ roleId: a.roleId, isApprentice: a.isApprentice });
  }

  return (
    <ApplicantsClient
      applications={applications}
      projects={projects.filter((p) => p.status !== "DRAFT")}
      hiredByProject={hiredByProject}
    />
  );
}
