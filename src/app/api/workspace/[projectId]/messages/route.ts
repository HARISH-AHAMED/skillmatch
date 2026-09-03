import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireProjectParty, visibleChannelsFor } from "@/lib/authz";
import { MESSAGE_TTL_DAYS } from "@/lib/constants";

/* ============================================================================
   CHAT TRANSPORT

   The chat used to keep itself current by calling router.refresh() on a timer,
   which re-runs the whole workspace server tree — payment items, the ledger,
   work logs, tasks, meetings, completion readiness — every tick, just to find
   out whether anyone had said anything. That is why it felt slow, and why the
   interval had to be set at ten seconds to stay affordable.

   This route returns messages and nothing else, so the poll can run often
   enough to feel live. It is deliberately a *replace* rather than an
   append-since-cursor: edits, deletions and read receipts all change a message
   without changing its createdAt, so a cursor keyed on send time would never
   pick them up. Returning the recent window uniformly carries all four.
   ========================================================================= */

/** Upper bound on one response. Older messages are already outside the TTL. */
const MAX_MESSAGES = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const access = await requireProjectParty(projectId);
    if (!access.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, role } = access.data;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MESSAGE_TTL_DAYS);

    const rows = await db.message.findMany({
      where: {
        projectId,
        createdAt: { gte: cutoff },
        // SEC-011 — the same predicate the page and the workspace API use, so a
        // faster transport cannot become a wider one.
        ...visibleChannelsFor(role, userId),
      },
      select: {
        id: true,
        projectId: true,
        senderId: true,
        content: true,
        channel: true,
        seen: true,
        createdAt: true,
        deletedAt: true,
        editedAt: true,
        sender: { select: { id: true, name: true, image: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_MESSAGES,
    });

    const messages = rows.reverse().map((m) => ({
      id: m.id,
      projectId: m.projectId,
      senderId: m.senderId,
      senderName: m.sender.name ?? "Member",
      senderAvatar: m.sender.image ?? "",
      senderRole: m.sender.role,
      // A deleted message carries no text to leak: the content was cleared at
      // deletion, and the thread renders a tombstone from this flag.
      content: m.deletedAt ? "" : m.content,
      channel: m.channel,
      seen: m.seen,
      createdAt: m.createdAt.toISOString(),
      deletedAt: m.deletedAt?.toISOString() ?? null,
      editedAt: m.editedAt?.toISOString() ?? null,
    }));

    return NextResponse.json(
      { messages },
      // Always fresh: a cached chat poll is not a chat poll.
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to load messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Mark the other party's messages in one channel as read.
 *
 * A POST rather than a side effect of the GET: the poll runs every few seconds
 * and must stay a pure read, or every open tab would be writing continuously.
 * This fires only when the reader actually has something unread in view.
 *
 * Deliberately not a server action — those call revalidatePath, which would
 * drag the whole workspace tree back through a render for a boolean.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const access = await requireProjectParty(projectId);
    if (!access.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, role } = access.data;

    const body = await request.json().catch(() => ({}));
    const channel = typeof body?.channel === "string" ? body.channel : null;
    if (!channel) {
      return NextResponse.json({ error: "A channel is required." }, { status: 400 });
    }

    // A reader can only clear a channel they are entitled to read.
    const readable = await db.message.findFirst({
      where: { projectId, channel, ...visibleChannelsFor(role, userId) },
      select: { id: true },
    });
    if (!readable) {
      return NextResponse.json({ updated: 0 });
    }

    const result = await db.message.updateMany({
      where: { projectId, channel, senderId: { not: userId }, seen: false },
      data: { seen: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Failed to mark messages as read:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
