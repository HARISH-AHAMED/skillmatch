import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MESSAGE_TTL_DAYS = 7;

/**
 * Message retention job.
 *
 * This handler permanently deletes every message older than the TTL, across
 * every project on the platform. It previously ran on an unauthenticated GET
 * as well as an unauthenticated DELETE, so a single anonymous request wiped the
 * platform's message history — and the proxy could not help, because its
 * matcher excludes /api.
 *
 * A shared secret is now required. It is compared in constant time, and a
 * missing CRON_SECRET fails closed rather than disabling the check.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (presented.length === 0) return false;

  // Length-safe comparison, so the check does not leak the secret's length.
  const len = Math.max(presented.length, secret.length);
  let diff = presented.length ^ secret.length;
  for (let i = 0; i < len; i++) {
    diff |= (presented.charCodeAt(i) || 0) ^ (secret.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function DELETE(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MESSAGE_TTL_DAYS);

    const result = await db.message.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error: any) {
    console.error("Message cleanup failed:", error);
    return NextResponse.json(
      { error: error.message || "Cleanup failed" },
      { status: 500 }
    );
  }
}

/**
 * Scheduled runners (Vercel Cron among them) issue a GET, so the verb is kept —
 * but it carries the same authorization requirement as DELETE. It is not an
 * unauthenticated alias for a destructive operation.
 */
export async function GET(req: NextRequest) {
  return DELETE(req);
}
