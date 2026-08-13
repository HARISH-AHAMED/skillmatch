"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  DollarSign,
  Users,
  Award,
  ShieldAlert,
  Eye,
  EyeOff,
  Edit2,
  FileText,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProjectStatus } from "@prisma/client";
import { getProjectDescriptionText, getProjectMetadataDirect, formatProjectBudget } from "@/lib/workflowHelpers";
import { CompanyDiscussionBoard } from "@/components/CompanyDiscussionBoard";
import { toggleProjectVisibility, closeProject } from "@/actions/projectActions";

interface ProjectDetailsViewProps {
  project: any;
}

export function ProjectDetailsView({ project }: ProjectDetailsViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(project.isVisible);
  const [status, setStatus] = useState(project.status);

  const meta = getProjectMetadataDirect(project.description);
  const cleanDescriptionText = getProjectDescriptionText(project.description);

  const getStatusBadge = (statusVal: ProjectStatus) => {
    switch (statusVal) {
      case ProjectStatus.OPEN:
        return <Badge variant="success">Open / Active</Badge>;
      case ProjectStatus.IN_PROGRESS:
        return <Badge variant="primary">In Progress</Badge>;
      case ProjectStatus.COMPLETED:
        return <Badge variant="secondary">Completed</Badge>;
      case ProjectStatus.CLOSED:
      default:
        return <Badge variant="neutral">Closed</Badge>;
    }
  };

  const handleToggleVisibility = async () => {
    setLoading(true);
    try {
      const res = await toggleProjectVisibility(project.id);
      if (res.success) {
        setIsVisible(res.isVisible);
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || "Failed to toggle visibility");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseProject = async () => {
    const confirmClose = confirm("Are you sure you want to close this project listing?");
    if (!confirmClose) return;

    setLoading(true);
    try {
      const res = await closeProject(project.id);
      if (res.success) {
        setStatus(ProjectStatus.CLOSED);
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || "Failed to close project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200 text-left">
      
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/company/projects")}
          className="text-xs font-medium text-[#181d26] hover:underline transition-colors cursor-pointer flex items-center gap-1.5"
        >
          ← Back to projects board
        </button>

        <div className="flex items-center gap-2">
          <Link href={`/company/projects/${project.id}/certificate`}>
            <Button size="sm" variant="outline" className="cursor-pointer gap-1.5">
              <Award className="h-3.5 w-3.5" /> Certificate Design
            </Button>
          </Link>
          <Link href={`/company/projects/edit/${project.id}`}>
            <Button size="sm" variant="outline" className="cursor-pointer gap-1.5 text-xs font-medium border-[#E2E5EA] text-[#181d26] hover:bg-[#F7F8FA] rounded-[12px]">
              <Edit2 className="h-3.5 w-3.5" /> Edit Project
            </Button>
          </Link>
          <Link href={`/company/applicants?projectId=${project.id}`}>
            <Button size="sm" className="cursor-pointer gap-1.5 text-xs font-medium bg-[#181d26] text-white hover:bg-[#333840] rounded-[12px]">
              <Users className="h-3.5 w-3.5" /> Review Applicants ({project._count.applications})
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <Card className="relative overflow-hidden border border-[#E2E5EA] bg-white p-0 text-[#181d26] shadow-xs rounded-[12px]">
        {/* Project banner — same artwork freelancers see when browsing */}
        {project.bannerUrl ? (
          <img
            src={project.bannerUrl}
            alt={project.title}
            className="h-44 w-full object-cover sm:h-56"
          />
        ) : (
          <div className="h-24 w-full bg-gradient-to-r from-[#181d26] via-[#333840] to-[#181d26]" />
        )}

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8">
          <div className="space-y-3.5 text-left">
            <div className="flex flex-wrap items-center gap-2.5">
              {getStatusBadge(status)}
              {isVisible ? (
                <Badge variant="mint" className="text-[10px]">Public Listing</Badge>
              ) : (
                <Badge variant="neutral" className="text-[10px]">Private / Hidden</Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight text-[#181d26]">
              {project.title}
            </h1>

            <p className="text-xs text-[#5A6472] font-normal">
              Posted on {new Date(project.createdAt).toLocaleDateString()} • Required Experience: {project.experienceRequired} Years
            </p>
          </div>

          {/* Inline Action Controls */}
          <div className="flex flex-wrap gap-2.5 shrink-0 w-full md:w-auto">
            <Button
              type="button"
              disabled={loading}
              onClick={handleToggleVisibility}
              size="sm"
              variant="outline"
              className="cursor-pointer flex-1 md:flex-none flex items-center justify-center gap-1.5 text-xs font-medium text-[#181d26] border-[#E2E5EA] hover:bg-[#F7F8FA] rounded-[12px]"
            >
              {isVisible ? (
                <>
                  <EyeOff className="h-4 w-4" /> Hide Listing
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" /> Show Listing
                </>
              )}
            </Button>

            {status === ProjectStatus.OPEN && (
              <Button
                type="button"
                disabled={loading}
                onClick={handleCloseProject}
                size="sm"
                variant="outline"
                className="cursor-pointer flex-1 md:flex-none text-rose-600 border-[#E2E5EA] hover:bg-rose-50 font-medium text-xs rounded-[12px]"
              >
                Close Project
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Grid: Details Panel & Sticky Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns (70%) - Project Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* About the Gig Description */}
          <Card className="p-6 border-[#E2E5EA] bg-white shadow-xs rounded-[12px] space-y-4">
            <h3 className="text-sm font-black text-[#181d26] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#EDEFF2] pb-3">
              <ClipboardList className="h-4.5 w-4.5 text-[#181d26]" /> Project Objectives & Description
            </h3>

            <div className="space-y-4 text-xs text-[#333840] leading-relaxed text-left">
              <div>
                <span className="font-bold text-[#181D26] uppercase text-[10px] tracking-wider block mb-1">Objectives & Brief</span>
                <p className="whitespace-pre-line">{cleanDescriptionText}</p>
              </div>

              {meta.deliverables && meta.deliverables.length > 0 && (
                <div>
                  <span className="font-bold text-[#181D26] uppercase text-[10px] tracking-wider block mb-1.5">Deliverables</span>
                  <ul className="list-disc pl-5 space-y-1 text-[#333840] font-medium">
                    {meta.deliverables.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {meta.responsibilities && meta.responsibilities.length > 0 && (
                <div>
                  <span className="font-bold text-[#181D26] uppercase text-[10px] tracking-wider block mb-1.5">Responsibilities</span>
                  <ul className="list-decimal pl-5 space-y-1 text-[#333840] font-medium">
                    {meta.responsibilities.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {/* Dynamic recruitment rounds list */}
          {meta.rounds && meta.rounds.length > 0 && (
            <Card className="p-6 border-[#E2E5EA] bg-white shadow-xs rounded-[12px] space-y-4 text-left">
              <h3 className="text-sm font-semibold text-[#181d26] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#EDEFF2] pb-3">
                Selection Process & Recruitment Rounds
              </h3>
              
              <div className="border border-[#E2E5EA]/80 rounded-2xl p-5 bg-[#f8faff] space-y-4">
                {meta.rounds.map((r: any, idx: number) => {
                  const isScreeningRound = r.type === "SCREENING_QUESTIONS";
                  const qCount = r.questions?.length || 0;

                  return (
                    <div key={r.id || idx} className={`flex items-start gap-3.5 text-left ${idx > 0 ? "border-t border-[#EDEFF2] pt-4" : ""}`}>
                      <div className="h-7 w-7 rounded-full bg-sky-200 text-[#181d26] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-1 min-w-0 flex-grow">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-extrabold text-[#181d26]">Round {idx + 1}: {r.name}</p>
                          <Badge variant="neutral" className="text-[9px] py-0 font-extrabold capitalize bg-[#EDEFF2] text-[#333840]">
                            {r.type.toLowerCase().replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-[#5A6472] leading-relaxed font-semibold">{r.description}</p>
                        
                        {isScreeningRound && qCount > 0 && (
                          <div className="mt-2 space-y-1.5 border-l-2 border-[#1968E5]/40 pl-3">
                            <span className="text-[9px] font-extrabold text-[#5A6472] uppercase block tracking-wider mb-1">Round Questions:</span>
                            {r.questions.map((q: any, qIdx: number) => (
                              <p key={q.id || qIdx} className="text-[9.5px] text-[#5A6472] font-semibold leading-relaxed">
                                Q{qIdx + 1}: &quot;{q.question}&quot; <span className="text-[#8A94A3] italic">({q.type.toLowerCase().replace("_", " ")})</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Hired Freelancers Workspace Links */}
          {project.applications.length > 0 && (
            <Card className="p-6 border-[#E2E5EA] bg-white shadow-xs rounded-[12px] space-y-4 text-left">
              <h3 className="text-sm font-semibold text-[#181d26] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#EDEFF2] pb-3">
                Hired Talent & Workspaces
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {project.applications.map((app: any) => (
                  <div
                    key={app.id}
                    className="flex justify-between items-center bg-[#F7F8FA] border border-[#EDEFF2] rounded-xl p-3 shadow-sm hover:border-[#1968E5]/20 transition-all"
                  >
                    <div>
                      <span className="font-bold text-[#181d26] block">{app.freelancer.user.name || "Talented Freelancer"}</span>
                      <span className="text-[#8A94A3] text-[9px] block mt-0.5">Application ID: {app.id.slice(0, 8)}</span>
                    </div>
                    <Link href={`/workspace/${app.id}`} target="_blank">
                      <Button size="xs" className="cursor-pointer bg-[#181d26] hover:bg-[#333840] text-white text-[10px] py-1 px-3 rounded-lg font-bold">
                        Open Workspace
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pre-Application FAQ Discussion Board */}
          <Card className="p-6 border-[#E2E5EA] bg-white shadow-xs rounded-[12px] space-y-4">
            <h3 className="text-sm font-black text-[#181d26] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#EDEFF2] pb-3">
              <HelpCircle className="h-4.5 w-4.5 text-[#181d26]" /> Pre-Application Q&A Board
            </h3>
            <CompanyDiscussionBoard projectId={project.id} faqList={meta.faq || []} />
          </Card>

        </div>

        {/* Right Sidebar (30%) - Timeline & Project Stats */}
        <div className="space-y-6 lg:sticky lg:top-24">
          
          {/* Key Timeline Deadlines */}
          <Card className="p-6 border-[#E2E5EA] bg-white shadow-xs rounded-[12px] space-y-4 text-left">
            <h3 className="text-xs font-black text-[#8A94A3] uppercase tracking-widest block">Opportunity Timeline</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <Clock className="h-4.5 w-4.5 text-rose-500" />
                </div>
                <div>
                  <span className="text-[10px] text-[#8A94A3] font-bold uppercase block">Application Deadline</span>
                  <span className="text-xs font-bold text-[#181D26]">
                    {meta.timeline?.applicationDeadline || "Not specified"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-4.5 w-4.5 text-[#181d26]" />
                </div>
                <div>
                  <span className="text-[10px] text-[#8A94A3] font-bold uppercase block">Kickoff / Start Date</span>
                  <span className="text-xs font-bold text-[#181D26]">
                    {meta.timeline?.projectStart || "Not specified"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-4.5 w-4.5 text-[#181d26]" />
                </div>
                <div>
                  <span className="text-[10px] text-[#8A94A3] font-bold uppercase block">Expected Completion</span>
                  <span className="text-xs font-bold text-[#181D26]">
                    {meta.timeline?.expectedCompletion || "Not specified"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Stats Specifications */}
          <Card className="p-6 border-[#E2E5EA] bg-white shadow-xs rounded-[12px] space-y-4 text-left">
            <h3 className="text-xs font-black text-[#8A94A3] uppercase tracking-widest block">Gig Specifications</h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#5A6472] font-bold">Stipend Budget</span>
                <span className="font-extrabold text-[#181D26]">{formatProjectBudget(project)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5A6472] font-bold">Required Experience</span>
                <span className="font-extrabold text-[#181D26]">{project.experienceRequired} Years</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5A6472] font-bold">Priority Level</span>
                <span className="font-extrabold text-[#181D26] uppercase text-[10px]">{project.priority}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5A6472] font-bold">Hired Limit</span>
                <span className="font-extrabold text-[#181D26]">{project.applications.length} / {project.freelancersLimit} Hired</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5A6472] font-bold">Gender Preference</span>
                <span className="font-extrabold text-[#181D26] capitalize">{project.preferredGender ? project.preferredGender.toLowerCase() : "any"}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EDEFF2] space-y-1.5">
              <span className="text-[10px] font-bold text-[#8A94A3] uppercase block tracking-wider">Required skills</span>
              <div className="flex flex-wrap gap-1.5">
                {project.requiredSkills.map((skill: string) => (
                  <Badge key={skill} variant="neutral" className="text-[9px]">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

        </div>
      </div>

    </div>
  );
}
