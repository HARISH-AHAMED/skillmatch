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
          className="text-xs font-medium text-[#1A1D29] hover:underline transition-colors cursor-pointer flex items-center gap-1.5"
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
            <Button size="sm" variant="outline" className="cursor-pointer gap-1.5 text-xs font-medium border-[#E3E5EA] text-[#1A1D29] hover:bg-[#F8F9FB] rounded-full">
              <Edit2 className="h-3.5 w-3.5" /> Edit Project
            </Button>
          </Link>
          <Link href={`/company/applicants?projectId=${project.id}`}>
            <Button size="sm" className="cursor-pointer gap-1.5 text-xs font-medium bg-[#152C55] text-white hover:bg-[#1E3D71] rounded-full">
              <Users className="h-3.5 w-3.5" /> Review Applicants ({project._count.applications})
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <Card className="relative overflow-hidden border border-[#E3E5EA] bg-white p-0 text-[#1A1D29] rounded-lg">
        {/* Project banner — same artwork freelancers see when browsing */}
        {project.bannerUrl ? (
          <img
            src={project.bannerUrl}
            alt={project.title}
            className="h-44 w-full object-cover sm:h-56"
          />
        ) : (
          <div className="h-24 w-full bg-[#152C55]" />
        )}

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8">
          <div className="space-y-3.5 text-left">
            <div className="flex flex-wrap items-center gap-2.5">
              {getStatusBadge(status)}
              {isVisible ? (
                <Badge variant="mint" className="text-[11px]">Public Listing</Badge>
              ) : (
                <Badge variant="neutral" className="text-[11px]">Private / Hidden</Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight text-[#1A1D29]">
              {project.title}
            </h1>

            <p className="text-xs text-[#5B6272] font-normal">
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
              className="cursor-pointer flex-1 md:flex-none flex items-center justify-center gap-1.5 text-xs font-medium text-[#1A1D29] border-[#E3E5EA] hover:bg-[#F8F9FB] rounded-full"
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
                className="cursor-pointer flex-1 md:flex-none text-[#BC2A2A] border-[#E3E5EA] hover:bg-[#FDEAEA] font-medium text-xs rounded-full"
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
          <Card className="p-6 border-[#E3E5EA] bg-white rounded-lg space-y-4">
            <h3 className="text-sm font-bold text-[#1A1D29] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E3E5EA] pb-3">
              <ClipboardList className="h-4.5 w-4.5 text-[#1A1D29]" /> Project Objectives & Description
            </h3>

            <div className="space-y-4 text-xs text-[#5B6272] leading-relaxed text-left">
              <div>
                <span className="font-bold text-[#1A1D29] uppercase text-[11px] tracking-wider block mb-1">Objectives & Brief</span>
                <p className="whitespace-pre-line">{cleanDescriptionText}</p>
              </div>

              {meta.deliverables && meta.deliverables.length > 0 && (
                <div>
                  <span className="font-bold text-[#1A1D29] uppercase text-[11px] tracking-wider block mb-1.5">Deliverables</span>
                  <ul className="list-disc pl-5 space-y-1 text-[#5B6272] font-medium">
                    {meta.deliverables.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {meta.responsibilities && meta.responsibilities.length > 0 && (
                <div>
                  <span className="font-bold text-[#1A1D29] uppercase text-[11px] tracking-wider block mb-1.5">Responsibilities</span>
                  <ul className="list-decimal pl-5 space-y-1 text-[#5B6272] font-medium">
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
            <Card className="p-6 border-[#E3E5EA] bg-white rounded-lg space-y-4 text-left">
              <h3 className="text-sm font-semibold text-[#1A1D29] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E3E5EA] pb-3">
                Selection Process & Recruitment Rounds
              </h3>
              
              <div className="border border-[#E3E5EA]/80 rounded-lg p-5 bg-[#F8F9FB] space-y-4">
                {meta.rounds.map((r: any, idx: number) => {
                  const isScreeningRound = r.type === "SCREENING_QUESTIONS";
                  const qCount = r.questions?.length || 0;

                  return (
                    <div key={r.id || idx} className={`flex items-start gap-3.5 text-left ${idx > 0 ? "border-t border-[#E3E5EA] pt-4" : ""}`}>
                      <div className="h-7 w-7 rounded-full bg-[#E8F1FE] text-[#1A1D29] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-1 min-w-0 flex-grow">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-[#1A1D29]">Round {idx + 1}: {r.name}</p>
                          <Badge variant="neutral" className="text-[11px] py-0 font-bold capitalize bg-[#F0F3F9] text-[#5B6272]">
                            {r.type.toLowerCase().replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#5B6272] leading-relaxed font-semibold">{r.description}</p>
                        
                        {isScreeningRound && qCount > 0 && (
                          <div className="mt-2 space-y-1.5 border-l border-[#C7CBD6]/40 pl-3">
                            <span className="text-[11px] font-bold text-[#5B6272] uppercase block tracking-wider mb-1">Round Questions:</span>
                            {r.questions.map((q: any, qIdx: number) => (
                              <p key={q.id || qIdx} className="text-[9.5px] text-[#5B6272] font-semibold leading-relaxed">
                                Q{qIdx + 1}: &quot;{q.question}&quot; <span className="text-[#5B6272] italic">({q.type.toLowerCase().replace("_", " ")})</span>
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
            <Card className="p-6 border-[#C7CBD6] bg-white rounded-lg space-y-4 text-left">
              <h3 className="text-sm font-semibold text-[#1A1D29] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E3E5EA] pb-3">
                Hired Talent & Workspaces
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {project.applications.map((app: any) => (
                  <div
                    key={app.id}
                    className="flex justify-between items-center bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg p-3 hover:border-[#E3E5EA]/20 transition-all"
                  >
                    <div>
                      <span className="font-bold text-[#1A1D29] block">{app.freelancer.user.name || "Talented Freelancer"}</span>
                      <span className="text-[#5B6272] text-[11px] block mt-0.5">Application ID: {app.id.slice(0, 8)}</span>
                    </div>
                    <Link href={`/workspace/${app.id}`} target="_blank">
                      <Button size="xs" className="cursor-pointer bg-[#152C55] hover:bg-[#1E3D71] text-white text-[11px] py-1 px-3 rounded-full font-bold">
                        Open Workspace
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pre-Application FAQ Discussion Board */}
          <Card className="p-6 border-[#E3E5EA] bg-white rounded-lg space-y-4">
            <h3 className="text-sm font-bold text-[#1A1D29] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E3E5EA] pb-3">
              <HelpCircle className="h-4.5 w-4.5 text-[#1A1D29]" /> Pre-Application Q&A Board
            </h3>
            <CompanyDiscussionBoard projectId={project.id} faqList={meta.faq || []} />
          </Card>

        </div>

        {/* Right Sidebar (30%) - Timeline & Project Stats */}
        <div className="space-y-6 lg:sticky lg:top-24">
          
          {/* Key Timeline Deadlines */}
          <Card className="p-6 border-[#E3E5EA] bg-white rounded-lg space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#5B6272] uppercase tracking-widest block">Opportunity Timeline</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#FDEAEA] border border-[#F5C2C2] flex items-center justify-center shrink-0">
                  <Clock className="h-4.5 w-4.5 text-[#BC2A2A]" />
                </div>
                <div>
                  <span className="text-[11px] text-[#5B6272] font-bold uppercase block">Application Deadline</span>
                  <span className="text-xs font-bold text-[#1A1D29]">
                    {meta.timeline?.applicationDeadline || "Not specified"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#E4F7EC] border border-[#BFE9D2] flex items-center justify-center shrink-0">
                  <Calendar className="h-4.5 w-4.5 text-[#1A1D29]" />
                </div>
                <div>
                  <span className="text-[11px] text-[#5B6272] font-bold uppercase block">Kickoff / Start Date</span>
                  <span className="text-xs font-bold text-[#1A1D29]">
                    {meta.timeline?.projectStart || "Not specified"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#E8F1FE] border border-[#C7CBD6] flex items-center justify-center shrink-0">
                  <Calendar className="h-4.5 w-4.5 text-[#1A1D29]" />
                </div>
                <div>
                  <span className="text-[11px] text-[#5B6272] font-bold uppercase block">Expected Completion</span>
                  <span className="text-xs font-bold text-[#1A1D29]">
                    {meta.timeline?.expectedCompletion || "Not specified"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Stats Specifications */}
          <Card className="p-6 border-[#E3E5EA] bg-white rounded-lg space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#5B6272] uppercase tracking-widest block">Gig Specifications</h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#5B6272] font-bold">Stipend Budget</span>
                <span className="font-bold text-[#1A1D29]">{formatProjectBudget(project)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5B6272] font-bold">Required Experience</span>
                <span className="font-bold text-[#1A1D29]">{project.experienceRequired} Years</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5B6272] font-bold">Priority Level</span>
                <span className="font-bold text-[#1A1D29] uppercase text-[11px]">{project.priority}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5B6272] font-bold">Hired Limit</span>
                <span className="font-bold text-[#1A1D29]">{project.applications.length} / {project.freelancersLimit} Hired</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#5B6272] font-bold">Gender Preference</span>
                <span className="font-bold text-[#1A1D29] capitalize">{project.preferredGender ? project.preferredGender.toLowerCase() : "any"}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3E5EA] space-y-1.5">
              <span className="text-[11px] font-bold text-[#5B6272] uppercase block tracking-wider">Required skills</span>
              <div className="flex flex-wrap gap-1.5">
                {project.requiredSkills.map((skill: string) => (
                  <Badge key={skill} variant="neutral" className="text-[11px]">
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
