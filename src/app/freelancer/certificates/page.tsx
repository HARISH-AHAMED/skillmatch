import { requireFreelancer } from "@/data/server/context";
import { certificatesFor } from "@/data/server/records";
import { CertificatesClient } from "./CertificatesClient";

export default async function FreelancerCertificatesPage() {
  const { freelancer } = await requireFreelancer("/freelancer/certificates");
  // The owner sees hidden credentials too, so they can put them back.
  const certificates = await certificatesFor(freelancer.id, true);

  return <CertificatesClient certificates={certificates} />;
}
