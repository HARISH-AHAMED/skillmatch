import React from "react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Star, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function AdminReviewsPage() {
  const reviews = await db.review.findMany({
    include: {
      project: {
        select: { title: true },
      },
      reviewer: {
        select: { name: true, email: true },
      },
      reviewee: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const handleDeleteReview = async (formData: FormData) => {
    "use server";
    const reviewId = formData.get("reviewId") as string;
    if (reviewId) {
      await db.review.delete({
        where: { id: reviewId },
      });
      revalidatePath("/admin/reviews");
    }
  };

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1D29]">
          Review Moderation
        </h1>
        <p className="text-xs text-[#5B6272] mt-1">
          Review written feedback entries and remove ratings violating guidelines
        </p>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card className="p-8 text-center text-xs text-[#5B6272]">
            No feedback entries recorded on the platform yet.
          </Card>
        ) : (
          reviews.map((rev) => (
            <Card key={rev.id} className="p-6 border-[#E3E5EA] bg-white space-y-4">
              <div className="flex justify-between items-start border-b border-[#E3E5EA] pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-[#1A1D29]">{rev.project.title}</h4>
                  <p className="text-[11px] text-[#5B6272]">
                    Reviewer: {rev.reviewer.name} ({rev.reviewer.email}) • Reviewee: {rev.reviewee.name}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {renderStars(rev.rating)}
                  </div>
                  <form action={handleDeleteReview}>
                    <input type="hidden" name="reviewId" value={rev.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="text-[#BC2A2A] hover:text-[#BC2A2A] hover:bg-[#FDEAEA] cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>

              <p className="text-xs text-[#5B6272] italic leading-relaxed bg-[#F8F9FB] p-4 border border-[#E3E5EA] rounded-lg">
                &quot;{rev.comment}&quot;
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
