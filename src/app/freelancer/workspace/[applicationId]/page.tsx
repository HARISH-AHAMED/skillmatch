import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    applicationId: string;
  }>;
}

export default async function FreelancerWorkspaceRedirectPage({ params }: PageProps) {
  const { applicationId } = await params;
  redirect(`/workspace/${applicationId}`);
}
