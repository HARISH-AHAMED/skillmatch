import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger" | "pill";
  size?: "xs" | "sm" | "md" | "lg";
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold tracking-[0.1px] rounded-[6px] transition-all duration-150 focus:outline-none focus:ring-[3px] focus:ring-[#1968E5]/25 disabled:bg-[#EDEFF2] disabled:text-[#A6ACB6] disabled:border-transparent disabled:opacity-100 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-[#1968E5] hover:bg-[#134FB0] active:bg-[#134FB0] text-white border border-transparent",
    secondary:
      "bg-white hover:bg-[#F7F8FA] text-[#181D26] border border-[#C7CCD4]",
    accent:
      "bg-[#181D26] hover:bg-[#0B1C32] text-white border border-transparent",
    outline:
      "bg-white hover:bg-[#F7F8FA] text-[#181D26] border border-[#E2E5EA]",
    ghost: "text-[#333840] hover:bg-[#F7F8FA] hover:text-[#181D26]",
    danger:
      "bg-[#B3401E] hover:bg-[#8f3318] text-white border border-transparent",
    pill:
      "bg-white hover:bg-[#EDF5FD] text-[#181D26] rounded-full border border-[#E2E5EA] hover:border-[#1968E5] px-6 py-3",
  };

  const sizes = {
    xs: "px-3 py-1 text-xs",
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5 text-sm min-h-[40px]",
    lg: "px-6 py-4 text-base",
  };

  return (
    <button
      type={type}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      suppressHydrationWarning={true}
      {...props}
    >
      {children}
    </button>
  );
}

