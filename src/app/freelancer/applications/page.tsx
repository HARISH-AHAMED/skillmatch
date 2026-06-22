import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FileText, Calendar, DollarSign, BrainCircuit } from "lucide-react";
import { ApplicationStatus } from "@prisma/client";

export default async function FreelancerApplicationsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [freelancer, applications] = await Promise.all([
    db.freelancer.findUnique({
      where: { userId },
    }),
    db.application.findMany({
      where: { freelancer: { userId } },
      include: {
        project: {
          include: {
            company: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  if (!freelancer) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">My Applications</h1>
        <Card className="p-8 text-center text-slate-500 text-xs">
          Please complete your profile to track application records.
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.HIRED:
        return <Badge variant="success">Hired / Contract Active</Badge>;
      case ApplicationStatus.SHORTLISTED:
        return <Badge variant="primary">Shortlisted</Badge>;
      case ApplicationStatus.REJECTED:
        return <Badge variant="danger">Rejected / Filled</Badge>;
      case ApplicationStatus.PENDING:
      default:
        return <Badge variant="neutral">Review Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
          Application History
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor status updates and cover letters submitted for active gigs
        </p>
      </div>

      <div className="space-y-4">
        {applications.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-500">
            No active project applications submitted yet.
          </Card>
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="p-6 border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-slate-200">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#002d59]">{app.project.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {app.project.company.companyName} • {app.project.company.location || "Remote"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(app.status)}
                  {app.status === ApplicationStatus.HIRED && (
                    <Link href={`/freelancer/workspace/${app.id}`}>
                      <Button size="xs" className="cursor-pointer bg-[#3ac0ff] hover:bg-[#29aaeb] text-white font-bold text-[10px] py-1 px-3 h-auto">
                        Enter Workspace
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span>Applied: {new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <DollarSign className="h-4 w-4 text-slate-500" />
                  <span>Proposed Budget: ${app.project.budget}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <BrainCircuit className="h-4 w-4 text-slate-500" />
                  <span>AI Match Score: {app.aiScore}%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs leading-relaxed space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Proposal Pitch</span>
                <p className="text-slate-700 italic">&quot;{app.coverLetter}&quot;</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
