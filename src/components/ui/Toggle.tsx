"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

/**
 *  — off: border-strong track, white knob; on: primary track.
 * Hit area is padded to 44x44 on touch surfaces per the responsive spec.
 */
export function Toggle({ checked, onChange, disabled, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center p-0.5 transition-colors cursor-pointer",
        "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2E6BEA]/15",
        "disabled:cursor-not-allowed disabled:bg-[#F1F2F4]",
        checked ? "bg-[#2E6BEA]" : "bg-[#C7CBD6]",
        className
      )}
      style={{ borderRadius: 9999 }}
    >
      <span
        className={cn(
          "h-5 w-5 bg-canvas transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
        style={{ borderRadius: "50%" }}
      />
    </button>
  );
}
