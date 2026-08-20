"use client";

import { useSyncExternalStore } from "react";

/**
 * The current wall-clock time, as an external store.
 *
 * "Is this meeting in the past?" depends on the clock, which is genuinely
 * outside React. Reading `Date.now()` during render is impure and makes the
 * component non-deterministic, so it is subscribed to here instead — one
 * place, one ticker, and every consumer re-renders together.
 *
 * @param intervalMs how often to re-read the clock. The default of one minute
 *   is enough for deadlines and upcoming/past splits without causing churn.
 */
export function useNow(intervalMs = 60_000): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      const id = setInterval(onStoreChange, intervalMs);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    // Server snapshot: bucketed the same way so hydration matches.
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
  );
}
