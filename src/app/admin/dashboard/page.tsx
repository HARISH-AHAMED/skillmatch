import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { DashboardNotifications } from "@/components/DashboardNotifications";
import { Users, UserSquare2, Building2, FolderKanban, ClipboardList } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Fetch notifications
  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Query overall counts
  const totalUsers = await db.user.count();
  const totalFreelancers = await db.freelancer.count();
  const totalCompanies = await db.company.count();
  const openProjects = await db.project.count({ where: { status: "OPEN" } });
  const completedProjects = await db.project.count({ where: { status: "COMPLETED" } });

  // Query latest activity logs
  const logs = await db.adminLog.findMany({
    include: {
      admin: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const chartData = [
    { label: "Feb", value: totalFreelancers + 2 },
    { label: "Mar", value: totalCompanies + 1 },
    { label: "Apr", value: openProjects + completedProjects },
    { label: "May", value: totalUsers },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <div className="bg-transparent">
        <span className="text-[11px] font-medium text-[#5B6272] tracking-wider uppercase">
          Administration
        </span>
        <h1 className="text-3xl font-normal text-[#1A1D29] tracking-tight mt-0.5">
          Admin Control Center
        </h1>
        <p className="text-xs text-[#5B6272] font-normal mt-1">
          Monitor platform metrics, user onboarding, database states, and AI logs
        </p>
      </div>

      {/* Grid summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-5 space-y-3 bg-white border border-[#E3E5EA] rounded-lg">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#F8F9FB] border border-[#C7CBD6] flex items-center justify-center">
              <Users className="h-5 w-5 text-[#1A1D29]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#1A1D29] leading-none">{totalUsers}</p>
            <p className="text-[11px] font-medium tracking-wider text-[#5B6272] uppercase mt-2">Total Users</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#E3E5EA] rounded-lg">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#F8F9FB] border border-[#E3E5EA] flex items-center justify-center">
              <UserSquare2 className="h-5 w-5 text-[#1A1D29]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#1A1D29] leading-none">{totalFreelancers}</p>
            <p className="text-[11px] font-medium tracking-wider text-[#5B6272] uppercase mt-2">Freelancers</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#E3E5EA] rounded-lg">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#F8F9FB] border border-[#E3E5EA] flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[#1A1D29]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#1A1D29] leading-none">{totalCompanies}</p>
            <p className="text-[11px] font-medium tracking-wider text-[#5B6272] uppercase mt-2">Companies</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#E3E5EA] rounded-lg">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#F8F9FB] border border-[#E3E5EA] flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-[#1A1D29]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#1A1D29] leading-none">{openProjects}</p>
            <p className="text-[11px] font-medium tracking-wider text-[#5B6272] uppercase mt-2">Active Gigs</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-[#E3E5EA] rounded-lg">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-full bg-[#F8F9FB] border border-[#C7CBD6] flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-[#1A1D29]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-normal text-[#1A1D29] leading-none">{completedProjects}</p>
            <p className="text-[11px] font-medium tracking-wider text-[#5B6272] uppercase mt-2">Completed contracts</p>
          </div>
        </Card>
      </div>

      {/* Splitting Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Growth trends chart */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-normal text-[#1A1D29] tracking-tight">Platform Analytics</h2>
          <AnalyticsChart title="User Growth Over Time" subtitle="Overall monthly signed users" data={chartData} type="line" />
        </div>

        {/* Recent logs activity */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#1A1D29]" />
            <h2 className="text-lg font-normal text-[#1A1D29] tracking-tight">System Activity Logs</h2>
          </div>

          <div className="space-y-3">
            {logs.length === 0 ? (
              <Card className="p-5 text-center text-xs text-[#5B6272] bg-white border border-[#E3E5EA] rounded-lg">
                No system activity logs recorded yet.
              </Card>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="p-4 border-[#E3E5EA] bg-white text-xs space-y-2 rounded-lg">
                  <div className="flex justify-between items-center text-[11px] text-[#5B6272] font-medium uppercase">
                    <span>{log.admin.name}</span>
                    <span>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[#5B6272] font-normal leading-relaxed">
                    {log.action}
                  </p>
                </Card>
              ))
            )}
          </div>

          <DashboardNotifications initialNotifications={notifications} />
        </div>
      </div>
    </div>
  );
}

