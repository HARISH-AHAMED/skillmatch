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
        <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
          Administration
        </span>
        <h1 className="text-3xl font-black text-[#002d59] tracking-tight mt-0.5">
          Admin Control Center
        </h1>
        <p className="text-xs text-slate-505 font-semibold mt-1">
          Monitor platform metrics, user onboarding, database states, and AI logs
        </p>
      </div>

      {/* Grid summary metrics with light background cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <Users className="h-5 w-5 text-[#002d59]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{totalUsers}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Total Users</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <UserSquare2 className="h-5 w-5 text-[#002d59]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{totalFreelancers}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Freelancers</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <Building2 className="h-5 w-5 text-[#002d59]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{totalCompanies}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Companies</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <FolderKanban className="h-5 w-5 text-[#002d59]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{openProjects}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Active Gigs</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3 bg-white border border-slate-200/60 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100/50">
              <FolderKanban className="h-5 w-5 text-[#002d59]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-[#002d59] leading-none">{completedProjects}</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-2">Completed contracts</p>
          </div>
        </Card>
      </div>

      {/* Splitting Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Growth trends chart */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-black text-[#002d59] tracking-tight">Platform Analytics</h2>
          <AnalyticsChart title="User Growth Over Time" subtitle="Overall monthly signed users" data={chartData} type="line" />
        </div>

        {/* Recent logs activity */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-500" />
            <h2 className="text-lg font-black text-[#002d59] tracking-tight">System Activity Logs</h2>
          </div>

          <div className="space-y-3">
            {logs.length === 0 ? (
              <Card className="p-5 text-center text-xs text-slate-500 bg-white border border-slate-200">
                No system activity logs recorded yet.
              </Card>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="p-4 border-slate-200 bg-white text-xs space-y-2 shadow-sm rounded-2xl">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                    <span>{log.admin.name}</span>
                    <span>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-650 font-medium leading-relaxed">
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
