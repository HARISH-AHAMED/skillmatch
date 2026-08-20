"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  href?: string;
}

/**
 * One clickable tab. Rendered as a Link when `href` is present and a button
 * otherwise — kept as an explicit branch so both stay fully typed.
 */
function TabTrigger({
  item,
  className,
  onSelect,
  children,
}: {
  item: TabItem;
  className: string;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onSelect} className={className}>
      {children}
    </button>
  );
}

/**
 * Horizontal tab bar. Scrolls without a visible scrollbar below the desktop
 * breakpoint (§19.18 / §19.19) so no page ever scrolls horizontally.
 */
export function Tabs({
  items,
  value,
  onChange,
  variant = "underline",
  className,
  size = "md",
}: {
  items: TabItem[];
  value: string;
  onChange?: (id: string) => void;
  variant?: "underline" | "pill" | "segmented";
  className?: string;
  size?: "sm" | "md";
}) {
  const layoutId = useId();

  if (variant === "segmented") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-1",
          className,
        )}
      >
        {items.map((t) => {
          const active = t.id === value;
          return (
            <TabTrigger
              key={t.id}
              item={t}
              onSelect={() => onChange?.(t.id)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                size === "sm" ? "h-7" : "h-8",
                active
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`${layoutId}-seg`}
                  className="absolute inset-0 rounded-full bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
                  transition={{ duration: 0.18, ease: "easeOut" }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {t.icon}
                {t.label}
                {typeof t.count === "number" && (
                  <span className="text-[11px] text-[var(--color-text-muted)]">{t.count}</span>
                )}
              </span>
            </TabTrigger>
          );
        })}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <div className={cn("no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1", className)}>
        {items.map((t) => {
          const active = t.id === value;
          return (
            <TabTrigger
              key={t.id}
              item={t}
              onSelect={() => onChange?.(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors",
                size === "sm" ? "h-9" : "h-10",
                active
                  ? "border-[var(--color-brand-ink)] bg-[var(--color-brand-ink)] text-white"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-hover)]",
              )}
            >
              {t.icon}
              {t.label}
              {typeof t.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    active ? "bg-white/20" : "bg-[var(--color-surface-sunken)]",
                  )}
                >
                  {t.count}
                </span>
              )}
            </TabTrigger>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("border-b border-[var(--color-border)]", className)}>
      <div className="no-scrollbar flex gap-1 overflow-x-auto">
        {items.map((t) => {
          const active = t.id === value;
          return (
            <TabTrigger
              key={t.id}
              item={t}
              onSelect={() => onChange?.(t.id)}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 px-3.5 text-[13.5px] font-medium transition-colors",
                size === "sm" ? "h-9" : "h-11",
                active
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              )}
            >
              {t.icon}
              {t.label}
              {typeof t.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[11px] tabular-nums",
                    active
                      ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
                      : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]",
                  )}
                >
                  {t.count}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId={`${layoutId}-underline`}
                  className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[var(--color-brand)]"
                  transition={{ duration: 0.18, ease: "easeOut" }}
                />
              )}
            </TabTrigger>
          );
        })}
      </div>
    </div>
  );
}
