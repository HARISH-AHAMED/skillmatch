import { requireFreelancer } from "@/data/server/context";
import { applicationsForFreelancer, getFreelancer } from "@/data/server/entities";
import { certificatesFor, reviewsBy, reviewsFor } from "@/data/server/records";
import { financialsByApplication } from "@/data/server/workspace";
import type { ApplicationFinancials } from "@/lib/domain";
import { CompletedProjectsClient } from "./CompletedProjectsClient";

export default async function CompletedProjectsPage() {
  const { viewer, freelancer } = await requireFreelancer("/freelancer/completed-projects");

  const [profile, applications, certificates, written, received] = await Promise.all([
    getFreelancer(freelancer.id),
    applicationsForFreelancer(freelancer.id),
    certificatesFor(freelancer.id, true),
    reviewsBy(viewer.userId),
    reviewsFor(viewer.userId),
  ]);

  if (!profile) return null;

  const completed = applications.filter(
    (a) => a.status === "HIRED" && a.project.status === "COMPLETED",
  );
  const financialsMap = await financialsByApplication(completed.map((a) => a.id));

  // A Map does not cross the server/client boundary; the client reads it by key.
  const financials: Record<string, ApplicationFinancials> = Object.fromEntries(financialsMap);

  return (
    <CompletedProjectsClient
      freelancer={profile}
      completed={completed}
      certificates={certificates}
      written={written}
      received={received}
      financials={financials}
    />
  );
}
