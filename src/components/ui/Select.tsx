import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-medium text-[#333840] mb-1.5">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "w-full h-[44px] pl-4 pr-10 py-2.5 rounded-[6px] text-sm text-[#181d26] transition-all focus:outline-none disabled:opacity-50",
              "glass-input focus:border-[#1968E5] focus:ring-2 focus:ring-[#1968E5]/20 appearance-none cursor-pointer",
              error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : "border-[#E2E5EA]",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-[#181d26]">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A6472]" />
        </div>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

