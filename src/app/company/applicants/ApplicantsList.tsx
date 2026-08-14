"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shortlistApplicant, rejectApplicant, hireApplicant, removeFreelancer } from "@/actions/applicationActions";
import { transitionApplicationStage, bulkTransitionApplicants, releaseMilestonePayment } from "@/actions/workflowActions";
import { parseApplicationMetadata, getApplicationCoverLetterText, getProjectMetadataDirect, formatProjectBudget } from "@/lib/workflowHelpers";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { User, Mail, Award, BrainCircuit, Star, Flame, ClipboardList, X, ExternalLink, ChevronRight, Briefcase, CheckCircle, FileText, Calendar, Clock, Send, ShieldAlert, History, LayoutGrid, Table as TableIcon } from "lucide-react";
import { ApplicationStatus } from "@prisma/client";

interface ReviewReceivedItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date | string;
  reviewer: {
    name: string | null;
  };
  project: {
    title: string;
    budget: number;
  };
}

interface CompletedApplicationItem {
  id: string;
  project: {
    id: string;
    title: string;
    budget: number;
    company: {
      companyName: string;
    };
  };
}

interface ApplicantItem {
  id: string;
  projectId: string;
  coverLetter: string;
  aiScore: number;
  status: ApplicationStatus;
  createdAt: Date | string;
  project: {
    title: string;
    status: string;
    description: string;
  };
  freelancer: {
    id: string;
    bio: string | null;
    skills: string[];
    experienceYears: number;
    rating: number;
    completedProjects: number;
    completionRate: number;
    portfolioUrl: string | null;
    resumeUrl: string | null;
    professionalHeadline?: string | null;
    experience?: any;
    certifications?: any;
    portfolioItems?: any;
    responseTime?: string | null;
    availabilityStatus?: string | null;
    verificationBadges?: string[];
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      reviewsReceived: ReviewReceivedItem[];
    };
    applications: CompletedApplicationItem[];
  };
}

interface ProjectSelectorItem {
  id: string;
  title: string;
  status: string;
  budget: number;
  priority: string;
  experienceRequired: number;
  createdAt: Date | string;
  _count: {
    applications: number;
  };
}

interface ApplicantsListProps {
  applicants: ApplicantItem[];
  projects: ProjectSelectorItem[];
  selectedProjectId?: string;
}

