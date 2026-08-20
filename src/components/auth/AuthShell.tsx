"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Quote, ShieldCheck, Star } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { EDITORIAL } from "@/lib/media";

/* ============================================================================
   AUTH SHELL — split layout: form on the left, editorial panel on the right.
   The panel swaps art and proof points depending on which side of the
   marketplace the visitor is signing up for.
   ========================================================================= */

export interface AuthPanelContent {
  image: string;
  eyebrow: string;
  headline: string;
  points: string[];
  quote: { text: string; name: string; role: string };
  stats: { label: string; value: string }[];
}

export const TALENT_PANEL: AuthPanelContent = {
  image: EDITORIAL.authTalent,
  eyebrow: "For talent",
  headline: "Work that is scoped before you start, and paid on a ledger you can audit",
  points: [
    "See the compensation model and role structure before you apply",
    "Track every application through a visible pipeline",
    "Get a verifiable certificate at the end of every engagement",
  ],
  quote: {
    text: "The first platform where I could see exactly why I scored 94 on one listing and 61 on another.",
    name: "Mei Chen",
    role: "Frontend engineer · Taipei",
  },
  stats: [
    { label: "Average rating", value: "4.8" },
    { label: "Paid out", value: "$1.4M+" },
    { label: "Certificates issued", value: "3,200+" },
  ],
};

export const COMPANY_PANEL: AuthPanelContent = {
  image: EDITORIAL.authCompany,
  eyebrow: "For companies",
  headline: "Hire a team into named roles, then run the whole engagement in one workspace",
  points: [
    "Rank applicants on a score that breaks into five explainable signals",
    "Fund, review and release payments without leaving the project",
    "Close the engagement with certificates issued automatically",
  ],
  quote: {
    text: "We physically cannot close a project while a stage is unreleased. That ended an argument we used to have every quarter.",
    name: "Marta Kovač",
    role: "VP Engineering · Northwind Labs",
  },
  stats: [
    { label: "Average time to hire", value: "9 days" },
    { label: "Completion rate", value: "96%" },
    { label: "Companies hiring", value: "270+" },
  ],
};

export function AuthShell({
  panel,
  children,
  footer,
}: {
  panel: AuthPanelContent;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      {/* ---------- Form column ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="FRIVVO home">
            <Logo size={34} />
          </Link>
          {footer}
        </header>

        <div className="flex flex-1 items-start justify-center px-5 pb-12 pt-2 md:px-8 md:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[420px]"
          >
            {children}
          </motion.div>
        </div>
      </div>

      {/* ---------- Editorial column ---------- */}
      <aside className="relative hidden w-[46%] max-w-[680px] shrink-0 overflow-hidden bg-[var(--color-brand-ink)] lg:block">
        <Image
          src={panel.image}
          alt=""
          fill
          priority
          sizes="680px"
          className="object-cover opacity-[0.42]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(155deg, rgba(16,20,19,0.72) 0%, rgba(16,20,19,0.88) 55%, rgba(4,151,64,0.42) 100%)",
          }}
        />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand-bright)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {panel.eyebrow}
            </span>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-6 max-w-md text-[30px] font-semibold leading-[1.2] tracking-[-0.022em] text-white xl:text-[34px]"
            >
              {panel.headline}
            </motion.h2>

            <ul className="mt-8 flex flex-col gap-3.5">
              {panel.points.map((point, i) => (
                <motion.li
                  key={point}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.09 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--color-brand-bright)]" />
                  <span className="text-[14.5px] leading-[1.55] text-white/82">{point}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div>
            {/* Quote */}
            <motion.figure
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.06] p-5 backdrop-blur-sm"
            >
              <Quote className="h-5 w-5 text-[var(--color-brand-bright)]" />
              <blockquote className="mt-3 text-[14.5px] leading-[1.65] text-white/88">
                “{panel.quote.text}”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <Avatar name={panel.quote.name} size="sm" />
                <span>
                  <span className="block text-[13px] font-semibold text-white">
                    {panel.quote.name}
                  </span>
                  <span className="block text-[12px] text-white/55">{panel.quote.role}</span>
                </span>
                <span className="ml-auto flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="h-3 w-3 fill-[var(--color-gold)] text-[var(--color-gold)]"
                    />
                  ))}
                </span>
              </figcaption>
            </motion.figure>

            {/* Stats */}
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/12 pt-6">
              {panel.stats.map((s) => (
                <div key={s.label}>
                  <dd className="text-[20px] font-semibold tracking-[-0.02em] text-white">
                    {s.value}
                  </dd>
                  <dt className="mt-0.5 text-[11.5px] leading-[1.4] text-white/50">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------- Google btn -- */

export function GoogleButton({
  onClick,
  label = "Continue with Google",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[14px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-hover)] hover:border-[var(--color-border-emphasis)]"
    >
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z"
        />
      </svg>
      {label}
    </button>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--color-border)]" />
      <span className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}
