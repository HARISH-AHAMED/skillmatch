import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WorkspaceView } from "@/components/workspace/WorkspaceView";
import { Skeleton } from "@/components/ui/Feedback";
import { requireApplicationParty } from "@/lib/authz";
import { getApplication } from "@/data/server/entities";
import { getWorkspaceData } from "@/data/server/workspace";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;

  // Access is the backend's own party check: the owning company, or the
  // freelancer hired on this application. Anyone else gets a 404.
  const party = await requireApplicationParty(applicationId);
  if (!party.ok) notFound();

  const application = await getApplication(applicationId);
  if (!application) notFound();

  const data = await getWorkspaceData(application, party.data.role, party.data.userId);
  if (!data) notFound();

  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[var(--radius-lg)]" />}>
      <WorkspaceView data={data} />
    </Suspense>
  );
}
