"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * `empty-state-astronaut` — the single reused zero-data illustration. Never
 * substitute a spinner or blank space; every empty view mounts this.
 */
export function EmptyStateAstronaut({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <svg viewBox="0 0 160 120" className="h-28 w-40" role="img" aria-label="No data yet">
        {/* faint bar-chart silhouette behind the figure */}
        <g fill="var(--color-surface-strong)">
          <rect x="18" y="72" width="16" height="30" />
          <rect x="40" y="58" width="16" height="44" />
          <rect x="106" y="64" width="16" height="38" />
          <rect x="128" y="46" width="16" height="56" />
        </g>
        {/* astronaut */}
        <circle cx="80" cy="46" r="22" fill="var(--color-primary-tint-strong)" />
        <circle cx="80" cy="46" r="14" fill="var(--color-canvas)" />
        <rect x="66" y="68" width="28" height="26" fill="var(--color-primary)" />
        <rect x="58" y="72" width="10" height="8" fill="var(--color-primary-active)" />
        <rect x="92" y="72" width="10" height="8" fill="var(--color-primary-active)" />
        {/* magnifying glass */}
        <circle cx="112" cy="34" r="11" fill="none" stroke="var(--color-signature-yellow)" strokeWidth="4" />
        <line x1="120" y1="42" x2="130" y2="52" stroke="var(--color-signature-yellow)" strokeWidth="4" />
      </svg>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {subtitle && <p className="max-w-sm text-xs font-normal text-muted">{subtitle}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** `persona-switcher` — top-level Talent / Mentor / Recruiter context switch. */
export function PersonaSwitcher({
  active,
  onChange,
  className,
}: {
  active: "TALENT" | "MENTOR" | "RECRUITER";
  onChange?: (p: "TALENT" | "MENTOR" | "RECRUITER") => void;
  className?: string;
}) {
  const personas = [
    { id: "TALENT" as const, label: "Talent", color: "text-persona-talent" },
    { id: "MENTOR" as const, label: "Mentor", color: "text-persona-mentor" },
    { id: "RECRUITER" as const, label: "Recruiter", color: "text-persona-recruiter" },
  ];
  return (
    <div className={cn("flex items-stretch gap-1", className)}>
      {personas.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange?.(p.id)}
          aria-pressed={active === p.id}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors cursor-pointer",
            active === p.id ? cn("bg-primary-tint", p.color) : "text-muted hover:text-ink"
          )}
        >
          <span className="h-2 w-2 bg-current" style={{ borderRadius: "50%" }} />
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** `kpi-tile-pastel` — quarantined lavender/sky/blush trio, campaigns only. */
export function KpiTilePastel({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "lavender" | "sky" | "blush";
  icon?: React.ReactNode;
}) {
  const tones = {
    lavender: "bg-kpi-lavender",
    sky: "bg-kpi-sky",
    blush: "bg-kpi-blush",
  };
  return (
    <div className={cn("flex items-start justify-between gap-3 p-4", tones[tone])}>
      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        <span className="mt-1 block text-[32px] font-bold leading-none text-ink">{value}</span>
      </div>
      {icon && (
        <span className="flex h-8 w-8 items-center justify-center bg-canvas text-ink" style={{ borderRadius: "50%" }}>
          {icon}
        </span>
      )}
    </div>
  );
}

/** `slider-range` — blue filled track up to a white/blue thumb, value pill. */
export function SliderRange({
  value,
  min = 0,
  max = 100,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <span className="block text-xs font-medium text-body">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none bg-border-strong accent-primary"
        aria-label={label}
      />
      <div className="flex items-center justify-between text-[11px] font-medium text-muted">
        <span>{min}</span>
        <span className="bg-primary-tint px-2 py-0.5 text-link">{value}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

/** `lock-badge-premium` — gold padlock + Unlock on plan-gated rows. */
export function LockBadgePremium({ label = "Unlock" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-lock">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="7" width="10" height="7" />
        <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
      </svg>
      {label}
    </span>
  );
}

/** `chip-stipend-highlight` — the one green treatment reserved for money. */
export function StipendChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-success-surface px-2 py-0.5 text-xs font-bold text-success">
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2 5.5h9l3 2.5-3 2.5H2z" />
      </svg>
      {children}
    </span>
  );
}
