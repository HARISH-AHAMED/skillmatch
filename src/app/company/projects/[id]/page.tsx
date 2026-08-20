import { notFound } from "next/navigation";
import { requireCompanyViewer } from "@/data/server/context";
import {
  applicationsForProject,
  getProject,
  hiredApplications,
  recommendationsForProject,
} from "@/data/server/entities";
import { getProjectCompletionReadiness } from "@/actions/reviewActions";
import { getLedger, getPaymentItems } from "@/data/server/workspace";
import { getProjectFinancialSummary } from "@/lib/domain";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function CompanyProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await requireCompanyViewer(`/company/projects/${id}`);

  const project = await getProject(id);
  if (!project || project.companyId !== company.id) notFound();

  const [applicants, hired, items, ledger, readiness, recommended] = await Promise.all([
    applicationsForProject(project.id),
    hiredApplications(project.id),
    getPaymentItems(project.id),
    getLedger(project.id),
    getProjectCompletionReadiness(project.id),
    recommendationsForProject(project.id).then((list) => list.slice(0, 5)),
  ]);

  return (
    <ProjectDetailClient
      project={project}
      applicants={applicants}
      hired={hired}
      summary={getProjectFinancialSummary(project.compensation, items, ledger)}
      readiness={readiness}
      recommended={recommended}
    />
  );
}
