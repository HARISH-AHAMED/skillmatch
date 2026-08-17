"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { DELIVERABLE_REVISION_CAP } from "@/lib/workflowHelpers";
import { isTaskStatus } from "@/lib/lifecycle";
import {
  scopedTask,
  scopedSharedFile,
  scopedMessage,
  scopedProjectUpdate,
} from "@/lib/authz";

// Helper to verify if the user belongs to the project workspace
async function verifyProjectWorkspaceAccess(projectId: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      company: true,
      applications: {
        where: { status: "HIRED" },
        include: {
          freelancer: true,
        },
      },
    },
  });

  if (!project) {
    return { error: "Project not found", project: null, role: null };
  }

  const isCompanyUser = project.company.userId === userId;
  const hiredFreelancerApp = project.applications.find(
    (app) => app.freelancer.userId === userId
  );

  const isFreelancerUser = !!hiredFreelancerApp;

  if (!isCompanyUser && !isFreelancerUser) {
    return { error: "Access denied", project: null, role: null };
  }

  return {
    error: null,
    project,
    role: isCompanyUser ? ("COMPANY" as const) : ("FREELANCER" as const),
  };
}

export async function sendMessage(projectId: string, content: string, channel: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  const { role, project } = access;

  // Security check: only freelancers can access the "freelancers" group
  if (channel === "freelancers" && role === "COMPANY") {
    return { error: "Access denied to Freelancers-only channel" };
  }

  // Security check for DMs: only the participants can access
  if (channel.startsWith("dm:")) {
    const parts = channel.split(":");
    if (parts.length !== 3 || !parts.includes(userId)) {
      return { error: "Access denied to private direct message channel" };
    }
  }

  try {
    const message = await db.message.create({
      data: {
        projectId,
        senderId: userId,
        content,
        channel,
      },
    });

    const senderName = session.user.name || (role === "COMPANY" ? "Company" : "Freelancer");

    // Create notifications for other members in the channel
    if (channel.startsWith("dm:")) {
      const parts = channel.split(":");
      const otherUserId = parts[1] === userId ? parts[2] : parts[1];
      
      await db.notification.create({
        data: {
          userId: otherUserId,
          title: "New Direct Message",
          message: `${senderName} sent you a direct message in "${project.title}": "${content.length > 50 ? content.slice(0, 50) + "…" : content}"`,
        },
      });
    } else if (channel === "freelancers") {
      const otherFreelancers = project.applications
        .filter((app) => app.freelancer.userId !== userId)
        .map((app) => app.freelancer.userId);

      for (const fUserId of otherFreelancers) {
        await db.notification.create({
          data: {
            userId: fUserId,
            title: "Freelancers Chat Update",
            message: `${senderName} posted in the freelancers-only channel of "${project.title}".`,
          },
        });
      }
    } else {
      // Group channel: notify all other project members
      const otherMembers = [
        project.company.userId,
        ...project.applications.map((app) => app.freelancer.userId),
      ].filter((id) => id !== userId);

      for (const mUserId of otherMembers) {
        await db.notification.create({
          data: {
            userId: mUserId,
            title: "Group Chat Update",
            message: `${senderName} posted in the "${project.title}" workspace: "${content.length > 50 ? content.slice(0, 50) + "…" : content}"`,
          },
        });
      }
    }

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");
    revalidatePath("/company/dashboard");
    revalidatePath("/freelancer/dashboard");

    return { success: true, message };
  } catch (error: any) {
    console.error("Error sending message:", error);
    return { error: error.message || "Failed to send message" };
  }
}

