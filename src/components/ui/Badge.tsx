import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "accent" | "coral" | "cream" | "forest" | "mint" | "peach" | "success" | "warning" | "danger" | "neutral";
}

export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  const styles = {
    primary: "bg-[#181d26] text-white border border-transparent",
    secondary: "bg-[#f8fafc] text-[#181d26] border border-[#dddddd]",
    accent: "bg-[#1b61c9]/10 text-[#1b61c9] border border-[#1b61c9]/20",
    coral: "bg-[#aa2d00] text-white border border-transparent",
    cream: "bg-[#f5e9d4] text-[#181d26] border border-[#e0d3bd]",
    forest: "bg-[#0a2e0e] text-white border border-transparent",
    mint: "bg-[#a8d8c4] text-[#0a2e0e] border border-transparent",
    peach: "bg-[#fcab79] text-[#181d26] border border-transparent",
    success: "bg-emerald-50 text-[#006400] border border-[#39bf45]/40",
    warning: "bg-amber-50 text-amber-900 border border-amber-200",
    danger: "bg-rose-50 text-[#aa2d00] border border-rose-200",
    neutral: "bg-[#f8fafc] text-[#333840] border border-[#dddddd]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium tracking-normal transition-colors duration-150",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

