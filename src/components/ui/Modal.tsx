"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Bold H2 shown in the header. Omit for fully custom content. */
  title?: React.ReactNode;
  /** Supporting line beneath the title. */
  description?: React.ReactNode;
  /** Right-aligned primary / left-aligned secondary action row. */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  /** Hide the × control for flows that must be dismissed via an action. */
  hideClose?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  full: "max-w-5xl",
};

/**
 * Centred dialog on a dimmed scrim; becomes a full-screen sheet on mobile.
 * 12px radius, header/footer separated by hairlines, shadow reserved for
 * this true-overlay context.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "2xl",
  hideClose = false,
  className,
  children,
}: ModalProps) {
  const titleId = React.useId();

  // Escape to dismiss, and the page behind must not scroll while open.
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
      className="fixed inset-0 z-[400] flex items-end justify-center sm:items-center sm:p-4"
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
          "relative z-[410] flex w-full flex-col bg-white shadow-lg",
          // Full-screen sheet on mobile, centred card from `sm` up.
          "max-h-[92vh] rounded-t-xl sm:max-h-[90vh] sm:rounded-xl",
          "animate-in fade-in slide-in-from-bottom-4 duration-[180ms] sm:slide-in-from-bottom-0",
          SIZES[size],
          className
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-[#E3E5EA] px-6 py-4">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-[20px] font-semibold leading-tight text-[#1A1D29]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-[13px] text-[#5B6272]">{description}</p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#5B6272] transition-colors hover:bg-[#F0F3F9] hover:text-[#1A1D29] cursor-pointer"
              >
                <X className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[#E3E5EA] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
