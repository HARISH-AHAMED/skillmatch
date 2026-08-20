import { requireViewer } from "@/data/server/context";
import { getCompanyByUserId } from "@/data/server/entities";
import { ProfileClient } from "./ProfileClient";

export default async function CompanyProfilePage() {
  // Not requireCompanyViewer: this page is where a company with no profile row
  // completes one, so it has to render before the profile exists.
  const viewer = await requireViewer("COMPANY", "/company/profile");
  const company = await getCompanyByUserId(viewer.userId);

  if (!company) return null;

  return <ProfileClient company={company} />;
}
