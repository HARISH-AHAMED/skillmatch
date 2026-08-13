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
import { getProjectDescriptionText, getProjectMetadataDirect, formatProjectBudget } from "@/lib/workflowHelpers";
import { CompanyDiscussionBoard } from "@/components/CompanyDiscussionBoard";
import { IssueCertificateModal } from "@/components/IssueCertificateModal";
import { toggleProjectVisibility, closeProject } from "@/actions/projectActions";

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
    <div className="space-y-6 text-left">
      {/* Header controls toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white border border-[#E2E5EA] p-6 rounded-[12px] shadow-xs">
        <div className="text-left">
          <h1 className="text-2xl font-semibold text-[#181d26] tracking-tight">
            Manage Projects
          </h1>
          <p className="text-xs text-[#5A6472] font-normal mt-1">
            Track, monitor, and edit active job requests posted by your team
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          {/* View mode toggle */}
          <div className="flex bg-[#F7F8FA] border border-[#E2E5EA] p-1 rounded-[12px] gap-0.5 self-center">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={cn(
                "px-3 py-1.5 rounded-[8px] transition-all duration-150 cursor-pointer flex items-center gap-1 text-xs font-medium",
                viewMode === "card"
                  ? "bg-[#181d26] text-white"
                  : "text-[#5A6472] hover:text-[#181d26]"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-1.5 rounded-[8px] transition-all duration-150 cursor-pointer flex items-center gap-1 text-xs font-medium",
                viewMode === "table"
                  ? "bg-[#181d26] text-white"
                  : "text-[#5A6472] hover:text-[#181d26]"
              )}
            >
              <Table className="h-3.5 w-3.5" /> Table
            </button>
          </div>

          <Link href="/company/projects/new">
            <Button className="cursor-pointer text-xs font-medium py-2 rounded-[12px] bg-[#181d26] text-white hover:bg-[#333840]">Post New Project</Button>
          </Link>
        </div>
      </div>

      {/* Projects List body */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[#5A6472]">
            No projects posted yet. Use the button above to add one.
          </Card>
        ) : viewMode === "table" ? (
          /* Table View mode */
          <Card className="overflow-x-auto border border-[#E2E5EA] bg-white shadow-xs p-5 rounded-[12px]">
            <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#EDEFF2] text-[10px] text-[#8A94A3] font-extrabold uppercase tracking-wider">
                  <th className="w-[26%] pb-3.5 pl-2 pt-1">Project</th>
                  <th className="w-[12%] pb-3.5 pt-1 text-center">Status</th>
                  <th className="w-[11%] pb-3.5 pt-1 text-center">Visibility</th>
                  <th className="w-[13%] pb-3.5 pt-1 text-center">Budget</th>
                  <th className="w-[9%] pb-3.5 pt-1 text-center">Hires</th>
                  <th className="w-[11%] pb-3.5 pt-1 text-center">Applicants</th>
                  <th className="w-[18%] pb-3.5 pt-1 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEFF2] font-medium">
                {projects.map((project) => {
                  const isVisLoading = loadingId === `${project.id}-visibility`;
                  return (
                    <tr key={project.id} className="hover:bg-[#F7F8FA]/50 transition-colors">
                      {/* Title & Date */}
                      <td className="py-4 align-middle pl-2 text-left pr-3">
                        <Link href={`/company/projects/${project.id}`}>
                          <button className="font-bold text-[#181d26] hover:text-[#5A6472] hover:underline cursor-pointer block text-left truncate max-w-[200px]">
                            {project.title}
                          </button>
                        </Link>
                        <span className="text-[9px] text-[#8A94A3] block font-semibold">Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 align-middle text-center">
                        {getStatusBadge(project.status)}
                      </td>

                      {/* Visibility badge & toggle */}
                      <td className="py-4 align-middle text-center">
                        <div className="flex flex-col items-center gap-1">
                          {project.isVisible ? (
                            <Badge variant="neutral" className="bg-[#181d26] text-white border-[#181d26] py-0 px-2 text-[9px]">Public</Badge>
                          ) : (
                            <Badge variant="neutral" className="bg-[#EDEFF2] text-[#5A6472] border-[#E2E5EA] py-0 px-2 text-[9px]">Private</Badge>
                          )}
                          <button
                            disabled={loadingId !== null}
                            onClick={() => handleToggleVisibility(project.id)}
                            className="cursor-pointer rounded-[6px] bg-[#181d26] px-2.5 py-1 text-[9px] font-bold text-white transition-colors hover:bg-[#333840] disabled:opacity-50"
                          >
                            {isVisLoading ? "Updating..." : project.isVisible ? "Hide" : "Show"}
                          </button>
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="py-4 align-middle text-center font-bold text-[#333840]">
                        {formatProjectBudget(project)}
                      </td>

                      {/* Hired progress */}
                      <td className="py-4 align-middle text-center font-bold text-[#181d26]">
                        {project.applications.length} / {project.freelancersLimit}
                      </td>

                      {/* Applicants count */}
                      <td className="py-4 align-middle text-center">
                        <Badge variant="accent" className="font-extrabold text-[10px] py-0.5 px-2">
                          {project._count.applications} Apps
                        </Badge>
                      </td>

                      {/* Workspace & Action Links */}
                      <td className="py-4 align-middle text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/company/projects/${project.id}`}>
                            <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2.5">
                              <FileText className="h-3 w-3 mr-0.5" /> Details
                            </Button>
                          </Link>
                          
                          <Link href={`/company/applicants?projectId=${project.id}`}>
                            <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2.5 border-[#181d26]/20 text-[#181d26]">
                              <Users2 className="h-3 w-3 mr-0.5" /> Applicants
                            </Button>
                          </Link>

                          <Link href={`/company/projects/edit/${project.id}`}>
                            <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2.5">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </Link>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ) : (
          /* Card View mode — banner grid, two per row; the whole card opens the project */
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/company/projects/${project.id}`} className="group block">
                <Card className="flex h-full flex-col overflow-hidden border border-[#E2E5EA] bg-white p-0 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1968E5]/40 hover:shadow-lg rounded-[12px]">
                  {/* Banner */}
                  <div className="relative">
                    {project.bannerUrl ? (
                      <img
                        src={project.bannerUrl}
                        alt={project.title}
                        className="aspect-[16/9] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-[#EDEFF2] via-[#F7F8FA] to-[#E2E5EA]">
                        <div className="px-6 text-center">
                          <FileText className="mx-auto h-6 w-6 text-[#8A94A3]" />
                          <p className="mt-2 line-clamp-2 text-xs font-bold text-[#5A6472]">{project.title}</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                      {getStatusBadge(project.status)}
                      {project.isVisible ? (
                        <Badge variant="success" className="bg-sky-50 text-sky-700 border-sky-200">Public</Badge>
                      ) : (
                        <Badge variant="neutral" className="bg-white/90 text-[#5A6472] border-[#E2E5EA]">Hidden</Badge>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-3 p-5 text-left">
                    <div>
                      <h3 className="truncate text-sm font-semibold text-[#181d26] group-hover:text-[#5A6472]">
                        {project.title}
                      </h3>
                      <p className="mt-0.5 text-[10px] font-medium text-[#5A6472]">
                        Posted {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <p className="line-clamp-2 text-xs leading-relaxed text-[#5A6472]">
                      {getProjectDescriptionText(project.description)}
                    </p>

                    <div className="grid grid-cols-3 gap-2 rounded-[10px] border border-[#E2E5EA] bg-[#F7F8FA] px-3 py-2.5 text-[10px]">
                      <div className="min-w-0">
                        <span className="block font-semibold uppercase tracking-wider text-[#8A94A3]">Budget</span>
                        <span className="block truncate font-bold text-[#181d26]">{formatProjectBudget(project)}</span>
                      </div>
                      <div className="min-w-0 border-l border-[#E2E5EA] pl-2">
                        <span className="block font-semibold uppercase tracking-wider text-[#8A94A3]">Hired</span>
                        <span className="block font-bold text-[#181d26]">
                          {project.applications.length} / {project.freelancersLimit}
                        </span>
                      </div>
                      <div className="min-w-0 border-l border-[#E2E5EA] pl-2">
                        <span className="block font-semibold uppercase tracking-wider text-[#8A94A3]">Applicants</span>
                        <span className="block font-bold text-[#181d26]">{project._count.applications}</span>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {project.requiredSkills.slice(0, 4).map((skill: string) => (
                        <Badge key={skill} variant="neutral" className="text-[9px]">
                          {skill}
                        </Badge>
                      ))}
                      {project.requiredSkills.length > 4 && (
                        <Badge variant="neutral" className="text-[9px]">
                          +{project.requiredSkills.length - 4}
                        </Badge>
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
