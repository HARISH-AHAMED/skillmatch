import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;

  try {
    if (role === Role.FREELANCER) {
      const activeApps = await db.application.findMany({
        where: {
          freelancer: { userId },
          status: "HIRED",
          project: {
            status: "IN_PROGRESS",
          },
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      const workspaces = activeApps.map((app) => ({
        id: app.id,
        label: app.project.title,
        href: `/freelancer/workspace/${app.id}`,
        applicationIds: [app.id],
      }));

      return NextResponse.json(workspaces);
    } else if (role === Role.COMPANY) {
      const activeApps = await db.application.findMany({
        where: {
          project: {
            company: { userId },
            status: "IN_PROGRESS",
          },
          status: "HIRED",
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          freelancer: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Group active hired workspaces by Project ID so companies only see one link per project
      const workspacesMap = new Map<string, { id: string; label: string; href: string; applicationIds: string[] }>();

      for (const app of activeApps) {
        const projectId = app.project.id;
        const existing = workspacesMap.get(projectId);
        if (existing) {
          existing.applicationIds.push(app.id);
        } else {
          workspacesMap.set(projectId, {
            id: app.id,
            label: app.project.title,
            href: `/company/workspace/${app.id}`,
            applicationIds: [app.id],
          });
        }
      }

      const workspaces = Array.from(workspacesMap.values());

      return NextResponse.json(workspaces);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("Failed to fetch active workspaces for navlink:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
