import Link from "next/link";
import { cn } from "@/lib/utils";

/* ============================================================================
   Card (§19.11) — white surface, 1px hairline, 12px radius, 16–24px padding,
   no shadow at rest; hover shifts background and border only.
   ========================================================================= */

export function Card({
  children,
  className,
  padding = "md",
  hover = false,
  href,
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  href?: string;
  as?: React.ElementType;
}) {
  const pads = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };
  const classes = cn(
    "glass-panel",
    pads[padding],
    hover && "glass-panel-hover",
    href && "block",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return <As className={classes}>{children}</As>;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
  divided = true,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  divided?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        divided && "border-b border-[var(--color-border-subtle)] pb-4 mb-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-active)] [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold leading-[1.35] tracking-[-0.008em] text-[var(--color-text-primary)]">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        align === "center" && "flex-col items-center text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--color-brand-active)]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-[24px] font-semibold leading-[1.22] tracking-[-0.018em] text-[var(--color-text-primary)] md:text-[28px]">
          {title}
        </h2>
        {description && (
          <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--color-text-secondary)] text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- PageHead -- */

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6", className)}>
      {breadcrumb && <div className="mb-3">{breadcrumb}</div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.018em] text-[var(--color-text-primary)] md:text-[26px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}