export async function shareFile(
  projectId: string,
  fileName: string,
  fileUrl: string,
  fileSize?: string,
  channel: string = "group"
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  const { role, project } = access;

  // Security check: only freelancers can access the "freelancers" group
  if (channel === "freelancers" && role === "COMPANY") {
    return { error: "Access denied to Freelancers-only channel" };
  }

  // Security check for DMs: only the participants can access
  if (channel.startsWith("dm:")) {
    const parts = channel.split(":");
    if (parts.length !== 3 || !parts.includes(userId)) {
      return { error: "Access denied to private direct message channel" };
    }
  }

  try {
    const file = await db.sharedFile.create({
      data: {
        projectId,
        uploadedById: userId,
        fileName,
        fileUrl,
        fileSize: fileSize || null,
        channel,
      },
    });

    const senderName = session.user.name || (role === "COMPANY" ? "Company" : "Freelancer");

    // Notify other members
    const otherMembers = [
      project.company.userId,
      ...project.applications.map((app) => app.freelancer.userId),
    ].filter((id) => id !== userId);

    for (const mUserId of otherMembers) {
      await db.notification.create({
        data: {
          userId: mUserId,
          title: "File Shared",
          message: `${senderName} shared a file "${fileName}" in the "${project.title}" workspace.`,
        },
      });
    }

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true, file };
  } catch (error: any) {
    console.error("Error sharing file:", error);
    return { error: error.message || "Failed to share file" };
  }
}

export async function createProjectUpdate(
  projectId: string,
  title: string,
  description: string,
  status: string
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  const { role, project } = access;

  try {
    const update = await db.projectUpdate.create({
      data: {
        projectId,
        createdById: userId,
        title,
        description,
        status,
      },
    });

    const senderName = session.user.name || (role === "COMPANY" ? "Company" : "Freelancer");

    // Notify other members
    const otherMembers = [
      project.company.userId,
      ...project.applications.map((app) => app.freelancer.userId),
    ].filter((id) => id !== userId);

    const statusLabel =
      status === "COMPLETED"
        ? "Completed"
        : status === "IN_PROGRESS"
        ? "In Progress"
        : "Pending";

    for (const mUserId of otherMembers) {
      await db.notification.create({
        data: {
          userId: mUserId,
          title: "New Milestone",
          message: `${senderName} created milestone "${title}" [${statusLabel}] in "${project.title}".`,
        },
      });
    }

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true, update };
  } catch (error: any) {
    console.error("Error creating project update:", error);
    return { error: error.message || "Failed to create update" };
  }
}

export async function updateProjectUpdateStatus(
  projectId: string,
  updateId: string,
  status: string
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  const { role, project } = access;

  // KANBAN-001 class — surfaced by the Phase 1 sweep, not named in the audit.
  // Same shape: project access is checked, the update id was not scoped to it.
  if (!(await scopedProjectUpdate(updateId, projectId))) {
    return { error: "Update not found" };
  }

  try {
    const update = await db.projectUpdate.update({
      where: { id: updateId },
      data: { status },
    });

    const senderName = session.user.name || (role === "COMPANY" ? "Company" : "Freelancer");
    const statusLabel =
      status === "COMPLETED"
        ? "Completed"
        : status === "IN_PROGRESS"
        ? "In Progress"
        : "Pending";

    // Notify other members
    const otherMembers = [
      project.company.userId,
      ...project.applications.map((app) => app.freelancer.userId),
    ].filter((id) => id !== userId);

    for (const mUserId of otherMembers) {
      await db.notification.create({
        data: {
          userId: mUserId,
          title: "Milestone Updated",
          message: `${senderName} updated milestone "${update.title}" to [${statusLabel}] in "${project.title}".`,
        },
      });
    }

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true, update };
  } catch (error: any) {
    console.error("Error updating update status:", error);
    return { error: error.message || "Failed to update project status" };
  }
}

export async function createTask(
  projectId: string,
  title: string,
  description: string,
  priority: string,
  dueDateString?: string,
  assignedToId?: string | null
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  try {
    const task = await db.task.create({
      data: {
        projectId,
        title,
        description: description || null,
        priority,
        status: "TODO",
        dueDate: dueDateString ? new Date(dueDateString) : null,
        assignedToId: assignedToId || null,
        createdById: userId,
      },
    });

    // Notify assigned user if applicable
    if (assignedToId && assignedToId !== userId) {
      await db.notification.create({
        data: {
          userId: assignedToId,
          title: "New Task Assigned",
          message: `${session.user.name || "Manager"} assigned a task to you: "${title}" in "${access.project.title}".`,
        },
      });
    }

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true, task };
  } catch (error: any) {
    console.error("Error creating task:", error);
    return { error: error.message || "Failed to create task" };
  }
}

