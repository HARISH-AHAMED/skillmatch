import React from "react";
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
        {label && <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>}
        <select
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50",
            "glass-input focus:border-[#3ac0ff] focus:ring-[#3ac0ff]/20 appearance-none bg-no-repeat bg-[right_1rem_center]",
            error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200/80",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
