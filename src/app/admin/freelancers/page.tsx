import { requireViewer } from "@/data/server/context";
import { allFreelancers } from "@/data/server/entities";
import { freelancerCounts } from "@/data/server/stats";
import { FreelancersClient } from "./FreelancersClient";

export default async function AdminFreelancersPage() {
  await requireViewer("ADMIN", "/admin/freelancers");

  const freelancers = await allFreelancers();
  const counts = await freelancerCounts(freelancers.map((f) => f.id));

  return <FreelancersClient freelancers={freelancers} counts={Object.fromEntries(counts)} />;
}
