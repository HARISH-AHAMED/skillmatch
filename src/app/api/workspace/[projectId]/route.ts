import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const userId = session.user.id;

  try {
    // Security check: Check if user is either the company owner of the project, or a hired freelancer
    const projectAccess = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { company: { userId } },
          {
            applications: {
              some: {
                freelancer: { userId },
                status: "HIRED",
              },
            },
          },
        ],
      },
    });

    if (!projectAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cleanup: delete messages older than 7 days
    const messageCutoff = new Date();
    messageCutoff.setDate(messageCutoff.getDate() - 7);

    // Fetch messages, files, updates, and tasks concurrently in parallel
    const [messages, sharedFiles, projectUpdates, tasks] = await Promise.all([
      db.message.findMany({
        where: {
          projectId,
          createdAt: { gte: messageCutoff },
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
        where: { projectId },
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
