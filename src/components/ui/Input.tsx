import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-medium text-[#333840] mb-1.5">{label}</label>}
        <input
          type={type}
          ref={ref}
          className={cn(
            "w-full h-[44px] px-4 py-3 rounded-[6px] text-sm text-[#181d26] transition-all focus:outline-none disabled:opacity-50",
            "glass-input focus:border-[#458fff] focus:ring-2 focus:ring-[#458fff]/20",
            error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : "border-[#dddddd]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

