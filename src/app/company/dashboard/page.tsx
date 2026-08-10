import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { DashboardNotifications } from "@/components/DashboardNotifications";
import {
  Users,
  FileCheck,
  Zap,
  TrendingUp,
  PlusCircle,
  FolderOpen,
} from "lucide-react";
import { ProjectStatus, ApplicationStatus } from "@prisma/client";
import { CompanyOnboardingWizard } from "@/components/CompanyOnboardingWizard";

export default async function CompanyDashboard() {
  const session = await auth();
  const userId = session!.user.id;

  // 1. Fetch Company profile and notifications in parallel
  const [notifications, company] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.company.findUnique({
      where: { userId },
    }),
  ]);

  if (!company || !company.verificationBadges.includes("ONBOARDING_COMPLETED")) {
    return (
      <CompanyOnboardingWizard
        company={
          company || {
            id: "",
            companyName: session?.user?.name || "Company",
            description: null,
            industry: null,
            website: null,
            location: null,
            verificationBadges: [],
            companySize: null,
            foundedYear: null,
            missionVision: null,
            workCulture: null,
            hiringPhilosophy: null,
            benefits: [],
          }
        }
      />
    );
  }

  // 2. Fetch stats and projects in parallel
  const [
    activeProjectsCount,
    totalApplicantsCount,
    hiredCount,
    completedProjectsCount,
    recentProjects,
    latestActiveProject,
  ] = await Promise.all([
    db.project.count({
      where: { companyId: company.id, status: ProjectStatus.OPEN },
    }),
    db.application.count({
      where: { project: { companyId: company.id } },
    }),
    db.application.count({
      where: { project: { companyId: company.id }, status: ApplicationStatus.HIRED },
    }),
    db.project.count({
      where: { companyId: company.id, status: ProjectStatus.COMPLETED },
    }),
    db.project.findMany({
      where: { companyId: company.id },
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.project.findFirst({
      where: { companyId: company.id, status: ProjectStatus.OPEN },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 3. Fetch top AI recommendations across active projects
  let topAIRecommendations: {
    id: string;
    score: number;
    freelancer: {
      experienceYears: number;
      rating: number;
      user: {
        name: string | null;
        image: string | null;
        email: string | null;
      };
    };
  }[] = [];
  if (latestActiveProject) {
    topAIRecommendations = await db.recommendation.findMany({
      where: { projectId: latestActiveProject.id },
      include: {
        freelancer: {
          include: {
            user: {
              select: { name: true, image: true, email: true },
            },
          },
        },
      },
      orderBy: { score: "desc" },
      take: 4,
    });
  }

  // Analytics mock data
  const hiringAnalytics = [
    { label: "Feb", value: 2 },
    { label: "Mar", value: totalApplicantsCount || 3 },
    { label: "Apr", value: 4 },
    { label: "May", value: hiredCount || 2 },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-transparent">
        <div>
          <span className="text-[10px] font-medium text-[#41454d] tracking-wider uppercase">
            Company Portal
          </span>
          <h1 className="text-3xl font-normal text-[#181d26] tracking-tight mt-0.5">
            {company.companyName} Dashboard
          </h1>
          <p className="text-xs text-[#333840] font-normal mt-1">
            Manage your project requests and evaluate AI recommendation profiles
          </p>
        </div>
        <Link href="/company/projects/new">
          <Button variant="primary" className="gap-2 cursor-pointer rounded-[12px]">
            <PlusCircle className="h-4 w-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Grid summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 space-y-3 bg-white border border-[#dddddd] shadow-xs rounded-[12px]">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#f8fafc] border border-[#dddddd] flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-[#181d26]" />
            </div>
            <span className="text-[10px] font-medium text-[#1b61c9] bg-[#f8fafc] px-2 py-0.5 rounded-full border border-[#dddddd]">Open</span>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#181d26] leading-none">{activeProjectsCount}</p>
            <p className="text-[10px] font-medium tracking-wider text-[#41454d] uppercase mt-2">Active Jobs</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#dddddd] shadow-xs rounded-[12px]">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#f8fafc] border border-[#dddddd] flex items-center justify-center">
              <Users className="h-5 w-5 text-[#181d26]" />
            </div>
            <span className="text-[10px] font-medium text-[#006400] bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#39bf45]/30">+12%</span>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#181d26] leading-none">{totalApplicantsCount}</p>
            <p className="text-[10px] font-medium tracking-wider text-[#41454d] uppercase mt-2">Total Applicants</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#dddddd] shadow-xs rounded-[12px]">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#f8fafc] border border-[#dddddd] flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-[#181d26]" />
            </div>
            <span className="text-[10px] font-medium text-[#006400] bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#39bf45]/30">+3</span>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#181d26] leading-none">{hiredCount}</p>
            <p className="text-[10px] font-medium tracking-wider text-[#41454d] uppercase mt-2">Freelancers Hired</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#dddddd] shadow-xs rounded-[12px]">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#f8fafc] border border-[#dddddd] flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-[#181d26]" />
            </div>
            <span className="text-[10px] font-medium text-[#006400] bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#39bf45]/30">+1</span>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#181d26] leading-none">{completedProjectsCount}</p>
            <p className="text-[10px] font-medium tracking-wider text-[#41454d] uppercase mt-2">Completed contracts</p>
          </div>
        </Card>
      </div>

      {/* Dashboard split content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Active projects list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-normal text-[#181d26] tracking-tight">Active Postings</h2>
            <Link href="/company/projects" className="text-xs text-[#1b61c9] hover:underline font-medium">
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {recentProjects.length === 0 ? (
              <Card className="p-8 text-center text-xs text-[#41454d] bg-white border border-[#dddddd] rounded-[12px]">
                You haven&apos;t posted any projects yet.
              </Card>
            ) : (
              recentProjects.map((p) => (
                <Card key={p.id} className="p-5 bg-white border border-[#dddddd] shadow-xs rounded-[12px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#181d26]">{p.title}</span>
                      {p.status === ProjectStatus.OPEN ? (
                        <Badge variant="mint">Open</Badge>
                      ) : p.status === ProjectStatus.IN_PROGRESS ? (
                        <Badge variant="primary">In Progress</Badge>
                      ) : (
                        <Badge variant="neutral">Completed</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#333840] max-w-sm line-clamp-1">
                      {p.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[#dddddd] pt-3 sm:pt-0">
                    <div className="text-center sm:text-right pr-2">
                      <span className="text-[10px] text-[#41454d] block uppercase font-medium tracking-wider">Applicants</span>
                      <span className="text-sm font-semibold text-[#181d26]">{p._count.applications}</span>
                    </div>
                    <Link href={`/company/applicants?projectId=${p.id}`}>
                      <Button size="sm" variant="outline">
                        View Applicants
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* AI Recommendations widget & Charts */}
        <div className="space-y-6">
          <DashboardNotifications initialNotifications={notifications} />
          
          <h2 className="text-lg font-normal text-[#181d26] tracking-tight">Hiring Trends</h2>
          <AnalyticsChart title="Applicant Flow" subtitle="Successful contracts month over month" data={hiringAnalytics} type="bar" />

          {/* AI recommendations panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#181d26] flex items-center gap-1.5">
                <Zap className="h-4.5 w-4.5 text-[#181d26]" />
                AI Top Recommendations
              </h3>
            </div>
            
            {topAIRecommendations.length === 0 ? (
              <Card className="p-5 text-center text-xs text-[#41454d] bg-white border border-[#dddddd] rounded-[12px]">
                Post an open project to view calculated recommendations.
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] text-[#41454d] font-medium mb-1">
                  Matching for project: <strong className="text-[#181d26]">{latestActiveProject!.title}</strong>
                </p>
                {topAIRecommendations.map((rec) => (
                  <Card key={rec.id} className="p-3.5 border-[#dddddd] bg-[#f8fafc] hover:bg-white transition-all flex justify-between items-center gap-3 rounded-[10px]">
                    <div className="overflow-hidden space-y-0.5">
                      <p className="text-xs font-semibold text-[#181d26] truncate">{rec.freelancer.user.name}</p>
                      <p className="text-[10px] text-[#41454d] font-normal">Exp: {rec.freelancer.experienceYears} Years • Rating: {rec.freelancer.rating}/5</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="cream" className="text-[9px]">Match {rec.score}%</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

