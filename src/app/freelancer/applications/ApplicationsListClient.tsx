"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FreelancerApplicationCard } from "./FreelancerApplicationCard";
import { parseApplicationMetadata } from "@/lib/workflowHelpers";
import {
  LayoutGrid,
  List,
  Calendar,
  DollarSign,
  BrainCircuit,
  Video,
  ExternalLink,
  CheckCircle,
  X,
  Gift,
  ChevronRight,
} from "lucide-react";

interface ApplicationsListClientProps {
  applications: any[];
  currentUserId: string;
}

export function ApplicationsListClient({ applications, currentUserId }: ApplicationsListClientProps) {
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const getStatusStyle = (status: string, pendingTeamMatch?: boolean) => {
    if (pendingTeamMatch) return "bg-amber-100 text-amber-800 border-amber-200";
    switch (status) {
      case "HIRED": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "SHORTLISTED": return "bg-sky-100 text-sky-800 border-sky-200";
      case "REJECTED": return "bg-rose-100 text-rose-800 border-rose-200";
      default: return "bg-[#EDEFF2] text-[#5A6472] border-[#E2E5EA]";
    }
  };

  const getStatusLabel = (
    status: string,
    projectStatus: string,
    roleId?: string | null,
    teamConfirmedAt?: Date | string | null
  ) => {
    if (status === "HIRED" && projectStatus === "COMPLETED") return "Completed";
    // Role-based hires are not fully placed until the freelancer confirms the team.
    if (status === "HIRED" && roleId && !teamConfirmedAt) return "Team Match Pending";
    switch (status) {
      case "HIRED": return "Hired";
      case "SHORTLISTED": return "Shortlisted";
      case "REJECTED": return "Rejected";
      default: return "Pending Review";
    }
  };

  const getActiveStage = (app: any) => {
    const meta = parseApplicationMetadata(app.coverLetter);
    return meta.pipelineHistory?.length > 0
      ? meta.pipelineHistory[meta.pipelineHistory.length - 1].stage
      : "Applied";
  };

  const hasOffer = (app: any) => {
    const meta = parseApplicationMetadata(app.coverLetter);
    return meta.offerLetter?.status === "PENDING";
  };

  const hasInterview = (app: any) => {
    const meta = parseApplicationMetadata(app.coverLetter);
    const latestInterview = [...(meta.pipelineHistory || [])].reverse().find((h: any) => h.meetingLink);
    const conducted = meta.pipelineHistory?.some((h: any) => h.stage === "Interview Conducted");
    const cancelled = meta.pipelineHistory?.some((h: any) => h.stage === "Interview Cancelled");
    return latestInterview && !conducted && !cancelled;
  };

  if (applications.length === 0) {
    return (
      <Card className="p-8 text-center text-xs text-[#5A6472]">
        No active project applications submitted yet.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* View toggle toolbar */}
      <div className="flex items-center justify-between text-left">
        <p className="text-xs text-[#5A6472] font-normal">{applications.length} application{applications.length !== 1 ? "s" : ""} found</p>
        <div className="flex items-center gap-1 bg-[#F7F8FA] border border-[#E2E5EA] p-1 rounded-[12px]">
          <button
            onClick={() => setViewMode("card")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${viewMode === "card" ? "bg-[#181d26] text-white" : "text-[#5A6472] hover:text-[#181d26]"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${viewMode === "table" ? "bg-[#181d26] text-white" : "text-[#5A6472] hover:text-[#181d26]"}`}
          >
            <List className="h-3.5 w-3.5" /> Table
          </button>
        </div>
      </div>

      {/* ═══ CARD VIEW ═══ */}
      {viewMode === "card" && (
        <div className="space-y-4">
          {applications.map((app) => (
            <FreelancerApplicationCard key={app.id} app={app} currentUserId={currentUserId} />
          ))}
        </div>
      )}

      {/* ═══ TABLE VIEW ═══ */}
      {viewMode === "table" && (
        <Card className="p-0 border-[#E2E5EA]/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap min-w-[900px]">
              <thead>
                <tr className="bg-[#f8faff] border-b border-[#E2E5EA]">
                  <th className="px-4 py-3 text-left font-black text-[#181d26] uppercase tracking-wider text-[10px]">Project</th>
                  <th className="px-4 py-3 text-left font-black text-[#181d26] uppercase tracking-wider text-[10px]">Company</th>
                  <th className="px-4 py-3 text-left font-black text-[#181d26] uppercase tracking-wider text-[10px]">Stage</th>
                  <th className="px-4 py-3 text-left font-black text-[#181d26] uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-4 py-3 text-left font-black text-[#181d26] uppercase tracking-wider text-[10px]">Budget</th>
                  <th className="px-4 py-3 text-left font-black text-[#181d26] uppercase tracking-wider text-[10px]">AI Score</th>
                  <th className="px-4 py-3 text-left font-black text-[#181d26] uppercase tracking-wider text-[10px]">Applied</th>
                  <th className="px-4 py-3 text-left font-black text-[#181d26] uppercase tracking-wider text-[10px]">Alerts</th>
                  <th className="px-4 py-3 text-left font-black text-[#181d26] uppercase tracking-wider text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEFF2]">
                {applications.map((app) => {
                  const stage = getActiveStage(app);
                  const pendingOffer = hasOffer(app);
                  const scheduledInterview = hasInterview(app);
                  return (
                    <tr key={app.id} className="hover:bg-[#F7F8FA]/70 transition-colors">
                      {/* Project */}
                      <td className="px-4 py-3 text-left">
                        <p className="font-bold text-[#181d26] truncate max-w-[160px]">{app.project.title}</p>
                      </td>
                      {/* Company */}
                      <td className="px-4 py-3 text-left">
                        <p className="font-semibold text-[#333840] truncate max-w-[120px]">{app.project.company.companyName}</p>
                        <p className="text-[10px] text-[#8A94A3]">{app.project.company.location || "Remote"}</p>
                      </td>
                      {/* Stage */}
                      <td className="px-4 py-3 text-left">
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-bold text-[10px]">
                          {stage}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 text-left">
                        <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${getStatusStyle(app.status, app.status === "HIRED" && !!app.roleId && !app.teamConfirmedAt)}`}>
                          {getStatusLabel(app.status, app.project.status, app.roleId, app.teamConfirmedAt)}
                        </span>
                      </td>
                      {/* Budget */}
                      <td className="px-4 py-3 text-left">
                        <span className="font-bold text-[#333840]">₹{app.project.budget}</span>
                      </td>
                      {/* AI Score */}
                      <td className="px-4 py-3 text-left">
                        <span className="font-black text-[#181d26]">{app.aiScore}%</span>
                      </td>
                      {/* Applied Date */}
                      <td className="px-4 py-3 text-left text-[#5A6472]">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      {/* Alerts */}
                      <td className="px-4 py-3 text-left">
                        <div className="flex flex-col gap-1">
                          {pendingOffer && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <Gift className="h-3 w-3" /> Offer Pending
                            </span>
                          )}
                          {scheduledInterview && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                              <Video className="h-3 w-3" /> Meet Scheduled
                            </span>
                          )}
                          {app.status === "HIRED" && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" /> Hired
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/freelancer/applications/${app.id}`}>
                            <button className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] bg-[#181d26] hover:bg-[#333840] text-white font-medium rounded-[8px] transition-colors cursor-pointer">
                              Track Status <ChevronRight className="h-3 w-3" />
                            </button>
                          </Link>
                          {scheduledInterview && (
                            <a
                              href={[...(parseApplicationMetadata(app.coverLetter).pipelineHistory || [])].reverse().find((h: any) => h.meetingLink)?.meetingLink || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] bg-[#1968E5] hover:bg-[#154ca0] text-white font-medium rounded-[8px]"
                            >
                              <Video className="h-3 w-3" /> Meet
                            </a>
                          )}
                          {app.status === "HIRED" && (
                            <Link href={`/workspace/${app.id}`}>
                              <button className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] bg-[#181d26] hover:bg-[#333840] text-white font-medium rounded-[8px]">
                                Open Workspace
                              </button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
