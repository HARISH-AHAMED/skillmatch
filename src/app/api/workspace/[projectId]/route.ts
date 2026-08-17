import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireProjectParty, visibleChannelsFor } from "@/lib/authz";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    // Project membership. Same guarantee as before, via the shared guard.
    const access = await requireProjectParty(projectId);
    if (!access.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, role } = access.data;

    /**
     * SEC-011 — this query previously had no channel filter, so every private
     * DM and every freelancers-only message on the project was returned to
     * whoever called it, including the company. collaborationActions enforces
     * channel access carefully on write; this read path discarded it.
     *
     * The predicate is shared with the server-rendered workspace page (WS-002),
     * which had the same leak via a different path, so the two cannot drift.
     */
    const channelFilter = visibleChannelsFor(role, userId);

    // Retention cutoff for the message window (see WS-008 for the deletion job).
    const messageCutoff = new Date();
    messageCutoff.setDate(messageCutoff.getDate() - 7);

    // Fetch messages, files, updates, and tasks concurrently in parallel
    const [messages, sharedFiles, projectUpdates, tasks] = await Promise.all([
      db.message.findMany({
        where: {
          projectId,
          createdAt: { gte: messageCutoff },
          ...channelFilter,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      db.sharedFile.findMany({
        // SharedFile carries the same `channel` column as Message and leaked
        // identically — same bug class as SEC-011, so the same predicate.
        where: { projectId, ...channelFilter },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { uploadedAt: "desc" },
      }),
      db.projectUpdate.findMany({
        where: { projectId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.task.findMany({
        where: { projectId },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    return NextResponse.json({
      messages,
      files: sharedFiles,
      updates: projectUpdates,
      tasks,
    });
  } catch (error) {
    console.error("Failed to sync workspace data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
