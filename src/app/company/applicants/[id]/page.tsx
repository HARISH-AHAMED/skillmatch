import { notFound } from "next/navigation";
import { requireCompanyViewer } from "@/data/server/context";
import {
  getApplication,
  getFreelancer,
  getProject,
  hiredApplications,
} from "@/data/server/entities";
import { certificatesFor, reviewsFor } from "@/data/server/records";
import { ApplicantDetailClient } from "./ApplicantDetailClient";

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await requireCompanyViewer(`/company/applicants/${id}`);

  const application = await getApplication(id);
  if (!application) notFound();

  const project = await getProject(application.projectId);
  // An application on another company's listing is simply not found here.
  if (!project || project.companyId !== company.id) notFound();

  const [freelancer, reviews, certificates, hired] = await Promise.all([
    getFreelancer(application.freelancerId),
    reviewsFor(application.freelancer.userId),
    certificatesFor(application.freelancerId),
    hiredApplications(application.projectId),
  ]);
  if (!freelancer) notFound();

  return (
    <ApplicantDetailClient
      application={application}
      project={project}
      freelancer={freelancer}
      reviews={reviews}
      certificates={certificates}
      hired={hired}
    />
  );
}
