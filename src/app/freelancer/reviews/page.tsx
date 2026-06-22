import React from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Star, MessageSquareQuote } from "lucide-react";

export default async function FreelancerReviewsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const reviews = await db.review.findMany({
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
  });

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
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#002d59]">
          Client Feedback & Reviews
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review comments and ratings submitted by companies after project completion
        </p>
      </div>

      <div className="space-y-4">
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
