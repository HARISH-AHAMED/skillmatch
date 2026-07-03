import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Star, MessageSquareQuote } from "lucide-react";

import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";

export default async function FreelancerReviewsPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Find completed projects where this freelancer was hired, but hasn't reviewed the company
  const [reviews, pendingProjects] = await Promise.all([
    db.review.findMany({
      where: { revieweeId: userId },
      include: {
        project: {
          include: {
            company: true,
          },
        },
        reviewer: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
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
        reviews: {
          none: {
            reviewerId: userId,
          },
        },
      },
      include: {
        company: true,
        applications: {
          where: {
            freelancer: { userId },
            status: "HIRED",
          },
        },
      },
    }),
  ]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4.5 w-4.5 ${
          i < rating ? "text-amber-400 fill-amber-400/20" : "text-slate-300"
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
            Client Feedback & Reviews
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review comments and ratings submitted by companies after project completion
          </p>
        </div>
      </div>

      {/* Pending Reviews Section */}
      {pendingProjects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-[#002d59] uppercase tracking-wider">
            ⚠️ Pending Reviews ({pendingProjects.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {pendingProjects.map((proj) => {
              const app = proj.applications[0];
              if (!app) return null;
              return (
                <Card key={proj.id} className="p-4 bg-amber-50/40 border-amber-200/80 shadow-sm flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-[#002d59]">{proj.title}</h3>
                    <p className="text-[10px] text-slate-550 mt-1">
                      Client: <strong className="text-slate-700">{proj.company.companyName}</strong>
                    </p>
                    <p className="text-[9px] text-amber-700 font-semibold mt-1">
                      Please leave a review for the company to close out the workspace.
                    </p>
                  </div>
                  <Link
                    href={`/workspace/${app.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002d59] hover:bg-[#001f3f] text-white text-[10px] font-black rounded-lg w-fit transition-colors"
                  >
                    Go to Workspace & Review <ArrowRight className="h-3 w-3" />
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#002d59] uppercase tracking-wider">
          Feedback History
        </h2>
        {reviews.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-500">
            No feedback reviews received yet. Completed contracts will populate reviews here.
          </Card>
        ) : (
          reviews.map((rev) => (
            <Card key={rev.id} className="p-6 border-slate-100 bg-white shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#002d59]">{rev.project.title}</h3>
                  <p className="text-[11px] text-slate-500">
                    Reviewed by {rev.reviewer.name} ({rev.project.company.companyName})
                  </p>
                </div>
                <div className="flex gap-0.5">
                  {renderStars(rev.rating)}
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <MessageSquareQuote className="h-5 w-5 text-[#002d59]/70 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  &quot;{rev.comment}&quot;
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
