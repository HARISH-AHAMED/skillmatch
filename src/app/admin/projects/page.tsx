import React from "react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Briefcase, Calendar, DollarSign, Trash2 } from "lucide-react";
import { ProjectStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getProjectDescriptionText, formatProjectBudget } from "@/lib/workflowHelpers";

export default async function AdminProjectsPage() {
  const projects = await db.project.findMany({
    include: {
      company: true,
      _count: {
        select: { applications: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const handleDeleteProject = async (formData: FormData) => {
    "use server";
    const projectId = formData.get("projectId") as string;
    if (projectId) {
      await db.project.delete({
        where: { id: projectId },
      });
      revalidatePath("/admin/projects");
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.OPEN:
        return <Badge variant="success">Open</Badge>;
      case ProjectStatus.IN_PROGRESS:
        return <Badge variant="primary">Active</Badge>;
      case ProjectStatus.COMPLETED:
        return <Badge variant="secondary">Completed</Badge>;
      case ProjectStatus.CLOSED:
      default:
        return <Badge variant="neutral">Closed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#181d26]">
          Project Listings Moderator
        </h1>
        <p className="text-xs text-[#5A6472] mt-1">
          Monitor posted project specs, applicants counts, and remove listings violating policies
        </p>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[#5A6472]">
            No projects posted on the platform yet.
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="p-6 border-[#EDEFF2] bg-white shadow-sm">
              <div className="flex justify-between items-start pb-3 border-b border-[#E2E5EA] mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#181d26]">{project.title}</h3>
                    {getStatusBadge(project.status)}
                  </div>
                  <p className="text-[10px] text-[#5A6472]">
                    Posted by: {project.company.companyName} • Urgency: {project.priority}
                  </p>
                </div>

                <form action={handleDeleteProject}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:text-rose-500 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>

              <p className="text-xs text-[#5A6472] leading-relaxed mb-4">
                {getProjectDescriptionText(project.description)}
              </p>

              <div className="grid grid-cols-3 gap-2.5 text-[10px] text-[#5A6472] border-t border-[#E2E5EA] pt-3.5">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-[#5A6472]" />
                  <span>Budget: <strong className="text-[#181D26]">{formatProjectBudget(project)}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#5A6472]" />
                  <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <span>Applications: <strong className="text-[#181D26]">{project._count.applications}</strong></span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
