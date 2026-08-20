import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompanyProfileView } from "@/components/shared/CompanyProfileView";
import { getCompany, projectsForCompany } from "@/data/server/entities";
import { reviewsFor } from "@/data/server/records";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = await getCompany(id);
  if (!c) return { title: "Company not found" };
  return {
    title: `${c.companyName} — ${c.industry}`,
    description: c.description.slice(0, 155),
    alternates: { canonical: `/companies/${c.id}` },
    openGraph: {
      title: `${c.companyName} · FRIVVO`,
      description: c.missionVision,
      images: [{ url: c.bannerUrl }],
    },
  };
}

export default async function PublicCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const [allProjects, reviews] = await Promise.all([
    projectsForCompany(company.id),
    // Reviews are keyed by the company owner's user id.
    reviewsFor(company.userId),
  ]);
  const projects = allProjects.filter((p) => p.status !== "DRAFT");

  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.companyName,
    description: company.description,
    url: company.website,
    logo: company.logoUrl || undefined,
    image: company.bannerUrl,
    foundingDate: String(company.foundedYear),
    address: { "@type": "PostalAddress", addressLocality: company.location },
    ...(reviews.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: company.rating,
        reviewCount: company.reviewCount,
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
        <CompanyProfileView company={company} projects={projects} reviews={reviews} />
      </main>
      <Footer />
    </div>
  );
}
