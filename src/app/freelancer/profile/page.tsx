import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";
import { Card } from "@/components/ui/Card";
import { Star, Briefcase } from "lucide-react";

export default async function FreelancerProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [freelancer, completedProjects] = await Promise.all([
    db.freelancer.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    }),
    db.project.findMany({
      where: {
        status: "COMPLETED",
        applications: {
          some: {
            freelancer: { userId },
            status: "HIRED",
          },
        },
      },
      include: {
        company: {
          select: {
            companyName: true,
          },
        },
        reviews: {
          where: { revieweeId: userId },
          include: {
            reviewer: {
              select: {
                name: true,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
          My Profile Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Add skills, experience, and bios to update your matching scores against open projects
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProfileForm initialData={freelancer} />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#002d59] uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" /> Completed Projects ({completedProjects.length})
            </h3>
            {completedProjects.length === 0 ? (
              <Card className="p-6 text-center text-xs text-slate-400 bg-white border border-slate-100/80 shadow-sm rounded-2xl">
                No platform projects completed yet.
              </Card>
            ) : (
              completedProjects.map((project) => {
                const projectReview = project.reviews[0];
                return (
                  <Card key={project.id} className="p-5 bg-white border border-slate-100/80 shadow-sm rounded-2xl space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#002d59]">{project.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {project.company.companyName} • ${project.budget}
                      </p>
                    </div>
                    {projectReview && (
                      <div className="pt-2.5 border-t border-slate-100">
                        <div className="flex items-center gap-1 mb-1 text-amber-500">
                          <Star className="h-3 w-3 fill-amber-500/20" />
                          <span className="text-[10px] font-bold text-slate-700">{projectReview.rating}★</span>
                        </div>
                        <p className="text-[10px] text-slate-650 italic leading-normal line-clamp-3">
                          &quot;{projectReview.comment}&quot;
                        </p>
                        <p className="text-[9px] text-slate-400 text-right mt-1">— {projectReview.reviewer.name}</p>
                      </div>
                    )}
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
