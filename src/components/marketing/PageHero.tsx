"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TextReveal } from "@/components/motion/Motion";

/**
 * Shared hero for the secondary marketing pages. Keeps the vertical rhythm and
 * type scale identical across every top-level page.
 */
export function PageHero({
  eyebrow,
  title,
  highlight = [],
  description,
  image,
  actions,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  highlight?: string[];
  description?: string;
  image?: string;
  actions?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b",
        dark
          ? "border-white/10 bg-[var(--color-brand-ink)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]",
      )}
    >
      {image && (
        <>
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className={cn("object-cover", dark ? "opacity-25" : "opacity-[0.12]")}
          />
          <div
            className="absolute inset-0"
            style={{
              background: dark
                ? "linear-gradient(120deg, rgba(16,20,19,0.92) 0%, rgba(16,20,19,0.78) 55%, rgba(4,151,64,0.35) 100%)"
                : "linear-gradient(120deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 60%, rgba(230,248,238,0.75) 100%)",
            }}
          />
        </>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "rgba(6,199,85,0.16)" }}
      />

      <div className="container-wide relative py-16 md:py-20 lg:py-24">
        <div className="max-w-3xl">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "mb-4 inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em]",
                dark
                  ? "border-white/20 bg-white/[0.08] text-[var(--color-brand-bright)]"
                  : "border-[var(--color-brand-border)] bg-[var(--color-brand-softer)] text-[var(--color-brand-active)]",
              )}
            >
              {eyebrow}
            </motion.p>
          )}

          <h1
            className={cn(
              "text-[30px] font-semibold leading-[1.12] tracking-[-0.026em] sm:text-[40px] lg:text-[46px]",
              dark ? "text-white" : "text-[var(--color-text-primary)]",
            )}
          >
            <TextReveal text={title} highlight={highlight} />
          </h1>

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className={cn(
                "mt-5 max-w-2xl text-[16px] leading-[1.7] text-pretty",
                dark ? "text-white/70" : "text-[var(--color-text-secondary)]",
              )}
            >
              {description}
            </motion.p>
          )}

          {actions && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              {actions}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
