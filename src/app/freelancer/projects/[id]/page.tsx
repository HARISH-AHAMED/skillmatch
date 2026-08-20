import { notFound } from "next/navigation";
import { requireFreelancer } from "@/data/server/context";
import {
  computeScore,
  getProject,
  hiredApplications,
  savedProjectIds,
} from "@/data/server/entities";
import { acceptsApplications, getCapacity } from "@/lib/domain";
import { db } from "@/lib/db";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function FreelancerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { freelancer } = await requireFreelancer(`/freelancer/projects/${id}`);

  const project = await getProject(id);
  if (!project) notFound();

  const [score, hired, saved, existing] = await Promise.all([
    computeScore(project.id, freelancer.id),
    hiredApplications(project.id),
    savedProjectIds(freelancer.id),
    db.application.findUnique({
      where: { projectId_freelancerId: { projectId: project.id, freelancerId: freelancer.id } },
      select: { id: true },
    }),
  ]);

  const capacity = getCapacity(project, hired);
  const hasApprenticeRoute = project.roles.some((r) => r.allowApprentice);

  const canApply =
    acceptsApplications(project.status) &&
    project.isVisible &&
    project.visibility !== "PRIVATE" &&
    (!capacity.projectFull || hasApprenticeRoute);

  return (
    <ProjectDetailClient
      project={project}
      matchScore={score.aiScore}
      hasApplied={Boolean(existing)}
      canApply={canApply}
      saved={saved.includes(project.id)}
    />
  );
}
