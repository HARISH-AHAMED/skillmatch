"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  /** Right-anchored by default, matching the system's slide-over pattern. */
  side?: "right" | "left";
  className?: string;
  children?: React.ReactNode;
}

/**
 * Full-height slide-over for focused secondary tasks. Same visual vocabulary
 * as `Modal` (white surface, hairline header, overlay shadow) but anchored to
 * an edge at a fixed 400px width.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  side = "right",
  className,
  children,
}: DrawerProps) {
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        className="absolute inset-0 bg-[#1A1D29]/50 animate-in fade-in duration-[180ms]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "absolute inset-y-0 flex w-full max-w-[400px] flex-col bg-white shadow-lg",
          "animate-in duration-[260ms]",
          side === "right"
            ? "right-0 slide-in-from-right"
            : "left-0 slide-in-from-left",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E3E5EA] px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-[17px] font-semibold leading-tight text-[#1A1D29]">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-[13px] text-[#5B6272]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#5B6272] transition-colors hover:bg-[#F0F3F9] hover:text-[#1A1D29] cursor-pointer"
          >
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[#E3E5EA] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
