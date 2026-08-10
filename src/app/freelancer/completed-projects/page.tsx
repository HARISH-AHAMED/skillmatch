import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CompletedProjectsView } from "./CompletedProjectsView";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function CompletedProjectsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [freelancer, completedProjects] = await Promise.all([
    db.freelancer.findUnique({
      where: { userId },
    }),
    db.project.findMany({
      where: {
        status: "COMPLETED",
        applications: {
          some: {
            freelancer: { userId },
            status: "HIRED",
          },
        },
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
          },
        },
        // The freelancer's own certificate for this contract, surfaced on the card.
        certificates: {
          where: { freelancer: { userId }, revokedAt: null },
          select: { publicId: true },
          take: 1,
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  // Every certificate the freelancer has earned, for the My Certificates tab.
  const certificates = freelancer
    ? await db.certificate.findMany({
        where: { freelancerId: freelancer.id, revokedAt: null },
        orderBy: { issuedAt: "desc" },
        include: { project: { select: { description: true } } },
      })
    : [];

  if (!freelancer) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#181d26]">Completed Projects</h1>
        <Card className="p-8 text-center space-y-4 bg-white border border-slate-200">
          <p className="text-slate-500 text-sm">Please complete your freelancer profile first to access Completed Projects features.</p>
          <Link href="/freelancer/profile">
            <Button variant="primary">Complete Profile</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#181d26]">Completed Projects</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your completed platform contracts and customize your portfolio gallery showcase.
        </p>
      </div>

      <CompletedProjectsView
        freelancer={freelancer as any}
        completedProjects={completedProjects as any}
        certificates={certificates as any}
      />
    </div>
  );
}
