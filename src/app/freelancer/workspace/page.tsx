import { requireViewer } from "@/data/server/context";
import { workspaceCards } from "@/data/server/workspace";
import { WorkspaceIndex } from "@/components/shared/WorkspaceIndex";

export default async function WorkspaceIndexPage() {
  const viewer = await requireViewer("FREELANCER", "/freelancer/workspace");
  const workspaces = await workspaceCards(viewer.userId, viewer.role);

  return <WorkspaceIndex workspaces={workspaces} isCompany={false} />;
}
