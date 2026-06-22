"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { shortlistApplicant, rejectApplicant, hireApplicant } from "@/actions/applicationActions";
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
  const [selectedProfile, setSelectedProfile] = useState<ApplicantItem["freelancer"] | null>(null);

  const handleAction = async (id: string, actionType: "shortlist" | "reject" | "hire") => {
    setLoadingId(`${id}-${actionType}`);
    try {
      if (actionType === "shortlist") {
        await shortlistApplicant(id);
      } else if (actionType === "reject") {
        await rejectApplicant(id);
      } else if (actionType === "hire") {
        const confirmHiring = confirm("Are you sure you want to hire this freelancer? This will mark the project as IN PROGRESS and reject all other applicants.");
        if (confirmHiring) {
          await hireApplicant(id);
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
          const isProjectActive = app.project.status === "OPEN";

          return (
            <Card key={app.id} className="p-6 border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-[#002d59]">
                    {app.freelancer.user.name ? app.freelancer.user.name[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#002d59]">{app.freelancer.user.name}</h3>
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
                  onClick={() => setSelectedProfile(app.freelancer)}
                  className="cursor-pointer text-xs gap-1.5"
                >
                  <User className="h-3.5 w-3.5 text-[#002d59]" /> View Profile
                </Button>

                {isProjectActive && !isHired && !isRejected && (
                  <div className="flex flex-wrap gap-2.5 w-full sm:w-auto justify-end">
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
                      className="cursor-pointer text-xs bg-emerald-600 hover:bg-emerald-500 border-emerald-500/20"
                    >
                      {loadingId === `${app.id}-hire` ? "Hiring..." : "Hire Freelancer"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(app.id, "reject")}
                      disabled={loadingId !== null}
                      className="cursor-pointer text-xs text-rose-600 hover:text-rose-500 hover:bg-rose-50"
                    >
                      {loadingId === `${app.id}-reject` ? "Rejecting..." : "Reject Candidate"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}
      </div>

      {/* Profile Detail Popup Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedProfile(null)}
          />

          {/* Modal Container */}
          <Card className="relative w-full max-w-2xl p-8 z-10 bg-white border border-slate-100 shadow-2xl rounded-3xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            {/* Close Button */}
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col pb-4 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-4.5">
                <div className="h-16 w-16 rounded-2xl bg-[#f0f7ff] border border-slate-100 overflow-hidden flex items-center justify-center font-black text-lg text-[#002d59] shrink-0">
                  {selectedProfile.user.image ? (
                    <img src={selectedProfile.user.image} alt={selectedProfile.user.name || "User"} className="h-full w-full object-cover" />
                  ) : (
                    selectedProfile.user.name ? selectedProfile.user.name[0].toUpperCase() : "U"
                  )}
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-[#002d59] tracking-tight">{selectedProfile.user.name}</h3>
                  {selectedProfile.professionalHeadline && (
                    <p className="text-xs font-bold text-[#3ac0ff] leading-none">{selectedProfile.professionalHeadline}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span>{selectedProfile.user.email}</span>
                  </div>
                </div>
              </div>

              {/* Show Badges under Header */}
              {selectedProfile.verificationBadges && selectedProfile.verificationBadges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.verificationBadges.map((badge: string) => (
                    <span key={badge} className="inline-flex items-center gap-1 bg-sky-50 text-[9px] font-black text-[#002d59] border border-sky-100 px-2 py-0.5 rounded-full shadow-sm">
                      <CheckCircle className="h-3 w-3 text-sky-500 fill-sky-50" />
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              {/* Availability & Response Time Bar */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 border-t border-slate-50/50">
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${
                    selectedProfile.availabilityStatus === "AVAILABLE" ? "bg-emerald-500" :
                    selectedProfile.availabilityStatus === "BUSY" ? "bg-amber-500" : "bg-rose-500"
                  }`} />
                  {selectedProfile.availabilityStatus === "AVAILABLE" && "Available for Hire"}
                  {selectedProfile.availabilityStatus === "BUSY" && "Busy / Limited Availability"}
                  {selectedProfile.availabilityStatus === "UNAVAILABLE" && "Unavailable"}
                </span>
                {selectedProfile.responseTime && (
                  <span className="text-slate-450">• Response: <strong className="text-slate-700">{selectedProfile.responseTime}</strong></span>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="py-4 space-y-5">
              {/* Rating and stats panel */}
              <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Experience</span>
                  <span className="text-sm font-extrabold text-[#002d59]">{selectedProfile.experienceYears} Years</span>
                </div>
                <div className="space-y-1 border-x border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rating Score</span>
                  <span className="text-sm font-extrabold text-[#002d59] flex items-center justify-center gap-1">
                    {selectedProfile.rating}★
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gigs Done</span>
                  <span className="text-sm font-extrabold text-[#002d59]">{selectedProfile.completedProjects} Jobs</span>
                </div>
              </div>

              {/* Bio block */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Professional Bio</span>
                <p className="text-slate-650 leading-relaxed bg-slate-50/70 p-4 border border-slate-100 rounded-2xl italic font-medium">
                  &quot;{selectedProfile.bio || "No professional biography provided."}&quot;
                </p>
              </div>

              {/* Skills block */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expertise Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.skills.map((skill) => (
                    <Badge key={skill} variant="neutral" className="text-[10px] px-2.5 py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Dynamic Lists parsed from Prisma JSON */}
              {(() => {
                const expList = Array.isArray(selectedProfile.experience) ? (selectedProfile.experience as any[]) : [];
                const certList = Array.isArray(selectedProfile.certifications) ? (selectedProfile.certifications as any[]) : [];
                const portList = Array.isArray(selectedProfile.portfolioItems) ? (selectedProfile.portfolioItems as any[]) : [];

                return (
                  <>
                    {/* Work Experience History */}
                    <div className="py-4 border-t border-slate-100 space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Work Experience Timeline ({expList.length})
                      </span>
                      {expList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No work history provided.</p>
                      ) : (
                        <div className="space-y-3.5">
                          {expList.map((exp: any, idx: number) => (
                            <div key={exp.id || idx} className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-1.5 text-xs">
                              <div className="flex justify-between items-start">
                                <h4 className="font-extrabold text-[#002d59]">{exp.title}</h4>
                                <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                  {exp.startDate} to {exp.current ? "Present" : exp.endDate}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#3ac0ff] font-bold">{exp.company}</p>
                              {exp.description && (
                                <p className="text-[10px] text-slate-550 leading-relaxed font-medium pt-0.5">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Certifications Creds */}
                    <div className="py-4 border-t border-slate-100 space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Professional Certifications ({certList.length})
                      </span>
                      {certList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No certificates listed.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {certList.map((cert: any, idx: number) => (
                            <div key={cert.id || idx} className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center gap-3 text-xs">
                              {cert.imageUrl ? (
                                <a href={cert.imageUrl} target="_blank" rel="noopener noreferrer" className="h-10 w-10 border border-slate-200 bg-white rounded-xl overflow-hidden shrink-0 flex items-center justify-center cursor-zoom-in">
                                  <img src={cert.imageUrl} alt={cert.name} className="h-full w-full object-cover" />
                                </a>
                              ) : (
                                <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 shrink-0">
                                  <Award className="h-4.5 w-4.5" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-[#002d59] leading-tight">{cert.name}</h4>
                                <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">
                                  {cert.issuer} • {cert.year}
                                  {cert.imageUrl && (
                                    <a href={cert.imageUrl} target="_blank" rel="noopener noreferrer" className="text-[#3ac0ff] hover:text-[#002d59] font-bold ml-2 transition-colors">
                                      View Certificate
                                    </a>
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Portfolio Gallery items */}
                    <div className="py-4 border-t border-slate-100 space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Portfolio Gallery Showcase ({portList.length})
                      </span>
                      {portList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic font-medium">No projects added to gallery.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {portList.map((item: any, idx: number) => (
                            <div key={item.id || idx} className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col justify-between space-y-3 hover:border-sky-200 transition-colors">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black text-[#002d59] line-clamp-1">{item.title}</h4>
                                  <Badge variant="neutral" className="text-[9px] uppercase px-1.5 py-0.5 font-bold tracking-wider shrink-0">
                                    {item.type.replace("_", " ")}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-slate-550 leading-relaxed font-medium line-clamp-3">
                                  {item.description}
                                </p>

                                {/* Display Grid of project images */}
                                {item.images && item.images.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                                    {item.images.map((img: string, i: number) => (
                                      <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="aspect-video bg-white border border-slate-200 rounded-lg overflow-hidden h-10 shrink-0 cursor-zoom-in">
                                        <img src={img} alt="screenshot" className="h-full w-full object-cover" />
                                      </a>
                                    ))}
                                  </div>
                                ) : item.fileUrl ? (
                                  /* Fallback/Legacy image display */
                                  item.type === "IMAGE" && (
                                    <div className="bg-white border border-slate-200/50 rounded-xl overflow-hidden h-28 mt-2 flex items-center justify-center shadow-inner">
                                      <img src={item.fileUrl} alt={item.title} className="h-full w-full object-cover" />
                                    </div>
                                  )
                                ) : null}
                                {item.type === "VIDEO" && item.fileUrl && (
                                  <div className="bg-black border border-slate-900 rounded-xl overflow-hidden h-28 mt-2 flex items-center justify-center">
                                    <video src={item.fileUrl} controls className="h-full w-full object-contain" />
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex justify-end">
                                {item.url ? (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3ac0ff] hover:text-[#002d59] transition-colors"
                                  >
                                    <span>Open Link</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-[9px] text-slate-400 italic">No link available</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Resume / CV file link */}
              {selectedProfile.resumeUrl && (
                <div className="py-4 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resume / CV Document</span>
                  <a
                    href={selectedProfile.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#002d59] hover:text-[#3ac0ff] font-bold bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span>View Resume File</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Completed Platform Projects */}
              <div className="py-4 border-t border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Completed Platform Projects ({selectedProfile.applications.length})
                </span>
                {selectedProfile.applications.length === 0 ? (
                  <p className="text-xs text-slate-550 italic font-medium">No platform projects completed yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {selectedProfile.applications.map((app) => (
                      <div key={app.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <h4 className="font-bold text-[#002d59]">{app.project.title}</h4>
                          <p className="text-[10px] text-slate-550">Hired by {app.project.company.companyName}</p>
                        </div>
                        <span className="font-bold text-[#002d59]">${app.project.budget}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client Reviews */}
              <div className="py-4 border-t border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Client Reviews ({selectedProfile.user.reviewsReceived.length})
                </span>
                {selectedProfile.user.reviewsReceived.length === 0 ? (
                  <p className="text-xs text-slate-550 italic font-medium">No reviews received yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {selectedProfile.user.reviewsReceived.map((rev) => (
                      <div key={rev.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#002d59] truncate max-w-[70%]">{rev.project.title}</span>
                          <span className="text-[10px] font-extrabold text-amber-500">{rev.rating}★</span>
                        </div>
                        <p className="text-slate-650 italic leading-relaxed font-medium">&quot;{rev.comment}&quot;</p>
                        <p className="text-[9px] text-slate-400 text-right">— Reviewed by {rev.reviewer.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedProfile(null)}
                className="cursor-pointer"
              >
                Close Profile
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
