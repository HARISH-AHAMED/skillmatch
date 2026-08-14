import React from "react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Star, Award, TrendingUp } from "lucide-react";

export default async function AdminFreelancersPage() {
  const freelancers = await db.freelancer.findMany({
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { rating: "desc" },
  });

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1A1D29]">
          Freelancer Directory
        </h1>
        <p className="text-xs text-[#5B6272] font-normal mt-1">
          Monitor freelancer bio credentials, active skills indices, and rating averages
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {freelancers.length === 0 ? (
          <Card className="p-8 text-center text-[#5B6272] text-xs md:col-span-2 border border-[#E3E5EA] rounded-lg">
            No freelancer profiles registered yet.
          </Card>
        ) : (
          freelancers.map((f) => (
            <Card key={f.id} className="p-6 border border-[#C7CBD6] bg-white rounded-lg space-y-4">
              <div className="flex justify-between items-start border-b border-[#E3E5EA] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1D29]">{f.user.name}</h3>
                  <p className="text-[11px] font-mono text-[#5B6272]">{f.user.email}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#8F5E08]">
                  <Star className="h-4 w-4 fill-[#B9790A]/20" />
                  <span className="font-bold">{f.rating}</span>
                </div>
              </div>

              <p className="text-xs text-[#5B6272] leading-relaxed italic">
                &quot;{f.bio || "No professional bio provided."}&quot;
              </p>

              <div className="grid grid-cols-3 gap-2.5 text-[11px] text-[#5B6272] bg-[#F8F9FB] p-3.5 border border-[#E3E5EA] rounded-lg">
                <div>
                  <span className="text-[#5B6272] block">Experience</span>
                  <span className="font-semibold text-[#1A1D29]">{f.experienceYears} Years</span>
                </div>
                <div>
                  <span className="text-[#5B6272] block">Completed</span>
                  <span className="font-semibold text-[#1A1D29]">{f.completedProjects} Jobs</span>
                </div>
                <div>
                  <span className="text-[#5B6272] block">Completion</span>
                  <span className="font-semibold text-[#147A44]">{f.completionRate}%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {f.skills.map((skill) => (
                  <Badge key={skill} variant="neutral" className="text-[11px]">
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
