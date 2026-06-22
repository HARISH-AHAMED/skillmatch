import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { FreelancerSearch } from "./FreelancerSearch";
import { TopFreelancers, type TopFreelancerItem } from "@/components/TopFreelancers";

interface SearchParams {
  skills?: string;
  minExperience?: string;
  maxExperience?: string;
  location?: string;
  minRating?: string;
  minCompleted?: string;
  availability?: string;
  sortBy?: string;
  q?: string;
}

export default async function CompanyFreelancersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth(); // Ensure authenticated (layout handles redirect)
  if (!session?.user) {
    return null;
  }

  const userId = session.user.id;
  const params = await searchParams;

  // Build dynamic Prisma where clause from URL search params
  const skillFilter = params.skills
    ? params.skills
        .toLowerCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const minExp = params.minExperience ? parseInt(params.minExperience) : undefined;
  const maxExp = params.maxExperience ? parseInt(params.maxExperience) : undefined;
  const minRating = params.minRating ? parseFloat(params.minRating) : undefined;
  const minCompleted = params.minCompleted ? parseInt(params.minCompleted) : undefined;
  const availability = params.availability || "";

  const sortBy = params.sortBy || "rating";

  const orderByMap: Record<string, object> = {
    rating: { rating: "desc" },
    experience: { experienceYears: "desc" },
    completed: { completedProjects: "desc" },
    newest: { user: { createdAt: "desc" } },
  };

  // Run independent database queries in parallel
  const [company, freelancers, savedRecords, allFreelancers] = await Promise.all([
    db.company.findUnique({ where: { userId } }),
    db.freelancer.findMany({
      where: {
        // Skill filter: ALL specified skills must be in the array
        ...(skillFilter.length > 0 && {
          skills: { hasEvery: skillFilter },
        }),
        // Experience range
        ...(minExp !== undefined && { experienceYears: { gte: minExp } }),
        ...(maxExp !== undefined && { experienceYears: { lte: maxExp } }),
        // Rating filter
        ...(minRating !== undefined && { rating: { gte: minRating } }),
        // Completed projects minimum
        ...(minCompleted !== undefined && { completedProjects: { gte: minCompleted } }),
        // Availability status
        ...(availability && availability !== "ALL" && { availabilityStatus: availability }),
        // Name/keyword search via user name
        ...(params.q && {
          OR: [
            { bio: { contains: params.q, mode: "insensitive" } },
            { professionalHeadline: { contains: params.q, mode: "insensitive" } },
            { user: { name: { contains: params.q, mode: "insensitive" } } },
          ],
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            reviewsReceived: {
              select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
                reviewer: { select: { name: true } },
                project: { select: { title: true, budget: true } },
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
        applications: {
          where: { status: "HIRED" },
          select: {
            id: true,
            project: {
              select: {
                id: true,
                title: true,
                budget: true,
                company: { select: { companyName: true } },
              },
            },
          },
          take: 10,
        },
      },
      orderBy: orderByMap[sortBy] || { rating: "desc" },
      take: 50,
    }),
    db.savedFreelancer.findMany({
      where: { company: { userId } },
      select: { freelancerId: true },
    }),
    db.freelancer.findMany({
      include: {
        user: { select: { id: true, name: true, image: true } },
        applications: {
          where: { status: "HIRED" },
          select: { aiScore: true },
        },
      },
      orderBy: { rating: "desc" },
      take: 100,
    }),
  ]);

  // Fetch saved freelancer details using the saved records
  const savedFreelancerIds = savedRecords.map((r) => r.freelancerId);
  const savedFreelancers = savedFreelancerIds.length > 0
    ? await db.freelancer.findMany({
        where: {
          id: { in: savedFreelancerIds },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              reviewsReceived: {
                select: {
                  id: true,
                  rating: true,
                  comment: true,
                  createdAt: true,
                  reviewer: { select: { name: true } },
                  project: { select: { title: true, budget: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
            },
          },
          applications: {
            where: { status: "HIRED" },
            select: {
              id: true,
              project: {
                select: {
                  id: true,
                  title: true,
                  budget: true,
                  company: { select: { companyName: true } },
                },
              },
            },
            take: 10,
          },
        },
      })
    : [];

  // Composite score: rating*40% + completedProjects*30% + avgAiScore*30% (all normalized to 0-100)
  const MAX_RATING = 5;
  const MAX_PROJECTS = 50;
  const scored: TopFreelancerItem[] = allFreelancers
    .map((f) => {
      const avgAiScore =
        f.applications.length > 0
          ? f.applications.reduce((sum, a) => sum + a.aiScore, 0) / f.applications.length
          : 0;
      const ratingNorm = (f.rating / MAX_RATING) * 100;
      const projectNorm = (Math.min(f.completedProjects, MAX_PROJECTS) / MAX_PROJECTS) * 100;
      const compositeScore = ratingNorm * 0.4 + projectNorm * 0.3 + avgAiScore * 0.3;
      return {
        id: f.id,
        rank: 0,
        name: f.user.name || "Unknown",
        image: f.user.image,
        headline: f.professionalHeadline,
        skills: f.skills.slice(0, 6),
        rating: f.rating,
        completedProjects: f.completedProjects,
        avgAiScore,
        compositeScore,
        availabilityStatus: f.availabilityStatus,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 10)
    .map((f, idx) => ({ ...f, rank: idx + 1 }));

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
          Company Portal
        </span>
        <h1 className="text-3xl font-black text-[#002d59] tracking-tight mt-0.5">
          Search Freelancers
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Discover and filter top freelancers by skills, experience, rating, availability and more.
        </p>
      </div>

      {/* Top Talent Leaderboard */}
      {scored.length > 0 && (
        <div className="bg-gradient-to-br from-slate-50 via-white to-amber-50/30 border border-amber-100/60 rounded-3xl p-6 shadow-sm relative z-10">
          <TopFreelancers topFreelancers={scored} />
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search &amp; Filter</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <FreelancerSearch
        freelancers={freelancers as any}
        savedFreelancerIds={savedFreelancerIds}
        savedFreelancers={savedFreelancers as any}
        initialParams={{
          q: params.q || "",
          skills: params.skills || "",
          minExperience: params.minExperience || "",
          maxExperience: params.maxExperience || "",
          minRating: params.minRating || "",
          minCompleted: params.minCompleted || "",
          availability: params.availability || "ALL",
          sortBy: params.sortBy || "rating",
        }}
      />
    </div>
  );
}
