"use client";

import { AlertCircle, CheckCircle2, Info, Star, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

/* ------------------------------------------------------------ EmptyState -- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-emphasis)] bg-[var(--color-surface)] text-center",
        compact ? "px-6 py-10" : "px-6 py-16",
        className,
      )}
    >
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </span>
      )}
      <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-[1.55] text-[var(--color-text-secondary)]">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Button size="md" href={action.href} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              size="md"
              variant="secondary"
              href={secondaryAction.href}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Alert -- */

const ALERT_TONES = {
  success: {
    cls: "bg-[var(--color-success-bg)] text-[var(--color-success-fg)] border-[var(--color-success-border)]",
    Icon: CheckCircle2,
  },
  warning: {
    cls: "bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)] border-[var(--color-warning-border)]",
    Icon: TriangleAlert,
  },
  error: {
    cls: "bg-[var(--color-error-bg)] text-[var(--color-error-fg)] border-[var(--color-error-border)]",
    Icon: AlertCircle,
  },
  info: {
    cls: "bg-[var(--color-info-bg)] text-[var(--color-info-fg)] border-[var(--color-info-border)]",
    Icon: Info,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof ALERT_TONES;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = ALERT_TONES[tone];
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-md)] border px-3.5 py-3",
        cls,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="text-[13.5px] font-semibold leading-[1.45]">{title}</p>}
        {children && (
          <div className={cn("text-[13px] leading-[1.55]", title && "mt-0.5 opacity-90")}>
            {children}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- Skeleton -- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Progress -- */

export function Progress({
  value,
  max = 100,
  tone = "brand",
  size = "md",
  label,
  className,
}: {
  value: number;
  max?: number;
  tone?: "brand" | "info" | "warning" | "neutral";
  size?: "sm" | "md";
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = {
    brand: "bg-[var(--color-brand)]",
    info: "bg-[var(--color-info-fg)]",
    warning: "bg-[var(--color-warning-fg)]",
    neutral: "bg-[var(--color-text-muted)]",
  };
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[12.5px] text-[var(--color-text-secondary)]">{label}</span>
          <span className="text-[12px] font-medium tabular-nums text-[var(--color-text-primary)]">
            {Math.round(pct)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]",
          size === "sm" ? "h-1.5" : "h-2",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", colors[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Rating -- */

export function Rating({
  value,
  count,
  size = "md",
  showValue = true,
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}) {
  const dims = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" };
  const text = { sm: "text-[11.5px]", md: "text-[12.5px]", lg: "text-[13.5px]" };
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              dims[size],
              i <= Math.round(value)
                ? "fill-[var(--color-star)] text-[var(--color-star)]"
                : "text-[var(--color-border-emphasis)]",
            )}
          />
        ))}
      </span>
      {showValue && (
        <span className={cn("font-medium tabular-nums text-[var(--color-text-primary)]", text[size])}>
          {value.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className={cn("text-[var(--color-text-muted)]", text[size])}>({count})</span>
      )}
    </span>
  );
}

/** Interactive star picker for review forms. */
export function RatingInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      {label && <span className="text-[13px] text-[var(--color-text-secondary)]">{label}</span>}
      <span className="inline-flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => onChange(i)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                i <= value
                  ? "fill-[var(--color-star)] text-[var(--color-star)]"
                  : "text-[var(--color-border-emphasis)]",
              )}
            />
          </button>
        ))}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- Tooltip -- */

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom";
}) {
  const pos = {
    top: "bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2",
    right: "left-[calc(100%+8px)] top-1/2 -translate-y-1/2",
    bottom: "top-[calc(100%+8px)] left-1/2 -translate-x-1/2",
  };
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[100] whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-brand-ink)] px-2 py-1 text-[11.5px] font-medium text-white opacity-0 shadow-[var(--shadow-md)] transition-opacity duration-[var(--motion-fast)] group-hover/tt:opacity-100",
          pos[side],
        )}
      >
        {content}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------- Breadcrumb -- */

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)]">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {item.href ? (
              <a
                href={item.href}
                className="transition-colors hover:text-[var(--color-text-primary)]"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-[var(--color-text-secondary)]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
