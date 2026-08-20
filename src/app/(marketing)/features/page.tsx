import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/PageHero";
import {
  ClosingBand,
  FaqSection,
  FeatureBlocks,
  HowItWorks,
  ReelStrip,
} from "@/components/marketing/Sections";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Card";
import { Reveal } from "@/components/motion/Motion";
import { EDITORIAL } from "@/lib/media";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explainable match scores, named roles with slots and apprentices, funded payment stages on an append-only ledger, a seven-tab project workspace, and verifiable certificates issued at completion.",
  alternates: { canonical: "/features" },
};

const CAPABILITY_GROUPS = [
  {
    title: "Publishing & discovery",
    items: [
      ["Five-step project wizard", "Autosaves as a draft at every step, so nothing is lost halfway."],
      ["Five compensation models", "Fixed, hourly, milestone, stipend and non-monetary — each with its own rules."],
      ["46 currencies", "Every amount on a project is denominated in one currency, enforced everywhere."],
      ["Visibility control", "Listed publicly, searchable but invite-only, or fully private."],
      ["Explainable match score", "Five weighted signals, always shown alongside the total."],
      ["Cached recommendations", "The top ten matched freelancers per open project, refreshed on every change."],
    ],
  },
  {
    title: "Hiring & team structure",
    items: [
      ["Named roles with slots", "Hiring is checked against both the role's slots and the project limit."],
      ["Apprentice placements", "Shadow a role without consuming a slot, with a separate score and their own certificate."],
      ["Screening questions", "Required answers are enforced when the application is submitted, not just in the UI."],
      ["Offer letters & counter-offers", "Full negotiation history retained on both sides."],
      ["Dual-signature contracts", "Both signatures and both IP addresses captured server-side."],
      ["Automatic role lock", "When a role fills, its remaining open applicants close out — apprentices are spared."],
    ],
  },
  {
    title: "Delivery & money",
    items: [
      ["Seven-tab workspace", "Overview, funding, tasks, deliverables, chat, meetings and team."],
      ["Funded payment stages", "Money is committed before work starts and released after review."],
      ["Append-only ledger", "Every movement writes an entry with an idempotency key, so a double-click never pays twice."],
      ["Hourly work logs", "Approved logs keep the rate in force when the work was done."],
      ["Deliverable versioning", "New versions reset the review state, capped at two revisions."],
      ["Completion readiness", "A project cannot complete while any payment obligation is open."],
    ],
  },
  {
    title: "Proof & reputation",
    items: [
      ["Verifiable certificates", "Public verification page, no login required."],
      ["Snapshotted content", "A certificate keeps saying what it said the day it was issued."],
      ["Two-way reviews", "Companies rate freelancers; freelancers rate companies on three sub-scores."],
      ["Derived reputation", "Trust score and payment reliability recompute on every new review."],
      ["Revocation with reason", "Revoking preserves the record rather than deleting it."],
      ["Freelancer-controlled visibility", "You choose which certificates appear on your profile."],
    ],
  },
];

const FEATURE_FAQ = [
  {
    q: "Can I run a project with more than one compensation model?",
    a: "No, and that is deliberate. A project has exactly one compensation record, which is the single source of truth for how it pays. Mixing models inside one project is what makes reconciliation impossible later. If you genuinely need both — say a fixed retainer plus hourly overflow — publish two projects.",
  },
  {
    q: "What stops a company funding a stage and then withdrawing the money?",
    a: "Funding writes a ledger entry that moves the value into the project's committed pool. Committed money can only be released to the freelancer or reversed with a compensating entry, and a project cannot be marked complete while any stage is unreleased. Both sides see the same ledger.",
  },
  {
    q: "How does the revision cap work?",
    a: "Two revisions can be requested on any deliverable or payment stage. On the third attempt the request is refused with a message telling the company to approve it or agree new terms with the freelancer. The cap exists to stop the open-ended revision cycles that make fixed-price work unprofitable.",
  },
  {
    q: "Can freelancers on the same project see each other's payments?",
    a: "No. Every financial record is keyed to a single application, which belongs to one freelancer. There is no query that returns another freelancer's stages, work logs or ledger entries — it is structurally impossible rather than checked at runtime.",
  },
  {
    q: "Is there a private channel freelancers can use?",
    a: "Yes. Every workspace has a freelancers-only channel that the company can neither read nor post in. It is filtered out on read and refused on write, using the same predicate everywhere so the two cannot drift apart.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="The platform"
        title="Everything an engagement needs, wired to one record"
        highlight={["one", "record"]}
        description="Most teams run hiring in one tool, contracts in another, payments in a third and delivery in a fourth. FRIVVO is the argument that they should be the same tool, because the handoffs between them are where the money and the accountability go missing."
        image={EDITORIAL.workspace}
        actions={
          <>
            <Button href="/register?role=COMPANY" size="xl" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Post a project
            </Button>
            <Button href="/discover/projects" size="xl" variant="secondary">
              Browse work
            </Button>
          </>
        }
      />

      <HowItWorks />

      <FeatureBlocks />

      {/* ---- Capability matrix ---- */}
      <section className="section-y bg-[var(--color-app)]">
        <div className="container-wide">
          <SectionHeading
            align="center"
            eyebrow="In detail"
            title="What is actually in the product"
            description="No roadmap items in this list — everything here is built."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {CAPABILITY_GROUPS.map((group, i) => (
              <Reveal key={group.title} delay={i * 0.06}>
                <div className="h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
                    {group.title}
                  </h3>
                  <dl className="mt-4 flex flex-col gap-4">
                    {group.items.map(([term, detail]) => (
                      <div key={term} className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                        <div className="min-w-0">
                          <dt className="text-[14px] font-medium text-[var(--color-text-primary)]">
                            {term}
                          </dt>
                          <dd className="mt-0.5 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                            {detail}
                          </dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ReelStrip />

      <FaqSection items={FEATURE_FAQ} eyebrow="Details" title="The questions that actually matter" />

      <ClosingBand />
    </>
  );
}
