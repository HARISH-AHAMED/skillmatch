"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/ui/Card";
import { ProjectBrowser } from "@/components/shared/ProjectBrowser";
import { useToast } from "@/components/ui/Toast";
import { toggleSaveProject } from "@/actions/companyActions";
import type { Project } from "@/lib/types";

export function ProjectsClient({
  projects,
  freelancerId,
  savedIds,
}: {
  projects: Project[];
  freelancerId: string;
  savedIds: string[];
}) {
  const toast = useToast();
  const [saved, setSaved] = useState<string[]>(savedIds);
  const [, startTransition] = useTransition();

  const onToggleSave = (id: string) => {
    const wasSaved = saved.includes(id);
    // Optimistic, then reconciled against what the action actually persisted.
    setSaved((prev) => (wasSaved ? prev.filter((x) => x !== id) : [...prev, id]));

    startTransition(async () => {
      try {
        const result = await toggleSaveProject(id);
        setSaved((prev) =>
          result.saved ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id),
        );
        toast.toast({
          title: result.saved ? "Saved for later" : "Removed from saved",
          tone: "success",
        });
      } catch {
        setSaved((prev) => (wasSaved ? [...prev, id] : prev.filter((x) => x !== id)));
        toast.toast({ title: "Could not update your saved projects", tone: "error" });
      }
    });
  };

  return (
    <div>
      <PageHeader
        title="Browse projects"
        description="Ranked by your match score by default. Every listing shows its compensation model, role slots and screening process before you apply."
      />
      <ProjectBrowser
        projects={projects}
        viewerId={freelancerId}
        hrefBase="/freelancer/projects"
        showSaveToggle
        savedIds={saved}
        onToggleSave={onToggleSave}
      />
    </div>
  );
}
