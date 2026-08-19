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
  Table as TableIcon,
  Edit2,
  Users2,
  FileText,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyStateAstronaut } from "@/components/ui/AppBlocks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { ProjectStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getProjectDescriptionText, getProjectMetadataDirect, formatProjectBudget } from "@/lib/workflowHelpers";
import { CompanyDiscussionBoard } from "@/components/CompanyDiscussionBoard";
import { IssueCertificateModal } from "@/components/IssueCertificateModal";
import { toggleProjectVisibility, closeProject, deleteProject, setProjectLifecycle } from "@/actions/projectActions";

interface ProjectsListProps {
  initialProjects: any[];
  companyName?: string;
}

export function ProjectsList({ initialProjects, companyName = "Your Company" }: ProjectsListProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [issuingCert, setIssuingCert] = useState<{
    projectId: string;
    projectTitle: string;
    freelancerId: string;
    freelancerName: string;
    skills: string[];
  } | null>(null);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.DRAFT:
        return <Badge variant="warning">Draft</Badge>;
      case ProjectStatus.OPEN:
        return <Badge variant="success">Open / Active</Badge>;
      case ProjectStatus.IN_PROGRESS:
        return <Badge variant="primary">In Progress</Badge>;
      case ProjectStatus.COMPLETED:
        return <Badge variant="secondary">Completed</Badge>;
      case ProjectStatus.CANCELLED:
        return <Badge variant="danger">Cancelled / Dropped</Badge>;
      case ProjectStatus.ARCHIVED:
        return <Badge variant="neutral">Archived</Badge>;
      case ProjectStatus.CLOSED:
      default:
        return <Badge variant="neutral">Closed</Badge>;
    }
  };

  /** Only these are "active"; everything else is history. */
  const isActiveStatus = (status: ProjectStatus) =>
    status === ProjectStatus.DRAFT ||
    status === ProjectStatus.OPEN ||
    status === ProjectStatus.IN_PROGRESS;

  const isInactiveStatus = (status: ProjectStatus) =>
    status === ProjectStatus.CANCELLED || status === ProjectStatus.ARCHIVED;

  /**
   * Requirement #1/#10 — one lifecycle path. Nothing is hard-deleted: a
   * published project is cancelled, a draft is archived, and every
   * application, workspace, review, certificate and payment record survives.
   */
  const handleDeleteProject = async (projectId: string, status: ProjectStatus) => {
    const isDraft = status === ProjectStatus.DRAFT;
    const message = isDraft
      ? "Archive this draft? You will not be able to edit it afterwards."
      : "Cancel this project? It will stop accepting applications and be removed from public browse. Applications, workspace history and payment records are kept.";
    if (!confirm(message)) return;

    setLoadingId(`${projectId}-delete`);
    try {
      const res = await deleteProject(projectId);
      if (res.success && "status" in res && res.status) {
        const nextStatus = res.status as ProjectStatus;
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, status: nextStatus, isVisible: false } : p
          )
        );
      } else {
        alert(res.error || "Could not update this project.");
      }
    } catch (err: any) {
      alert(err.message || "Could not update this project.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    if (!confirm("Archive this project? It will move out of your active list. History is kept.")) return;
    setLoadingId(`${projectId}-archive`);
    try {
      const res = await setProjectLifecycle(projectId, "ARCHIVED");
      if (res.success) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, status: ProjectStatus.ARCHIVED, isVisible: false } : p
          )
        );
      } else {
        alert(res.error || "Could not archive this project.");
      }
    } finally {
      setLoadingId(null);
    }
  };

  /**
   * Requirement #10 — cancelled and archived projects are history, so they sort
   * below the active list rather than sitting among live work. They stay
   * visible and clearly badged: the records are intact, not hidden.
   */
  const orderedProjects = [...projects].sort((a, b) => {
    const rank = (st: ProjectStatus) => (isInactiveStatus(st) ? 1 : 0);
    return rank(a.status) - rank(b.status);
  });

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
    <div className="space-y-6 text-left">
      {/* Header controls toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white border border-[#E3E5EA] p-6 rounded-lg">
        <div className="text-left">
          <h1 className="text-2xl font-semibold text-[#1A1D29] tracking-tight">
            Manage Projects
          </h1>
          <p className="text-xs text-[#5B6272] font-normal mt-1">
            Track, monitor, and edit active job requests posted by your team
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          {/* View mode toggle */}
          <div className="flex bg-[#F8F9FB] border border-[#E3E5EA] p-1 rounded-lg gap-0.5 self-center">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={cn(
                "px-3 py-1.5 rounded-full transition-all duration-150 cursor-pointer flex items-center gap-1 text-xs font-medium",
                viewMode === "card"
                  ? "bg-[#152C55] text-white"
                  : "text-[#5B6272] hover:text-[#1A1D29]"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-1.5 rounded-full transition-all duration-150 cursor-pointer flex items-center gap-1 text-xs font-medium",
                viewMode === "table"
                  ? "bg-[#152C55] text-white"
                  : "text-[#5B6272] hover:text-[#1A1D29]"
              )}
            >
              <TableIcon className="h-3.5 w-3.5" /> Table
            </button>
          </div>

          <Link href="/company/projects/new">
            <Button className="cursor-pointer text-xs font-medium py-2 rounded-full bg-[#152C55] text-white hover:bg-[#1E3D71]">Post New Project</Button>
          </Link>
        </div>
      </div>

      {/* Projects List body */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[#5B6272]">
            No projects posted yet. Use the button above to add one.
          </Card>
        ) : viewMode === "table" ? (
          /* Table View mode */
          <Table className="min-w-[860px] table-fixed">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH className="w-[26%]">Project</TH>
                  <TH className="w-[12%]" align="center">Status</TH>
                  <TH className="w-[11%]" align="center">Visibility</TH>
                  <TH className="w-[13%]" align="center">Budget</TH>
                  <TH className="w-[9%]" align="center">Hires</TH>
                  <TH className="w-[11%]" align="center">Applicants</TH>
                  <TH className="w-[18%]" align="right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {orderedProjects.map((project) => {
                  const isVisLoading = loadingId === `${project.id}-visibility`;
                  return (
                    <TR key={project.id}>
                      {/* Title & Date */}
                      <TD className="pr-3">
                        <Link href={`/company/projects/${project.id}`}>
                          <button className="font-bold text-[#1A1D29] hover:text-[#5B6272] hover:underline cursor-pointer block text-left truncate max-w-[200px]">
                            {project.title}
                          </button>
                        </Link>
                        <span className="text-[11px] text-[#5B6272] block font-semibold">Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                      </TD>

                      {/* Status */}
                      <TD align="center">
                        {getStatusBadge(project.status)}
                      </TD>

                      {/* Visibility badge & toggle */}
                      <TD align="center">
                        <div className="flex flex-col items-center gap-1">
                          {project.isVisible ? (
                            <Badge variant="neutral" className="bg-[#152C55] text-white border-[#1A1D29] py-0 px-2 text-[11px]">Public</Badge>
                          ) : (
                            <Badge variant="neutral" className="bg-[#F0F3F9] text-[#5B6272] border-[#E3E5EA] py-0 px-2 text-[11px]">Private</Badge>
                          )}
                          <button
                            disabled={loadingId !== null}
                            onClick={() => handleToggleVisibility(project.id)}
                            className="cursor-pointer rounded-full bg-[#152C55] px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-[#1E3D71] disabled:opacity-50"
                          >
                            {isVisLoading ? "Updating..." : project.isVisible ? "Hide" : "Show"}
                          </button>
                        </div>
                      </TD>

                      {/* Budget */}
                      <TD align="center" className="font-semibold text-[#5B6272]">
                        {formatProjectBudget(project)}
                      </TD>

                      {/* Hired progress */}
                      <TD align="center" className="font-semibold">
                        {project.applications.length} / {project.freelancersLimit}
                      </TD>

                      {/* Applicants count */}
                      <TD align="center">
                        <Badge variant="accent" className="font-bold text-[11px] py-0.5 px-2">
                          {project._count.applications} Apps
                        </Badge>
                      </TD>

                      {/* Workspace & Action Links */}
                      <TD align="right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/company/projects/${project.id}`}>
                            <Button size="xs" variant="outline" className="cursor-pointer text-[11px] font-bold h-7 py-1 px-2.5">
                              <FileText className="h-3 w-3 mr-0.5" /> Details
                            </Button>
                          </Link>
                          
                          <Link href={`/company/applicants?projectId=${project.id}`}>
                            <Button size="xs" variant="outline" className="cursor-pointer text-[11px] font-bold h-7 py-1 px-2.5 border-[#1A1D29]/20 text-[#1A1D29]">
                              <Users2 className="h-3 w-3 mr-0.5" /> Applicants
                            </Button>
                          </Link>

                          <Link href={`/company/projects/edit/${project.id}`}>
                            <Button size="xs" variant="outline" className="cursor-pointer text-[11px] font-bold h-7 py-1 px-2.5">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </Link>

                          {!isInactiveStatus(project.status) && (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={loadingId !== null}
                              onClick={() => handleDeleteProject(project.id, project.status)}
                              className="cursor-pointer text-[11px] font-bold h-7 py-1 px-2.5 border-[#BC2A2A]/30 text-[#BC2A2A]"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}

                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
        ) : (
          /* Card View mode — banner grid, two per row; the whole card opens the project */
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {orderedProjects.map((project) => (
              <Link key={project.id} href={`/company/projects/${project.id}`} className="group block">
                <Card className="flex h-full flex-col overflow-hidden border border-[#E3E5EA] bg-white p-0 shadow-none transition-colors duration-[180ms] hover:border-[#C7CBD6] hover:bg-[#F0F3F9] rounded-xl">
                  {/* Banner */}
                  <div className="relative">
                    {project.bannerUrl ? (
                      <img
                        src={project.bannerUrl}
                        alt={project.title}
                        className="aspect-[16/9] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[16/9] w-full items-center justify-center bg-[#F0F3F9]">
                        <div className="px-6 text-center">
                          <FileText className="mx-auto h-6 w-6 text-[#5B6272]" />
                          <p className="mt-2 line-clamp-2 text-xs font-bold text-[#5B6272]">{project.title}</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                      {getStatusBadge(project.status)}
                      {project.isVisible ? (
                        <Badge variant="success" className="bg-[#E8F1FE] text-[#2159C9] border-[#C7CBD6]">Public</Badge>
                      ) : (
                        <Badge variant="neutral" className="bg-white/90 text-[#5B6272] border-[#E3E5EA]">Hidden</Badge>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-3 p-5 text-left">
                    <div>
                      <h3 className="truncate text-sm font-semibold text-[#1A1D29] group-hover:text-[#5B6272]">
                        {project.title}
                      </h3>
                      <p className="mt-0.5 text-[11px] font-medium text-[#5B6272]">
                        Posted {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <p className="line-clamp-2 text-xs leading-relaxed text-[#5B6272]">
                      {getProjectDescriptionText(project.description)}
                    </p>

                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#E3E5EA] bg-[#F8F9FB] px-3 py-2.5 text-[11px]">
                      <div className="min-w-0">
                        <span className="block font-semibold uppercase tracking-wider text-[#5B6272]">Budget</span>
                        <span className="block truncate font-bold text-[#1A1D29]">{formatProjectBudget(project)}</span>
                      </div>
                      <div className="min-w-0 border-l border-[#E3E5EA] pl-2">
                        <span className="block font-semibold uppercase tracking-wider text-[#5B6272]">Hired</span>
                        <span className="block font-bold text-[#1A1D29]">
                          {project.applications.length} / {project.freelancersLimit}
                        </span>
                      </div>
                      <div className="min-w-0 border-l border-[#C7CBD6] pl-2">
                        <span className="block font-semibold uppercase tracking-wider text-[#5B6272]">Applicants</span>
                        <span className="block font-bold text-[#1A1D29]">{project._count.applications}</span>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {project.requiredSkills.slice(0, 4).map((skill: string) => (
                        <Badge key={skill} variant="neutral" className="text-[11px]">
                          {skill}
                        </Badge>
                      ))}
                      {project.requiredSkills.length > 4 && (
                        <Badge variant="neutral" className="text-[11px]">
                          +{project.requiredSkills.length - 4}
                        </Badge>
                      )}
                    </div>

                    {/*
                      Requirement #12 — card actions. The card itself is a link,
                      so each control stops the navigation before acting. The
                      visibility button calls the same server action and the same
                      Project.isVisible field the table view uses (#11): one
                      field, one action, no second source of truth.
                    */}
                    <div
                      className="flex flex-wrap items-center gap-1.5 border-t border-[#E3E5EA] pt-3"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Link href={`/company/projects/edit/${project.id}`} className="shrink-0">
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-7 cursor-pointer px-2.5 py-1 text-[11px] font-bold"
                        >
                          <Edit2 className="mr-1 h-3 w-3" />
                          {project.status === ProjectStatus.DRAFT ? "Continue editing" : "Edit"}
                        </Button>
                      </Link>

                      {!isInactiveStatus(project.status) && project.status !== ProjectStatus.COMPLETED && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={loadingId !== null}
                          onClick={() => handleToggleVisibility(project.id)}
                          className="h-7 cursor-pointer px-2.5 py-1 text-[11px] font-bold"
                        >
                          {project.isVisible ? (
                            <><EyeOff className="mr-1 h-3 w-3" /> Hide</>
                          ) : (
                            <><Eye className="mr-1 h-3 w-3" /> Show</>
                          )}
                        </Button>
                      )}

                      {!isInactiveStatus(project.status) && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={loadingId !== null}
                          onClick={() => handleDeleteProject(project.id, project.status)}
                          className="h-7 cursor-pointer border-[#BC2A2A]/30 px-2.5 py-1 text-[11px] font-bold text-[#BC2A2A]"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          {project.status === ProjectStatus.DRAFT ? "Discard" : "Delete"}
                        </Button>
                      )}

                      {(project.status === ProjectStatus.CANCELLED ||
                        project.status === ProjectStatus.COMPLETED ||
                        project.status === ProjectStatus.CLOSED) && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={loadingId !== null}
                          onClick={() => handleArchiveProject(project.id)}
                          className="h-7 cursor-pointer px-2.5 py-1 text-[11px] font-bold"
                        >
                          Archive
                        </Button>
                      )}

                      {isInactiveStatus(project.status) && (
                        <span className="text-[11px] font-semibold text-[#5B6272]">
                          {project.status === ProjectStatus.CANCELLED
                            ? "Cancelled — history kept, no new applications"
                            : "Archived — history kept"}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {issuingCert && (
        <IssueCertificateModal
          projectId={issuingCert.projectId}
          projectTitle={issuingCert.projectTitle}
          freelancerId={issuingCert.freelancerId}
          freelancerName={issuingCert.freelancerName}
          companyName={companyName}
          suggestedSkills={issuingCert.skills}
          onClose={() => setIssuingCert(null)}
        />
      )}
    </div>
  );
}
