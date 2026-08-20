import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/marketing/Hero";
import {
  ClosingBand,
  DomainCardRow,
  DualCta,
  FaqSection,
  FeatureBlocks,
  FeaturedCarousel,
  HowItWorks,
  ReelStrip,
  Testimonials,
  TrustBar,
} from "@/components/marketing/Sections";
import { SectionHeading } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CompanyCard, FreelancerCard } from "@/components/shared/Cards";
import { Reveal } from "@/components/motion/Motion";
import { featuredCompanies, featuredProjects, topFreelancers } from "@/data/server/entities";
import { companyNames, openProjectCounts, platformStats } from "@/data/server/stats";

export const metadata: Metadata = {
  title: "FRIVVO — Hire, deliver and get paid in one workspace",
  description:
    "Publish work, discover talent by explainable AI match score, hire into named roles, and run the whole engagement — contracts, funded payment stages, tasks, chat, meetings, deliverables and verifiable certificates — inside one project workspace.",
  alternates: { canonical: "/" },
};

const HOME_FAQ = [
  {
    q: "How is the match score calculated?",
    a: "It is a deterministic weighted formula, not a black box. Skill match counts for 50%, experience match 20%, rating 15%, completion rate 10% and project priority 5%. Every applicant view shows the five component scores alongside the total, so a company can see exactly why one candidate scored above another — and a freelancer can see which signal is holding them back.",
  },
  {
    q: "What happens to my money between funding and release?",
    a: "Funding moves value into the project's committed pool and writes a FUND entry to an append-only ledger. Releasing writes a RELEASE entry and moves it to the freelancer. Committed money — funded but not yet released — cannot be withdrawn, and a project cannot be marked complete while any stage is unreleased, any work log is unapproved, or any stipend period is unpaid.",
  },
  {
    q: "Can I hire more than one person on a project?",
    a: "Yes. Define named roles with a fixed number of slots each. Hiring is checked against both the role's slot count and the project's overall limit, under a lock, so two simultaneous hires into a last slot cannot both succeed. When a role fills, its remaining open applicants are closed out automatically.",
  },
  {
    q: "What is an apprentice?",
    a: "An apprentice shadows a named role without consuming one of its slots. They can be hired even when the role and the project are full, they are paid on the same terms as the role defines, and they receive their own certificate at completion. Apprentice reviews accumulate separately and never move the primary rating.",
  },
  {
    q: "Are certificates actually verifiable?",
    a: "Every certificate has a public ID and a verification page that needs no login. The content is snapshotted at issue time — recipient name, role title, skills, dates and both signatories — so it keeps saying what it said the day it was issued, even if the profile or the project changes later. Revoked certificates keep their record and show the revocation reason.",
  },
  {
    q: "Does it cost anything to join?",
    a: "Creating an account, building a profile, browsing projects and applying are all free for freelancers. Companies can publish and manage projects free during the current phase; see the pricing page for what changes when payment processing goes live.",
  },
];

export default async function HomePage() {
  const [stats, projects, talent, companies, trustNames] = await Promise.all([
    platformStats(),
    featuredProjects(9),
    topFreelancers(4),
    featuredCompanies(3),
    companyNames(),
  ]);
  const openRoles = await openProjectCounts(companies.map((c) => c.id));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero
          stats={{
            freelancers: stats.freelancers,
            companies: stats.companies,
            projects: stats.projects,
            released: stats.totalReleased,
          }}
          people={talent.map((f) => ({ id: f.id, name: f.name, avatarUrl: f.avatarUrl }))}
        />

        <TrustBar names={trustNames} />

        <DomainCardRow />

        <FeaturedCarousel projects={projects} />

        <HowItWorks />

        <FeatureBlocks />

        <ReelStrip />

        {/* ---- Top talent ---- */}
        <section className="section-y bg-[var(--color-app)]">
          <div className="container-wide">
            <SectionHeading
              eyebrow="Top rated this month"
              title="Specialists with a verified track record"
              description="Ratings are averaged from completed engagements only, and completed-project counts are derived rather than self-reported."
              action={
                <Button
                  href="/discover/talent"
                  variant="secondary"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Browse all talent
                </Button>
              }
            />
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {talent.map((f, i) => (
                <Reveal key={f.id} delay={i * 0.07}>
                  <FreelancerCard freelancer={f} showMatch={false} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Companies ---- */}
        <section className="section-y bg-[var(--color-surface)]">
          <div className="container-wide">
            <SectionHeading
              eyebrow="Hiring now"
              title="Companies running engagements on FRIVVO"
              description="Trust score, payment reliability and average time to hire are computed from real engagement history, not claimed."
              action={
                <Button
                  href="/discover/companies"
                  variant="secondary"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  All companies
                </Button>
              }
            />
            <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {companies.map((c, i) => (
                <Reveal key={c.id} delay={i * 0.07}>
                  <CompanyCard
                    company={c}
                    openRoles={
                      openRoles.get(c.id) ?? 0
                    }
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Testimonials />

        <DualCta />

        <FaqSection items={HOME_FAQ} />

        <ClosingBand />
      </main>
      <Footer />
    </div>
  );
}
