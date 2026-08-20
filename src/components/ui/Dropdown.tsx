"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export function Dropdown({
  trigger,
  items,
  align = "end",
  width = 220,
  className,
  children,
}: {
  trigger: React.ReactNode;
  items?: MenuItem[];
  align?: "start" | "end";
  width?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="block"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{ width, zIndex: 100 }}
            className={cn(
              "absolute top-[calc(100%+6px)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-md)]",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {children ? (
              <div onClick={() => setOpen(false)}>{children}</div>
            ) : (
              items?.map((item, i) => {
                const content = (
                  <>
                    {item.icon && (
                      <span className="[&>svg]:h-4 [&>svg]:w-4 shrink-0">{item.icon}</span>
                    )}
                    <span className="truncate">{item.label}</span>
                  </>
                );
                const classes = cn(
                  "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13.5px] transition-colors",
                  item.disabled
                    ? "cursor-not-allowed text-[var(--color-text-disabled)]"
                    : item.destructive
                      ? "text-[var(--color-error-fg)] hover:bg-[var(--color-error-bg)]"
                      : "text-[var(--color-text-primary)] hover:bg-[var(--color-hover)]",
                );
                return (
                  <div key={item.label + i}>
                    {item.separatorBefore && (
                      <div className="my-1 h-px bg-[var(--color-border-subtle)]" />
                    )}
                    {item.href && !item.disabled ? (
                      <Link href={item.href} className={classes} onClick={() => setOpen(false)}>
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={item.disabled}
                        className={classes}
                        onClick={() => {
                          item.onClick?.();
                          setOpen(false);
                        }}
                      >
                        {content}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Filter dropdown with a checkbox list. */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <Dropdown
      width={260}
      align="start"
      trigger={
        <span
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
            selected.length
              ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]",
          )}
        >
          {label}
          {selected.length > 0 && (
            <span className="rounded-full bg-[var(--color-brand)] px-1.5 text-[11px] font-semibold text-white">
              {selected.length}
            </span>
          )}
          <svg viewBox="0 0 12 8" className="h-2 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 1.5L6 6.5L11 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      }
    >
      <div onClick={(e) => e.stopPropagation()}>
        {searchable && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="mb-1 h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2.5 text-[13px] focus:border-[var(--color-brand)] focus:outline-none"
          />
        )}
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-2.5 py-3 text-[12.5px] text-[var(--color-text-muted)]">No matches</p>
          )}
          {filtered.map((o) => {
            const on = selected.includes(o);
            return (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] hover:bg-[var(--color-hover)]"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    onChange(on ? selected.filter((s) => s !== o) : [...selected, o])
                  }
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                <span className="truncate capitalize">{o}</span>
              </label>
            );
          })}
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full rounded-[var(--radius-sm)] border-t border-[var(--color-border-subtle)] px-2.5 py-2 text-left text-[12.5px] text-[var(--color-link)] hover:bg-[var(--color-hover)]"
          >
            Clear selection
          </button>
        )}
      </div>
    </Dropdown>
  );
}
