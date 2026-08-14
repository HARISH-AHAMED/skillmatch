import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ApplicationsListClient } from "./ApplicationsListClient";

export default async function FreelancerApplicationsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [freelancer, applications] = await Promise.all([
    db.freelancer.findUnique({ where: { userId } }),
    db.application.findMany({
      where: { freelancer: { userId } },
      include: {
        project: {
          include: { company: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!freelancer) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1D29]">My Applications</h1>
        <Card className="p-8 text-center text-[#5B6272] text-xs">
          Please complete your profile to track application records.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1D29]">Application History</h1>
        <p className="text-xs text-[#5B6272] mt-1">
          Monitor status updates and cover letters submitted for active gigs
        </p>
      </div>

      <ApplicationsListClient applications={applications} currentUserId={userId} />
    </div>
  );
}
