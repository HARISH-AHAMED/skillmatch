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
import { getProjectDescriptionText, parseFreelancerMetadata } from "@/lib/workflowHelpers";
import { DeclineInviteButton } from "@/components/DeclineInviteButton";

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

  if (!freelancer || !freelancer.verificationBadges.includes("ONBOARDING_COMPLETED")) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto text-center py-10">
        <div className="p-10 bg-white border border-[#dddddd] shadow-xs rounded-[12px] space-y-6">
          <div className="h-14 w-14 rounded-full bg-[#f8fafc] border border-[#dddddd] flex items-center justify-center mx-auto text-[#181d26]">
            <Sparkles className="h-7 w-7 text-[#181d26]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-normal text-[#181d26]">Complete Your Profile Onboarding</h2>
            <p className="text-xs text-[#333840] leading-relaxed max-w-md mx-auto font-normal">
              To unlock full platform privileges—including AI match recommendations, the project search directory, slot booking calendar, and client workspace applications—you must save your profile settings.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/freelancer/profile">
              <Button variant="primary" className="px-8 py-3 rounded-[12px] font-medium text-xs uppercase tracking-wider cursor-pointer">
                Go to Profile Settings →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Direct invitations from companies (proactive sourcing). Only surface ones
  // still pending — applied/dismissed invites are history, not an action.
  // Declined invites stay visible as history rather than disappearing; only
  // invites already converted into an application drop off the list.
  const pendingInvites = (parseFreelancerMetadata(freelancer.bio).projectInvites ?? []).filter(
    (inv) => inv.status === "PENDING" || inv.status === "DISMISSED"
  );

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
  const topMatchDesc = topRec ? getProjectDescriptionText(topRec.project.description) : "AWS, Terraform, Kubernetes, Helm Charts, CI/CD Pipelines";
  const topMatchProjectLink = topRec ? `/freelancer/projects` : "#";

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex justify-between items-center bg-transparent">
        <div>
          <span className="text-[10px] font-medium text-[#41454d] tracking-wider uppercase">
            Freelancer Dashboard
          </span>
          <h1 className="text-3xl font-normal text-[#181d26] tracking-tight mt-0.5">
            Hello, {session?.user?.name || "Alex Rivera"}
          </h1>
        </div>
        
        {/* Profile Circle */}
        <div className="relative">
          <div className="h-12 w-12 rounded-full bg-[#181d26] flex items-center justify-center font-medium text-white text-base border border-[#dddddd] shadow-xs">
            {session?.user?.name ? session.user.name[0].toUpperCase() : "A"}
          </div>
          <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
        </div>
      </div>

      {/* Top Match Hero Card */}
      <Card className="p-6 bg-white border border-[#dddddd] shadow-xs rounded-[12px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="cream" className="text-[10px]">
                <Sparkles className="h-3 w-3 mr-1 text-[#181d26]" />
                TOP MATCH
              </Badge>
            </div>
            <h2 className="text-2xl font-normal text-[#181d26] tracking-tight leading-tight">
              {topMatchTitle}
            </h2>
            <p className="text-xs text-[#333840] max-w-xl font-normal leading-relaxed">
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
                  stroke="#f8fafc"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="#181d26"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * topMatchScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center z-10">
                <span className="text-3xl font-normal text-[#181d26]">{topMatchScore}</span>
                <p className="text-[9px] font-medium text-[#41454d] uppercase tracking-wider">% Match</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 space-y-3 bg-white border border-[#dddddd] shadow-xs rounded-[12px]">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#f8fafc] border border-[#dddddd] flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-[#181d26]" />
            </div>
            <span className="text-[10px] font-medium text-[#006400] bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#39bf45]/30">+12%</span>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#181d26] leading-none">{totalApps || 24}</p>
            <p className="text-[10px] font-medium tracking-wider text-[#41454d] uppercase mt-2">Applications</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#dddddd] shadow-xs rounded-[12px]">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#f8fafc] border border-[#dddddd] flex items-center justify-center">
              <Eye className="h-5 w-5 text-[#181d26]" />
            </div>
            <span className="text-[10px] font-medium text-[#006400] bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#39bf45]/30">+5</span>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#181d26] leading-none">{shortlistedApps * 15 + 142}</p>
            <p className="text-[10px] font-medium tracking-wider text-[#41454d] uppercase mt-2">Profile Views</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#dddddd] shadow-xs rounded-[12px]">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#f8fafc] border border-[#dddddd] flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-[#181d26]" />
            </div>
            <span className="text-[10px] font-medium text-[#006400] bg-[#f0fdf4] px-2 py-0.5 rounded-full border border-[#39bf45]/30">+2</span>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#181d26] leading-none">{freelancer.completedProjects || 8}</p>
            <p className="text-[10px] font-medium tracking-wider text-[#41454d] uppercase mt-2">Completed Gigs</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#dddddd] shadow-xs rounded-[12px]">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#f8fafc] border border-[#dddddd] flex items-center justify-center">
              <Star className="h-5 w-5 text-[#181d26]" />
            </div>
            <span className="text-[10px] font-medium text-[#1b61c9] bg-[#f8fafc] px-2 py-0.5 rounded-full border border-[#dddddd]">Top Rate</span>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#181d26] leading-none">{freelancer.rating || "5.0"}</p>
            <p className="text-[10px] font-medium tracking-wider text-[#41454d] uppercase mt-2">Rating Score</p>
          </div>
        </Card>
      </div>

      {pendingInvites.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#181d26]" />
            <h2 className="text-sm font-semibold text-[#181d26]">
              You have {pendingInvites.length} project invitation
              {pendingInvites.length === 1 ? "" : "s"}
            </h2>
          </div>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.projectId + inv.invitedAt}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#f8fafc] border border-[#dddddd] rounded-[12px]"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#181d26] truncate">{inv.projectTitle}</p>
                  <p className="text-[11px] text-[#41454d]">
                    Invited by {inv.companyName}
                    {inv.roleName ? " · " + (inv.isApprentice ? "Apprentice on " : "") + inv.roleName : ""}
                  </p>
                  {inv.message && (
                    <p className="text-[11px] text-[#333840] italic mt-1">&quot;{inv.message}&quot;</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {inv.status === "DISMISSED" ? (
                    <Badge variant="neutral" className="text-[10px]">Declined</Badge>
                  ) : (
                    <>
                      <Link href={"/freelancer/projects/" + inv.projectId}>
                        <Button size="sm" className="cursor-pointer">
                          View &amp; Accept
                        </Button>
                      </Link>
                      <DeclineInviteButton projectId={inv.projectId} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Splits: Active Applications & Recommendations */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left side listings */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Applications Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-normal text-[#181d26] tracking-tight">Active Applications</h2>
              <Link href="/freelancer/applications" className="text-xs font-medium text-[#1b61c9] hover:underline">
                VIEW ALL
              </Link>
            </div>

            <div className="space-y-4">
              {activeApplications.length === 0 ? (
                /* Mock applications showing structure */
                <>
                  <Card className="p-5 bg-white border border-[#dddddd] shadow-xs rounded-[12px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-[#181d26] flex items-center justify-center text-white font-medium text-sm">
                        <Briefcase className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#181d26]">Stellar Systems</h4>
                        <p className="text-xs text-[#333840]">Senior DevOps Engineer</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="primary" className="uppercase text-[9px]">
                        INTERVIEWING
                      </Badge>
                      <div className="text-xs text-[#333840] flex items-center gap-1.5 font-normal">
                        <Calendar className="h-3.5 w-3.5" />
                        May 12, 10:00 AM
                      </div>
                      <Button variant="outline" size="sm" className="gap-1 text-xs px-4">
                        <PhoneCall className="h-3 w-3 mr-1" />
                        Join Call
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-5 bg-white border border-[#dddddd] shadow-xs rounded-[12px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-[#181d26] flex items-center justify-center text-white font-medium text-sm">
                        <Briefcase className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#181d26]">NeoCode Lab</h4>
                        <p className="text-xs text-[#333840]">Node.js Engineer</p>
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
                  <Card key={app.id} className="p-5 bg-white border border-[#dddddd] shadow-xs rounded-[12px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-[#181d26] flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[#181d26] truncate">{app.project.company.companyName}</h4>
                        <p className="text-xs text-[#333840] truncate">{app.project.title}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 border-[#dddddd] pt-3 sm:pt-0">
                      <Badge variant="mint" className="uppercase text-[9px] py-0.5">
                        HIRED & ACTIVE
                      </Badge>
                      <span className="text-sm font-semibold text-[#181d26]">${app.project.budget}</span>
                      <Link href={`/workspace/${app.id}`} target="_blank" rel="noopener noreferrer">
                        <Button size="xs" variant="primary" className="cursor-pointer font-medium text-[10px] py-1.5 px-3 h-auto">
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
            <h2 className="text-lg font-normal text-[#181d26] tracking-tight">Recommended for You</h2>
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <Card className="p-8 text-center text-xs text-[#41454d] bg-white border border-[#dddddd] rounded-[12px]">
                  No matching projects found yet. Try updating your skills profile!
                </Card>
              ) : (
                recommendations.map((rec) => (
                  <Card key={rec.id} className="p-5 bg-white border border-[#dddddd] shadow-xs rounded-[12px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#9297a0] transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="cream">AI Score: {rec.score}%</Badge>
                        {rec.project.priority === "HIGH" && (
                          <Badge variant="coral">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-[#181d26]">{rec.project.title}</h3>
                      <p className="text-xs text-[#333840] font-normal">
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

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#dddddd] pt-3 md:pt-0">
                      <div className="text-right pr-2">
                        <p className="text-[10px] text-[#41454d] uppercase font-medium tracking-wider">Est. Budget</p>
                        <p className="text-sm font-semibold text-[#181d26]">${rec.project.budget}</p>
                      </div>
                      <Link href="/freelancer/projects">
                        <Button size="sm" variant="primary">Apply Now</Button>
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right side Analytics & Tips */}
        <div className="space-y-6">
          <DashboardNotifications initialNotifications={notifications} />
          
          <h2 className="text-lg font-normal text-[#181d26] tracking-tight">Hiring Trends</h2>
          
          <AnalyticsChart title="Market Statistics" subtitle="Monthly Matching Index" data={chartData} type="line" />

          {/* Profile Level Up Card */}
          <Card className="p-6 bg-white border border-[#dddddd] shadow-xs rounded-[12px] space-y-4">
            <h4 className="text-base font-normal tracking-tight flex items-center gap-2 text-[#181d26]">
              <Sparkles className="h-4.5 w-4.5 text-[#181d26]" />
              Level up your profile
            </h4>
            <p className="text-xs text-[#333840] leading-relaxed font-normal">
              AI suggests adding &quot;Golang&quot; to your skills based on current market trends in your niche.
            </p>
            <div className="pt-2">
              <Link href="/freelancer/profile">
                <Button variant="primary" className="w-full rounded-[12px]">
                  Update Skills
                </Button>
              </Link>
            </div>
          </Card>

          {/* Secondary stats lists */}
          <Card className="p-5 bg-white border border-[#dddddd] shadow-xs rounded-[12px] space-y-4">
            <h3 className="text-sm font-semibold text-[#181d26] border-b border-[#dddddd] pb-2">Skill Match Index</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#333840] font-normal">AI Match Score</span>
                <span className="text-[#006400] font-semibold">92%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#333840] font-normal">Fintech Market Growth</span>
                <span className="text-[#006400] font-semibold">+ 12%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#333840] font-normal">Fintech Dev Demand</span>
                <span className="text-[#1b61c9] font-semibold">+ 8%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

