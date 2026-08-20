import { requireCompanyViewer } from "@/data/server/context";
import { getCompanyByUserId } from "@/data/server/entities";
import { NewProjectClient } from "./NewProjectClient";

export default async function NewProjectPage() {
  const { viewer } = await requireCompanyViewer("/company/projects/new");
  const company = await getCompanyByUserId(viewer.userId);

  if (!company) return null;

  return <NewProjectClient company={company} />;
}