export async function updateTaskStatus(projectId: string, taskId: string, status: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  // KANBAN-001: the workspace-access check above validates the *project* the
  // caller claims, not that this task lives in it. Without this, any member of
  // any project could mutate any task on the platform by id.
  if (!(await scopedTask(taskId, projectId))) {
    return { error: "Task not found" };
  }

  // KANBAN-003: Task.status is a bare String column, so an arbitrary value used
  // to persist and strand the task outside every rendered column.
  if (!isTaskStatus(status)) {
    return { error: "Unknown task status." };
  }

  try {
    const task = await db.task.update({
      where: { id: taskId },
      data: { status },
    });

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true, task };
  } catch (error: any) {
    console.error("Error updating task status:", error);
    return { error: error.message || "Failed to update task status" };
  }
}

export async function updateTaskDetails(
  projectId: string,
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    assignedToId?: string | null;
  }
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  // KANBAN-001 — see updateTaskStatus.
  if (!(await scopedTask(taskId, projectId))) {
    return { error: "Task not found" };
  }

  try {
    const task = await db.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
      },
    });

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true, task };
  } catch (error: any) {
    console.error("Error updating task details:", error);
    return { error: error.message || "Failed to update task details" };
  }
}

export async function deleteTask(projectId: string, taskId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  // KANBAN-001 — see updateTaskStatus. Deletion is irreversible, so the
  // unscoped version allowed permanent destruction of another project's plan.
  if (!(await scopedTask(taskId, projectId))) {
    return { error: "Task not found" };
  }

  try {
    await db.task.delete({
      where: { id: taskId },
    });

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting task:", error);
    return { error: error.message || "Failed to delete task" };
  }
}

export async function deleteFile(projectId: string, fileId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  const { role } = access;

  try {
    // WS-001: the company branch below is intentionally permissive ("a company
    // may delete any file in their project"), which without this scope check
    // meant any company could delete any file on the platform — and unlink it
    // from disk. Scoping the lookup to the project restores the intent.
    const file = await scopedSharedFile(fileId, projectId);

    if (!file) {
      return { error: "File not found" };
    }

    // Role-based authorization check:
    // Company can delete any file.
    // Freelancer can only delete files they uploaded themselves.
    if (role === "FREELANCER" && file.uploadedById !== userId) {
      return { error: "Access denied. Freelancers can only delete their own uploaded files." };
    }

    // Delete file from filesystem if it exists under public/uploads
    if (file.fileUrl.startsWith("/uploads/")) {
      const fs = require("fs");
      const path = require("path");
      const filename = file.fileUrl.replace("/uploads/", "");
      const filePath = path.join(process.cwd(), "public", "uploads", filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fsErr) {
          console.error("Failed to delete physical file from disk:", fsErr);
        }
      }
    }

    await db.sharedFile.delete({
      where: { id: fileId },
    });

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return { error: error.message || "Failed to delete file" };
  }
}

