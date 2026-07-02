"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { shortlistApplicant, rejectApplicant, hireApplicant, removeFreelancer } from "@/actions/applicationActions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { User, Mail, Award, BrainCircuit, Star, Flame, ClipboardList, X, ExternalLink, ChevronRight, Briefcase, CheckCircle, FileText } from "lucide-react";
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
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
      <div className="space-y-6">
        <div className="bg-white border border-slate-100/80 shadow-sm p-6 rounded-2xl">
          <h2 className="text-base font-bold text-[#002d59] mb-1">Select a Project to Review</h2>
          <p className="text-xs text-slate-500">
            Please choose a project below to evaluate and rank candidate proposals matching that listing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.length === 0 ? (
            <Card className="col-span-full p-10 text-center text-xs text-slate-500">
              No projects posted yet. Post a project first to receive proposals.
            </Card>
          ) : (
            projects.map((project) => (
              <Card
                key={project.id}
                onClick={() => router.push(`/company/applicants?projectId=${project.id}`)}
                className="p-6 border-slate-100 bg-white hover:shadow-md transition-all cursor-pointer hover:border-[#3ac0ff]/30 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="text-sm font-bold text-[#002d59] group-hover:text-[#3ac0ff] transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    <Badge variant={project.status === "OPEN" ? "success" : "neutral"} className="shrink-0 text-[9px] px-2 py-0.5">
                      {project.status === "OPEN" ? "Active" : project.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                    <span>Budget: <strong>${project.budget}</strong></span>
                    <span>•</span>
                    <span>Exp: <strong>{project.experienceRequired}y</strong></span>
                    <span>•</span>
                    <span>Priority: <strong className="uppercase">{project.priority.toLowerCase()}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100/50 flex items-center gap-1">
                    <ClipboardList className="h-3 w-3 text-slate-400" />
                    <strong>{project._count.applications}</strong> proposals
                  </span>
                  <span className="text-[10px] font-bold text-[#002d59] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
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
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white border border-slate-100 shadow-md p-6 rounded-2xl sticky top-0 z-20">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Currently Reviewing</span>
          <h2 className="text-base font-extrabold text-[#002d59] line-clamp-1">
            {selectedProject ? selectedProject.title : "Project Details"}
          </h2>
          <button
            onClick={() => router.push("/company/applicants")}
            className="text-[10px] font-semibold text-[#3ac0ff] hover:text-[#002d59] transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
          >
            ← Back to all projects
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center hidden sm:inline">Switch Project:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              if (e.target.value === "all") {
                router.push("/company/applicants");
              } else {
                router.push(`/company/applicants?projectId=${e.target.value}`);
              }
            }}
            className="px-4 py-2 py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer min-w-[200px]"
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

      <div className="space-y-4">
      {applicants.length === 0 ? (
        <Card className="p-8 text-center text-xs text-slate-500">
          No proposals submitted for this project yet.
        </Card>
      ) : (
        applicants.map((app) => {
          const isHired = app.status === ApplicationStatus.HIRED;
          const isRejected = app.status === ApplicationStatus.REJECTED;
          const isProjectActive = app.project.status === "OPEN" || app.project.status === "IN_PROGRESS";

          return (
            <Card key={app.id} className="p-6 border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => app.freelancer.user.image && setLightboxImage(app.freelancer.user.image)}
                    disabled={!app.freelancer.user.image}
                    className={`h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-[#002d59] shrink-0 overflow-hidden border border-slate-200/50 ${
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
                      className="text-sm font-bold text-[#002d59] hover:text-[#3ac0ff] cursor-pointer transition-colors"
                    >
                      {app.freelancer.user.name}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Applied for: <strong className="text-slate-800">{app.project.title}</strong>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-500 block">Experience</span>
                  <span className="font-bold text-slate-800">{app.freelancer.experienceYears} Years</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Average Rating</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    {app.freelancer.rating}★
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Completion Rate</span>
                  <span className="font-bold text-emerald-700">{app.freelancer.completionRate}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Gigs Completed</span>
                  <span className="font-bold text-slate-800">{app.freelancer.completedProjects} Jobs</span>
                </div>
              </div>

              {/* Proposal Cover Letter */}
              <div className="space-y-1 mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cover Letter Proposal</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-4 border border-slate-100 rounded-xl italic">
                  &quot;{app.coverLetter}&quot;
                </p>
              </div>

              {/* Freelancer Skills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {app.freelancer.skills.map((skill) => (
                  <Badge key={skill} variant="neutral" className="text-[9px]">
                    {skill}
                  </Badge>
                ))}
              </div>

              {/* Action Handles */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-200">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/freelancers/${app.freelancer.id}`)}
                  className="cursor-pointer text-xs gap-1.5"
                >
                  <User className="h-3.5 w-3.5 text-[#002d59]" /> View Profile
                </Button>

                {isProjectActive && (
                  <div className="flex flex-wrap gap-2.5 w-full sm:w-auto justify-end">
                    {/* Hired candidate removal */}
                    {isHired && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction(app.id, "remove")}
                        disabled={loadingId !== null}
                        className="cursor-pointer text-xs text-rose-600 hover:text-rose-50 hover:bg-rose-50"
                      >
                        {loadingId === `${app.id}-remove` ? "Removing..." : "Remove Freelancer"}
                      </Button>
                    )}

                    {!isHired && !isRejected && (
                      <>
                        {app.status !== ApplicationStatus.SHORTLISTED && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(app.id, "shortlist")}
                            disabled={loadingId !== null}
                            className="cursor-pointer text-xs"
                          >
                            {loadingId === `${app.id}-shortlist` ? "Processing..." : "Shortlist Applicant"}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleAction(app.id, "hire")}
                          disabled={loadingId !== null}
                          className="cursor-pointer text-xs bg-emerald-600 hover:bg-emerald-500 border-emerald-500/20 text-white font-semibold"
                        >
                          {loadingId === `${app.id}-hire` ? "Hiring..." : "Hire Freelancer"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(app.id, "reject")}
                          disabled={loadingId !== null}
                          className="cursor-pointer text-xs text-rose-600 hover:text-rose-50"
                        >
                          {loadingId === `${app.id}-reject` ? "Rejecting..." : "Reject Candidate"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}
      </div>

      {/* Lightbox Zoom-In Modal Overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-slate-900/60 hover:bg-slate-900/80 transition-colors cursor-pointer z-10"
            title="Close image overlay"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative max-w-full max-h-[85vh] z-10 animate-in zoom-in-95 duration-200 rounded-2xl overflow-hidden shadow-2xl bg-black flex items-center justify-center">
            <img src={lightboxImage} alt="lightbox preview" className="object-contain max-h-[80vh] max-w-[90vw]" />
          </div>
        </div>
      )}
    </div>
  );
}
