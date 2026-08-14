import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "primary" | "secondary" | "accent" | "coral" | "cream" | "forest"
    | "mint" | "peach" | "success" | "warning" | "danger" | "neutral";
}

/**
 * Status pill. Always pastel background + saturated same-hue text —
 * never a solid saturated fill. Legacy variant names are kept and folded
 * onto the six semantic types so call sites stay untouched.
 */
export function Badge({ children, className, variant = "neutral", ...props }: BadgeProps) {
  const styles = {
    // Semantic set.
    success: "bg-[#E4F7EC] text-[#147A44]",
    warning: "bg-[#FFF3DC] text-[#8F5E08]",
    danger: "bg-[#FDEAEA] text-[#BC2A2A]",
    neutral: "bg-[#F1F2F4] text-[#5B6272]",
    primary: "bg-[#E8F1FE] text-[#2159C9]",
    secondary: "bg-[#F1F2F4] text-[#5B6272]",

    // Legacy aliases → nearest semantic meaning.
    accent: "bg-[#E8F1FE] text-[#2159C9]",
    coral: "bg-[#FDEAEA] text-[#BC2A2A]",
    cream: "bg-[#FFF3DC] text-[#8F5E08]",
    peach: "bg-[#FFF3DC] text-[#8F5E08]",
    forest: "bg-[#E4F7EC] text-[#147A44]",
    mint: "bg-[#E4F7EC] text-[#147A44]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
        "text-xs font-medium leading-5 whitespace-nowrap",
        "border border-transparent transition-colors duration-[180ms]",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
