import type { Metadata } from "next";
import { TalentBrowser } from "@/components/shared/TalentBrowser";
import { PageHeader } from "@/components/ui/Card";
import { Breadcrumb } from "@/components/ui/Feedback";
import { searchFreelancers } from "@/data/server/entities";

export const metadata: Metadata = {
  title: "Hire talent",
  description:
    "Search verified specialists on FRIVVO by skill, discipline, availability and rating. Ratings are averaged from completed engagements and project counts are derived, never self-reported.",
  alternates: { canonical: "/discover/talent" },
};

export default async function DiscoverTalentPage() {
  const freelancers = await searchFreelancers();

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Verified specialists on FRIVVO",
    numberOfItems: freelancers.length,
    itemListElement: freelancers.slice(0, 10).map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: f.name,
      url: `https://frivvo.com/freelancers/${f.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container-wide py-8 md:py-10">
          <PageHeader
            breadcrumb={
              <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Hire talent" }]} />
            }
            title="Specialists with a verified track record"
            description="Every rating is averaged from completed engagements only, and every completed-project count is derived from real hires — not entered by the person on the profile."
            className="mb-0"
          />
        </div>
      </div>
      <div className="container-wide py-8">
        <TalentBrowser freelancers={freelancers} />
      </div>
    </>
  );
}
