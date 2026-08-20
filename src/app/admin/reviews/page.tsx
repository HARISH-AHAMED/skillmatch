import { requireViewer } from "@/data/server/context";
import { allReviews } from "@/data/server/records";
import { ReviewsClient } from "./ReviewsClient";

export default async function AdminReviewsPage() {
  await requireViewer("ADMIN", "/admin/reviews");
  const reviews = await allReviews();

  return <ReviewsClient reviews={reviews} />;
}
