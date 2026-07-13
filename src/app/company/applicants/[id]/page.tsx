import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { ApplicantDetailView } from "./ApplicantDetailView";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ApplicantDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    redirect("/login");
  }

  const { id: applicationId } = await params;

  // Retrieve candidate application from database
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: true,
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

  return (
    <div className="container mx-auto py-8 px-4">
      <ApplicantDetailView application={application} currentUserId={session.user.id} />
    </div>
  );
}
