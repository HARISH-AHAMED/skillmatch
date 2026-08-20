import { requireCompanyViewer } from "@/data/server/context";
import { applicationsForCompany, projectsForCompany } from "@/data/server/entities";
import { reviewsBy, reviewsFor } from "@/data/server/records";
import { ReviewsClient } from "./ReviewsClient";

export default async function CompanyReviewsPage() {
  const { viewer, company } = await requireCompanyViewer("/company/reviews");

  const [projects, applications, written, received] = await Promise.all([
    projectsForCompany(company.id),
    applicationsForCompany(company.id),
    // Reviews are keyed by the company owner's user id.
    reviewsBy(viewer.userId),
    reviewsFor(viewer.userId),
  ]);

  const completedProjects = projects.filter((p) => p.status === "COMPLETED");
  const completedIds = new Set(completedProjects.map((p) => p.id));

  return (
    <ReviewsClient
      completedProjects={completedProjects}
      hires={applications.filter((a) => a.status === "HIRED" && completedIds.has(a.projectId))}
      written={written}
      received={received}
      trustScore={company.trustScore}
    />
  );
}
