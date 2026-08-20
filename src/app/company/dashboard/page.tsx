import { requireCompanyViewer } from "@/data/server/context";
import {
  applicationsForCompany,
  getCompanyByUserId,
  projectsForCompany,
  recommendationsForProject,
} from "@/data/server/entities";
import { companyDashboardStats } from "@/data/server/stats";
import { financialSummaries, workspacesForUser } from "@/data/server/workspace";
import { getProjectCompletionReadiness } from "@/actions/reviewActions";
import { PUBLICLY_BROWSEABLE } from "@/lib/domain";
import { DashboardClient } from "./DashboardClient";

export default async function CompanyDashboardPage() {
  const { viewer, company } = await requireCompanyViewer("/company/dashboard");

  const [profile, stats, projects, applications, workspaces] = await Promise.all([
    getCompanyByUserId(viewer.userId),
    companyDashboardStats(company.id),
    projectsForCompany(company.id),
    applicationsForCompany(company.id),
    workspacesForUser(viewer.userId, "COMPANY"),
  ]);

  if (!profile) return null;

  const active = projects.filter((p) => PUBLICLY_BROWSEABLE.includes(p.status));
  const recommendedFor = active[0];

  const [summaries, recommended, readinessEntries] = await Promise.all([
    financialSummaries(active.map((p) => p.id)),
    recommendedFor
      ? recommendationsForProject(recommendedFor.id).then((list) => list.slice(0, 4))
      : Promise.resolve([]),
    // Readiness is an existing server action; it re-checks project membership
    // per project rather than trusting the caller.
    Promise.all(
      active.map(async (p) => [p.id, await getProjectCompletionReadiness(p.id)] as const),
    ),
  ]);

  const readiness = Object.fromEntries(readinessEntries);

  return (
    <DashboardClient
      company={profile}
      data={{
        stats,
        projects,
        active,
        drafts: projects.filter((p) => p.status === "DRAFT"),
        applications,
        pending: applications.filter((a) => a.status === "PENDING"),
        workspaces,
        recommended,
        recommendedFor,
        readyToComplete: active.filter((p) => readiness[p.id]?.ready),
        summaries: Object.fromEntries(summaries),
        readiness,
      }}
    />
  );
}
