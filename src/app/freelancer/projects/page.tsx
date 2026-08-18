import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProjectsBrowser } from "./ProjectsBrowser";
import { rewardWhere } from "@/lib/browseFilters";

interface PageProps {
  searchParams: Promise<{
    query?: string;
    budget?: string;
    priority?: string;
    domain?: string;
    experience?: string;
    reward?: string;
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
  const domain = params.domain || "";
  const maxExperience = params.experience ? Number(params.experience) : 99;
  const reward = params.reward || "ALL";

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
        // PERF-002 — compensation filtering happens in SQL, before any rows
        // are returned. AND keeps it independent of the text-search OR.
        ...(rewardWhere(reward) ? { AND: [rewardWhere(reward)!] } : {}),
        ...(priority && priority !== "ALL" && { priority: priority as any }),
        ...(domain && domain !== "ALL" && { domain }),
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
            logoUrl: true,
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
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1D29]">
          Browse Projects
        </h1>
        <div className="p-8 text-center bg-white border border-[#E3E5EA] rounded-lg">
          <p className="text-[#5B6272] text-sm">
            Please complete your profile details first to browse open projects.
          </p>
        </div>
      </div>
    );
  }

  // Capacity is still applied here: it depends on the included application
  // count, not on metadata. The reward filter now runs in SQL (PERF-002).
  const activeProjects = projects.filter((p) => p.applications.length < p.freelancersLimit);

  const appliedProjectIds = applications.map((app) => app.projectId);
  const savedProjectIds = savedProjects.map((sp) => sp.projectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1D29]">
          Browse Matching Gigs
        </h1>
        <p className="text-xs text-[#5B6272] mt-1">
          Apply to open project requests matching your expertise
        </p>
      </div>

      <ProjectsBrowser
        projects={activeProjects as any}
        appliedProjectIds={appliedProjectIds}
        savedProjectIds={savedProjectIds}
        freelancer={freelancer}
      />
    </div>
  );
}
