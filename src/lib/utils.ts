import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ---------------------------------------------------------------- money --- */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "د.إ",
  JPY: "¥",
  CHF: "CHF",
  SEK: "kr",
  NZD: "NZ$",
  ZAR: "R",
  BRL: "R$",
  MXN: "MX$",
};

export function currencySymbol(code: string) {
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function formatMoney(amount: number, currency = "USD", compact = false) {
  const symbol = currencySymbol(currency);
  if (compact && amount >= 1000) {
    if (amount >= 1_000_000)
      return `${symbol}${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
    return `${symbol}${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  }
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(n: number, compact = false) {
  if (compact && n >= 1000) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  }
  return n.toLocaleString("en-US");
}

/* ----------------------------------------------------------------- dates --- */

export function formatDate(value: string | Date, style: "short" | "long" | "medium" = "medium") {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  if (style === "short")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (style === "long")
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * Human-readable distance from now, in either direction. Past dates read
 * "3d ago", future dates read "in 3d".
 */
export function relativeTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";

  const diff = Date.now() - d.getTime();
  const future = diff < 0;
  const minutes = Math.floor(Math.abs(diff) / 60000);
  const wrap = (text: string) => (future ? `in ${text}` : `${text} ago`);

  if (minutes < 1) return "just now";
  if (minutes < 60) return wrap(`${minutes}m`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return wrap(`${hours}h`);
  const days = Math.floor(hours / 24);
  if (days < 7) return wrap(`${days}d`);
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return wrap(`${weeks}w`);
  const months = Math.floor(days / 30);
  if (months < 12) return wrap(`${months}mo`);
  return wrap(`${Math.floor(days / 365)}y`);
}

/** Deadline phrasing that stays correct once the date has passed. */
export function formatDueDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "No due date";

  const days = daysUntil(d);
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 30) return `Due in ${days}d`;
  return `Due ${formatDate(d)}`;
}

export function daysUntil(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/* ------------------------------------------------------------------ text --- */

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function truncate(value: string, max = 50) {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

/* ------------------------------------------------------------------ misc --- */

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Deterministic avatar background derived from a name (no random per render). */
export function avatarTone(name: string) {
  const tones = [
    "bg-[var(--color-accent-mint)] text-[var(--color-brand-active)]",
    "bg-[var(--color-accent-sky)] text-[var(--color-info-fg)]",
    "bg-[var(--color-accent-lavender)] text-[var(--color-accent-violet-fg)]",
    "bg-[var(--color-accent-blush)] text-[var(--color-accent-pink-fg)]",
    "bg-[var(--color-accent-marigold)] text-[var(--color-warning-fg)]",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return tones[hash % tones.length];
}

/* ------------------------------------------------------------- uploads --- */

/**
 * Client-side file → data URL, used by the profile/banner/logo pickers before
 * they hand the payload to the existing upload API route.
 */
export function fileToBase64(file: File, maxSizeMB: number = 1.5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      reject(new Error(`File "${file.name}" is too large. Please select a file under ${maxSizeMB}MB.`));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
