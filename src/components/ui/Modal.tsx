"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
  hideClose?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 400 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(12,24,18,0.42)] backdrop-blur-[2px]"
          />
          <div className="absolute inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-lg)]",
                "rounded-t-[18px] sm:rounded-[var(--radius-lg)]",
                SIZES[size],
              )}
            >
              {(title || !hideClose) && (
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border-subtle)] px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    {title && (
                      <h2 className="text-[17px] font-semibold leading-[1.35] tracking-[-0.008em] text-[var(--color-text-primary)]">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="mt-1 text-[13px] leading-[1.5] text-[var(--color-text-secondary)]">
                        {description}
                      </p>
                    )}
                  </div>
                  {!hideClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
              {footer && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-alt)] px-5 py-3.5 sm:px-6">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "right" | "left";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 300 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(12,24,18,0.36)]"
          />
          <motion.aside
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "right" ? "100%" : "-100%" }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute top-0 flex h-full w-full flex-col bg-[var(--color-surface)] shadow-[var(--shadow-lg)] sm:w-[var(--spacing-drawer)]",
              side === "right" ? "right-0" : "left-0",
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border-subtle)] px-5 py-4">
              <div className="min-w-0">
                {title && (
                  <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-alt)] px-5 py-3.5">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[14px] font-medium hover:bg-[var(--color-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium text-white",
              destructive
                ? "bg-[var(--color-error-fg)] hover:brightness-110"
                : "bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)]",
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">{message}</p>
    </Modal>
  );
}
