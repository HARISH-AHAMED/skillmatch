import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Maps onto the six system variants:
   * primary (blue) · accent (navy, high-emphasis) · secondary (outline) ·
   * ghost (text) · outline (blue outline-emphasis) · danger (destructive).
   * `pill` is the chip/multi-select control.
   */
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger" | "pill";
  size?: "xs" | "sm" | "md" | "lg";
  /** Swaps content for a spinner without changing the button's footprint. */
  loading?: boolean;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  // Pill radius, 600 weight, blue focus ring, background-tint hover (no transform).
  const baseStyles = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold",
    "transition-colors duration-[180ms] ease-out",
    "focus:outline-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2E6BEA]/15 focus-visible:border-[#2E6BEA]",
    "disabled:cursor-not-allowed disabled:bg-[#F1F2F4] disabled:text-[#B7BBC6] disabled:border-transparent disabled:shadow-none"
  );

  const variants = {
    // Primary CTA — the only solid-fill control in the system.
    primary:
      "bg-[#2E6BEA] text-white border border-transparent hover:bg-[#245BC9] active:bg-[#1B49A8]",
    // Secondary / cancel — white with a neutral outline.
    secondary:
      "bg-white text-[#1A1D29] border border-[#E3E5EA] hover:bg-[#F0F3F9] active:bg-[#EAF1FE]",
    // High-emphasis alternate primary (navy).
    accent:
      "bg-[#152C55] text-white border border-transparent hover:bg-[#1E3D71] active:bg-[#152C55]",
    // Outline-emphasis / toggle-style.
    outline:
      "bg-white text-[#2159C9] border border-[#2E6BEA] hover:bg-[#EAF1FE] active:bg-[#E8F1FE]",
    // Tertiary text action.
    ghost:
      "bg-transparent text-[#2159C9] border border-transparent hover:bg-[#EAF1FE] active:bg-[#E8F1FE]",
    danger:
      "bg-white text-[#BC2A2A] border border-[#F5C2C2] hover:bg-[#FDEAEA] active:bg-[#FDEAEA]",
    // Chip multi-select: selection reads as border + text colour, never fill.
    pill: cn(
      "bg-white text-[#5B6272] border border-dashed border-[#C7CBD6] px-5",
      "hover:border-[#2E6BEA] hover:text-[#2159C9]",
      "data-[selected=true]:border-solid data-[selected=true]:border-[1.5px]",
      "data-[selected=true]:border-[#2E6BEA] data-[selected=true]:text-[#2159C9]"
    ),
  };

  // Generous horizontal padding — pills need it to read correctly.
  const sizes = {
    xs: "h-8 px-4 text-[13px]",
    sm: "h-9 px-5 text-[13px]",
    md: "h-10 px-6 text-sm",
    lg: "h-11 px-7 text-sm",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      suppressHydrationWarning={true}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
        {children}
      </span>
    </button>
  );
}
