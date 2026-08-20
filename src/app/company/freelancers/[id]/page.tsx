import { notFound } from "next/navigation";
import { requireCompanyViewer } from "@/data/server/context";
import { getFreelancer, savedFreelancerIds } from "@/data/server/entities";
import { certificatesFor, reviewsFor } from "@/data/server/records";
import { FreelancerDetailClient } from "./FreelancerDetailClient";

export default async function CompanyFreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await requireCompanyViewer(`/company/freelancers/${id}`);

  const freelancer = await getFreelancer(id);
  if (!freelancer) notFound();

  const [reviews, certificates, saved] = await Promise.all([
    reviewsFor(freelancer.userId),
    certificatesFor(freelancer.id),
    savedFreelancerIds(company.id),
  ]);

  return (
    <FreelancerDetailClient
      freelancer={freelancer}
      reviews={reviews}
      certificates={certificates}
      saved={saved.includes(freelancer.id)}
    />
  );
}
