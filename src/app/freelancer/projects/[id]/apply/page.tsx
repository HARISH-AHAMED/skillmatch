import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { ProjectApplyWizard } from "./ProjectApplyWizard";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectApplyPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    redirect("/login");
  }

  const { id: projectId } = await params;

  // Retrieve current freelancer profile details
  const freelancer = await db.freelancer.findUnique({
    where: { userId: session.user.id },
  });

  if (!freelancer) {
    redirect("/freelancer/profile");
  }

  // Force onboarding completion lock
  if (!freelancer.verificationBadges.includes("ONBOARDING_COMPLETED")) {
    redirect("/freelancer/dashboard");
  }

  // Fetch project opportunity details in DB
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      applications: {
        where: { freelancerId: freelancer.id },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const hasApplied = project.applications.length > 0;
  if (hasApplied) {
    redirect(`/freelancer/projects/${project.id}`);
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <ProjectApplyWizard project={project} freelancer={freelancer} />
    </div>
  );
}
