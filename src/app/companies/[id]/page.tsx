import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompanyProfileView } from "@/components/shared/CompanyProfileView";
import { COMPANIES, getCompany, projectsForCompany, reviewsFor } from "@/data/queries";

export function generateStaticParams() {
  return COMPANIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = getCompany(id);
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
  const company = getCompany(id);
  if (!company) notFound();

  const projects = projectsForCompany(company.id).filter((p) => p.status !== "DRAFT");
  const reviews = reviewsFor(company.id);

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
