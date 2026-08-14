import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tint the surface on hover — for cards that are themselves clickable. */
  hoverable?: boolean;
  /** Selected state reads as a blue border, never a fill change. */
  selected?: boolean;
}

/**
 * Container surface: white, 1px border, 12px radius, no shadow.
 * Elevation in this system comes from borders and background contrast.
 */
export function Card({
  children,
  className,
  hoverable = true,
  selected = false,
  ...props
}: CardProps) {
  const hasBg = className
    ?.split(/\s+/)
    .some((c) => c.startsWith("bg-") || c.startsWith("from-") || c.startsWith("to-"));

  return (
    <div
      data-selected={selected || undefined}
      className={cn(
        "rounded-xl border p-4 transition-colors duration-[180ms] ease-out",
        hasBg ? "border-[#E3E5EA]" : "border-[#E3E5EA] bg-white",
        selected ? "border-[1.5px] border-[#2E6BEA]" : null,
        hoverable && !selected && "hover:border-[#C7CBD6] hover:bg-[#F0F3F9]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
