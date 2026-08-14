"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  /** Stable key returned by `onChange`. */
  id: string;
  label: React.ReactNode;
  /** Optional trailing count chip, e.g. an applicant total. */
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** `underline` for page sections, `pill` for filter/category switches. */
  variant?: "underline" | "pill";
  className?: string;
  /** Accessible name for the tablist. */
  label?: string;
}

/**
 * Two documented treatments only: flat underline tabs for page sections,
 * filled pill tabs for filter switches. Arrow-key navigable.
 */
export function Tabs({
  items,
  value,
  onChange,
  variant = "underline",
  className,
  label,
}: TabsProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    for (let i = 1; i <= items.length; i++) {
      const next = (idx + dir * i + items.length * i) % items.length;
      if (!items[next].disabled) {
        onChange(items[next].id);
        refs.current[next]?.focus();
        return;
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex items-center overflow-x-auto scrollbar-none",
        variant === "underline"
          ? "gap-7 border-b border-[#E3E5EA]"
          : "gap-2",
        className
      )}
    >
      {items.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={t.disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] font-medium",
              "transition-colors duration-[180ms] cursor-pointer",
              "disabled:cursor-not-allowed disabled:text-[#B7BBC6]",
              variant === "underline"
                ? cn(
                    "-mb-px border-b-2 px-0.5 pb-2.5 pt-1",
                    active
                      ? "border-[#2E6BEA] text-[#2159C9] font-semibold"
                      : "border-transparent text-[#5B6272] hover:text-[#1A1D29]"
                  )
                : cn(
                    "h-9 rounded-full border px-4",
                    active
                      ? "border-transparent bg-[#EAF1FE] text-[#2159C9] font-semibold"
                      : "border-[#E3E5EA] bg-white text-[#5B6272] hover:bg-[#F0F3F9] hover:text-[#1A1D29]"
                  )
            )}
          >
            {t.icon}
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-4",
                  active ? "bg-[#E8F1FE] text-[#2159C9]" : "bg-[#F1F2F4] text-[#5B6272]"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
