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

  if (!freelancer) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">Completed Projects</h1>
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
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">Completed Projects</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your completed platform contracts and customize your portfolio gallery showcase.
        </p>
      </div>

      <CompletedProjectsView
        freelancer={freelancer as any}
        completedProjects={completedProjects as any}
      />
    </div>
  );
}
