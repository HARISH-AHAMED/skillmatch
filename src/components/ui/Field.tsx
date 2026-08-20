"use client";

import { forwardRef, useId } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Label -- */

export function Label({
  children,
  htmlFor,
  required,
  hint,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-secondary)]"
      >
        {children}
        {required && <span className="ml-1 text-[var(--color-error-fg)]">*</span>}
      </label>
      {hint && <span className="text-[12px] text-[var(--color-text-muted)]">{hint}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ Field -- */

export function Field({
  label,
  required,
  hint,
  error,
  help,
  children,
  htmlFor,
  className,
}: {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required} hint={hint}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-[12px] leading-[1.45] text-[var(--color-error-fg)]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : help ? (
        <p className="text-[12px] leading-[1.45] text-[var(--color-text-muted)]">{help}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Input -- */

const controlBase =
  "w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 text-[14px] " +
  "text-[var(--color-text-primary)] transition-[border-color,box-shadow] duration-[var(--motion-fast)] " +
  "placeholder:text-[var(--color-text-muted)] " +
  "focus:outline-none focus:border-[var(--color-brand)] focus:shadow-[var(--shadow-focus)] " +
  "disabled:bg-[var(--color-input-disabled)] disabled:text-[var(--color-text-disabled)] disabled:cursor-not-allowed";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "sm" | "md" | "lg";
  invalid?: boolean;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputSize = "md", invalid, leftIcon, rightSlot, ...props },
  ref,
) {
  const heights = { sm: "h-9", md: "h-10", lg: "h-11" };
  const input = (
    <input
      ref={ref}
      className={cn(
        controlBase,
        heights[inputSize],
        invalid
          ? "border-[var(--color-error-border)] focus:border-[var(--color-error-fg)]"
          : "border-[var(--color-border)]",
        leftIcon && "pl-9",
        rightSlot && "pr-10",
        className,
      )}
      {...props}
    />
  );
  if (!leftIcon && !rightSlot) return input;
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] [&>svg]:h-4 [&>svg]:w-4">
          {leftIcon}
        </span>
      )}
      {input}
      {rightSlot && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          {rightSlot}
        </span>
      )}
    </div>
  );
});

/* --------------------------------------------------------------- Textarea -- */

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        controlBase,
        "resize-y py-2.5 leading-[1.6]",
        invalid ? "border-[var(--color-error-border)]" : "border-[var(--color-border)]",
        className,
      )}
      {...props}
    />
  );
});

/* ----------------------------------------------------------------- Select -- */

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  inputSize?: "sm" | "md" | "lg";
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, inputSize = "md", invalid, children, ...props },
  ref,
) {
  const heights = { sm: "h-9", md: "h-10", lg: "h-11" };
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          controlBase,
          heights[inputSize],
          "appearance-none pr-9 cursor-pointer",
          invalid ? "border-[var(--color-error-border)]" : "border-[var(--color-border)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
        aria-hidden
      />
    </div>
  );
});

/* --------------------------------------------------------------- Checkbox -- */

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode; description?: string }) {
  const id = useId();
  return (
    <label
      htmlFor={props.id ?? id}
      className={cn("flex cursor-pointer items-start gap-2.5 select-none", className)}
    >
      <input
        id={props.id ?? id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border-[var(--color-border-emphasis)] accent-[var(--color-brand)]"
        {...props}
      />
      <span className="min-w-0">
        {label && (
          <span className="block text-[13px] leading-[1.45] text-[var(--color-text-primary)]">
            {label}
          </span>
        )}
        {description && (
          <span className="mt-0.5 block text-[12px] leading-[1.45] text-[var(--color-text-muted)]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ Radio -- */

export function RadioCard({
  checked,
  onSelect,
  title,
  description,
  icon,
  className,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={cn(
        "group flex w-full items-start gap-3 rounded-[var(--radius-lg)] border p-3.5 text-left transition-all duration-[var(--motion-base)]",
        checked
          ? "border-[var(--color-brand)] bg-[var(--color-brand-softer)] shadow-[var(--shadow-focus)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-hover)]",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] [&>svg]:h-[18px] [&>svg]:w-[18px]",
            checked
              ? "bg-[var(--color-brand)] text-white"
              : "bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-[var(--color-text-primary)]">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-[var(--color-text-secondary)]">
            {description}
          </span>
        )}
      </span>
      <span
        className={cn(
          "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked ? "border-[var(--color-brand)]" : "border-[var(--color-border-emphasis)]",
        )}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-brand)]" />}
      </span>
    </button>
  );
}

/* ----------------------------------------------------------------- Toggle -- */

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const dims =
    size === "sm"
      ? { track: "h-5 w-9", knob: "h-4 w-4", shift: "translate-x-4" }
      : { track: "h-6 w-11", knob: "h-5 w-5", shift: "translate-x-5" };
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <p className="text-[13.5px] font-medium text-[var(--color-text-primary)]">{label}</p>
          )}
          {description && (
            <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative shrink-0 rounded-full transition-colors duration-[var(--motion-base)] disabled:opacity-50",
          dims.track,
          checked ? "bg-[var(--color-brand)]" : "bg-[var(--color-border-emphasis)]",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform duration-[var(--motion-base)]",
            dims.knob,
            checked && dims.shift,
          )}
        />
      </button>
    </div>
  );
}
