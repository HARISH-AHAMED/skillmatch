import { requireFreelancer } from "@/data/server/context";
import { applicationsForFreelancer } from "@/data/server/entities";
import { ApplicationsClient } from "./ApplicationsClient";

export default async function FreelancerApplicationsPage() {
  const { freelancer } = await requireFreelancer("/freelancer/applications");
  const all = await applicationsForFreelancer(freelancer.id);

  return <ApplicationsClient all={all} />;
}
