import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProjectDetail } from "./PublicProjectDetail";
import { PROJECTS, getProject } from "@/data/queries";
import { COMPENSATION_META } from "@/lib/constants";

export function generateStaticParams() {
  return PROJECTS.filter((p) => p.status !== "DRAFT").map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return { title: "Project not found" };

  const summary = project.description.split("\n")[0]?.slice(0, 155) ?? "";
  return {
    title: project.title,
    description:
      summary ||
      `${COMPENSATION_META[project.compensation.type].label} engagement with ${project.company.companyName}.`,
    alternates: { canonical: `/discover/projects/${project.id}` },
    openGraph: {
      title: `${project.title} · ${project.company.companyName}`,
      description: summary,
      images: [{ url: project.bannerUrl }],
      type: "article",
    },
  };
}

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project || project.status === "DRAFT" || project.visibility === "PRIVATE") notFound();

  const jobSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: project.title,
    description: project.description,
    datePosted: project.createdAt,
    validThrough: project.applicationDeadline,
    employmentType: project.timingType.startsWith("Full") ? "FULL_TIME" : "PART_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: project.company.companyName,
      sameAs: `https://frivvo.com/companies/${project.company.id}`,
    },
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: { "@type": "Country", name: "Worldwide" },
    skills: project.requiredSkills.join(", "),
    ...(project.compensation.type !== "UNPAID" && {
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: project.compensation.currency,
        value: {
          "@type": "QuantitativeValue",
          ...(project.compensation.type === "HOURLY"
            ? { value: project.compensation.hourlyRate, unitText: "HOUR" }
            : { value: project.compensation.totalBudget, unitText: "PROJECT" }),
        },
      },
    }),
  };

  const faqSchema =
    project.faq.filter((f) => f.answer).length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: project.faq
            .filter((f) => f.answer)
            .map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <PublicProjectDetail projectId={project.id} />
    </>
  );
}
