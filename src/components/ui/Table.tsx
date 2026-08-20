"use client";

import { cn } from "@/lib/utils";

/* ============================================================================
   Table (§19.12) — 56px rows, hairline separators, sticky header,
   right-aligned numerics, own horizontal scroll container.
   On mobile the same data is rendered as stacked label/value cards (§19.19).
   ========================================================================= */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Column priority: "essential" columns survive the tablet reduction. */
  essential?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  empty,
  className,
  dense,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  className?: string;
  dense?: boolean;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <>
      {/* ---- Desktop / tablet table ---- */}
      <div
        className={cn(
          "hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] md:block",
          className,
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[var(--color-surface-alt)]">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: c.width }}
                    className={cn(
                      "border-b border-[var(--color-border)] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)] whitespace-nowrap",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      !c.essential && "hidden lg:table-cell",
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-[var(--color-border-subtle)] transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-[var(--color-hover)]",
                  )}
                  style={{ height: dense ? 48 : 56 }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 text-[13.5px] text-[var(--color-text-primary)] align-middle",
                        c.align === "right" && "text-right tabular-nums",
                        c.align === "center" && "text-center",
                        !c.essential && "hidden lg:table-cell",
                      )}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Mobile stacked cards ---- */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "glass-panel p-4",
              onRowClick && "cursor-pointer glass-panel-hover",
            )}
          >
            <dl className="flex flex-col gap-2.5">
              {columns.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-4">
                  <dt className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--color-text-muted)]">
                    {c.header}
                  </dt>
                  <dd className="min-w-0 text-right text-[13.5px] text-[var(--color-text-primary)]">
                    {c.render(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}

/* --------------------------------------------------------------- KPI tile -- */

export function KpiTile({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  tone = "brand",
  href,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  tone?: "brand" | "info" | "warning" | "neutral";
  href?: string;
}) {
  const tones = {
    brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]",
    info: "bg-[var(--color-info-bg)] text-[var(--color-info-fg)]",
    warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)]",
    neutral: "bg-[var(--color-neutral-bg)] text-[var(--color-neutral-fg)]",
  };
  const Comp = href ? "a" : "div";
  return (
    <Comp
      {...(href ? { href } : {})}
      className={cn(
        "glass-panel flex flex-col justify-between gap-3 p-4 md:p-5",
        href && "glass-panel-hover",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium leading-[1.4] text-[var(--color-text-secondary)]">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] [&>svg]:h-4 [&>svg]:w-4",
              tones[tone],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div>
        <p className="text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[var(--color-text-primary)]">
          {value}
        </p>
        {(delta !== undefined || deltaLabel) && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px]">
            {delta !== undefined && (
              <span
                className={cn(
                  "font-medium tabular-nums",
                  delta >= 0
                    ? "text-[var(--color-success-fg)]"
                    : "text-[var(--color-error-fg)]",
                )}
              >
                {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
              </span>
            )}
            {deltaLabel && <span className="text-[var(--color-text-muted)]">{deltaLabel}</span>}
          </p>
        )}
      </div>
    </Comp>
  );
}
