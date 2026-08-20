"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  label: string;
  description?: string;
}

/**
 * Numbered stepper with current / complete / upcoming states (§19.13).
 * Below 768px only "Step N of M" is shown (§19.19).
 */
export function Stepper({
  steps,
  current,
  onStepClick,
  className,
}: {
  steps: Step[];
  current: number;
  onStepClick?: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* Mobile */}
      <div className="md:hidden">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            {steps[current]?.label}
          </p>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Step {current + 1} of {steps.length}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
          <div
            className="h-full rounded-full bg-[var(--color-brand)] transition-[width] duration-500 ease-out"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
        {steps[current]?.description && (
          <p className="mt-2 text-[12.5px] text-[var(--color-text-secondary)]">
            {steps[current].description}
          </p>
        )}
      </div>

      {/* Desktop */}
      <ol className="hidden items-start md:flex">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const clickable = onStepClick && i <= current;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(i)}
                className={cn(
                  "group flex min-w-0 flex-1 items-start gap-3 text-left",
                  clickable ? "cursor-pointer" : "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-semibold transition-colors duration-[var(--motion-base)]",
                    done
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
                      : active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
                        : "border-[var(--color-border-emphasis)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      "block truncate text-[13px] font-medium leading-[1.35]",
                      active || done
                        ? "text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-muted)]",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="mt-0.5 block truncate text-[11.5px] text-[var(--color-text-muted)]">
                      {step.description}
                    </span>
                  )}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    "mx-3 mt-4 h-px min-w-6 flex-1 transition-colors duration-[var(--motion-slow)]",
                    done ? "bg-[var(--color-brand)]" : "bg-[var(--color-border)]",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Vertical pipeline timeline used on application detail pages. */
export function PipelineTrack({
  stages,
  currentIndex,
  rejected,
}: {
  stages: readonly string[];
  currentIndex: number;
  rejected?: boolean;
}) {
  return (
    <ol className="flex flex-col">
      {stages.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={stage} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                  rejected && active
                    ? "border-[var(--color-error-fg)] bg-[var(--color-error-bg)] text-[var(--color-error-fg)]"
                    : done
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
                      : active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
                        : "border-[var(--color-border-emphasis)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                )}
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              {i < stages.length - 1 && (
                <span
                  className={cn(
                    "w-0.5 flex-1 min-h-6",
                    done ? "bg-[var(--color-brand)]" : "bg-[var(--color-border)]",
                  )}
                />
              )}
            </div>
            <div className="pb-5">
              <p
                className={cn(
                  "text-[13px] font-medium",
                  done || active
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-muted)]",
                )}
              >
                {stage}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
