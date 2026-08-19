"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Renders the red required asterisk beside the label. */
  required?: boolean;
}

/**
 * Text field: label above (never placeholder-only), 8px radius, 40px tall,
 * blue border + soft glow on focus. Errors pair an icon with text so the
 * state is never communicated by colour alone.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, id, required, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
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
        <input
          id={inputId}
          type={type}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-10 w-full rounded-md border bg-white px-3.5 text-sm text-[#1A1D29]",
            "placeholder:text-[#8A90A0]",
            "transition-[border-color,box-shadow] duration-[180ms] focus:outline-none",
            "disabled:cursor-not-allowed disabled:bg-[#F1F2F4] disabled:text-[#5B6272]",
            error
              ? "border-[#D33636] focus:border-[#D33636] focus:shadow-[0_0_0_3px_rgba(211,54,54,0.15)]"
              : "border-[#E3E5EA] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)]",
            className
          )}
          {...props}
        />
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

Input.displayName = "Input";
