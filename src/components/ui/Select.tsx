"use client";

import React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  /** A disabled option still renders but cannot be chosen (EVAL-001…006). */
  options: { value: string; label: string; disabled?: boolean }[];
}

/** Same box, radius, height and focus treatment as `Input`, plus a trailing chevron. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, required, ...props }, ref) => {
    const autoId = React.useId();
    const selectId = id ?? autoId;
    const errorId = `${selectId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-[13px] font-medium text-[#1A1D29]"
          >
            {label}
            {required && (
              <span className="ml-0.5 text-[#BC2A2A]" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "h-10 w-full cursor-pointer appearance-none rounded-md border bg-white",
              "pl-3.5 pr-10 text-sm text-[#1A1D29]",
              "transition-[border-color,box-shadow] duration-[180ms] focus:outline-none",
              "disabled:cursor-not-allowed disabled:bg-[#F1F2F4] disabled:text-[#5B6272]",
              error
                ? "border-[#D33636] focus:border-[#D33636] focus:shadow-[0_0_0_3px_rgba(211,54,54,0.15)]"
                : "border-[#E3E5EA] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)]",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-white text-[#1A1D29]"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A90A0]"
          />
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-1.5 flex items-center gap-1.5 text-xs text-[#BC2A2A]"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