export function ApplicantsList({ applicants, projects, selectedProjectId }: ApplicantsListProps) {
  // Role tabs. Only meaningful once a project using role slots is selected;
  // otherwise the single "All" tab renders and behaviour is unchanged.
  const [activeRoleId, setActiveRoleId] = useState<string>("ALL");
  const roleTabs = Array.from(
    applicants.reduce((m, a: any) => {
      if (a.role?.id) m.set(a.role.id, { id: a.role.id, name: a.role.name, slots: a.role.slots });
      return m;
    }, new Map<string, { id: string; name: string; slots: number }>()).values()
  );
  const visibleApplicants =
    activeRoleId === "ALL"
      ? applicants
      : applicants.filter((a: any) => a.role?.id === activeRoleId);
  const roleCount = (id: string) =>
    id === "ALL" ? applicants.length : applicants.filter((a: any) => a.role?.id === id).length;
  const roleHired = (id: string) =>
    applicants.filter((a: any) => a.role?.id === id && a.status === ApplicationStatus.HIRED && !a.isApprentice).length;
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Pipeline details states
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [stageNotes, setStageNotes] = useState<Record<string, string>>({});
  const [schedulingApp, setSchedulingApp] = useState<ApplicantItem | null>(null);
  const [interviewDate, setInterviewDate] = useState("2026-07-10");
  const [interviewTime, setInterviewTime] = useState("14:00");
  const [meetLink, setMeetLink] = useState("https://meet.google.com/xyz-pdq-abc");

  const handleAction = async (id: string, actionType: "shortlist" | "reject" | "hire" | "remove") => {
    setLoadingId(`${id}-${actionType}`);
    try {
      if (actionType === "shortlist") {
        await shortlistApplicant(id);
      } else if (actionType === "reject") {
        await rejectApplicant(id);
      } else if (actionType === "hire") {
        const confirmHiring = confirm("Are you sure you want to hire this freelancer? This will register them as active talent on this project.");
        if (confirmHiring) {
          await hireApplicant(id);
        }
      } else if (actionType === "remove") {
        const confirmRemoval = confirm("Are you sure you want to remove/release this freelancer from the project? They will lose workspace access immediately.");
        if (confirmRemoval) {
          await removeFreelancer(id);
        }
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Action failed to execute. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleTransitionStage = async (applicationId: string, targetStage: string) => {
    const notes = stageNotes[applicationId] || `Moved to ${targetStage}`;
    setLoadingId(`${applicationId}-transition`);
    try {
      const res = await transitionApplicationStage(applicationId, targetStage, notes);
      if (res.success) {
        setStageNotes(prev => ({ ...prev, [applicationId]: "" }));
        router.refresh();
      } else {
        alert(res.error || "Failed to transition stage.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to transition stage.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleBulkTransition = async (targetStage: string) => {
    if (selectedAppIds.length === 0) return;
    setLoadingId(`bulk-${targetStage}`);
    try {
      const res = await bulkTransitionApplicants(selectedAppIds, targetStage, `Bulk moved to ${targetStage}`);
      if (res.success) {
        setSelectedAppIds([]);
        router.refresh();
      } else {
        alert(res.error || "Failed bulk transition.");
      }
    } catch (err: any) {
      alert(err.message || "Failed bulk transition.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleScheduleInterview = async () => {
    if (!schedulingApp) return;
    setLoadingId(`${schedulingApp.id}-sched`);
    try {
      const notes = `Interview scheduled on ${interviewDate} at ${interviewTime}. Link: ${meetLink}`;
      const combinedDateTime = `${interviewDate}T${interviewTime}`;
      const res = await transitionApplicationStage(schedulingApp.id, "Interview", notes, {
        date: combinedDateTime,
        meetingLink: meetLink
      });
      if (res.success) {
        setSchedulingApp(null);
        router.refresh();
      } else {
        alert(res.error || "Failed to schedule interview.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to schedule interview.");
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.HIRED:
        return <Badge variant="success">Hired</Badge>;
      case ApplicationStatus.SHORTLISTED:
        return <Badge variant="primary">Shortlisted</Badge>;
      case ApplicationStatus.REJECTED:
        return <Badge variant="danger">Rejected</Badge>;
      case ApplicationStatus.PENDING:
      default:
        return <Badge variant="neutral">Pending Review</Badge>;
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (!selectedProjectId) {
    return (
      <div className="space-y-6 text-left">
        <div className="bg-white border border-[#E3E5EA] p-6 rounded-lg">
          <h2 className="text-base font-semibold text-[#1A1D29] mb-1">Select a Project to Review</h2>
          <p className="text-xs text-[#5B6272] font-normal">
            Please choose a project below to evaluate and rank candidate proposals matching that listing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.length === 0 ? (
            <Card className="col-span-full p-10 text-center text-xs text-[#5B6272] border border-[#E3E5EA] rounded-lg">
              No projects posted yet. Post a project first to receive proposals.
            </Card>
          ) : (
            projects.map((project) => (
              <Card
                key={project.id}
                onClick={() => router.push(`/company/applicants?projectId=${project.id}`)}
                className="p-6 border border-[#E3E5EA] bg-white hover:bg-[#F8F9FB] transition-all cursor-pointer rounded-lg flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="text-sm font-semibold text-[#1A1D29] transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    <Badge variant={project.status === "OPEN" ? "forest" : "neutral"} className="shrink-0 text-[11px] px-2 py-0.5">
                      {project.status === "OPEN" ? "Active" : project.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#5B6272] font-normal">
                    <span>Budget: <strong className="text-[#1A1D29] font-semibold">{formatProjectBudget(project)}</strong></span>
                    <span>•</span>
                    <span>Exp: <strong className="text-[#1A1D29] font-semibold">{project.experienceRequired}y</strong></span>
                    <span>•</span>
                    <span>Priority: <strong className="text-[#1A1D29] font-semibold uppercase">{project.priority.toLowerCase()}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#C7CBD6]">
                  <span className="text-[11px] font-medium text-[#1A1D29] bg-[#F8F9FB] px-2.5 py-1 rounded-full border border-[#E3E5EA] flex items-center gap-1">
                    <ClipboardList className="h-3 w-3 text-[#5B6272]" />
                    <strong>{project._count.applications}</strong> proposals
                  </span>
                  <span className="text-[11px] font-medium text-[#1A1D29] flex items-center gap-0.5 group- transition-transform">
                    View Applicants <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top project switcher toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white border border-[#E3E5EA] shadow-md p-6 rounded-lg sticky top-0 z-20">
        <div className="space-y-1">
          <span className="text-[11px] text-[#5B6272] font-bold uppercase tracking-wider block">Currently Reviewing</span>
          <h2 className="text-base font-bold text-[#1A1D29] line-clamp-1">
            {selectedProject ? selectedProject.title : "Project Details"}
          </h2>
          <button
            onClick={() => router.push("/company/applicants")}
            className="text-[11px] font-semibold text-[#1A1D29] hover:text-[#1A1D29] transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
          >
            ← Back to all projects
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
          {/* View Mode Toggle Switch */}
          <Tabs
            label="Result layout"
            variant="pill"
            value={viewMode}
            onChange={(id) => setViewMode(id as any)}
            className="self-center"
            items={[
              { id: "card", label: "Cards", icon: <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" /> },
              { id: "table", label: "Table", icon: <TableIcon className="h-3.5 w-3.5" aria-hidden="true" /> },
            ]}
          />

          <label className="text-[11px] font-bold text-[#5B6272] uppercase tracking-wider self-center hidden sm:inline">Switch Project:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              if (e.target.value === "all") {
                router.push("/company/applicants");
              } else {
                router.push(`/company/applicants?projectId=${e.target.value}`);
              }
            }}
            className="px-4 py-2.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-white border border-[#E3E5EA] text-[#1A1D29] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-[#152C55]/20 cursor-pointer min-w-[200px]"
          >
            <option value="all">-- Select Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p._count.applications})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk actions toolbar */}
      {applicants.length > 0 && (
        <div className="bg-[#F8F9FB] border border-[#E3E5EA] p-4 rounded-lg flex flex-wrap justify-between items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="selectAllApps"
              checked={selectedAppIds.length === applicants.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedAppIds(applicants.map(a => a.id));
                } else {
                  setSelectedAppIds([]);
                }
              }}
              className="rounded-md border-[#E3E5EA] focus:ring-[#152C55] h-4 w-4 cursor-pointer"
            />
            <label htmlFor="selectAllApps" className="font-bold text-[#1A1D29] cursor-pointer">
              Select All Candidates ({selectedAppIds.length} chosen)
            </label>
          </div>

          {selectedAppIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[#5B6272] font-bold uppercase text-[11px]">Transition Selection To:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkTransition(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="px-3 py-1.5 border border-[#C7CBD6] bg-white text-xs rounded-md focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Stage --</option>
                <option value="Profile Reviewed">Profile Reviewed</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Assessment">Assessment</option>
                <option value="Interview">Interview</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Selected">Selected</option>
                <option value="Contract Sent">Contract Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Project Started">Project Started</option>
                <option value="Milestone Review">Milestone Review</option>
                <option value="Completed">Completed</option>
                <option value="REJECTED">Reject Selection</option>
              </select>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
      {/* Per-role tabs. Applicant review is naturally scoped to one role at a
          time when a project has several. Hidden entirely for single-hire listings. */}
      {roleTabs.length > 0 && (
        <Tabs
          label="Applicant roles"
          variant="pill"
          value={activeRoleId}
          onChange={setActiveRoleId}
          className="flex-wrap"
          items={[{ id: "ALL", name: "All Roles", slots: 0 }, ...roleTabs].map((tab) => ({
            id: tab.id,
            count: roleCount(tab.id),
            label:
              tab.id === "ALL" ? (
                tab.name
              ) : (
                <>
                  {tab.name}
                  <span className="ml-1 text-[11px] font-normal opacity-70">
                    · {roleHired(tab.id)}/{tab.slots} hired
                  </span>
                </>
              ),
          }))}
        />
      )}

      {visibleApplicants.length === 0 ? (
        <Card className="p-8 text-center text-xs text-[#5B6272]">
          {applicants.length === 0
            ? "No proposals submitted for this project yet."
            : "No applicants for this role yet."}
        </Card>
      ) : viewMode === "table" ? (
        <Card className="border-[#E3E5EA] bg-white overflow-hidden rounded-lg">
          <div className="overflow-x-auto p-5">
            <Table className="w-full whitespace-nowrap min-w-[950px]">
            <THead>
              <TR>
                <TH className="w-10">Select</TH>
                <TH>Candidate Profile</TH>
                <TH>Applied Project</TH>
                <TH align="center">Match Score</TH>
                <TH>Pipeline Stage</TH>
                <TH align="center">Specs</TH>
                <TH align="right">Workspace & Actions</TH>
              </TR>
            </THead>
            <TBody>
              {visibleApplicants.map((app) => {
                const isSelected = selectedAppIds.includes(app.id);
                const isHired = app.status === ApplicationStatus.HIRED;
                const isRejected = app.status === ApplicationStatus.REJECTED;

                // Parse current stage from cover letter metadata
                const appMeta = parseApplicationMetadata(app.coverLetter);
                const currentStage = appMeta.pipelineHistory && appMeta.pipelineHistory.length > 0
                  ? appMeta.pipelineHistory[appMeta.pipelineHistory.length - 1].stage
                  : "Applied";

                return (
                  <TR key={app.id} className={cn("hover:bg-[#F8F9FB]/50 transition-colors", isSelected && "bg-[#F8F9FB]")}>
                    {/* Checkbox */}
                    <TD>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAppIds([...selectedAppIds, app.id]);
                          } else {
                            setSelectedAppIds(selectedAppIds.filter(id => id !== app.id));
                          }
                        }}
                        className="rounded-md border-[#C7CBD6] focus:ring-[#152C55] h-4 w-4 cursor-pointer"
                      />
                    </TD>

                    {/* Candidate Profile Details */}
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-[#E8F1FE] flex items-center justify-center font-bold text-[#1A1D29] text-[11px] border border-[#C7CBD6] shrink-0 overflow-hidden">
                          {app.freelancer.user.image ? (
                            <img src={app.freelancer.user.image} className="h-full w-full object-cover" />
                          ) : (
                            app.freelancer.user.name ? app.freelancer.user.name[0].toUpperCase() : "U"
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <button
                            type="button"
                            onClick={() => router.push(`/freelancers/${app.freelancer.id}`)}
                            className="font-bold text-[#1A1D29] hover:text-[#5B6272] hover:underline cursor-pointer block text-left truncate max-w-[150px]"
                          >
                            {app.freelancer.user.name}
                          </button>
                          <span className="text-[11px] text-[#5B6272] block truncate max-w-[150px]">
                            {app.freelancer.professionalHeadline || "Software Engineer"}
                          </span>
                        </div>
                      </div>
                    </TD>

                    {/* Applied Project */}
                    <TD>
                      <p className="font-bold text-[#5B6272] truncate max-w-[180px]" title={app.project.title}>
                        {app.project.title}
                      </p>
                      <span className="text-[11px] text-[#5B6272] block font-semibold">Submitted {new Date(app.createdAt).toLocaleDateString()}</span>
                    </TD>

                    {/* Match Score */}
                    <TD align="center">
                      <Badge variant="accent" className="font-bold text-[11px] py-1 px-2.5">
                        <BrainCircuit className="h-3 w-3 mr-0.5" /> {app.aiScore}%
                      </Badge>
                    </TD>

                    {/* Status Badge & Actions dropdown */}
                    <TD>
                      <div className="space-y-1.5">
                        {getStatusBadge(app.status)}
                        
                        <div className="flex items-center gap-1.5">
                          <select
                            value={isRejected ? "REJECTED" : isHired ? "Hired" : currentStage}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "Interview") {
                                setSchedulingApp(app);
                              } else if (val === "REJECTED") {
                                handleAction(app.id, "reject");
                              } else if (val) {
                                handleTransitionStage(app.id, val);
                              }
                            }}
                            className="px-2 py-1 border border-[#E3E5EA] bg-white text-[11px] rounded-md focus:outline-none cursor-pointer text-[#5B6272] font-bold"
                          >
                            <option value="Applied">Applied</option>
                            <option value="Profile Reviewed">Profile Reviewed</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Assessment">Assessment</option>
                            <option value="Interview">Interview</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Selected">Selected</option>
                            <option value="Contract Sent">Contract Sent</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Project Started">Project Started</option>
                            <option value="Milestone Review">Milestone Review</option>
                            <option value="Completed">Completed</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                          
                          {app.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleAction(app.id, "shortlist")}
                              className="text-[11px] text-[#147A44] hover:text-[#147A44] font-bold underline cursor-pointer"
                            >
                              Shortlist
                            </button>
                          )}
                        </div>
                      </div>
                    </TD>

                    {/* Specs Details */}
                    <TD align="center">
                      <div className="space-y-0.5 text-[11px] text-[#5B6272] font-bold">
                        <p><strong className="text-[#5B6272]">{app.freelancer.experienceYears}y</strong> exp</p>
                        <p><strong className="text-[#1A1D29]">{app.freelancer.rating}/5</strong> rating</p>
                        <p><strong className="text-[#147A44]">{app.freelancer.completionRate}%</strong> done</p>
                      </div>
                    </TD>

                    {/* Actions and Workspace Links */}
                    <TD align="right">
                      <div className="flex flex-col items-end gap-1.5">
                        {isHired ? (
                          <Link href={`/workspace/${app.id}`} target="_blank">
                            <Button size="xs" className="cursor-pointer bg-[#152C55] hover:bg-[#1E3D71] text-white text-[11px] py-1 px-2.5 h-auto rounded-full font-bold">
                              Open Workspace
                            </Button>
                          </Link>
                        ) : isRejected ? (
                          <span className="text-[11px] text-[#5B6272] font-bold">Closed</span>
                        ) : (
                          <>
                            {currentStage === "Interview" && (
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => setSchedulingApp(app)}
                                className="cursor-pointer text-[11px] py-1 px-2.5 h-auto rounded-full bg-[#F8F9FB] border border-[#E3E5EA] text-[#1A1D29] font-bold"
                              >
                                Schedule Meet
                              </Button>
                            )}
                            {currentStage === "Selected" && (
                              <Button
                                size="xs"
                                onClick={() => handleAction(app.id, "hire")}
                                className="cursor-pointer text-[11px] py-1 px-2.5 h-auto rounded-full bg-[#14713D] hover:bg-[#14713D] text-white font-bold"
                              >
                                Sign & Hire
                              </Button>
                            )}
                          </>
                        )}
                        <Link href={`/company/applicants/${app.id}`}>
                          <button
                            type="button"
                            className="text-[11px] text-[#1A1D29] hover:text-[#5B6272] font-bold hover:underline flex items-center gap-0.5 justify-end cursor-pointer"
                          >
                            View Details <ChevronRight className="h-2.5 w-2.5" />
                          </button>
                        </Link>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          </div>
        </Card>
      ) : (
        visibleApplicants.map((app) => {
          const isHired = app.status === ApplicationStatus.HIRED;
          const isRejected = app.status === ApplicationStatus.REJECTED;
          const isProjectActive = app.project.status === "OPEN" || app.project.status === "IN_PROGRESS";

          // Parse current stage from cover letter metadata
          const appMeta = parseApplicationMetadata(app.coverLetter);
          const currentStage = appMeta.pipelineHistory && appMeta.pipelineHistory.length > 0
            ? appMeta.pipelineHistory[appMeta.pipelineHistory.length - 1].stage
            : "Applied";

          return (
            <Card key={app.id} className="p-6 border-[#E3E5EA] bg-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-[#E3E5EA] mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedAppIds.includes(app.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAppIds([...selectedAppIds, app.id]);
                      } else {
                        setSelectedAppIds(selectedAppIds.filter(id => id !== app.id));
                      }
                    }}
                    className="rounded-md border-[#E3E5EA] focus:ring-[#152C55] h-4 w-4 cursor-pointer mr-1 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => app.freelancer.user.image && setLightboxImage(app.freelancer.user.image)}
                    disabled={!app.freelancer.user.image}
                    className={`h-10 w-10 rounded-full bg-[#F0F3F9] flex items-center justify-center font-bold text-[#1A1D29] shrink-0 overflow-hidden border border-[#E3E5EA]/50 ${
                      app.freelancer.user.image ? "cursor-zoom-in hover:brightness-95 transition-all" : ""
                    }`}
                    title={app.freelancer.user.image ? "Click to view full image" : undefined}
                  >
                    {app.freelancer.user.image ? (
                      <img src={app.freelancer.user.image} className="h-full w-full object-cover" />
                    ) : (
                      app.freelancer.user.name ? app.freelancer.user.name[0].toUpperCase() : "U"
                    )}
                  </button>
                  <div>
                    <h3
                      onClick={() => router.push(`/freelancers/${app.freelancer.id}`)}
                      className="text-sm font-bold text-[#1A1D29] hover:text-[#5B6272] cursor-pointer transition-colors"
                    >
                      {app.freelancer.user.name}
                    </h3>
                    <p className="text-[11px] text-[#5B6272]">
                      Applied for: <strong className="text-[#1A1D29]">{app.project.title}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="accent" className="flex items-center gap-1 font-bold">
                    <BrainCircuit className="h-3 w-3" />
                    AI Match: {app.aiScore}%
                  </Badge>
                  {getStatusBadge(app.status)}
                </div>
              </div>

              {/* Freelancer Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-[#5B6272] mb-4 bg-[#F8F9FB] p-4 rounded-lg border border-[#E3E5EA]">
                <div>
                  <span className="text-[11px] text-[#5B6272] block">Experience</span>
                  <span className="font-bold text-[#1A1D29]">{app.freelancer.experienceYears} Years</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#5B6272] block">Average Rating</span>
                  <span className="font-semibold text-[#1A1D29] flex items-center gap-1">
                    {app.freelancer.rating}/5
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#5B6272] block">Completion Rate</span>
                  <span className="font-bold text-[#147A44]">{app.freelancer.completionRate}%</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#5B6272] block">Gigs Completed</span>
                  <span className="font-bold text-[#1A1D29]">{app.freelancer.completedProjects} Jobs</span>
                </div>
              </div>

              {/* Freelancer Skills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {app.freelancer.skills.map((skill) => (
                  <Badge key={skill} variant="neutral" className="text-[11px]">
                    {skill}
                  </Badge>
                ))}
              </div>

              {/* Action Handles */}
              <div className="space-y-3.5 pt-3 border-t border-[#C7CBD6]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/company/applicants/${app.id}`}>
                      <Button
                        size="sm"
                        className="cursor-pointer text-xs gap-1.5 font-bold"
                      >
                        <FileText className="h-3.5 w-3.5" /> View Details
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/freelancers/${app.freelancer.id}`)}
                      className="cursor-pointer text-xs gap-1.5 font-bold"
                    >
                      <User className="h-3.5 w-3.5 text-[#1A1D29]" /> View Profile
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isHired && <Badge variant="success">Hired</Badge>}
                    {isRejected && <Badge variant="danger">Rejected</Badge>}
                    {!isHired && !isRejected && <Badge variant="neutral">{currentStage}</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}
      </div>

      {/* Interview Scheduler Modal Overlay */}
      {schedulingApp && (
        <Modal open onClose={() => setSchedulingApp(null)} size="lg">
          <div className="space-y-4">
            <div className="space-y-1.5 text-left border-b border-[#E3E5EA] pb-2">
              <h3 className="text-sm font-bold text-[#1A1D29]">Schedule Video Interview</h3>
              <p className="text-[11px] text-[#5B6272] font-medium font-semibold">Candidate: <span className="text-[#1A1D29]">{schedulingApp.freelancer.user.name}</span></p>
            </div>

            <div className="space-y-3 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase">Interview Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-[#E3E5EA] rounded-md text-xs focus:outline-none"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#5B6272] uppercase">Interview Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-[#E3E5EA] rounded-md text-xs focus:outline-none"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#5B6272] uppercase">Google Meet / Video Link</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-[#E3E5EA] rounded-md text-xs focus:outline-none"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E3E5EA]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSchedulingApp(null)}
                disabled={loadingId !== null}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleScheduleInterview}
                disabled={loadingId !== null}
                className="cursor-pointer text-xs bg-[#14713D] hover:bg-[#14713D] text-white font-semibold"
              >
                {loadingId === `${schedulingApp.id}-sched` ? "Scheduling..." : "Schedule Round"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lightbox Zoom-In Modal Overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-[#1A1D29]/50 cursor-zoom-out" onClick={() => setLightboxImage(null)} />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-[#152C55]/70 hover:bg-[#152C55] transition-colors cursor-pointer z-10"
            title="Close image overlay"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative max-w-full max-h-[85vh] z-10 animate-in zoom-in-95 duration-200 rounded-lg overflow-hidden shadow-lg bg-black flex items-center justify-center">
            <img src={lightboxImage} alt="lightbox preview" className="object-contain max-h-[80vh] max-w-[90vw]" />
          </div>
        </div>
      )}
    </div>
  );
}
