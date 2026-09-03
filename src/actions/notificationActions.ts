"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function markAsRead(notificationId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const notification = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function markAllAsRead() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await db.notification.updateMany({
    where: {
      userId: session.user.id,
      read: false,
    },
    data: { read: true },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getNotificationRedirectUrl(notificationId: string) {
  const session = await auth();
  if (!session?.user) return "/login";

  const notif = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notif) return "/";

  const userId = session.user.id;
  const userRole = session.user.role;

  const title = notif.title;
  const message = notif.message;

  // 1. Workspace / Message / Milestones / Files notifications
  if (
    title.includes("Workspace") ||
    title.includes("Message") ||
    title.includes("Milestone") ||
    title.includes("File Shared") ||
    title.includes("Hired") ||
    title.includes("Task")
  ) {
    // Extract all quoted substrings
    const allQuotes = [...message.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
    if (allQuotes.length > 0) {
      /**
       * Project titles are not unique, and this matched them across the whole
       * platform — so a company clicking a notification about "Website
       * Redesign" could be routed at another company's project, and then at an
       * arbitrary hired application on it. The destination re-authorizes, so
       * the outcome was a 404 rather than a leak, but the link was wrong.
       *
       * Resolution is scoped to projects the reader actually belongs to.
       * (A title is still a poor key; the durable fix is to store the target
       * id on the notification row, which is a schema change.)
       */
      const project = await db.project.findFirst({
        where: {
          title: { in: allQuotes },
          ...(userRole === "COMPANY"
            ? { company: { userId } }
            : { applications: { some: { freelancer: { userId } } } }),
        },
        orderBy: { updatedAt: "desc" },
      });
      if (project) {
        if (userRole === "COMPANY") {
          const app = await db.application.findFirst({
            where: { projectId: project.id, status: "HIRED" },
          });
          if (app) return `/company/workspace/${app.id}`;
          return `/company/projects`;
        } else {
          const freelancer = await db.freelancer.findUnique({
            where: { userId },
          });
          if (freelancer) {
            const app = await db.application.findFirst({
              where: { projectId: project.id, freelancerId: freelancer.id, status: "HIRED" },
            });
            if (app) return `/freelancer/workspace/${app.id}`;
          }
          return `/freelancer/applications`;
        }
      }
    }
  }

  // 2. Application status / Shortlisted / Rejected
  if (title.includes("Shortlisted") || title.includes("Application") || title.includes("Project Filled")) {
    if (userRole === "COMPANY") {
      return `/company/applicants`;
    } else {
      return `/freelancer/applications`;
    }
  }

  // 3. New matching project
  if (title.includes("Project") || title.includes("Matching")) {
    if (userRole === "FREELANCER") {
      return `/freelancer/projects`;
    }
  }

  // Fallbacks
  if (userRole === "COMPANY") return "/company/dashboard";
  if (userRole === "FREELANCER") return "/freelancer/dashboard";
  if (userRole === "ADMIN") return "/admin/dashboard";

  return "/";
}
