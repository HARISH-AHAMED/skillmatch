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

  if (!company) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">Company Dashboard</h1>
        <Card className="p-8 text-center space-y-4 bg-white border border-slate-200">
          <p className="text-slate-500 text-sm">
            Please complete your company profile details to unlock project postings and applicant scoring features.
          </p>
          <Link href="/company/dashboard">
            <Button variant="primary">Configure Settings</Button>
          </Link>
        </Card>
      </div>
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
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            Company Portal
          </span>
          <h1 className="text-3xl font-black text-[#002d59] tracking-tight mt-0.5">
            {company.companyName} Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage your project requests and evaluate AI recommendation profiles
          </p>
        </div>
        <Link href="/company/projects/new">
          <Button variant="primary" className="gap-2 cursor-pointer rounded-xl">
            <PlusCircle className="h-4 w-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Grid summary metrics with light background cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <FolderOpen className="h-5 w-5 text-[#002d59]" />
            </div>
            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100/50">Open</span>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{activeProjectsCount}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Active Jobs</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <Users className="h-5 w-5 text-[#002d59]" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">+12%</span>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{totalApplicantsCount}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Total Applicants</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <FileCheck className="h-5 w-5 text-[#002d59]" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">+3</span>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{hiredCount}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Freelancers Hired</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <TrendingUp className="h-5 w-5 text-[#002d59]" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">+1</span>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{completedProjectsCount}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Completed contracts</p>
          </div>
        </Card>
      </div>

      {/* Dashboard split content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Active projects list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-[#002d59] tracking-tight">Active Postings</h2>
            <Link href="/company/projects" className="text-xs text-sky-600 hover:text-sky-700 font-bold">
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {recentProjects.length === 0 ? (
              <Card className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200">
                You haven&apos;t posted any projects yet.
              </Card>
            ) : (
              recentProjects.map((p) => (
                <Card key={p.id} className="p-5 bg-white border border-slate-200/60 shadow-sm rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#002d59]">{p.title}</span>
                      {p.status === ProjectStatus.OPEN ? (
                        <Badge variant="success">Open</Badge>
                      ) : p.status === ProjectStatus.IN_PROGRESS ? (
                        <Badge variant="primary">In Progress</Badge>
                      ) : (
                        <Badge variant="neutral">Completed</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-550 max-w-sm line-clamp-1">
                      {p.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <div className="text-center sm:text-right pr-2">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Applicants</span>
                      <span className="text-sm font-black text-[#002d59]">{p._count.applications}</span>
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
          
          <h2 className="text-lg font-black text-[#002d59] tracking-tight">Hiring Trends</h2>
          <AnalyticsChart title="Applicant Flow" subtitle="Successful contracts month over month" data={hiringAnalytics} type="bar" />

          {/* AI recommendations panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#002d59] flex items-center gap-1.5">
                <Zap className="h-4.5 w-4.5 text-sky-500" />
                AI Top Recommendations
              </h3>
            </div>
            
            {topAIRecommendations.length === 0 ? (
              <Card className="p-5 text-center text-xs text-slate-500 bg-white border border-slate-200">
                Post an open project to view calculated recommendations.
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-500 font-semibold mb-1">
                  Matching for project: <strong className="text-[#002d59]">{latestActiveProject!.title}</strong>
                </p>
                {topAIRecommendations.map((rec) => (
                  <Card key={rec.id} className="p-3.5 border-slate-200 bg-sky-50/20 hover:bg-[#3ac0ff]/5 transition-all flex justify-between items-center gap-3">
                    <div className="overflow-hidden space-y-0.5">
                      <p className="text-xs font-bold text-[#002d59] truncate">{rec.freelancer.user.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Exp: {rec.freelancer.experienceYears} Years • Rating: {rec.freelancer.rating}★</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="accent" className="text-[9px]">Match {rec.score}%</Badge>
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
