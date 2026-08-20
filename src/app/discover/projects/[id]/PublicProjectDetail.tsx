"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ProjectDetailView } from "@/components/shared/ProjectDetailView";
import { useToast } from "@/components/ui/Toast";
import { submitDiscussionQuestion } from "@/actions/workflowActions";
import type { Project } from "@/lib/types";

export function PublicProjectDetail({
  project,
  matchScore,
  hasApplied,
  canApply,
  isOwner,
  applyHref,
}: {
  project: Project;
  matchScore?: number;
  hasApplied: boolean;
  canApply: boolean;
  isOwner: boolean;
  applyHref?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const onAskQuestion = (question: string) => {
    startTransition(async () => {
      const result = await submitDiscussionQuestion(project.id, question);
      if (result.success) {
        toast.toast({ title: "Question sent to the company", tone: "success" });
        router.refresh();
        return;
      }
      toast.toast({ title: result.error ?? "Could not send your question", tone: "error" });
    });
  };

  return (
    <ProjectDetailView
      project={project}
      matchScore={matchScore}
      applyHref={applyHref}
      hasApplied={hasApplied}
      canApply={canApply}
      isOwner={isOwner}
      onAskQuestion={onAskQuestion}
    />
  );
}