export async function updateDeliverableStatus(
  projectId: string,
  fileId: string,
  status: "APPROVED" | "REVISION_REQUESTED",
  feedback: string
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }
  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  try {
    // KANBAN-001 class, surfaced by the Phase 1 sweep: scope the deliverable
    // to the project the caller was granted access to.
    const file = await scopedSharedFile(fileId, projectId);
    if (!file) return { error: "Deliverable not found" };

    let meta = {
      size: "Unknown size",
      status: "PENDING",
      version: 1,
      feedback: "",
      revisionCount: 0,
      revisionCap: DELIVERABLE_REVISION_CAP,
    };
    try {
      meta = { ...meta, ...JSON.parse(file.fileSize || "{}") };
    } catch (e) {}

    // Each revision request consumes one of the agreed rounds. Both sides can then
    // see how many remain, so the cap is never a surprise at the moment it bites.
    const cap = meta.revisionCap ?? DELIVERABLE_REVISION_CAP;
    if (status === "REVISION_REQUESTED") {
      if ((meta.revisionCount ?? 0) >= cap) {
        return {
          error:
            "Revision limit reached (" +
            cap +
            " of " +
            cap +
            " used). Approve the deliverable or agree new terms with the freelancer.",
        };
      }
      meta.revisionCount = (meta.revisionCount ?? 0) + 1;
    }

    meta.status = status;
    meta.feedback = feedback;

    const updated = await db.sharedFile.update({
      where: { id: fileId },
      data: {
        fileSize: JSON.stringify(meta),
      },
    });

    const otherMembers = [
      access.project.company.userId,
      ...access.project.applications.map((app) => app.freelancer.userId),
    ].filter((id) => id !== userId);

    const label = status === "APPROVED" ? "Approved" : "Revision Requested";
    const senderName = session.user.name || "Client";

    for (const mUserId of otherMembers) {
      await db.notification.create({
        data: {
          userId: mUserId,
          title: `Deliverable Update: ${label}`,
          message: `${senderName} updated deliverable "${file.fileName}" status to ${label}.`,
        },
      });
    }

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true, updated };
  } catch (err: any) {
    return { error: err.message || "Failed to update status" };
  }
}

export async function uploadDeliverableVersion(
  projectId: string,
  fileId: string,
  fileName: string,
  fileUrl: string,
  fileSizeStr: string
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }
  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  try {
    // KANBAN-001 class, surfaced by the Phase 1 sweep: scope the deliverable
    // to the project the caller was granted access to.
    const file = await scopedSharedFile(fileId, projectId);
    if (!file) return { error: "Deliverable not found" };

    let meta = { size: "Unknown size", status: "PENDING", version: 1, feedback: "" };
    try {
      meta = { ...meta, ...JSON.parse(file.fileSize || "{}") };
    } catch (e) {}

    const newVersion = meta.version + 1;
    const newMeta = {
      size: fileSizeStr,
      status: "PENDING",
      feedback: "",
      version: newVersion,
    };

    const updated = await db.sharedFile.update({
      where: { id: fileId },
      data: {
        fileName,
        fileUrl,
        fileSize: JSON.stringify(newMeta),
      },
    });

    const otherMembers = [
      access.project.company.userId,
      ...access.project.applications.map((app) => app.freelancer.userId),
    ].filter((id) => id !== userId);

    for (const mUserId of otherMembers) {
      await db.notification.create({
        data: {
          userId: mUserId,
          title: "New Deliverable Version",
          message: `${session.user.name || "Freelancer"} uploaded version v${newVersion} of "${fileName}".`,
        },
      });
    }

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true, updated };
  } catch (err: any) {
    return { error: err.message || "Failed to upload new version" };
  }
}

export async function deleteMessage(projectId: string, messageId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const access = await verifyProjectWorkspaceAccess(projectId, userId);
  if (access.error || !access.project || !access.role) {
    return { error: access.error || "Access denied" };
  }

  try {
    // Same class as KANBAN-001. The audit flagged this as lower-risk because
    // the sender check below already limits the blast radius to the caller's
    // own messages — confirmed, but scoping it costs nothing and removes the
    // cross-project shape entirely.
    const message = await scopedMessage(messageId, projectId);

    if (!message) {
      return { error: "Message not found" };
    }

    if (message.senderId !== userId) {
      return { error: "You can only delete your own messages" };
    }

    await db.message.delete({
      where: { id: messageId },
    });

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting message:", error);
    return { error: error.message || "Failed to delete message" };
  }
}

export async function markMessagesAsRead(projectId: string, channel: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    await db.message.updateMany({
      where: {
        projectId,
        channel,
        senderId: { not: userId },
        seen: false,
      },
      data: {
        seen: true,
      },
    });

    revalidatePath("/company/workspace/[applicationId]", "layout");
    revalidatePath("/freelancer/workspace/[applicationId]", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Error marking messages as read:", error);
    return { error: error.message || "Failed to mark messages as read" };
  }
}
