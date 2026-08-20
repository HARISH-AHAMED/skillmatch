import { requireViewer } from "@/data/server/context";
import { workspaceCards } from "@/data/server/workspace";
import { WorkspaceIndex } from "@/components/shared/WorkspaceIndex";

export default async function CompanyWorkspaceIndexPage() {
  const viewer = await requireViewer("COMPANY", "/company/workspace");
  const workspaces = await workspaceCards(viewer.userId, viewer.role);

  return <WorkspaceIndex workspaces={workspaces} isCompany />;
}
