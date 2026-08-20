"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { WorkspaceView } from "@/components/workspace/WorkspaceView";
import { Skeleton } from "@/components/ui/Feedback";

export default function WorkspacePage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[var(--radius-lg)]" />}>
      <WorkspaceView applicationId={applicationId} />
    </Suspense>
  );
}
