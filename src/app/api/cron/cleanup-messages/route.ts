import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const MESSAGE_TTL_DAYS = 7;

export async function DELETE() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MESSAGE_TTL_DAYS);

    // Delete messages older than 7 days
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

// Also support GET for simple cron triggers (e.g. Vercel Cron)
export async function GET() {
  return DELETE();
}
