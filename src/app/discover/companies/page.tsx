import type { Metadata } from "next";
import { CompanyCard } from "@/components/shared/Cards";
import { PageHeader, SectionHeading } from "@/components/ui/Card";
import { Breadcrumb } from "@/components/ui/Feedback";
import { Reveal } from "@/components/motion/Motion";
import { COMPANIES, projectsForCompany } from "@/data/queries";

export const metadata: Metadata = {
  title: "Companies hiring",
  description:
    "Browse companies running engagements on FRIVVO. Trust score, payment reliability and average time to hire are computed from real engagement history.",
  alternates: { canonical: "/discover/companies" },
};

export default function DiscoverCompaniesPage() {
  const companies = [...COMPANIES].sort((a, b) => b.trustScore - a.trustScore);

  return (
    <>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container-wide py-8 md:py-10">
          <PageHeader
            breadcrumb={
              <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Companies" }]} />
            }
            title="Companies hiring on FRIVVO"
            description="Trust score, payment reliability and time to hire are recomputed from every completed engagement and every review — so they reflect how a company actually behaves, not how it describes itself."
            className="mb-0"
          />
        </div>
      </div>

      <div className="container-wide py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.05}>
              <CompanyCard
                company={c}
                openRoles={projectsForCompany(c.id).filter((p) => p.status === "OPEN").length}
              />
            </Reveal>
          ))}
        </div>

        <div className="mt-14">
          <SectionHeading
            align="center"
            eyebrow="How the scores work"
            title="Three numbers, all derived from history"
          />
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
            {[
              {
                title: "Trust score",
                body: "The mean of communication, payment reliability and project clarity sub-scores across every freelancer review, expressed out of 100.",
              },
              {
                title: "Payment reliability",
                body: "The payment sub-score alone. It moves every time a freelancer reviews an engagement with this company.",
              },
              {
                title: "Time to hire",
                body: "The average gap between an application arriving and a hire being confirmed, across the company's completed pipelines.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
              >
                <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
