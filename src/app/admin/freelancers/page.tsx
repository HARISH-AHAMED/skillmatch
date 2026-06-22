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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
          Freelancer Directory
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor freelancer bio credentials, active skills indices, and rating averages
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {freelancers.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 text-xs md:col-span-2">
            No freelancer profiles registered yet.
          </Card>
        ) : (
          freelancers.map((f) => (
            <Card key={f.id} className="p-6 border-slate-100 bg-white shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#002d59]">{f.user.name}</h3>
                  <p className="text-[10px] font-mono text-slate-500">{f.user.email}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400/20" />
                  <span className="font-bold">{f.rating}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed italic">
                &quot;{f.bio || "No professional bio provided."}&quot;
              </p>

              <div className="grid grid-cols-3 gap-2.5 text-[10px] text-slate-600 bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Experience</span>
                  <span className="font-semibold text-slate-800">{f.experienceYears} Years</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Completed</span>
                  <span className="font-semibold text-slate-800">{f.completedProjects} Jobs</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Completion</span>
                  <span className="font-semibold text-emerald-700">{f.completionRate}%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {f.skills.map((skill) => (
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
