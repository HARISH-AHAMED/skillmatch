import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { closeProject } from "@/actions/projectActions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Calendar, DollarSign, Users, Award, ShieldAlert } from "lucide-react";
import { ProjectStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export default async function CompanyProjectsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const company = await db.company.findUnique({
    where: { userId },
  });

  if (!company) {
    return (
      <div className="p-8 text-center bg-white border border-slate-100 shadow-sm rounded-2xl text-slate-500 text-xs">
        Please complete your profile to manage listings.
      </div>
    );
  }

  const projects = await db.project.findMany({
    where: { companyId: company.id },
    include: {
      applications: {
        where: { status: "HIRED" },
        select: {
          id: true,
          freelancer: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: { applications: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Server Action inline executor for closing project
  const triggerClose = async (formData: FormData) => {
    "use server";
    const id = formData.get("projectId") as string;
    if (id) {
      await closeProject(id);
      revalidatePath("/company/projects");
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
            Manage Projects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track, monitor, and edit active job requests posted by your team
          </p>
        </div>
        <Link href="/company/projects/new">
          <Button className="cursor-pointer">Post New Project</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-500">
            No projects posted yet. Use the button above to add one.
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="p-6 border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-[#002d59]">{project.title}</h3>
                    {getStatusBadge(project.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    Posted: {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <Link href={`/company/projects/edit/${project.id}`}>
                    <Button size="sm" variant="outline" className="cursor-pointer">
                      Edit Gig
                    </Button>
                  </Link>

                  <Link href={`/company/applicants?projectId=${project.id}`}>
                    <Button size="sm" variant="outline" className="cursor-pointer">
                      Review Applicants ({project._count.applications})
                    </Button>
                  </Link>

                  {project.status === ProjectStatus.IN_PROGRESS && (
                    <Link href={`/company/reviews?projectId=${project.id}`}>
                      <Button
                        size="sm"
                        className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 border-emerald-500/20 text-white font-semibold"
                      >
                        Complete & Review
                      </Button>
                    </Link>
                  )}

                  {project.status === ProjectStatus.OPEN && (
                    <form action={triggerClose}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-500 hover:bg-rose-50 cursor-pointer border border-transparent hover:border-rose-500/10"
                      >
                        Close Listing
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {project.description}
              </p>

              {/* Hired Freelancers / Workspace Links */}
              {project.applications.length > 0 && (
                <div className="mb-4 bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    🤝 Hired Talent & Workspaces
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {project.applications.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-lg px-3 py-1.5 shadow-sm"
                      >
                        <span className="font-bold text-[#002d59]">
                          {app.freelancer.user.name || "Freelancer"}
                        </span>
                        <Link href={`/workspace/${app.id}`} target="_blank" rel="noopener noreferrer">
                          <Button size="xs" className="cursor-pointer bg-[#3ac0ff] hover:bg-[#29aaeb] text-white text-[10px] py-1 px-2.5 h-auto">
                            Open Workspace
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs pt-3 border-t border-slate-200">
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

              <div className="flex flex-wrap gap-1.5 mt-4 pt-1">
                {project.requiredSkills.map((skill) => (
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
