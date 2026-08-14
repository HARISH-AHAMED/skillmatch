"use client";

import React, { useState } from "react";
import { EmptyStateAstronaut } from "@/components/ui/AppBlocks";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
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
    if (pendingTeamMatch) return "bg-[#FFF3DC] text-[#8F5E08] border-[#F5DEB0]";
    switch (status) {
      case "HIRED": return "bg-[#E4F7EC] text-[#147A44] border-[#BFE9D2]";
      case "SHORTLISTED": return "bg-[#E8F1FE] text-[#2159C9] border-[#C7CBD6]";
      case "REJECTED": return "bg-[#FDEAEA] text-[#BC2A2A] border-[#F5C2C2]";
      default: return "bg-[#E8F1FE] text-[#5B6272] border-[#E3E5EA]";
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
      <Card className="p-8 text-center text-xs text-[#5B6272]">
            <EmptyStateAstronaut title="No applications yet" subtitle="Browse open projects and apply to see them tracked here." />
          </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* View toggle toolbar */}
      <div className="flex items-center justify-between text-left">
        <p className="text-xs text-[#5B6272] font-normal">{applications.length} application{applications.length !== 1 ? "s" : ""} found</p>
        <Tabs
          label="Result layout"
          variant="pill"
          value={viewMode}
          onChange={(id) => setViewMode(id as any)}
          items={[
            { id: "card", label: "Cards", icon: <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" /> },
            { id: "table", label: "Table", icon: <List className="h-3.5 w-3.5" aria-hidden="true" /> },
          ]}
        />
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
        <Card className="p-0 border-[#E3E5EA]/60 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full whitespace-nowrap min-w-[900px]">
              <THead>
                <TR>
                  <TH>Project</TH>
                  <TH>Company</TH>
                  <TH>Stage</TH>
                  <TH>Status</TH>
                  <TH>Budget</TH>
                  <TH>AI Score</TH>
                  <TH>Applied</TH>
                  <TH>Alerts</TH>
                  <TH>Action</TH>
                </TR>
              </THead>
              <TBody>
                {applications.map((app) => {
                  const stage = getActiveStage(app);
                  const pendingOffer = hasOffer(app);
                  const scheduledInterview = hasInterview(app);
                  return (
                    <TR key={app.id}>
                      {/* Project */}
                      <TD>
                        <p className="font-bold text-[#1A1D29] truncate max-w-[160px]">{app.project.title}</p>
                      </TD>
                      {/* Company */}
                      <TD>
                        <p className="font-semibold text-[#5B6272] truncate max-w-[120px]">{app.project.company.companyName}</p>
                        <p className="text-[11px] text-[#5B6272]">{app.project.company.location || "Remote"}</p>
                      </TD>
                      {/* Stage */}
                      <TD>
                        <span className="px-2 py-0.5 rounded-full bg-[#E8F1FE] text-[#2159C9] border border-[#C7CBD6] font-bold text-[11px]">
                          {stage}
                        </span>
                      </TD>
                      {/* Status */}
                      <TD>
                        <span className={`px-2 py-0.5 rounded-full border font-bold text-[11px] ${getStatusStyle(app.status, app.status === "HIRED" && !!app.roleId && !app.teamConfirmedAt)}`}>
                          {getStatusLabel(app.status, app.project.status, app.roleId, app.teamConfirmedAt)}
                        </span>
                      </TD>
                      {/* Budget */}
                      <TD>
                        <span className="font-bold text-[#5B6272]">₹{app.project.budget}</span>
                      </TD>
                      {/* AI Score */}
                      <TD>
                        <span className="font-bold text-[#1A1D29]">{app.aiScore}%</span>
                      </TD>
                      {/* Applied Date */}
                      <TD>
                        {new Date(app.createdAt).toLocaleDateString()}
                      </TD>
                      {/* Alerts */}
                      <TD>
                        <div className="flex flex-col gap-1">
                          {pendingOffer && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-[#8F5E08] bg-[#FFF3DC] border border-[#F5DEB0] px-2 py-0.5 rounded-full">
                              <Gift className="h-3 w-3" /> Offer Pending
                            </span>
                          )}
                          {scheduledInterview && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-[#2159C9] bg-[#E8F1FE] border border-[#C7CBD6] px-2 py-0.5 rounded-full">
                              <Video className="h-3 w-3" /> Meet Scheduled
                            </span>
                          )}
                          {app.status === "HIRED" && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-[#147A44] bg-[#E4F7EC] border border-[#BFE9D2] px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" /> Hired
                            </span>
                          )}
                        </div>
                      </TD>
                      {/* Actions */}
                      <TD>
                        <div className="flex items-center gap-1.5">
                          <Link href={`/freelancer/applications/${app.id}`}>
                            <button className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] bg-[#152C55] hover:bg-[#1E3D71] text-white font-medium rounded-full transition-colors cursor-pointer">
                              Track Status <ChevronRight className="h-3 w-3" />
                            </button>
                          </Link>
                          {scheduledInterview && (
                            <a
                              href={[...(parseApplicationMetadata(app.coverLetter).pipelineHistory || [])].reverse().find((h: any) => h.meetingLink)?.meetingLink || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#EAF1FE] hover:bg-[#FFF3DC] text-white font-medium rounded-full"
                            >
                              <Video className="h-3 w-3" /> Meet
                            </a>
                          )}
                          {app.status === "HIRED" && (
                            <Link href={`/workspace/${app.id}`}>
                              <button className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-[#152C55] hover:bg-[#1E3D71] text-white font-medium rounded-full">
                                Open Workspace
                              </button>
                            </Link>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
