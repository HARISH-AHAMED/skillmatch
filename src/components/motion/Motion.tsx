"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ----------------------------------------------------------------- Reveal -- */

export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  once = true,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: "-60px" });
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/* ---------------------------------------------------------------- Stagger -- */

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: EASE } },
};

export function Stagger({
  children,
  className,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={childVariants} className={className}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------ TextReveal -- */

/** Word-by-word entrance for headline copy. */
export function TextReveal({
  text,
  className,
  delay = 0,
  highlight = [],
}: {
  text: string;
  className?: string;
  delay?: number;
  /** Words rendered in the brand colour. */
  highlight?: string[];
}) {
  const words = text.split(" ");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <span ref={ref} className={cn("inline-block", className)}>
      {words.map((word, i) => {
        const clean = word.replace(/[^\w]/g, "").toLowerCase();
        const isHighlight = highlight.some((h) => h.toLowerCase() === clean);
        return (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
            <motion.span
              initial={{ y: "108%", opacity: 0 }}
              animate={inView ? { y: 0, opacity: 1 } : { y: "108%", opacity: 0 }}
              transition={{ duration: 0.55, delay: delay + i * 0.045, ease: EASE }}
              className={cn(
                "inline-block",
                isHighlight && "text-[var(--color-brand)]",
              )}
            >
              {word}
              {i < words.length - 1 && " "}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------- CountUp ----- */

/**
 * Counts up to `to` once the element scrolls into view. The animation runs in
 * an effect (never during render) so it is safe under StrictMode's double
 * invocation, and it always settles on the exact target value.
 */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  duration = 1.4,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (typeof window === "undefined" || !window.requestAnimationFrame) return;

    let frame = 0;

    // Jump straight to the target when motion is unwelcome, but still off the
    // synchronous path so it never cascades a render.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || duration <= 0) {
      frame = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(frame);
    }

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {value.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/* ----------------------------------------------------------- PageWrapper --- */

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Subtle hover lift for interactive cards. */
export function HoverLift({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
