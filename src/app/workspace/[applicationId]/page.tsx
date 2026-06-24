import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { WorkspaceView } from "@/components/WorkspaceView";

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

  // Security Check: is this user part of the project workspace?
  if (!userWorkspaceRole) {
    redirect("/login");
  }

  // Map hired freelancers for components
  const hiredFreelancers = project.applications.map((app) => ({
    id: app.freelancer.user.id,
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

  // Auto-cleanup: delete messages older than 7 days for this project
  const messageCutoff = new Date();
  messageCutoff.setDate(messageCutoff.getDate() - 7);

  db.message.deleteMany({
    where: {
      projectId: project.id,
      createdAt: { lt: messageCutoff },
    },
  }).catch((err) => console.error("Stale messages cleanup error:", err));

  // Filter out any stale messages from the already-fetched data
  const freshMessages = project.messages.filter(
    (m) => new Date(m.createdAt) >= messageCutoff
  );

  return (
    <WorkspaceView
      role={userWorkspaceRole}
      currentUserId={currentUserId}
      projectId={project.id}
      projectTitle={project.title}
      projectBudget={project.budget}
      companyName={project.company.companyName}
      hiredFreelancers={hiredFreelancers}
      companyUser={companyUser}
      initialMessages={freshMessages as any}
      initialFiles={project.sharedFiles as any}
      initialUpdates={project.projectUpdates as any}
      initialTasks={project.tasks as any}
    />
  );
}
