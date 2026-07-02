import React from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { EditProjectForm } from "./EditProjectForm";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EditProjectPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    redirect("/login");
  }

  const { projectId } = await params;

  const [project, company] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      include: {
        company: true,
      },
    }),
    db.company.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  if (!project) {
    notFound();
  }

  if (!company || project.companyId !== company.id) {
    redirect("/company/projects");
  }

  // Map database entity to form compatible serializable values
  const serializedProject = {
    id: project.id,
    title: project.title,
    description: project.description,
    budget: project.budget,
    priority: project.priority,
    requiredSkills: project.requiredSkills,
    experienceRequired: project.experienceRequired,
    freelancersLimit: project.freelancersLimit,
    isVisible: project.isVisible,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
          Edit Project Gig
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Modify your project request listing spec. Matches will recalculate automatically.
        </p>
      </div>

      <div className="max-w-2xl">
        <EditProjectForm project={serializedProject} />
      </div>
    </div>
  );
}
