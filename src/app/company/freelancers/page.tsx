import { requireCompanyViewer } from "@/data/server/context";
import { projectsForCompany, savedFreelancerIds, searchFreelancers } from "@/data/server/entities";
import { PUBLICLY_BROWSEABLE } from "@/lib/domain";
import { FreelancersClient } from "./FreelancersClient";

export default async function CompanyFreelancersPage() {
  const { company } = await requireCompanyViewer("/company/freelancers");

  const [freelancers, projects, saved] = await Promise.all([
    searchFreelancers(),
    projectsForCompany(company.id),
    savedFreelancerIds(company.id),
  ]);

  return (
    <FreelancersClient
      freelancers={freelancers}
      // Only live listings can receive an invitation.
      projects={projects.filter((p) => PUBLICLY_BROWSEABLE.includes(p.status))}
      savedIds={saved}
    />
  );
}
