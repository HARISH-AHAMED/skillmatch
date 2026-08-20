"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/Card";
import { ProjectBrowser } from "@/components/shared/ProjectBrowser";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/session";
import { getFreelancerByUserId } from "@/data/queries";

export default function FreelancerProjectsPage() {
  const { session } = useSession();
  const toast = useToast();
  const [saved, setSaved] = useState<string[]>([]);

  const freelancer = session ? getFreelancerByUserId(session.userId) : undefined;

  return (
    <div>
      <PageHeader
        title="Browse projects"
        description="Ranked by your match score by default. Every listing shows its compensation model, role slots and screening process before you apply."
      />
      <ProjectBrowser
        viewerId={freelancer?.id}
        hrefBase="/freelancer/projects"
        showSaveToggle
        savedIds={saved}
        onToggleSave={(id) => {
          setSaved((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            toast.toast({
              title: prev.includes(id) ? "Removed from saved" : "Saved for later",
              tone: "success",
            });
            return next;
          });
        }}
      />
    </div>
  );
}
