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
        hasBg ? "rounded-2xl p-6 border border-slate-200/50 shadow-sm" : "glass-panel rounded-2xl p-6",
        "transition-all duration-300",
        hoverable && !hasBg && "glass-panel-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
