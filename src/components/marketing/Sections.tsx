"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Code2,
  FileSignature,
  LineChart,
  MessagesSquare,
  Paintbrush,
  Play,
  Quote,
  Scale,
  ScrollText,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { EDITORIAL, REELS, reelSrc } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { ProjectCard } from "@/components/shared/Cards";

/* ============================================================================
   DOMAIN CARD ROW
   ========================================================================= */

const DOMAIN_CARDS = [
  { label: "Software Engineering", Icon: Code2, count: "1,240", tone: "bg-[var(--color-accent-sky)] text-[var(--color-info-fg)]" },
  { label: "Design & UX", Icon: Paintbrush, count: "860", tone: "bg-[var(--color-accent-blush)] text-[var(--color-accent-pink-fg)]" },
  { label: "Data & AI", Icon: BarChart3, count: "740", tone: "bg-[var(--color-accent-lavender)] text-[var(--color-accent-violet-fg)]" },
  { label: "Marketing & Sales", Icon: LineChart, count: "620", tone: "bg-[var(--color-accent-mint)] text-[var(--color-brand-active)]" },
  { label: "Product & PM", Icon: Briefcase, count: "410", tone: "bg-[var(--color-accent-marigold)] text-[var(--color-warning-fg)]" },
  { label: "Writing & Translation", Icon: ScrollText, count: "380", tone: "bg-[var(--color-accent-sky)] text-[var(--color-info-fg)]" },
  { label: "Finance & Accounting", Icon: Wallet, count: "210", tone: "bg-[var(--color-accent-mint)] text-[var(--color-brand-active)]" },
  { label: "Legal", Icon: Scale, count: "96", tone: "bg-[var(--color-neutral-bg)] text-[var(--color-neutral-fg)]" },
];

