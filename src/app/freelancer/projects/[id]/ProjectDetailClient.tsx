"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ProjectDetailView } from "@/components/shared/ProjectDetailView";
import { toggleSaveProject } from "@/actions/companyActions";
import { submitDiscussionQuestion } from "@/actions/workflowActions";
import type { Project } from "@/lib/types";

export function ProjectDetailClient({
  project,
  matchScore,
  hasApplied,
  canApply,
  saved: savedInitial,
}: {
  project: Project;
  matchScore?: number;
  hasApplied: boolean;
  canApply: boolean;
  saved: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(savedInitial);
  const [, startTransition] = useTransition();

  const onToggleSave = () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    startTransition(async () => {
      try {
        const result = await toggleSaveProject(project.id);
        setSaved(result.saved);
      } catch {
        setSaved(wasSaved);
        toast.toast({ title: "Could not update your saved projects", tone: "error" });
      }
    });
  };

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
        hasApplied={hasApplied}
        canApply={canApply}
        saved={saved}
        onToggleSave={onToggleSave}
        onAskQuestion={onAskQuestion}
      />
    </div>
  );
}
