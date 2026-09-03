"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bell,
  CalendarClock,
  CheckCheck,
  CircleDollarSign,
  MessageSquare,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { getNotificationRedirectUrl, markAllAsRead, markAsRead } from "@/actions/notificationActions";
import { useChrome } from "./chrome";
import { cn, relativeTime } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";

const KIND_ICON = {
  application: UserPlus,
  money: CircleDollarSign,
  message: MessageSquare,
  team: Users,
  meeting: CalendarClock,
  certificate: Award,
  system: Settings,
};

const KIND_TONE: Record<AppNotification["kind"], string> = {
  application: "bg-[var(--color-info-bg)] text-[var(--color-info-fg)]",
  money: "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]",
  message: "bg-[var(--color-accent-lavender)] text-[var(--color-accent-violet-fg)]",
  team: "bg-[var(--color-accent-blush)] text-[var(--color-accent-pink-fg)]",
  meeting: "bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)]",
  certificate: "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]",
  system: "bg-[var(--color-neutral-bg)] text-[var(--color-neutral-fg)]",
};

export function NotificationCenter({ inverse }: { inverse?: boolean }) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /*
   * On a narrow screen the panel spans the viewport instead of hanging off the
   * bell.
   *
   * It was anchored with `right-0`, which aligns it to the *button*, not to the
   * screen — and the button is not the last thing in the header, the avatar is.
   * At 375px that put the panel's right edge 61px in from the viewport and its
   * left edge 23px off the screen, so it was clipped on one side and visibly
   * off-centre on the other.
   *
   * The vertical anchor stays where it is: the two headers this mounts in are
   * different heights, and `top-[calc(100%+8px)]` already tracks whichever one
   * it lands in. Only the horizontal axis needs to escape the button, which it
   * cannot do while absolutely positioned inside it — hence the measured
   * switch to fixed, taken once on open.
   */
  const [sheetTop, setSheetTop] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const place = () => {
      /*
       * The negation of Tailwind's `sm` breakpoint, not `max-width: 639px`.
       *
       * A viewport can sit on a fractional width — device emulation and
       * browser zoom both produce them — and at 639.x neither `max-width:
       * 639px` nor `min-width: 640px` matches. Written as `max-width` this
       * left a one-pixel band where the sheet had been dismissed and the
       * anchored panel had not yet taken over, which is the same off-screen
       * panel in miniature. Asking the same question the CSS asks closes it.
       */
      if (window.matchMedia("(min-width: 640px)").matches) return setSheetTop(null);
      const rect = buttonRef.current?.getBoundingClientRect();
      setSheetTop(rect ? Math.round(rect.bottom + 8) : null);
    };

    place();
    // Both headers are sticky, so the button does not move on scroll; only a
    // resize or a rotation can change where the sheet belongs.
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  const router = useRouter();
  const { notifications: items } = useChrome();
  const [, startTransition] = useTransition();

  const unread = items.filter((n) => !n.read && !readIds.includes(n.id)).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!session) return null;

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` — ${unread} unread` : ""}`}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
          inverse
            ? "text-white/80 hover:bg-white/10 hover:text-white"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]",
        )}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand)] px-1 text-[10px] font-bold text-white ring-2 ring-[var(--color-surface)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{
              zIndex: 100,
              ...(sheetTop !== null
                ? { position: "fixed" as const, top: sheetTop, left: 12, right: 12, width: "auto" }
                : {}),
            }}
            className="absolute right-0 top-[calc(100%+8px)] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3">
              <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                Notifications
              </p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setReadIds(items.map((i) => i.id));
                    startTransition(() => void markAllAsRead());
                  }}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--color-link)] hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[min(420px,60svh)] overflow-y-auto overscroll-contain">
              {items.length === 0 && (
                <p className="px-4 py-10 text-center text-[13px] text-[var(--color-text-muted)]">
                  Nothing yet. Activity on your projects will show up here.
                </p>
              )}
              {items.slice(0, 12).map((n) => {
                const Icon = KIND_ICON[n.kind];
                const isRead = n.read || readIds.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setReadIds((p) => [...p, n.id]);
                      setOpen(false);
                      startTransition(async () => {
                        void markAsRead(n.id);
                        // Resolved per click rather than for the whole feed:
                        // the action does a session check and a lookup, and
                        // fanning it out over every notification exhausted the
                        // connection pool on each page load.
                        const href = await getNotificationRedirectUrl(n.id);
                        if (href) router.push(href);
                      });
                    }}
                    className={cn(
                      "flex w-full gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[var(--color-hover)]",
                      !isRead && "bg-[var(--color-brand-softer)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        KIND_TONE[n.kind],
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-semibold leading-[1.4] text-[var(--color-text-primary)]">
                          {n.title}
                        </span>
                        {!isRead && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-[var(--color-text-secondary)]">
                        {n.message}
                      </span>
                      <span className="mt-1 block text-[11.5px] text-[var(--color-text-muted)]">
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
