import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, Briefcase, CircleDollarSign, GraduationCap, LayoutGrid, MessageSquare, Users } from "lucide-react";
import { PageHero } from "@/components/marketing/PageHero";
import { FaqSection, ReelStrip } from "@/components/marketing/Sections";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Card";
import { Reveal } from "@/components/motion/Motion";
import { EDITORIAL } from "@/lib/media";

export const metadata: Metadata = {
  title: "Help centre",
  description:
    "How roles, slots and apprentices work; how funding, review and release move money; what completion requires; and how certificate verification works.",
  alternates: { canonical: "/help" },
};

const TOPICS = [
  {
    icon: <Briefcase />,
    title: "Publishing a project",
    body: "The five-step wizard, draft autosave, publish validation and what each visibility setting actually does.",
    links: [
      ["What the five steps cover", "/features"],
      ["Choosing a compensation model", "/features#payments"],
      ["Public, invite-only and private", "/features"],
    ],
  },
  {
    icon: <Users />,
    title: "Roles, slots and capacity",
    body: "How hiring is capped, what happens when a role fills, and why two simultaneous hires cannot both take the last slot.",
    links: [
      ["Defining roles and slot counts", "/features"],
      ["What happens when a role fills", "/features"],
      ["Removing a hired freelancer", "/features"],
    ],
  },
  {
    icon: <GraduationCap />,
    title: "Apprentices",
    body: "Apprentices shadow a role, occupy no slot, are paid on the same terms and receive their own certificate.",
    links: [
      ["Applying as an apprentice", "/discover/projects"],
      ["Apprentice scores are separate", "/features"],
      ["Handing a role over", "/features"],
    ],
  },
  {
    icon: <CircleDollarSign />,
    title: "Funding and payments",
    body: "Fund, review, release. Why money is committed before work starts, and what the ledger guarantees.",
    links: [
      ["How funded stages work", "/features#payments"],
      ["Hourly work logs and rate snapshots", "/features#payments"],
      ["Stipend periods", "/features#payments"],
    ],
  },
  {
    icon: <LayoutGrid />,
    title: "The project workspace",
    body: "Seven tabs, three chat channels, a kanban board with four real columns and deliverable versioning.",
    links: [
      ["Tabs and what lives in each", "/features#workspace"],
      ["The freelancers-only channel", "/features#workspace"],
      ["Deliverables and the revision cap", "/features#workspace"],
    ],
  },
  {
    icon: <Award />,
    title: "Certificates",
    body: "Issued at completion, snapshotted at issue time, verifiable by anyone without an account.",
    links: [
      ["Verify a certificate", "/verify"],
      ["Designing the template", "/features"],
      ["Hiding one from your profile", "/features"],
    ],
  },
];

const HELP_FAQ = [
  {
    q: "I was hired but my workspace is not showing anything.",
    a: "Two things gate a workspace: the project must be OPEN or IN_PROGRESS, and you must have confirmed your team placement. If you were hired onto a project that uses roles, open Track Applications and confirm your place — the slot stays reserved but the workspace does not fully open until you do.",
  },
  {
    q: "The company funded my stage but I cannot submit it.",
    a: "A stage can only be submitted when it is FUNDED or CHANGES_REQUESTED. If it is still PENDING the money has not been committed yet. If it is SUBMITTED it is already with the company. The status pill on each stage tells you exactly which state it is in.",
  },
  {
    q: "Why can I not request a third revision?",
    a: "There is a hard cap of two revisions on any deliverable or payment stage. Past that the request is refused, and the options are to approve it or agree new terms with the freelancer. The cap exists because open-ended revision cycles are the single most common way fixed-price work becomes unprofitable.",
  },
  {
    q: "Why can I not mark my project complete?",
    a: "Completion requires every payment obligation to be settled, and what that means depends on the model. Fixed and milestone projects need every stage released or cancelled. Hourly projects need no pending work logs and no unpaid approved hours. Stipend projects need every expected period released. The banner on the project tells you which specific obligation is outstanding.",
  },
  {
    q: "A freelancer declined their team placement. What happens to the slot?",
    a: "It reopens immediately. Their application returns to closed, the role slot is freed, and you can hire someone else into it. Nothing about the project state needs unpicking manually.",
  },
  {
    q: "Can I change the compensation model after hiring someone?",
    a: "Not while money is committed. Changing the model or the currency after funding would leave existing ledger entries denominated in a currency the project no longer uses. If the arrangement genuinely needs to change, settle the outstanding stages and start a new engagement.",
  },
  {
    q: "Someone applied who is clearly not a fit. Do I have to reject them?",
    a: "No, but closing an application notifies them, which is more useful than silence. Closed applications can be reconsidered later — they return to pending. What is never allowed is moving straight from closed to hired; it has to pass back through pending or shortlisted first.",
  },
  {
    q: "My certificate shows an old name.",
    a: "That is deliberate. Certificate content is snapshotted at issue time so it keeps saying what it said on the day it was issued, even if you later change your display name or the company rebrands. It is what makes the certificate meaningful as a record.",
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHero
        eyebrow="Help centre"
        title="How the parts that surprise people actually work"
        highlight={["actually"]}
        description="Most support questions on FRIVVO are about four things: capacity, money, completion and certificates. Each one behaves in a specific way for a specific reason, and this page explains both."
        image={EDITORIAL.heroTertiary}
        actions={
          <>
            <Button href="/contact" size="xl" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Contact support
            </Button>
            <Button href="/verify" size="xl" variant="secondary">
              Verify a certificate
            </Button>
          </>
        }
      />

      {/* ---- Topic grid ---- */}
      <section className="section-y bg-[var(--color-app)]">
        <div className="container-wide">
          <SectionHeading
            eyebrow="Browse by topic"
            title="Where to start"
            description="Six areas that cover almost everything people ask about."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((t, i) => (
              <Reveal key={t.title} delay={i * 0.06}>
                <article className="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-active)] [&>svg]:h-5 [&>svg]:w-5">
                    {t.icon}
                  </span>
                  <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.008em] text-[var(--color-text-primary)]">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                    {t.body}
                  </p>
                  <ul className="mt-4 flex flex-1 flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-4">
                    {t.links.map(([label, href]) => (
                      <li key={label}>
                        <Link
                          href={href}
                          className="group inline-flex items-center gap-1.5 text-[13px] text-[var(--color-link)] hover:underline"
                        >
                          {label}
                          <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ReelStrip />

      <FaqSection
        items={HELP_FAQ}
        eyebrow="Common questions"
        title="The eight questions we answer most often"
      />

      {/* ---- Still stuck ---- */}
      <section className="section-y bg-[var(--color-surface)]">
        <div className="container-app">
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-8 text-center md:p-12">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
              <MessageSquare className="h-5 w-5 text-[var(--color-brand-active)]" />
            </span>
            <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.018em] text-[var(--color-text-primary)] md:text-[26px]">
              Still stuck?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-[1.7] text-[var(--color-text-secondary)]">
              If you are mid-engagement, the chat inside your project workspace is the fastest route
              — it reaches the same team with the full project context already attached. Otherwise
              send us a message and we will reply within one working day.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button href="/contact" size="lg">
                Contact support
              </Button>
              <Button href="/login" size="lg" variant="secondary">
                Open your workspace
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
