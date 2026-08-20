"use client";

import { createContext, useContext } from "react";
import type { AppNotification, WorkspaceSummary } from "@/lib/types";

/* ============================================================================
   DASHBOARD CHROME

   The sidebar and the notification bell need data that has nothing to do with
   the page being viewed. It is fetched once per request in the role layout and
   handed down here, rather than each piece of chrome querying for itself.
   ========================================================================= */

export interface DashboardChrome {
  workspaces: WorkspaceSummary[];
  badges: { applicants: number; applications: number };
  notifications: AppNotification[];
}

export const EMPTY_CHROME: DashboardChrome = {
  workspaces: [],
  badges: { applicants: 0, applications: 0 },
  notifications: [],
};

const ChromeContext = createContext<DashboardChrome>(EMPTY_CHROME);

export function ChromeProvider({
  value,
  children,
}: {
  value: DashboardChrome;
  children: React.ReactNode;
}) {
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useChrome() {
  return useContext(ChromeContext);
}
