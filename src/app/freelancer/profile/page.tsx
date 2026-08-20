import { requireViewer } from "@/data/server/context";
import { getFreelancerByUserId } from "@/data/server/entities";
import { certificatesFor } from "@/data/server/records";
import { ProfileClient } from "./ProfileClient";

export default async function FreelancerProfilePage() {
  // Not requireFreelancer: this page is where a freelancer who has no profile
  // row yet creates one, so it must render before the profile exists.
  const viewer = await requireViewer("FREELANCER", "/freelancer/profile");
  const freelancer = await getFreelancerByUserId(viewer.userId);

  if (!freelancer) return null;

  const certificates = await certificatesFor(freelancer.id, true);

  return <ProfileClient freelancer={freelancer} certificates={certificates} />;
}
