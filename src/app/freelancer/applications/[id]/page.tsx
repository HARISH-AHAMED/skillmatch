import { notFound } from "next/navigation";
import { requireFreelancer } from "@/data/server/context";
import { getApplication, getProject, hiredApplications } from "@/data/server/entities";
import { ApplicationDetailClient } from "./ApplicationDetailClient";

export default async function FreelancerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { freelancer } = await requireFreelancer(`/freelancer/applications/${id}`);

  const application = await getApplication(id);
  // Scoped to the viewer: an application belonging to someone else is simply
  // not found, rather than being rendered with a permission message.
  if (!application || application.freelancerId !== freelancer.id) notFound();

  const [project, hired] = await Promise.all([
    getProject(application.projectId),
    hiredApplications(application.projectId),
  ]);
  if (!project) notFound();

  return <ApplicationDetailClient application={application} project={project} hired={hired} />;
}
