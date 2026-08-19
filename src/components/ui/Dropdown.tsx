"use client";

import React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownProps {
  /** Custom trigger. When omitted, a pill-shaped filter button is rendered. */
  trigger?: React.ReactNode;
  /** Label for the built-in filter-pill trigger. */
  label?: React.ReactNode;
  align?: "left" | "right";
  /** Panel width; defaults to at least the trigger width. */
  panelClassName?: string;
  className?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}

/**
 * Trigger + floating panel. White surface, 8px radius, `shadow-md`, offset
 * from the trigger. Dismisses on outside click and Escape.
 */
export function Dropdown({
  trigger,
  label,
  align = "left",
  panelClassName,
  className,
  children,
}: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          trigger
            ? "cursor-pointer"
            : cn(
                "inline-flex h-9 items-center gap-2 rounded-full border border-[#E3E5EA] bg-white px-4",
                "text-[13px] font-medium text-[#1A1D29] cursor-pointer",
                "transition-colors duration-[180ms] hover:bg-[#F0F3F9]",
                open && "border-[#2E6BEA] text-[#2159C9]"
              )
        }
      >
        {trigger ?? (
          <>
            {label}
            <ChevronDown
              className={cn("h-4 w-4 text-[#8A90A0] transition-transform", open && "rotate-180")}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-[100] mt-1.5 min-w-full overflow-hidden rounded-md border border-[#E3E5EA] bg-white py-1 shadow-md",
            "animate-in fade-in slide-in-from-top-1 duration-[120ms]",
            align === "right" ? "right-0" : "left-0",
            panelClassName
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: React.ReactNode;
  /** Renders in the destructive treatment. */
  destructive?: boolean;
}

export function DropdownItem({
  children,
  className,
  selected,
  icon,
  destructive,
  ...props
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px]",
        "transition-colors duration-[120ms] cursor-pointer",
        "disabled:cursor-not-allowed disabled:text-[#5B6272]",
        destructive
          ? "text-[#BC2A2A] hover:bg-[#FDEAEA]"
          : "text-[#1A1D29] hover:bg-[#F0F3F9]",
        selected && !destructive && "font-semibold text-[#2159C9]",
        className
      )}
      {...props}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {selected && <Check className="h-4 w-4 shrink-0 text-[#2159C9]" aria-hidden="true" />}
    </button>
  );
}

/** Thin rule between logical groups — not between every item. */
export function DropdownDivider() {
  return <div className="my-1 h-px bg-[#EDEEF2]" role="separator" />;
}
