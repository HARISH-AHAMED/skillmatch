import { requireFreelancer } from "@/data/server/context";
import { getFreelancer } from "@/data/server/entities";
import { reviewsBy, reviewsFor } from "@/data/server/records";
import { ReviewsClient } from "./ReviewsClient";

export default async function FreelancerReviewsPage() {
  const { viewer, freelancer } = await requireFreelancer("/freelancer/reviews");

  // Reviews are keyed by user id, not by profile id.
  const [profile, received, written] = await Promise.all([
    getFreelancer(freelancer.id),
    reviewsFor(viewer.userId),
    reviewsBy(viewer.userId),
  ]);

  if (!profile) return null;

  return <ReviewsClient freelancer={profile} received={received} written={written} />;
}
