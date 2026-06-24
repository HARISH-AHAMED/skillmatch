import React from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FreelancerProfileDetail } from "./FreelancerProfileDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PublicFreelancerProfilePage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;

  // Fetch freelancer detailed data
  const freelancer = await db.freelancer.findUnique({
    where: { id },
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
            take: 10,
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
  });

  if (!freelancer) {
    notFound();
  }

  // Check if saved (only relevant if logged in as a company user)
  let isSaved = false;
  if (session?.user) {
    const savedRecord = await db.savedFreelancer.findFirst({
      where: {
        freelancerId: id,
        company: { userId: session.user.id },
      },
    });
    isSaved = !!savedRecord;
  }

  if (session?.user) {
    return (
      <DashboardLayout role={session.user.role} userName={session.user.name}>
        <FreelancerProfileDetail
          freelancer={freelancer as any}
          initialSaved={isSaved}
        />
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f8ff] flex flex-col">
      {/* Navbar header */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10">
        <FreelancerProfileDetail
          freelancer={freelancer as any}
          initialSaved={isSaved}
        />
      </main>
    </div>
  );
}
