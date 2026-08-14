"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Marketing surface blocks (DESIGN-unstop-marketing.md). Intensity ladder:
 * stats = tint, demo cards = accent border only, testimonials = full saturation.
 * Organizer rail tokens never appear here.
 */

/** `stat-tile-rainbow` — tint wash, big number, no border. */
export function StatTileRainbow({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "pink" | "blue" | "marigold";
}) {
  const tones = {
    pink: "bg-[#FFF3DC]",
    blue: "bg-[#FFF3DC]",
    marigold: "bg-[#EAF1FE]",
  };
  return (
    <div className={cn("flex min-h-[132px] flex-col justify-between p-6", tones[tone])}>
      <span className="text-[36px] font-bold leading-none tracking-tight text-ink">{value}</span>
      <span className="text-sm font-medium text-body">{label}</span>
    </div>
  );
}

/** `demo-card-grid` — white cards, accent top border only, product crop inside. */
export function DemoCardGrid({
  items,
}: {
  items: { title: string; body: string }[];
}) {
  const accents = ["border-t-[#C7CBD6]", "border-t-[#F5DEB0]", "border-t-[#E3E5EA]", "border-t-[#E3E5EA]"];
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.title}
          className={cn("border border-hairline border-t-4 bg-canvas p-5", accents[i % accents.length])}
        >
          <h3 className="text-base font-semibold text-ink">{item.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

/** `logo-wall-strip` — monochrome partner row, no card, no dividers. */
export function LogoWallStrip({ names }: { names: string[] }) {
  return (
    <div className="no-scrollbar flex items-center gap-10 overflow-x-auto whitespace-nowrap bg-canvas px-6 py-6">
      {names.map((n) => (
        <span key={n} className="shrink-0 text-sm font-semibold uppercase tracking-widest text-logo-mono">
          {n}
        </span>
      ))}
    </div>
  );
}

/** `section-eyebrow-label` — muted lead-in above a section title. */
export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-sm font-normal text-muted">{children}</p>;
}

/** `testimonial-card-saturated` — the only full-saturation surface in the system. */
export function TestimonialCardSaturated({
  quote,
  name,
  title,
  tone,
}: {
  quote: string;
  name: string;
  title: string;
  tone: "violet" | "pink" | "mint" | "marigold";
}) {
  const tones = {
    violet: "bg-[#EAF1FE] text-[#1A1D29]",
    pink: "bg-[#EAF1FE] text-[#1A1D29]",
    mint: "bg-[#E8F1FE] text-[#1A1D29]",
    marigold: "bg-[#FFF3DC] text-[#1A1D29]",
  };
  return (
    <div className={cn("flex min-w-[280px] flex-1 flex-col justify-between gap-6 p-6", tones[tone])}>
      <p className="text-sm font-medium leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center bg-canvas text-sm font-bold"
          style={{ borderRadius: "50%" }}
        >
          {name.charAt(0)}
        </span>
        <div>
          <p className="text-base font-bold leading-tight">{name}</p>
          <p className="text-xs opacity-90">{title}</p>
        </div>
      </div>
    </div>
  );
}

/** `faq-accordion` — strictly single-row-open; first row open on load. */
export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = React.useState(0);
  return (
    <div className="mx-auto max-w-3xl">
      {items.map((item, i) => (
        <div key={item.q} className={cn("border-b border-hairline", open === i ? "bg-[#E8F1FE]" : "bg-white")}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
          >
            <span className="text-[15px] font-semibold text-ink">{item.q}</span>
            <span className="text-lg font-semibold text-link">{open === i ? "−" : "+"}</span>
          </button>
          {open === i && <p className="px-5 pb-5 text-sm leading-relaxed text-body">{item.a}</p>}
        </div>
      ))}
    </div>
  );
}

/** `hero-split-cta-card` — headline left with one blue word-run, form card right. */
export function HeroSplitCtaCard({
  lead,
  highlight,
  trail,
  sub,
  children,
}: {
  lead: string;
  highlight: string;
  trail?: string;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-2">
      <div className="text-left">
        <h1 className="text-[44px] font-bold leading-[1.15] tracking-[-0.3px] text-ink">
          {lead} <span className="text-link">{highlight}</span> {trail}
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-body">{sub}</p>
      </div>
      {/* Flat surface — this system has no gradients or blur (§15); the panel
          reads as elevated purely through its border. */}
      <div className="rounded-xl border border-hairline bg-canvas p-6">{children}</div>
    </div>
  );
}

/** `footer-wash-band` — pale blue, never dark, never pure white. */
export function FooterWashBand({ children }: { children: React.ReactNode }) {
  return <footer className="bg-footer-wash px-6 py-12 text-footer-ink">{children}</footer>;
}
