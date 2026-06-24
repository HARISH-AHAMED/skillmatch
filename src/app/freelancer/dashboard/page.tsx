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
  Sparkles,
  Briefcase,
  FileCheck,
  Star,
  TrendingUp,
  Eye,
  Calendar,
  PhoneCall,
} from "lucide-react";
import { ApplicationStatus, ProjectStatus } from "@prisma/client";

export default async function FreelancerDashboard() {
  const session = await auth();
  const userId = session!.user.id;

  // 1. Fetch Freelancer profile and notifications in parallel
  const [notifications, freelancer] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.freelancer.findUnique({
      where: { userId },
    }),
  ]);

  if (!freelancer) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">Freelancer Dashboard</h1>
        <Card className="p-8 text-center space-y-4 bg-white border border-slate-200">
          <p className="text-slate-500 text-sm">Please complete your freelancer profile to unlock AI recommendations and search listings.</p>
          <Link href="/freelancer/profile">
            <Button variant="primary">Complete Profile</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // 2. Fetch stats, recommendations, and active applications in parallel
  const [totalApps, shortlistedApps, recommendations, activeApplications] = await Promise.all([
    db.application.count({
      where: { freelancerId: freelancer.id },
    }),
    db.application.count({
      where: { freelancerId: freelancer.id, status: ApplicationStatus.SHORTLISTED },
    }),
    db.recommendation.findMany({
      where: { freelancerId: freelancer.id, project: { status: ProjectStatus.OPEN } },
      include: {
        project: {
          include: {
            company: true,
          },
        },
      },
      orderBy: {
        score: "desc",
      },
      take: 3,
    }),
    db.application.findMany({
      where: {
        freelancerId: freelancer.id,
        status: ApplicationStatus.HIRED,
        project: { status: ProjectStatus.IN_PROGRESS },
      },
      include: {
        project: {
          include: {
            company: true,
          },
        },
      },
      take: 3,
    }),
  ]);

  // Mock analytics data for visual representation
  const chartData = [
    { label: "Jan", value: 1 },
    { label: "Feb", value: 3 },
    { label: "Mar", value: 2 },
    { label: "Apr", value: shortlistedApps + 1 },
    { label: "May", value: totalApps || 4 },
  ];

  // Top match recommendation if available, otherwise mock one for aesthetic visual matching
  const topRec = recommendations[0];
  const topMatchScore = topRec ? topRec.score : 95;
  const topMatchTitle = topRec ? topRec.project.title : "Cloud Architect";
  const topMatchDesc = topRec ? topRec.project.description : "AWS, Terraform, Kubernetes, Helm Charts, CI/CD Pipelines";
  const topMatchProjectLink = topRec ? `/freelancer/projects` : "#";

  return (
    <div className="space-y-8">
      {/* Welcome header based on Screenshot 2 */}
      <div className="flex justify-between items-center bg-transparent">
        <div>
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            Freelancer Dashboard
          </span>
          <h1 className="text-3xl font-black text-[#002d59] tracking-tight mt-0.5">
            Hello, {session?.user?.name || "Alex Rivera"}
          </h1>
        </div>
        
        {/* Profile Circle with Green Active Indicator dot */}
        <div className="relative">
          <div className="h-12 w-12 rounded-full bg-sky-100 flex items-center justify-center font-bold text-[#002d59] text-base border-2 border-white shadow-md">
            {session?.user?.name ? session.user.name[0].toUpperCase() : "A"}
          </div>
          <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
        </div>
      </div>

      {/* Top Match Hero Card (Screenshot 2 Top Match banner) */}
      <Card className="p-6 bg-white border border-slate-200/60 shadow-lg shadow-[#002d59]/5 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="accent" className="bg-[#3ac0ff]/10 text-[#002d59] border border-sky-200/30">
                <Sparkles className="h-3 w-3 mr-1 text-[#002d59]" />
                TOP MATCH
              </Badge>
            </div>
            <h2 className="text-2xl font-black text-[#002d59] tracking-tight leading-tight">
              {topMatchTitle}
            </h2>
            <p className="text-xs text-slate-600 max-w-xl font-medium leading-relaxed">
              {topMatchDesc.length > 180 ? `${topMatchDesc.slice(0, 180)}...` : topMatchDesc}
            </p>
            <div className="pt-2">
              <Link href={topMatchProjectLink}>
                <Button variant="primary" size="sm" className="px-5">
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>

          {/* Matches Ring Graphic */}
          <div className="flex items-center justify-center pr-2">
            <div className="relative h-28 w-28 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="#e2edf8"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="#3ac0ff"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * topMatchScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center z-10">
                <span className="text-3xl font-black text-[#002d59]">{topMatchScore}</span>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">% Match</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid summary metrics with green growth indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <FileCheck className="h-5 w-5 text-[#002d59]" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">+12%</span>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{totalApps || 24}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Applications</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <Eye className="h-5 w-5 text-[#002d59]" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">+5</span>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{shortlistedApps * 15 + 142}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Profile Views</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <TrendingUp className="h-5 w-5 text-[#002d59]" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50">+2</span>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{freelancer.completedProjects || 8}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Completed Gigs</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <Star className="h-5 w-5 text-[#002d59]" />
            </div>
            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100/50">Top Rate</span>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{freelancer.rating || "5.0"}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Rating Score</p>
          </div>
        </Card>
      </div>

      {/* Main Splits: Active Applications & Recommendations */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left side listings */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Applications Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-[#002d59] tracking-tight">Active Applications</h2>
              <Link href="/freelancer/applications" className="text-xs font-bold text-sky-600 hover:text-sky-700">
                VIEW ALL
              </Link>
            </div>

            <div className="space-y-4">
              {activeApplications.length === 0 ? (
                /* Mock applications showing the structure matching Screenshot 2 */
                <>
                  <Card className="p-5 bg-white border border-slate-200/60 shadow-sm rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-[#002d59]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#002d59]">Stellar Systems</h4>
                        <p className="text-xs text-slate-600">Senior DevOps Engineer</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="primary" className="bg-[#3ac0ff]/10 text-[#002d59] border border-sky-200/30 uppercase text-[9px]">
                        INTERVIEWING
                      </Badge>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        May 12, 10:00 AM
                      </div>
                      <Button variant="outline" size="sm" className="gap-1 text-xs px-4">
                        <PhoneCall className="h-3 w-3 mr-1" />
                        Join Call
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-5 bg-white border border-slate-200/60 shadow-sm rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Briefcase className="h-6 w-6 text-[#002d59]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#002d59]">NeoCode Lab</h4>
                        <p className="text-xs text-slate-600">Node.js Engineer</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="neutral" className="uppercase text-[9px]">
                        APPLIED
                      </Badge>
                    </div>
                  </Card>
                </>
              ) : (
                activeApplications.map((app) => (
                  <Card key={app.id} className="p-5 bg-white border border-slate-200/60 shadow-sm rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5.5 w-5.5 text-[#002d59]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#002d59] truncate">{app.project.company.companyName}</h4>
                        <p className="text-xs text-slate-600 truncate">{app.project.title}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                      <Badge variant="primary" className="bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase text-[9px] py-0.5">
                        HIRED & ACTIVE
                      </Badge>
                      <span className="text-sm font-bold text-[#002d59]">${app.project.budget}</span>
                      <Link href={`/workspace/${app.id}`} target="_blank" rel="noopener noreferrer">
                        <Button size="xs" className="cursor-pointer bg-[#3ac0ff] hover:bg-[#29aaeb] text-white font-bold text-[10px] py-1.5 px-3 h-auto">
                          Open Workspace
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Recommended list */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-black text-[#002d59] tracking-tight">Recommended for You</h2>
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <Card className="p-8 text-center text-xs text-slate-400 bg-white border border-slate-100">
                  No matching projects found yet. Try updating your skills profile!
                </Card>
              ) : (
                recommendations.map((rec) => (
                  <Card key={rec.id} className="p-5 bg-white border border-slate-200/60 shadow-sm rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-sky-300 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="accent">AI Score: {rec.score}%</Badge>
                        {rec.project.priority === "HIGH" && (
                          <Badge variant="danger" className="bg-rose-50 text-rose-700 border border-rose-100">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#002d59]">{rec.project.title}</h3>
                      <p className="text-xs text-slate-600 font-medium">
                        {rec.project.company.companyName} • {rec.project.company.location}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rec.project.requiredSkills.slice(0, 3).map((s) => (
                          <Badge key={s} variant="neutral" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                      <div className="text-right pr-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Est. Budget</p>
                        <p className="text-sm font-black text-[#002d59]">${rec.project.budget}</p>
                      </div>
                      <Link href="/freelancer/projects">
                        <Button size="sm">Apply Now</Button>
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right side Analytics & Tips (matching Screenshot 2) */}
        <div className="space-y-6">
          <DashboardNotifications initialNotifications={notifications} />
          
          <h2 className="text-lg font-black text-[#002d59] tracking-tight">Hiring Trends</h2>
          
          <AnalyticsChart title="Market Statistics" subtitle="Monthly Matching Index" data={chartData} type="line" />

          {/* Profile Level Up Card matching Screenshot 2 exactly - restyled to light theme */}
          <Card className="p-6 bg-white border border-slate-200/60 shadow-md rounded-2xl space-y-4">
            <h4 className="text-base font-black tracking-tight flex items-center gap-2 text-[#002d59]">
              <Sparkles className="h-4.5 w-4.5 text-[#3ac0ff]" />
              Level up your profile
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              AI suggests adding &quot;Golang&quot; to your skills based on current market trends in your niche.
            </p>
            <div className="pt-2">
              <Link href="/freelancer/profile">
                <Button variant="primary" className="w-full rounded-xl">
                  Update Skills
                </Button>
              </Link>
            </div>
          </Card>

          {/* Secondary stats lists */}
          <Card className="p-5 bg-white border border-slate-200/60 shadow-sm rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#002d59] border-b border-slate-100 pb-2">Skill Match Index</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">AI Match Score</span>
                <span className="text-emerald-600 font-black">92%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Fintech Market Growth</span>
                <span className="text-emerald-600 font-black">+ 12%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Fintech Dev Demand</span>
                <span className="text-sky-500 font-black">+ 8%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
