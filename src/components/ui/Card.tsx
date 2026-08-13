import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ children, className, hoverable = true, ...props }: CardProps) {
  const hasBg = className?.split(/\s+/).some(c => c.startsWith("bg-") || c.startsWith("from-") || c.startsWith("to-"));
  return (
    <div
      className={cn(
        hasBg ? "rounded-[8px] p-4 border border-[#E2E5EA]" : "glass-panel rounded-[8px] p-4",
        "transition-all duration-200",
        hoverable && !hasBg && "glass-panel-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

