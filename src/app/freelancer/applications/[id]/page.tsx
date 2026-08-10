import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { FreelancerApplicationDetailView } from "./FreelancerApplicationDetailView";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FreelancerApplicationDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    redirect("/login");
  }

  const { id: applicationId } = await params;

  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: {
        include: {
          company: true,
        },
      },
      freelancer: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!application) {
    notFound();
  }

  // Ensure freelancer owns this application
  if (application.freelancer.userId !== session.user.id) {
    redirect("/freelancer/applications");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <FreelancerApplicationDetailView application={application} currentUserId={session.user.id} />
    </div>
  );
}
