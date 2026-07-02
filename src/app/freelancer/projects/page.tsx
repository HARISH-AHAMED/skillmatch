import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProjectsBrowser } from "./ProjectsBrowser";

interface PageProps {
  searchParams: Promise<{
    query?: string;
    budget?: string;
    priority?: string;
    experience?: string;
  }>;
}

export default async function FreelancerProjectsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session!.user.id;

  // Parse filters from page parameters
  const params = await searchParams;
  const query = params.query || "";
  const minBudget = params.budget ? Number(params.budget) : 0;
  const priority = params.priority || "";
  const maxExperience = params.experience ? Number(params.experience) : 99;

  // Run database queries in parallel
  const [freelancer, projects, applications, savedProjects] = await Promise.all([
    db.freelancer.findUnique({
      where: { userId },
    }),
    db.project.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        isVisible: true,
        budget: { gte: minBudget },
        experienceRequired: { lte: maxExperience },
        ...(priority && priority !== "ALL" && { priority: priority as any }),
        ...(query && {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { requiredSkills: { hasSome: [query.toLowerCase()] } },
          ],
        }),
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            location: true,
          },
        },
        recommendations: {
          where: { freelancer: { userId } },
          select: { score: true },
        },
        applications: {
          where: { status: "HIRED" },
          select: { id: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.application.findMany({
      where: { freelancer: { userId } },
      select: { projectId: true },
    }),
    db.savedProject.findMany({
      where: { freelancer: { userId } },
      select: { projectId: true },
    }),
  ]);

  if (!freelancer) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
          Browse Projects
        </h1>
        <div className="p-8 text-center bg-white border border-slate-100 shadow-sm rounded-2xl">
          <p className="text-slate-600 text-sm">
            Please complete your profile details first to browse open projects.
          </p>
        </div>
      </div>
    );
  }

  // Filter in-memory to only show projects where the hiring limit is not reached
  const activeProjects = projects.filter((p) => p.applications.length < p.freelancersLimit);

  const appliedProjectIds = applications.map((app) => app.projectId);
  const savedProjectIds = savedProjects.map((sp) => sp.projectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
          Browse Matching Gigs
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Apply to open project requests matching your expertise
        </p>
      </div>

      <ProjectsBrowser
        projects={activeProjects as any}
        appliedProjectIds={appliedProjectIds}
        savedProjectIds={savedProjectIds}
      />
    </div>
  );
}
