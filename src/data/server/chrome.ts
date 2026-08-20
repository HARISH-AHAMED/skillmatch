import "server-only";
import { db } from "@/lib/db";
import type { DashboardChrome } from "@/components/layout/chrome";
import { allNotificationsFor } from "./records";
import { workspacesForUser } from "./workspace";
import type { Viewer } from "./context";

/* ============================================================================
   DASHBOARD CHROME DATA

   The sidebar's workspace list and pipeline badges, plus the notification
   feed. Fetched once per request in each role layout.
   ========================================================================= */

export async function getDashboardChrome(viewer: Viewer): Promise<DashboardChrome> {
  const [workspaces, notifications, applicants, applications] = await Promise.all([
    workspacesForUser(viewer.userId, viewer.role),
    allNotificationsFor(viewer.userId),
    viewer.company
      ? db.application.count({
          where: { project: { companyId: viewer.company.id }, status: "PENDING" },
        })
      : Promise.resolve(0),
    viewer.freelancer
      ? db.application.count({
          where: {
            freelancerId: viewer.freelancer.id,
            status: { in: ["PENDING", "SHORTLISTED"] },
          },
        })
      : Promise.resolve(0),
  ]);

  return {
    workspaces,
    badges: { applicants, applications },
    notifications,
  };
}