export function DomainCardRow() {
  return (
    <section className="section-y bg-[var(--color-app)]">
      <div className="container-wide">
        <SectionHeading
          eyebrow="Browse by discipline"
          title="Find work in the field you actually practise"
          description="Every listing states its compensation model, role structure and screening process before you apply — no guessing what the engagement is."
          action={
            <Button href="/discover/projects" variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>
              All categories
            </Button>
          }
        />
        <Stagger className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {DOMAIN_CARDS.map(({ label, Icon, count, tone }) => (
            <StaggerItem key={label}>
              <Link
                href={`/discover/projects?domain=${encodeURIComponent(label)}`}
                className="group flex h-full flex-col justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-[var(--motion-base)] hover:-translate-y-0.5 hover:border-[var(--color-border-emphasis)] hover:shadow-[var(--shadow-sm)] md:p-5"
              >
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)]", tone)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold leading-[1.35] text-[var(--color-text-primary)]">
                    {label}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)]">
                    {count} specialists
                    <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </span>
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ============================================================================
   FEATURED PROJECT CAROUSEL
   ========================================================================= */

export function FeaturedCarousel({ projects }: { projects: Project[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="section-y bg-[var(--color-surface)]">
      <div className="container-wide">
        <SectionHeading
          eyebrow="Live right now"
          title="Engagements accepting applications"
          description="Each one shows its budget, role structure and how many people have already applied."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label="Previous"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-hover)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label="Next"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-hover)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        />
        <div
          ref={scroller}
          className="no-scrollbar -mx-4 mt-9 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6"
        >
          {projects.map((p) => (
            <div
              key={p.id}
              className="w-[300px] shrink-0 snap-start sm:w-[340px] lg:w-[368px]"
            >
              <ProjectCard project={p} href={`/discover/projects/${p.id}`} showMatch={false} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   HOW IT WORKS
   ========================================================================= */

const STEPS = [
  {
    n: "01",
    title: "Publish or apply",
    body: "Companies run a five-step wizard that autosaves as a draft. Freelancers apply in three steps with screening answers attached.",
    image: EDITORIAL.heroSecondary,
    points: ["Draft autosave", "Role slots & apprentices", "Screening questions"],
  },
  {
    n: "02",
    title: "Match, offer, sign",
    body: "Sort applicants by an AI score that breaks into five weighted signals. Send an offer, negotiate, and sign a contract both sides can see.",
    image: EDITORIAL.craft,
    points: ["Explainable scoring", "Counter-offers", "Dual-signature contracts"],
  },
  {
    n: "03",
    title: "Deliver and get paid",
    body: "Fund a stage, review the submission, release the payment. Every movement writes an append-only ledger entry that reconciles.",
    image: EDITORIAL.payouts,
    points: ["Funded stages", "Hourly & stipend payouts", "Verifiable certificate"],
  },
];

export function HowItWorks() {
  return (
    <section className="section-y bg-[var(--color-app)]" id="how-it-works">
      <div className="container-wide">
        <SectionHeading
          align="center"
          eyebrow="How it works"
          title="Three phases, one continuous record"
          description="Nothing gets re-keyed into another tool. The application becomes the offer, the offer becomes the contract, and the contract becomes the workspace."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={step.image}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 400px"
                    className="object-cover"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.55)] to-transparent" />
                  <span className="absolute bottom-3 left-4 text-[34px] font-bold leading-none tracking-[-0.03em] text-white/95">
                    {step.n}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[17px] font-semibold tracking-[-0.008em] text-[var(--color-text-primary)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-[1.6] text-[var(--color-text-secondary)]">
                    {step.body}
                  </p>
                  <ul className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-4">
                    {step.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   ALTERNATING FEATURE BLOCKS
   ========================================================================= */

const FEATURE_BLOCKS = [
  {
    id: "workspace",
    eyebrow: "Project workspace",
    title: "Seven tabs. One engagement.",
    body: "Overview, funding, tasks, deliverables, chat, meetings and team — all scoped to the project and to the people genuinely on it. Freelancers see their own money and nobody else's.",
    image: EDITORIAL.workspace,
    Icon: MessagesSquare,
    bullets: [
      "Group, freelancers-only and direct message channels",
      "Kanban with four real columns, including Review",
      "Deliverable versioning with a two-revision cap",
    ],
    href: "/features#workspace",
  },
  {
    id: "payments",
    eyebrow: "Funding & payments",
    title: "Money that reconciles, every time",
    body: "Fund a stage, review the submission, release in full or in part. Every movement appends a ledger entry with an idempotency key, so a double-click can never pay twice.",
    image: EDITORIAL.payouts,
    Icon: CircleDollarSign,
    bullets: [
      "Fixed, hourly, milestone, stipend and non-monetary models",
      "Hourly work logs freeze their rate at approval",
      "Completion is refused while any obligation is open",
    ],
    href: "/features#payments",
  },
  {
    id: "certificates",
    eyebrow: "Proof of work",
    title: "A certificate anyone can verify",
    body: "Issued automatically at completion from a template the company designs. Every factual value is snapshotted, so it keeps saying what it said the day it was issued.",
    image: EDITORIAL.heroTertiary,
    Icon: Award,
    bullets: [
      "Public verification page, no login required",
      "Dual signatories and revocation with reason",
      "Freelancers control visibility on their profile",
    ],
    href: "/verify",
  },
  {
    id: "contracts",
    eyebrow: "Offers & contracts",
    title: "Negotiate in the open, sign in one place",
    body: "Offer letters carry the amount, category, benefits and milestone schedule. Counter-offers keep the full history. Both signatures and both IP addresses are captured server-side.",
    image: EDITORIAL.heroSecondary,
    Icon: FileSignature,
    bullets: [
      "Counter-offer with a proposed amount and rationale",
      "Full negotiation history retained",
      "Milestones derived from the agreed terms",
    ],
    href: "/features#contracts",
  },
];

export function FeatureBlocks() {
  return (
    <section className="bg-[var(--color-surface)]">
      <div className="container-wide">
        <div className="section-y">
          <SectionHeading
            align="center"
            eyebrow="The platform"
            title="Built so nothing falls between the tools"
            description="Every part of an engagement that usually lives in a different product lives here, wired to the same record."
          />
        </div>
        <div className="flex flex-col gap-16 pb-20 md:gap-24 md:pb-28">
          {FEATURE_BLOCKS.map((block, i) => (
            <Reveal key={block.id} y={24}>
              <div
                id={block.id}
                className={cn(
                  "grid items-center gap-8 scroll-mt-24 lg:grid-cols-2 lg:gap-14",
                  i % 2 === 1 && "lg:[&>*:first-child]:order-2",
                )}
              >
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-brand-active)]">
                    <block.Icon className="h-3.5 w-3.5" />
                    {block.eyebrow}
                  </span>
                  <h3 className="mt-4 text-[24px] font-semibold leading-[1.22] tracking-[-0.02em] text-[var(--color-text-primary)] md:text-[30px]">
                    {block.title}
                  </h3>
                  <p className="mt-3.5 text-[15px] leading-[1.65] text-[var(--color-text-secondary)] text-pretty">
                    {block.body}
                  </p>
                  <ul className="mt-6 flex flex-col gap-3">
                    {block.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                          <svg viewBox="0 0 12 12" className="h-3 w-3 text-[var(--color-brand-active)]" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 6.5L4.5 9L10 3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    href={block.href}
                    variant="secondary"
                    className="mt-7"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Learn more
                  </Button>
                </div>

                <div className="relative">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-md)]">
                    <Image
                      src={block.image}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 560px"
                      className="object-cover"
                    />
                  </div>
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute -z-10 h-40 w-40 rounded-full blur-3xl",
                      i % 2 === 0 ? "-right-6 -top-6" : "-left-6 -bottom-6",
                    )}
                    style={{ background: "rgba(6,199,85,0.18)" }}
                  />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   VIDEO / REEL STRIP
   ========================================================================= */

export function ReelStrip() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="section-y bg-[var(--color-brand-ink)]">
      <div className="container-wide">
        <div className="max-w-2xl">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--color-brand-bright)]">
            See it working
          </p>
          <h2 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-white md:text-[32px]">
            Ninety seconds per feature, no sales call required
          </h2>
          <p className="mt-3 text-[15px] leading-[1.65] text-white/65">
            Short walkthroughs of the surfaces you will actually spend time in.
          </p>
        </div>

        <div className="no-scrollbar -mx-4 mt-9 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
          {REELS.map((reel) => (
            <div
              key={reel.id}
              className="w-[248px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.04]"
            >
              <div className="relative aspect-[345/500] w-full bg-black/40">
                {active === reel.id ? (
                  <iframe
                    src={reelSrc(reel.id)}
                    title={reel.title}
                    className="absolute inset-0 h-full w-full"
                    frameBorder="0"
                    scrolling="no"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setActive(reel.id)}
                    className="group absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-white/[0.06] to-transparent"
                    aria-label={`Play: ${reel.title}`}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand)] text-white transition-transform duration-[var(--motion-base)] group-hover:scale-110">
                      <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </span>
                    <span className="px-4 text-center text-[12.5px] text-white/60">
                      Tap to play
                    </span>
                  </button>
                )}
              </div>
              <div className="p-3.5">
                <p className="text-[13.5px] font-semibold text-white">{reel.title}</p>
                <p className="mt-1 text-[12px] leading-[1.5] text-white/55">{reel.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   TESTIMONIALS
   ========================================================================= */

const TESTIMONIALS = [
  {
    quote:
      "The thing that changed for us was completion readiness. We physically cannot close a project while a stage is unreleased or an hour is unapproved, which ended a category of argument we used to have every quarter.",
    name: "Marta Kovač",
    role: "VP Engineering, Northwind Labs",
    tone: "bg-[var(--color-accent-mint)]",
  },
  {
    quote:
      "I have used four platforms. This is the first one where I could see exactly why I scored 94 on one listing and 61 on another, and adjust what I applied for accordingly.",
    name: "Mei Chen",
    role: "Frontend engineer",
    tone: "bg-[var(--color-accent-sky)]",
  },
  {
    quote:
      "We run an apprentice on nearly every role. Apprentices consuming no slot is not a small detail — it is the reason the programme is affordable at all.",
    name: "Grace Wanjiru",
    role: "Executive Director, BrightPath",
    tone: "bg-[var(--color-accent-lavender)]",
  },
  {
    quote:
      "Milestones funded before I started each one, reviews back within two days, and nobody trying to expand scope inside a fixed stage. That is the whole review.",
    name: "Carlos Mendes",
    role: "Mobile engineer",
    tone: "bg-[var(--color-accent-blush)]",
  },
];

export function Testimonials() {
  return (
    <section className="section-y bg-[var(--color-app)]">
      <div className="container-wide">
        <SectionHeading
          align="center"
          eyebrow="From both sides"
          title="What people say once the engagement is over"
        />
        <div className="mt-11 grid gap-4 md:grid-cols-2">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    t.tone,
                  )}
                >
                  <Quote className="h-4 w-4 text-[var(--color-text-primary)]" />
                </span>
                <blockquote className="mt-4 flex-1 text-[14.5px] leading-[1.7] text-[var(--color-text-primary)] text-pretty">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-[var(--color-border-subtle)] pt-4">
                  <Avatar name={t.name} size="sm" />
                  <span>
                    <span className="block text-[13px] font-semibold text-[var(--color-text-primary)]">
                      {t.name}
                    </span>
                    <span className="block text-[12px] text-[var(--color-text-muted)]">
                      {t.role}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   DUAL CTA
   ========================================================================= */

export function DualCta() {
  const cards = [
    {
      role: "FREELANCER" as const,
      eyebrow: "For talent",
      title: "Get paid for work that is scoped before you start",
      body: "See the compensation model, the role structure and the screening process before you write a word of a cover letter.",
      image: EDITORIAL.authTalent,
      cta: "Create a talent profile",
      href: "/register?role=FREELANCER",
      Icon: Sparkles,
    },
    {
      role: "COMPANY" as const,
      eyebrow: "For companies",
      title: "Hire a team, not a series of disconnected contractors",
      body: "Named roles, fixed slot counts, apprentices that cost you nothing in capacity, and one workspace per engagement.",
      image: EDITORIAL.authCompany,
      cta: "Post your first project",
      href: "/register?role=COMPANY",
      Icon: Users,
    },
  ];

  return (
    <section className="section-y bg-[var(--color-surface)]">
      <div className="container-wide">
        <div className="grid gap-5 lg:grid-cols-2">
          {cards.map((c, i) => (
            <Reveal key={c.role} delay={i * 0.1}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)]">
                <div className="relative h-52 overflow-hidden md:h-60">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 600px"
                    className="object-cover transition-transform duration-[700ms] group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.82)] via-[rgba(12,20,17,0.3)] to-transparent" />
                  <span className="absolute bottom-4 left-5 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-brand-active)]">
                    <c.Icon className="h-3.5 w-3.5" />
                    {c.eyebrow}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-[20px] font-semibold leading-[1.3] tracking-[-0.015em] text-[var(--color-text-primary)]">
                    {c.title}
                  </h3>
                  <p className="mt-2.5 flex-1 text-[14px] leading-[1.65] text-[var(--color-text-secondary)]">
                    {c.body}
                  </p>
                  <Button
                    href={c.href}
                    size="lg"
                    className="mt-6 self-start"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {c.cta}
                  </Button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   FAQ
   ========================================================================= */

export function FaqSection({
  items,
  title = "Questions people ask before signing up",
  eyebrow = "FAQ",
}: {
  items: { q: string; a: string }[];
  title?: string;
  eyebrow?: string;
}) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section-y bg-[var(--color-app)]">
      <div className="container-app">
        <SectionHeading align="center" eyebrow={eyebrow} title={title} />
        <div className="mx-auto mt-10 max-w-3xl">
          <dl className="flex flex-col gap-2.5">
            {items.map((item, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={item.q}
                  className={cn(
                    "overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--color-surface)] transition-colors",
                    isOpen ? "border-[var(--color-brand-border)]" : "border-[var(--color-border)]",
                  )}
                >
                  <dt>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="text-[14.5px] font-medium leading-[1.5] text-[var(--color-text-primary)]">
                        {item.q}
                      </span>
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-[var(--motion-base)]",
                          isOpen
                            ? "rotate-45 bg-[var(--color-brand)] text-white"
                            : "bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]",
                        )}
                      >
                        <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 1v12M1 7h12" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                  </dt>
                  <motion.dd
                    initial={false}
                    animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-[14px] leading-[1.7] text-[var(--color-text-secondary)]">
                      {item.a}
                    </p>
                  </motion.dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   TRUST BAR
   ========================================================================= */

export function TrustBar({ names }: { names: string[] }) {
  const doubled = [...names, ...names];
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-7">
      <p className="container-wide mb-5 text-center text-[12px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
        Teams running engagements on FRIVVO
      </p>
      <div className="relative overflow-hidden">
        <div className="marquee-track flex w-max items-center gap-12">
          {doubled.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="whitespace-nowrap text-[17px] font-semibold tracking-[-0.015em] text-[var(--color-text-disabled)]"
            >
              {name}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--color-surface)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--color-surface)] to-transparent" />
      </div>
    </section>
  );
}

/* ============================================================================
   CLOSING BAND
   ========================================================================= */

export function ClosingBand() {
  return (
    <section className="relative overflow-hidden bg-[var(--color-brand-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(6,199,85,0.28), transparent 70%)" }}
      />
      <div className="container-app relative py-16 text-center md:py-24">
        <Badge tone="brand" className="mb-5">
          Free to join · no card required
        </Badge>
        <h2 className="mx-auto max-w-2xl text-[28px] font-semibold leading-[1.18] tracking-[-0.024em] text-white md:text-[38px]">
          Start the engagement properly, and the rest of it takes care of itself
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-[1.65] text-white/65">
          Publish your first project or build a profile in under ten minutes. Everything after that
          happens in one place.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/register?role=COMPANY" size="xl" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Post a project
          </Button>
          <Button
            href="/register?role=FREELANCER"
            size="xl"
            variant="secondary"
            className="border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12] hover:border-white/30"
          >
            Find work
          </Button>
        </div>
      </div>
    </section>
  );
}
