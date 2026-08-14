import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";
import { Card } from "@/components/ui/Card";
import { Briefcase } from "lucide-react";
import { formatProjectBudget } from "@/lib/workflowHelpers";

export default async function CompanyProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [company, completedProjects] = await Promise.all([
    db.company.findUnique({
      where: { userId },
    }),
    db.project.findMany({
      where: {
        company: { userId },
        status: "COMPLETED",
      },
      include: {
        applications: {
          where: {
            status: "HIRED",
          },
          include: {
            freelancer: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1D29]">
          Company Profile Settings
        </h1>
        <p className="text-xs text-[#5B6272] mt-1 font-normal">
          Configure your company profile, location, website, and description so freelancers know more about you
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProfileForm initialData={company} />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#1A1D29] uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" /> Completed Projects ({completedProjects.length})
            </h3>
            {completedProjects.length === 0 ? (
              <Card className="p-6 text-center text-xs text-[#5B6272] bg-white border border-[#E3E5EA] rounded-lg">
                No completed projects yet.
              </Card>
            ) : (
              completedProjects.map((project) => {
                const freelancerName = project.applications[0]?.freelancer?.user?.name || "Unknown Freelancer";
                return (
                  <Card key={project.id} className="p-5 bg-white border border-[#C7CBD6] rounded-lg space-y-2">
                    <div>
                      <h4 className="text-xs font-semibold text-[#1A1D29]">{project.title}</h4>
                      <p className="text-[11px] text-[#5B6272] font-normal mt-0.5">
                        Freelancer: <span className="text-[#1A1D29] font-medium">{freelancerName}</span>
                      </p>
                      <p className="text-[11px] text-[#5B6272] mt-0.5">
                        Budget: {formatProjectBudget(project)}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
