import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";
import { Card } from "@/components/ui/Card";
import { Star, Briefcase } from "lucide-react";
import { formatProjectBudget } from "@/lib/workflowHelpers";
import { getFreelancerCertificates, getHiddenCertificateIds } from "@/actions/certificateActions";

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

  // Platform-issued certificates, including ones hidden from the public profile —
  // this is the freelancer's own view, where they control that visibility.
  const certificates = freelancer
    ? await getFreelancerCertificates(freelancer.id, { includeHidden: true })
    : [];
  const hiddenIds = freelancer ? await getHiddenCertificateIds(freelancer.id) : [];
  const earnedCertificates = certificates.map((c) => ({
    id: c.id,
    publicId: c.publicId,
    projectTitle: c.projectTitle,
    roleTitle: c.roleTitle,
    issuerName: c.issuerName,
    issuedAt: c.issuedAt,
    hidden: hiddenIds.includes(c.id),
  }));

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1D29]">
          My Profile Settings
        </h1>
        <p className="text-xs text-[#5B6272] mt-1 font-normal">
          Add skills, experience, and bios to update your matching scores against open projects
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProfileForm initialData={freelancer} earnedCertificates={earnedCertificates} />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#1A1D29] uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" /> Completed Projects ({completedProjects.length})
            </h3>
            {completedProjects.length === 0 ? (
              <Card className="p-6 text-center text-xs text-[#5B6272] bg-white border border-[#E3E5EA] rounded-lg">
                No platform projects completed yet.
              </Card>
            ) : (
              completedProjects.map((project) => {
                const projectReview = project.reviews[0];
                return (
                  <Card key={project.id} className="p-5 bg-white border border-[#E3E5EA] rounded-lg space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-[#1A1D29]">{project.title}</h4>
                      <p className="text-[11px] text-[#5B6272] font-normal">
                        {project.company.companyName} • {formatProjectBudget(project)}
                      </p>
                    </div>
                    {projectReview && (
                      <div className="pt-2.5 border-t border-[#E3E5EA]">
                        <div className="flex items-center gap-1 mb-1 text-[#8F5E08]">
                          <Star className="h-3 w-3 fill-[#F5B942]" />
                          <span className="text-[11px] font-medium text-[#1A1D29]">{projectReview.rating}/5</span>
                        </div>
                        <p className="text-[11px] text-[#5B6272] italic leading-normal line-clamp-3">
                          &quot;{projectReview.comment}&quot;
                        </p>
                        <p className="text-[11px] text-[#5B6272] text-right mt-1">— {projectReview.reviewer.name}</p>
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
