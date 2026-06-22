import React from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { CompanyProfileView } from "./CompanyProfileView";
import { Role } from "@prisma/client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PublicCompanyProfilePage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth();
  const currentUserId = session?.user?.id || null;
  const isFreelancer = session?.user?.role === Role.FREELANCER;

  // Run database queries in parallel
  const [company, projects, reviews, freelancer, apps, saved] = await Promise.all([
    db.company.findUnique({
      where: { id },
    }),
    db.project.findMany({
      where: {
        companyId: id,
        status: "OPEN",
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.review.findMany({
      where: {
        reviewee: { companyProfile: { id } },
      },
      include: {
        reviewer: {
          select: {
            name: true,
            image: true,
          },
        },
        project: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    isFreelancer && currentUserId
      ? db.freelancer.findUnique({
          where: { userId: currentUserId },
        })
      : Promise.resolve(null),
    isFreelancer && currentUserId
      ? db.application.findMany({
          where: { freelancer: { userId: currentUserId } },
          select: { projectId: true },
        })
      : Promise.resolve([]),
    isFreelancer && currentUserId
      ? db.savedProject.findMany({
          where: { freelancer: { userId: currentUserId } },
          select: { projectId: true },
        })
      : Promise.resolve([]),
  ]);

  if (!company) {
    notFound();
  }

  const isCompanyOwner = currentUserId === company.userId;
  const initialAppliedProjectIds = apps ? apps.map((a) => a.projectId) : [];
  const initialSavedProjectIds = saved ? saved.map((s) => s.projectId) : [];

  // Follow/alerts/watchlist initial states
  const initialFollowState = currentUserId ? company.followers.includes(currentUserId) : false;
  const initialAlertState = currentUserId ? company.jobAlertsUsers.includes(currentUserId) : false;
  const initialWatchlistState = currentUserId ? company.watchlistUsers.includes(currentUserId) : false;
  const initialCommunityState = currentUserId ? company.talentCommunity.includes(currentUserId) : false;

  return (
    <div className="min-h-screen bg-[#f4f8ff] flex flex-col">
      {/* Navbar header */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10">
        <CompanyProfileView
          company={company as any}
          projects={projects}
          reviews={reviews}
          currentUserId={currentUserId}
          isCompanyOwner={isCompanyOwner}
          isFreelancer={isFreelancer}
          initialAppliedProjectIds={initialAppliedProjectIds}
          initialSavedProjectIds={initialSavedProjectIds}
          initialFollowState={initialFollowState}
          initialAlertState={initialAlertState}
          initialWatchlistState={initialWatchlistState}
          initialCommunityState={initialCommunityState}
        />
      </main>
    </div>
  );
}
