import React from "react";
import { EmptyStateAstronaut } from "@/components/ui/AppBlocks";
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
          i < rating ? "text-[#8F5E08] fill-[#B9790A]/20" : "text-[#2159C9]"
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1D29]">
            Client Feedback & Reviews
          </h1>
          <p className="text-xs text-[#5B6272] mt-1">
            Review comments and ratings submitted by companies after project completion
          </p>
            <EmptyStateAstronaut title="No reviews yet" subtitle="Completed contracts will populate client feedback here." />
          </div>
      </div>

      {/* Pending Reviews Section */}
      {pendingProjects.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-[#1A1D29] uppercase tracking-wider">
            Pending Reviews ({pendingProjects.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {pendingProjects.map((proj) => {
              const app = proj.applications[0];
              if (!app) return null;
              return (
                <Card key={proj.id} className="p-4 bg-[#FFF3DC]/40 border-[#F5DEB0]/80 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-[#1A1D29]">{proj.title}</h3>
                    <p className="text-[11px] text-[#5B6272] mt-1">
                      Client: <strong className="text-[#5B6272]">{proj.company.companyName}</strong>
                    </p>
                    <p className="text-[11px] text-[#8F5E08] font-semibold mt-1">
                      Please leave a review for the company to close out the workspace.
                    </p>
                  </div>
                  <Link
                    href={`/workspace/${app.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#152C55] hover:bg-[#EAF1FE] text-white text-[11px] font-bold rounded-full w-fit transition-colors"
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
        <h2 className="text-xs font-bold text-[#1A1D29] uppercase tracking-wider">
          Feedback History
        </h2>
        {reviews.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[#5B6272]">
            
          </Card>
        ) : (
          reviews.map((rev) => (
            <Card key={rev.id} className="p-6 border-[#E3E5EA] bg-white space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#E3E5EA]">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#1A1D29]">{rev.project.title}</h3>
                  <p className="text-[11px] text-[#5B6272]">
                    Reviewed by {rev.reviewer.name} ({rev.project.company.companyName})
                  </p>
                </div>
                <div className="flex gap-0.5">
                  {renderStars(rev.rating)}
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <MessageSquareQuote className="h-5 w-5 text-[#1A1D29]/70 shrink-0 mt-0.5" />
                <p className="text-xs text-[#5B6272] italic leading-relaxed">
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
