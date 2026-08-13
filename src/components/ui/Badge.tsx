import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "accent" | "coral" | "cream" | "forest" | "mint" | "peach" | "success" | "warning" | "danger" | "neutral";
}

export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  const styles = {
    primary: "bg-[#E6F0FE] text-[#1968E5] border border-transparent",
    secondary: "bg-[#F7F8FA] text-[#181d26] border border-[#E2E5EA]",
    accent: "bg-[#EDF5FD] text-[#1968E5] border border-[#DEEDFC]",
    coral: "bg-[#B3401E] text-white border border-transparent",
    cream: "bg-[#FFF7DA] text-[#181d26] border border-[#e0d3bd]",
    forest: "bg-[#0B1C32] text-white border border-transparent",
    mint: "bg-[#DEF7EB] text-[#0B1C32] border border-transparent",
    peach: "bg-[#FFC700] text-[#181d26] border border-transparent",
    success: "bg-[#DEF7EB] text-[#0F9D58] border border-transparent",
    warning: "bg-[#FDEEDC] text-[#B4630E] border border-transparent",
    danger: "bg-[#FDEDEA] text-[#B3401E] border border-transparent",
    neutral: "bg-[#F7F8FA] text-[#333840] border border-[#E2E5EA]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-2 py-0.5 text-xs font-medium tracking-normal transition-colors duration-150",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

