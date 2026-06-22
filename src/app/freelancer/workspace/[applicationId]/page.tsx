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

export default async function FreelancerWorkspacePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== Role.FREELANCER) {
    redirect("/login");
  }

  const { applicationId } = await params;

  // Fetch the application to check freelancer permissions
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      freelancer: true,
    },
  });

  if (!application) {
    notFound();
  }

  // Security Check: Does the freelancer own the application?
  if (application.freelancer.userId !== session.user.id) {
    redirect("/freelancer/dashboard");
  }

  // Security Check: Is the freelancer actually HIRED?
  if (application.status !== "HIRED") {
    redirect("/freelancer/dashboard");
  }

  const projectId = application.projectId;

  // Fetch the project workspace data
  const project = await db.project.findUnique({
    where: { id: projectId },
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
      // Fetch all hired freelancers for this project
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
  });

  if (!project) {
    notFound();
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
  };

  // Auto-cleanup: delete messages older than 7 days for this project
  const messageCutoff = new Date();
  messageCutoff.setDate(messageCutoff.getDate() - 7);

  // Trigger cleanup asynchronously without awaiting, so it does not block the page render
  db.message.deleteMany({
    where: {
      projectId,
      createdAt: { lt: messageCutoff },
    },
  }).catch((err) => console.error("Stale messages cleanup error:", err));

  // Filter out any stale messages from the already-fetched data
  const freshMessages = project.messages.filter(
    (m) => new Date(m.createdAt) >= messageCutoff
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
          Freelancer Portal
        </span>
        <h1 className="text-3xl font-black text-[#002d59] tracking-tight mt-0.5">
          Project Workspace
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Coordinate deliverables, exchange messages, and log task milestones.
        </p>
      </div>

      <WorkspaceView
        role="FREELANCER"
        currentUserId={session.user.id}
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
    </div>
  );
}
