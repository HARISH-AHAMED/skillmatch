import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
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
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const variants = {
    primary:
      "bg-[#002d59] hover:bg-[#001f3f] text-white shadow-md shadow-[#002d59]/10 border border-transparent",
    secondary:
      "bg-[#3ac0ff] hover:bg-[#1ab5ff] text-[#002d59] shadow-md shadow-sky-400/10 border border-transparent",
    accent:
      "bg-sky-400 hover:bg-sky-500 text-white shadow-md shadow-sky-400/10 border border-transparent",
    outline:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 hover:border-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/10",
  };

  const sizes = {
    xs: "px-2.5 py-1 text-[10px]",
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
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
