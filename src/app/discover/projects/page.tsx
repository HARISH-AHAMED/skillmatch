import type { Metadata } from "next";
import { ProjectBrowser } from "@/components/shared/ProjectBrowser";
import { PageHeader } from "@/components/ui/Card";
import { Breadcrumb } from "@/components/ui/Feedback";
import { browseProjects } from "@/data/server/entities";

export const metadata: Metadata = {
  title: "Browse projects",
  description:
    "Browse open engagements on FRIVVO. Every listing states its compensation model, role structure, screening process and deadline before you apply.",
  alternates: { canonical: "/discover/projects" },
};

export default async function DiscoverProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; domain?: string; skill?: string }>;
}) {
  const params = await searchParams;
  const projects = await browseProjects();
  const total = projects.length;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Open engagements on FRIVVO",
    numberOfItems: total,
    itemListElement: projects.slice(0, 10).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      url: `https://frivvo.com/discover/projects/${p.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container-wide py-8 md:py-10">
          <PageHeader
            breadcrumb={
              <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Browse projects" }]} />
            }
            title="Find work that is scoped before you start"
            description={`${total} open engagements. Each one publishes its compensation model, role slots, screening rounds and deadline up front — so you know what you are applying to.`}
            className="mb-0"
          />
        </div>
      </div>

      <div className="container-wide py-8">
        <ProjectBrowser
          projects={projects}
          initialQuery={params.q ?? ""}
          initialDomain={params.domain}
          initialSkill={params.skill}
        />
      </div>
    </>
  );
}
