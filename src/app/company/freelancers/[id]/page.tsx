import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { FreelancerProfileDetail } from "./FreelancerProfileDetail";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FreelancerProfilePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

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

  // Check if saved by currently logged-in company user
  const savedRecord = await db.savedFreelancer.findFirst({
    where: {
      freelancerId: id,
      company: { userId: session.user.id },
    },
  });
  const isSaved = !!savedRecord;

  return (
    <FreelancerProfileDetail
      freelancer={freelancer as any}
      initialSaved={isSaved}
    />
  );
}
