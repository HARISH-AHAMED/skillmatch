import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";
import {
  APPLICATION_STATUS_META,
  PAYMENT_STATUS_META,
  PROJECT_STATUS_META,
} from "@/lib/constants";
import type { ApplicationStatus, PaymentItemStatus, ProjectStatus } from "@/lib/types";

const TONES: Record<Tone, string> = {
  success:
    "bg-[var(--color-success-bg)] text-[var(--color-success-fg)] border-[var(--color-success-border)]",
  warning:
    "bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)] border-[var(--color-warning-border)]",
  error: "bg-[var(--color-error-bg)] text-[var(--color-error-fg)] border-[var(--color-error-border)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info-fg)] border-[var(--color-info-border)]",
  neutral:
    "bg-[var(--color-neutral-bg)] text-[var(--color-neutral-fg)] border-[var(--color-neutral-border)]",
  brand:
    "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)] border-[var(--color-brand-border)]",
};

export function Badge({
  children,
  tone = "neutral",
  size = "md",
  dot = false,
  icon,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "h-[20px] px-2 text-[11px]" : "h-[24px] px-2.5 text-[12px]",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {icon && <span className="[&>svg]:h-3 [&>svg]:w-3">{icon}</span>}
      {children}
    </span>
  );
}

export function StatusIndicator({
  status,
  kind,
  size = "md",
  className,
}: {
  status: string;
  kind: "project" | "application" | "payment";
  size?: "sm" | "md";
  className?: string;
}) {
  const meta =
    kind === "project"
      ? PROJECT_STATUS_META[status as ProjectStatus]
      : kind === "application"
        ? APPLICATION_STATUS_META[status as ApplicationStatus]
        : PAYMENT_STATUS_META[status as PaymentItemStatus];

  if (!meta) return <Badge tone="neutral" size={size}>{status}</Badge>;

  return (
    <Badge tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </Badge>
  );
}

/** Small pill for skills / tags. */
export function Chip({
  children,
  active,
  onClick,
  onRemove,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors duration-[var(--motion-fast)]",
        size === "sm" ? "h-[22px] px-2.5 text-[11.5px]" : "h-[28px] px-3 text-[12.5px]",
        active
          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]",
        onClick && !active && "hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-hover)]",
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
          aria-label="Remove"
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </Comp>
  );
}

/** Score ring used on applicant + project cards. */
export function MatchScore({
  score,
  size = 44,
  showLabel = false,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
}) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const tone =
    pct >= 85 ? "var(--color-brand)" : pct >= 65 ? "var(--color-info-fg)" : "var(--color-warning-fg)";
  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-surface-sunken)"
            strokeWidth="3.5"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * pct) / 100}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
          style={{ fontSize: size <= 40 ? 11 : 12, color: tone }}
        >
          {Math.round(pct)}
        </span>
      </div>
      {showLabel && (
        <span className="text-[12px] leading-tight text-[var(--color-text-secondary)]">
          AI match
          <br />
          <span className="text-[var(--color-text-muted)]">score</span>
        </span>
      )}
    </div>
  );
}
