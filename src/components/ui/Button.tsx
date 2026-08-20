"use client";

import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-full " +
    "transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--motion-base)] ease-out " +
    "disabled:pointer-events-none disabled:opacity-55 active:scale-[0.985] " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] active:bg-[var(--color-brand-active)] shadow-[0_1px_2px_rgba(12,24,18,0.08)]",
        ink: "bg-[var(--color-brand-ink)] text-white hover:bg-[var(--color-brand-ink-hover)]",
        secondary:
          "bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-hover)] hover:border-[var(--color-border-emphasis)]",
        soft: "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)] hover:bg-[var(--color-brand-border)]",
        ghost:
          "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]",
        danger:
          "bg-[var(--color-error-fg)] text-white hover:brightness-110",
        dangerSoft:
          "bg-[var(--color-error-bg)] text-[var(--color-error-fg)] border border-[var(--color-error-border)] hover:brightness-[0.98]",
        link: "bg-transparent text-[var(--color-link)] hover:underline underline-offset-4 px-0 h-auto",
      },
      size: {
        xs: "h-8 px-3 text-[12px]",
        sm: "h-9 px-3.5 text-[13px]",
        md: "h-10 px-4 text-[14px]",
        lg: "h-11 px-5 text-[14px]",
        xl: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10 p-0",
        iconSm: "h-8 w-8 p-0",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  href?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, href, leftIcon, rightIcon, children, disabled, ...props },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, block }), className);
  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  );

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
});

export { buttonVariants };
