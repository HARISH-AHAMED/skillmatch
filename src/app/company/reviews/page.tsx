import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ReviewForm } from "./ReviewForm";
import { Card } from "@/components/ui/Card";
import { Star, MessageSquareQuote } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
  }>;
}

export default async function CompanyReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preselectedProjectId = params.projectId || "";
  const session = await auth();
  const userId = session!.user.id;

  // Run database queries in parallel
  const [company, activeContracts, submittedReviews] = await Promise.all([
    db.company.findUnique({
      where: { userId },
    }),
    db.project.findMany({
      where: {
        company: { userId },
        status: { in: ["IN_PROGRESS", "COMPLETED"] },
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
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.review.findMany({
      where: { reviewerId: userId },
      include: {
        project: {
          select: { title: true },
        },
        reviewee: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!company) {
    return (
      <div className="p-8 text-center bg-white border border-[#E3E5EA] rounded-lg text-[#5B6272] text-xs">
        Complete your company profile to write feedback reviews.
      </div>
    );
  }

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1D29]">
          Project Reviews & Contracts
        </h1>
        <p className="text-xs text-[#5B6272] mt-1">
          Review hired freelancers on completed assignments or ongoing contracts
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left pane: Review submission form */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-[#1A1D29]">Submit Freelancer Review</h2>
          <ReviewForm projects={activeContracts as any} initialProjectId={preselectedProjectId} />
        </div>

        {/* Right pane: Review logs history */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-[#1A1D29]">Review History</h2>
          
          <div className="space-y-4">
            {submittedReviews.length === 0 ? (
              <Card className="p-8 text-center text-xs text-[#5B6272] bg-white border border-[#E3E5EA]">
                No reviews left for freelancers yet.
              </Card>
            ) : (
              submittedReviews.map((rev) => (
                <Card key={rev.id} className="p-5 border-[#E3E5EA] bg-white">
                  <div className="flex justify-between items-center pb-2.5 border-b border-[#E3E5EA] mb-3 text-xs">
                    <div>
                      <h4 className="font-bold text-[#1A1D29]">{rev.project.title}</h4>
                      <p className="text-[11px] text-[#5B6272] mt-0.5">
                        Reviewed Freelancer: {rev.reviewee.name}
                      </p>
                    </div>
                    <div className="flex gap-0.5">
                      {renderStars(rev.rating)}
                    </div>
                  </div>

                  <p className="text-xs text-[#5B6272] italic flex gap-2">
                    <MessageSquareQuote className="h-4.5 w-4.5 text-[#1A1D29]/70 shrink-0 mt-0.5" />
                    &quot;{rev.comment}&quot;
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
