import { notFound } from "next/navigation";
import { requireFreelancer } from "@/data/server/context";
import { computeScore, getFreelancer, getProject, hiredApplications } from "@/data/server/entities";
import { db } from "@/lib/db";
import { ApplyClient } from "./ApplyClient";

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { freelancer } = await requireFreelancer(`/freelancer/projects/${id}/apply`);

  const project = await getProject(id);
  if (!project) notFound();

  const [profile, matchScore, hired, existing] = await Promise.all([
    getFreelancer(freelancer.id),
    computeScore(project.id, freelancer.id),
    hiredApplications(project.id),
    db.application.findUnique({
      where: { projectId_freelancerId: { projectId: project.id, freelancerId: freelancer.id } },
      select: { id: true },
    }),
  ]);

  if (!profile) return null;

  return (
    <ApplyClient
      project={project}
      freelancer={profile}
      matchScore={matchScore}
      hired={hired}
      already={Boolean(existing)}
    />
  );
}
