import React from "react";
import { getProjectTeam } from "@/actions/roleActions";
import { notFound, redirect, forbidden } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { WorkspaceView } from "@/components/WorkspaceView";
import { visibleChannelsFor } from "@/lib/authz";
import { getProjectFinancialSummary } from "@/lib/compensation";

interface PageProps {
  params: Promise<{
    applicationId: string;
  }>;
}

export default async function StandaloneWorkspacePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { applicationId } = await params;

  // Fetch application to get the project and security details
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      project: {
        include: {
          company: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                },
              },
            },
          },
          applications: {
            where: { status: "HIRED" },
            include: {
              freelancer: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
          messages: {
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
          },
          sharedFiles: {
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
          },
          projectUpdates: {
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
          },
          tasks: {
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
          },
        },
      },
    },
  });

  if (!application || !application.project) {
    notFound();
  }

  const project = application.project;
  const currentUserId = session.user.id;

  // Determine User Role inside Workspace
  let userWorkspaceRole: "COMPANY" | "FREELANCER" | null = null;

  if (project.company.userId === currentUserId) {
    userWorkspaceRole = "COMPANY";
  } else {
    // Check if current user is one of the hired freelancers
    const isHiredFreelancer = project.applications.some(
      (app) => app.freelancer.userId === currentUserId
    );
    if (isHiredFreelancer) {
      userWorkspaceRole = "FREELANCER";
    }
  }

  /**
   * SEC-009 — a non-member was bounced to /login, which is misleading for an
   * already-authenticated user and masks a genuine permission error as a
   * session problem. forbidden() states what actually happened.
   */
  if (!userWorkspaceRole) {
    forbidden();
  }

  // Map hired freelancers for components
  const hiredFreelancers = project.applications.map((app) => ({
    id: app.freelancer.user.id,
    applicationId: app.id,
    name: app.freelancer.user.name,
    image: app.freelancer.user.image,
    role: app.freelancer.user.role,
    freelancerId: app.freelancer.id,
  }));

  const companyUser = {
    id: project.company.user.id,
    name: project.company.companyName,
    image: project.company.user.image,
    role: project.company.user.role,
    companyId: project.company.id,
  };

  /**
   * WS-008 — a destructive `deleteMany` used to run here, un-awaited, as a side
   * effect of rendering the page. Retention is unchanged at 7 days but now runs
   * solely through /api/cron/cleanup-messages; rendering only filters the view.
   */
  const messageCutoff = new Date();
  messageCutoff.setDate(messageCutoff.getDate() - 7);

  /**
   * WS-002 — every DM and every freelancers-only message on the project was
   * embedded in the RSC payload sent to whoever opened the workspace,
   * including the company. Any client-side tab filtering was cosmetic: the
   * content was already on the wire.
   *
   * Filtered here with the same predicate the polling API uses (SEC-011), so
   * the two paths cannot drift apart.
   */
  const visible = visibleChannelsFor(userWorkspaceRole, currentUserId);
  const canSeeChannel = (channel: string) =>
    visible.OR.some((clause) => {
      const c = clause.channel;
      if (typeof c === "string") return channel === c;
      if ("startsWith" in c) return channel.startsWith(c.startsWith);
      return channel.endsWith(c.endsWith);
    });

  const freshMessages = project.messages.filter(
    (m) => new Date(m.createdAt) >= messageCutoff && canSeeChannel(m.channel)
  );
  const visibleFiles = project.sharedFiles.filter((f) => canSeeChannel(f.channel));

  // Shared roster (null for zero-role projects, panel then not rendered).
  const teamRoster = await getProjectTeam(project.id);

  /**
   * WS-003 / DATA-008 / DATA-009 — the authoritative financial figures and
   * compensation type, read from the payment tables rather than derived from
   * ProjectUpdate title prose on the client.
   */
  const financials = await getProjectFinancialSummary(project.id);

  return (
    <WorkspaceView
      teamRoster={teamRoster}
      role={userWorkspaceRole}
      currentUserId={currentUserId}
      projectId={project.id}
      projectTitle={project.title}
      projectDescription={project.description}
      applicationId={applicationId}
      projectBudget={project.budget}
      projectStatus={project.status}
      projectDueDate={project.dueDate}
      companyName={project.company.companyName}
      hiredFreelancers={hiredFreelancers}
      companyUser={companyUser}
      initialMessages={freshMessages as any}
      initialFiles={visibleFiles as any}
      initialUpdates={project.projectUpdates as any}
      initialTasks={project.tasks as any}
      financials={financials}
    />
  );
}
