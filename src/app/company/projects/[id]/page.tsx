import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { ProjectDetailsView } from "./ProjectDetailsView";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyProjectDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    redirect("/login");
  }

  const { id: projectId } = await params;

  // Retrieve project detail specifications
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      applications: {
        where: { status: "HIRED" },
        include: {
          freelancer: {
            include: {
              user: true,
            },
          },
        },
      },
      _count: {
        select: { applications: true },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Double check company owns project
  const company = await db.company.findUnique({
    where: { userId: session.user.id },
  });

  if (!company || project.companyId !== company.id) {
    redirect("/company/projects");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <ProjectDetailsView project={project} />
    </div>
  );
}
