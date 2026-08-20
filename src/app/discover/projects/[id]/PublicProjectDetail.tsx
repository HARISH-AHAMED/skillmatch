"use client";

import { useRouter } from "next/navigation";
import { ProjectDetailView } from "@/components/shared/ProjectDetailView";
import { useSession } from "@/lib/session";
import {
  acceptsApplications,
  applicationsForFreelancer,
  computeScore,
  getCapacity,
  getFreelancerByUserId,
  getProject,
} from "@/data/queries";

export function PublicProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { session } = useSession();
  const project = getProject(projectId);

  if (!project) return null;

  const freelancer = session?.role === "FREELANCER" ? getFreelancerByUserId(session.userId) : undefined;
  const isOwner =
    session?.role === "COMPANY" && getProject(projectId)?.companyId === session.profileId;

  const matchScore = freelancer ? computeScore(project.id, freelancer.id).aiScore : undefined;
  const hasApplied = freelancer
    ? applicationsForFreelancer(freelancer.id).some((a) => a.projectId === project.id)
    : false;

  const capacity = getCapacity(project.id);
  const canApply =
    acceptsApplications(project.status) &&
    project.isVisible &&
    project.visibility === "PUBLIC" &&
    !capacity.projectFull;

  const applyHref = session
    ? freelancer
      ? `/freelancer/projects/${project.id}/apply`
      : undefined
    : `/login?next=${encodeURIComponent(`/freelancer/projects/${project.id}/apply`)}`;

  return (
    <ProjectDetailView
      project={project}
      matchScore={matchScore}
      applyHref={applyHref}
      hasApplied={hasApplied}
      canApply={canApply}
      isOwner={isOwner}
      onAskQuestion={() => router.refresh()}
    />
  );
}
