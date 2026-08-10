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
    "inline-flex items-center justify-center font-medium rounded-[12px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#458fff]/30 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]";

  const variants = {
    primary:
      "bg-[#181d26] hover:bg-[#0d1218] active:bg-[#0d1218] text-white border border-transparent shadow-sm",
    secondary:
      "bg-white hover:bg-slate-50 text-[#181d26] border border-[#dddddd] shadow-sm",
    accent:
      "bg-[#1b61c9] hover:bg-[#1a3866] text-white border border-transparent shadow-sm",
    outline:
      "bg-white hover:bg-slate-50 text-[#181d26] border border-[#dddddd]",
    ghost: "text-[#333840] hover:bg-[#f8fafc] hover:text-[#181d26]",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white shadow-sm",
    pill:
      "bg-white hover:bg-slate-50 text-[#181d26] rounded-full border border-[#dddddd] px-6 py-3",
  };

  const sizes = {
    xs: "px-3 py-1 text-xs",
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-3 text-sm",
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

