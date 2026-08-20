import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/PageHero";
import { ClosingBand, Testimonials } from "@/components/marketing/Sections";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Card";
import { CountUp, Reveal } from "@/components/motion/Motion";
import { EDITORIAL, GALLERY } from "@/lib/media";
import { platformStats } from "@/data/server/stats";

export const metadata: Metadata = {
  title: "About",
  description:
    "FRIVVO exists because freelance work breaks in the handoffs — between the job board, the chat tool, the contract and the payment. We built one record that carries the whole engagement.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    n: "01",
    title: "Money is auditable or it is not real",
    body: "Every movement of value writes an append-only ledger entry with an idempotency key. Cached totals exist for speed, but where they disagree with the ledger, the ledger wins. We would rather refuse a payment than record one twice.",
  },
  {
    n: "02",
    title: "A score you cannot explain is not a score",
    body: "Match scoring is a deterministic weighted formula, and every applicant view shows the five component signals next to the total. A company can see why one candidate ranked above another. A freelancer can see which signal is holding them back.",
  },
  {
    n: "03",
    title: "Structure beats good intentions",
    body: "Apprentice programmes fail when they cost a team a headcount slot. So apprentices consume no capacity, anywhere in the system. Revision cycles run forever unless something stops them, so there is a hard cap of two. Rules beat encouragement.",
  },
  {
    n: "04",
    title: "Nothing is hard-deleted",
    body: "Applications, reviews, certificates and ledger entries all reference the project. Deleting a project cancels it instead. Revoking a certificate keeps the record and adds a reason. History that can vanish is not history.",
  },
];

const TIMELINE = [
  {
    year: "2023",
    title: "The frustration",
    body: "Four tools, three exports and a spreadsheet to answer one question: has this person been paid for the work they delivered?",
  },
  {
    year: "2024",
    title: "The ledger first",
    body: "We built the money layer before the marketplace. Append-only, row-locked, idempotent — the part everyone else bolts on last.",
  },
  {
    year: "2025",
    title: "Teams, not contractors",
    body: "Named roles, fixed slots and apprentices who cost nothing in capacity. Companies started hiring three people at once instead of one.",
  },
  {
    year: "2026",
    title: "Portable proof",
    body: "Verifiable certificates issued at completion. Work done on FRIVVO is provable somewhere other than FRIVVO.",
  },
];

export default async function AboutPage() {
  const stats = await platformStats();

  return (
    <>
      <PageHero
        eyebrow="About FRIVVO"
        title="Freelance work does not break in the work. It breaks in the handoffs."
        highlight={["handoffs."]}
        description="A job board that does not know about the contract. A contract that does not know about the payment. A payment that does not know whether the work was accepted. Every gap between those tools is somewhere a freelancer goes unpaid or a company loses track of what it bought."
        image={EDITORIAL.collaboration}
        dark
        actions={
          <>
            <Button href="/register" size="xl" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Get started
            </Button>
            <Button
              href="/contact"
              size="xl"
              variant="secondary"
              className="border-white/20 bg-white/[0.06] text-white hover:border-white/30 hover:bg-white/[0.12]"
            >
              Talk to us
            </Button>
          </>
        }
      />

      {/* ---- Stats band ---- */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container-wide">
          <dl className="grid grid-cols-2 divide-x divide-[var(--color-border)] md:grid-cols-4">
            {[
              { label: "Specialists", value: stats.freelancers, suffix: "+" },
              { label: "Companies hiring", value: stats.companies, suffix: "" },
              { label: "Engagements run", value: stats.projects, suffix: "" },
              { label: "Certificates issued", value: stats.certificates, suffix: "" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`px-4 py-8 text-center md:px-6 ${i >= 2 ? "border-t border-[var(--color-border)] md:border-t-0" : ""} ${i === 2 ? "border-l-0 md:border-l" : ""}`}
              >
                <dd className="text-[26px] font-semibold tracking-[-0.022em] text-[var(--color-text-primary)] md:text-[32px]">
                  <CountUp to={s.value} suffix={s.suffix} />
                </dd>
                <dt className="mt-1 text-[12.5px] text-[var(--color-text-secondary)]">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---- Principles ---- */}
      <section className="section-y bg-[var(--color-app)]">
        <div className="container-wide">
          <SectionHeading
            eyebrow="What we decided"
            title="Four decisions the whole product is built around"
            description="These are not values on a wall. Each one is enforced in code, and each one costs us something in flexibility."
          />

          <div className="mt-11 grid gap-5 md:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.07}>
                <article className="h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <span className="text-[28px] font-bold leading-none tracking-[-0.03em] text-[var(--color-brand)]">
                    {p.n}
                  </span>
                  <h3 className="mt-3.5 text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
                    {p.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-[1.7] text-[var(--color-text-secondary)]">
                    {p.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Story + images ---- */}
      <section className="section-y bg-[var(--color-surface)]">
        <div className="container-wide">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                eyebrow="How we got here"
                title="We built the boring half first"
              />
              <div className="mt-6 flex flex-col gap-4 text-[15px] leading-[1.75] text-[var(--color-text-secondary)]">
                <p>
                  Most marketplaces start with discovery, because discovery is what demos well. The
                  ledger, the transition tables and the capacity guards get added later, under
                  pressure, once the first real dispute has already happened.
                </p>
                <p>
                  We did it the other way around. The money layer came first — append-only,
                  row-locked, idempotent — and the marketplace was built on top of it. It made the
                  first six months look slower than they were, and it is the reason a project on
                  FRIVVO cannot be marked complete while somebody is still owed money.
                </p>
                <p>
                  The same instinct produced the parts people notice: apprentices that cost no
                  capacity, a revision cap that ends the endless-feedback problem, and a certificate
                  that keeps saying what it said on the day it was issued.
                </p>
              </div>
            </div>

            <Reveal>
              <div className="grid grid-cols-2 gap-3">
                {[GALLERY[0], GALLERY[3], GALLERY[5], GALLERY[1]].map((src, i) => (
                  <div
                    key={src}
                    className={`relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] ${
                      i % 3 === 0 ? "aspect-[4/5]" : "aspect-[4/3]"
                    }`}
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 50vw, 280px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---- Timeline ---- */}
      <section className="section-y bg-[var(--color-app)]">
        <div className="container-wide">
          <SectionHeading align="center" eyebrow="Timeline" title="Four years, in four lines" />
          <ol className="mx-auto mt-11 max-w-3xl">
            {TIMELINE.map((t, i) => (
              <Reveal key={t.year} delay={i * 0.07}>
                <li className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[12px] font-bold text-[var(--color-brand-active)]">
                      {t.year.slice(2)}
                    </span>
                    {i < TIMELINE.length - 1 && (
                      <span className="w-0.5 flex-1 bg-[var(--color-border)]" />
                    )}
                  </div>
                  <div className="pb-8">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand-active)]">
                      {t.year}
                    </p>
                    <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
                      {t.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-[1.7] text-[var(--color-text-secondary)]">
                      {t.body}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <div id="stories">
        <Testimonials />
      </div>

      <ClosingBand />
    </>
  );
}
