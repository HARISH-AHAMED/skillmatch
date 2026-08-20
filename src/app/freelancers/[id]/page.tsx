import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FreelancerProfileDetail } from "@/components/shared/FreelancerProfileDetail";
import { FREELANCERS, certificatesFor, getFreelancer, reviewsFor } from "@/data/queries";

export function generateStaticParams() {
  return FREELANCERS.map((f) => ({ id: f.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const f = getFreelancer(id);
  if (!f) return { title: "Profile not found" };
  return {
    title: `${f.name} — ${f.professionalHeadline.split("—")[0].trim()}`,
    description: f.bio.slice(0, 155),
    alternates: { canonical: `/freelancers/${f.id}` },
    openGraph: {
      title: `${f.name} · FRIVVO`,
      description: f.professionalHeadline,
      images: [{ url: f.avatarUrl }],
      type: "profile",
    },
  };
}

export default async function PublicFreelancerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const freelancer = getFreelancer(id);
  if (!freelancer) notFound();

  const reviews = reviewsFor(freelancer.id);
  const certificates = certificatesFor(freelancer.id);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: freelancer.name,
    jobTitle: freelancer.professionalHeadline,
    description: freelancer.bio,
    image: freelancer.avatarUrl,
    address: { "@type": "PostalAddress", addressLocality: freelancer.location },
    knowsAbout: freelancer.skills,
    ...(reviews.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: freelancer.rating,
        reviewCount: freelancer.reviewCount,
        bestRating: 5,
      },
    }),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Navbar />
      <main className="flex-1">
        <FreelancerProfileDetail
          freelancer={freelancer}
          reviews={reviews}
          certificates={certificates}
        />
      </main>
      <Footer />
    </div>
  );
}
