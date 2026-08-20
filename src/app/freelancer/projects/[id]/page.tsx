"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
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

export default function FreelancerProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const [saved, setSaved] = useState(false);

  const project = getProject(id);
  if (!project) notFound();

  const freelancer = session ? getFreelancerByUserId(session.userId) : undefined;
  const matchScore = freelancer ? computeScore(project.id, freelancer.id).aiScore : undefined;

  const existing = freelancer
    ? applicationsForFreelancer(freelancer.id).find((a) => a.projectId === project.id)
    : undefined;

  const capacity = getCapacity(project.id);
  const hasApprenticeRoute = project.roles.some((r) => r.allowApprentice);

  const canApply =
    acceptsApplications(project.status) &&
    project.isVisible &&
    project.visibility !== "PRIVATE" &&
    (!capacity.projectFull || hasApprenticeRoute);

  return (
    <div className="-mx-4 -my-6 md:-mx-6 md:-my-8 xl:-mx-8">
      <div className="container-wide pt-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push("/freelancer/projects")}
        >
          Back to browse
        </Button>
      </div>

      <ProjectDetailView
        project={project}
        matchScore={matchScore}
        applyHref={`/freelancer/projects/${project.id}/apply`}
        hasApplied={Boolean(existing)}
        canApply={canApply}
        saved={saved}
        onToggleSave={() => setSaved((v) => !v)}
        onAskQuestion={() => router.refresh()}
      />
    </div>
  );
}
