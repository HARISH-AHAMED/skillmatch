import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "accent" | "success" | "warning" | "danger" | "neutral";
}

export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  const styles = {
    primary: "bg-[#d0efff]/60 text-[#002d59] border border-sky-200/50 shadow-sm",
    secondary: "bg-[#f0f7ff] text-[#002d59] border border-blue-100/50 shadow-sm",
    accent: "bg-[#d0efff] text-[#002d59] border border-sky-300/40 shadow-sm",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/50",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/50",
    neutral: "bg-slate-100 text-slate-600 border border-slate-200/60",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors duration-200",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
