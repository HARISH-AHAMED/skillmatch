import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ApplicantsList } from "./ApplicantsList";

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function CompanyApplicantsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session!.user.id;

  const params = await searchParams;
  const projectId = params.projectId;

  // Run database queries in parallel
  const [company, projects, applicants] = await Promise.all([
    db.company.findUnique({
      where: { userId },
    }),
    db.project.findMany({
      where: { company: { userId } },
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.application.findMany({
      where: {
        project: {
          company: { userId },
          ...(projectId && { id: projectId }),
        },
      },
      include: {
        project: {
          select: {
            title: true,
            status: true,
          },
        },
        freelancer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                reviewsReceived: {
                  include: {
                    reviewer: {
                      select: {
                        name: true,
                      },
                    },
                    project: {
                      select: {
                        title: true,
                        budget: true,
                      },
                    },
                  },
                  orderBy: {
                    createdAt: "desc",
                  },
                },
              },
            },
            applications: {
              where: {
                status: "HIRED",
                project: {
                  status: "COMPLETED",
                },
              },
              include: {
                project: {
                  include: {
                    company: {
                      select: {
                        companyName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        aiScore: "desc",
      },
    }),
  ]);

  if (!company) {
    return (
      <div className="p-8 text-center bg-white border border-slate-100 shadow-sm rounded-2xl text-slate-500 text-xs">
        Complete your company profile to review applicants.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
          Review Proposals
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Evaluate applications ranked automatically by our AI recommendation engine
        </p>
      </div>

      <ApplicantsList
        applicants={applicants as any}
        projects={projects as any}
        selectedProjectId={projectId}
      />
    </div>
  );
}
