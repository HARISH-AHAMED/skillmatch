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
  LayoutGrid,
  Table,
  Edit2,
  Users2,
  FileText,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProjectStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getProjectDescriptionText, getProjectMetadataDirect } from "@/lib/workflowHelpers";
import { CompanyDiscussionBoard } from "@/components/CompanyDiscussionBoard";
import { toggleProjectVisibility, closeProject } from "@/actions/projectActions";

interface ProjectsListProps {
  initialProjects: any[];
}

export function ProjectsList({ initialProjects }: ProjectsListProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
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

  const handleToggleVisibility = async (projectId: string) => {
    setLoadingId(`${projectId}-visibility`);
    try {
      const res = await toggleProjectVisibility(projectId);
      if (res.success) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, isVisible: res.isVisible } : p))
        );
      }
    } catch (err: any) {
      alert(err.message || "Failed to update visibility");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCloseProject = async (projectId: string) => {
    const confirmClose = confirm("Are you sure you want to close this project listing?");
    if (!confirmClose) return;

    setLoadingId(`${projectId}-close`);
    try {
      const res = await closeProject(projectId);
      if (res.success) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: ProjectStatus.CLOSED } : p))
        );
      }
    } catch (err: any) {
      alert(err.message || "Failed to close project");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white border border-slate-100 shadow-sm p-6 rounded-2xl">
        <div className="text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#002d59]">
            Manage Projects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track, monitor, and edit active job requests posted by your team
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          {/* View mode toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 self-center">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1 text-[10px] font-bold",
                viewMode === "card"
                  ? "bg-white text-[#002d59] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <LayoutGrid className="h-3 w-3" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1 text-[10px] font-bold",
                viewMode === "table"
                  ? "bg-white text-[#002d59] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Table className="h-3 w-3" /> Table
            </button>
          </div>

          <Link href="/company/projects/new">
            <Button className="cursor-pointer text-xs font-bold py-2.5">Post New Project</Button>
          </Link>
        </div>
      </div>

      {/* Projects List body */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-500">
            No projects posted yet. Use the button above to add one.
          </Card>
        ) : viewMode === "table" ? (
          /* Table View mode */
          <Card className="overflow-x-auto border-slate-100 bg-white shadow-sm p-5 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-150 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="pb-3.5 pl-2 pt-1">Project Details</th>
                  <th className="pb-3.5 pt-1 text-center">Status</th>
                  <th className="pb-3.5 pt-1 text-center">Visibility</th>
                  <th className="pb-3.5 pt-1 text-center">Budget</th>
                  <th className="pb-3.5 pt-1 text-center">Hires</th>
                  <th className="pb-3.5 pt-1 text-center">Applicants</th>
                  <th className="pb-3.5 pt-1 text-right pr-2">Workspace & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {projects.map((project) => {
                  const isVisLoading = loadingId === `${project.id}-visibility`;
                  return (
                    <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Title & Date */}
                      <td className="py-4 pl-2 text-left pr-3">
                        <Link href={`/company/projects/${project.id}`}>
                          <button className="font-bold text-[#002d59] hover:text-[#3ac0ff] hover:underline cursor-pointer block text-left truncate max-w-[200px]">
                            {project.title}
                          </button>
                        </Link>
                        <span className="text-[9px] text-slate-400 block font-semibold">Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 text-center">
                        {getStatusBadge(project.status)}
                      </td>

                      {/* Visibility badge & toggle */}
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {project.isVisible ? (
                            <Badge variant="success" className="bg-sky-50 text-sky-700 border-sky-200 py-0 px-2 text-[9px]">Public</Badge>
                          ) : (
                            <Badge variant="neutral" className="bg-slate-100 text-slate-500 border-slate-200 py-0 px-2 text-[9px]">Private</Badge>
                          )}
                          <button
                            disabled={loadingId !== null}
                            onClick={() => handleToggleVisibility(project.id)}
                            className="text-[9px] font-bold text-slate-500 hover:text-[#002d59] underline cursor-pointer"
                          >
                            {isVisLoading ? "Updating..." : "Toggle"}
                          </button>
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="py-4 text-center font-bold text-slate-700">
                        ${project.budget}
                      </td>

                      {/* Hired progress */}
                      <td className="py-4 text-center font-bold text-[#002d59]">
                        {project.applications.length} / {project.freelancersLimit}
                      </td>

                      {/* Applicants count */}
                      <td className="py-4 text-center">
                        <Badge variant="accent" className="font-extrabold text-[10px] py-0.5 px-2">
                          {project._count.applications} Apps
                        </Badge>
                      </td>

                      {/* Workspace & Action Links */}
                      <td className="py-4 text-right pr-2">
                        <div className="flex flex-wrap items-center justify-end gap-2.5">
                          <Link href={`/company/projects/${project.id}`}>
                            <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2.5">
                              <FileText className="h-3 w-3 mr-0.5" /> Details
                            </Button>
                          </Link>
                          
                          <Link href={`/company/applicants?projectId=${project.id}`}>
                            <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2.5 border-[#002d59]/20 text-[#002d59]">
                              <Users2 className="h-3 w-3 mr-0.5" /> Applicants
                            </Button>
                          </Link>

                          <Link href={`/company/projects/edit/${project.id}`}>
                            <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2.5">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </Link>

                          {project.status === ProjectStatus.OPEN && (
                            <Button
                              size="xs"
                              variant="ghost"
                              disabled={loadingId !== null}
                              onClick={() => handleCloseProject(project.id)}
                              className="text-rose-600 hover:bg-rose-50 h-7 py-1 px-2 text-[9px] font-bold"
                            >
                              Close
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : (
          /* Card View mode */
          projects.map((project) => (
            <Card key={project.id} className="p-6 border-slate-100 bg-white shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-[#002d59]">{project.title}</h3>
                    {getStatusBadge(project.status)}
                    {project.isVisible ? (
                      <Badge variant="success" className="bg-sky-50 text-sky-700 border-sky-200">Public</Badge>
                    ) : (
                      <Badge variant="neutral" className="bg-slate-100 text-slate-500 border-slate-200">Private / Hidden</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Posted: {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                  {/* Visibility Toggle Button */}
                  <Button
                    type="button"
                    disabled={loadingId !== null}
                    onClick={() => handleToggleVisibility(project.id)}
                    size="sm"
                    variant="outline"
                    className="cursor-pointer flex items-center gap-1.5"
                    title={project.isVisible ? "Make Private" : "Make Public"}
                  >
                    {project.isVisible ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Hide Gig</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Show Gig</span>
                      </>
                    )}
                  </Button>

                  <Link href={`/company/projects/${project.id}`}>
                    <Button size="sm" variant="outline" className="cursor-pointer font-bold">
                      View Details
                    </Button>
                  </Link>

                  <Link href={`/company/projects/edit/${project.id}`}>
                    <Button size="sm" variant="outline" className="cursor-pointer font-bold border-[#002d59]/20 text-[#002d59]">
                      Edit Gig
                    </Button>
                  </Link>

                  <Link href={`/company/applicants?projectId=${project.id}`}>
                    <Button size="sm" variant="outline" className="cursor-pointer font-bold">
                      Review Applicants ({project._count.applications})
                    </Button>
                  </Link>

                  {project.status === ProjectStatus.OPEN && (
                    <Button
                      type="button"
                      disabled={loadingId !== null}
                      onClick={() => handleCloseProject(project.id)}
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:text-rose-500 hover:bg-rose-50 cursor-pointer border border-transparent hover:border-rose-500/10 font-bold"
                    >
                      Close Listing
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4 text-left">
                {getProjectDescriptionText(project.description)}
              </p>

              {/* Hired Freelancers / Workspace Links */}
              {project.applications.length > 0 && (
                <div className="bg-slate-55/40 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs text-left">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    🤝 Hired Talent & Workspaces
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {project.applications.map((app: any) => (
                      <div
                        key={app.id}
                        className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-lg px-3 py-1.5 shadow-sm"
                      >
                        <span className="font-bold text-[#002d59]">
                          {app.freelancer.user.name || "Freelancer"}
                        </span>
                        <Link href={`/workspace/${app.id}`} target="_blank" rel="noopener noreferrer">
                          <Button size="xs" className="cursor-pointer bg-[#3ac0ff] hover:bg-[#29aaeb] text-white text-[10px] py-1 px-2.5 h-auto font-bold">
                            Open Workspace
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discussion Board Q&A */}
              {(() => {
                const meta = getProjectMetadataDirect(project.description);
                return <CompanyDiscussionBoard projectId={project.id} faqList={meta.faq || []} />;
              })()}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-3 border-t border-slate-200 text-left">
                <div className="flex items-center gap-2 text-slate-600">
                  <DollarSign className="h-4 w-4 text-slate-500" />
                  <span>Budget: <strong className="text-slate-800">${project.budget}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Award className="h-4 w-4 text-slate-500" />
                  <span>Req Exp: <strong className="text-slate-800">{project.experienceRequired} years</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <ShieldAlert className="h-4 w-4 text-slate-500" />
                  <span>Priority: <strong className="text-slate-800 uppercase">{project.priority.toLowerCase()}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span>Hired: <strong className="text-slate-800">{project.applications.length} / {project.freelancersLimit} limit</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2 text-left">
                {project.requiredSkills.map((skill: string) => (
                  <Badge key={skill} variant="neutral" className="text-[9px]">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
