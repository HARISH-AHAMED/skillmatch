import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProjectsBrowser } from "./ProjectsBrowser";
import { getProjectMetadataDirect } from "@/lib/workflowHelpers";

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
        <h1 className="text-3xl font-extrabold tracking-tight text-[#181d26]">
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

  // Filter in-memory to only show projects where the hiring limit is not reached.
  // The reward filter is also applied here rather than in the query, because the
  // payment category lives in the description metadata JSON, not a column.
  const activeProjects = projects
    .filter((p) => p.applications.length < p.freelancersLimit)
    .filter((p) => {
      if (reward === "ALL") return true;
      const category = getProjectMetadataDirect(p.description).paymentCategory || "FIXED";
      if (reward === "NON_MONETARY") return category === "NON_MONETARY";
      if (reward === "HYBRID") return category === "HYBRID";
      // "PAID" means any cash-bearing arrangement, including hybrid.
      return category !== "NON_MONETARY";
    });

  const appliedProjectIds = applications.map((app) => app.projectId);
  const savedProjectIds = savedProjects.map((sp) => sp.projectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#181d26]">
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
        freelancer={freelancer}
      />
    </div>
  );
}
