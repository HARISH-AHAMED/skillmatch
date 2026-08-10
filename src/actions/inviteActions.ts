"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  parseFreelancerMetadata,
  serializeFreelancerMetadata,
  getFreelancerBioText,
} from "@/lib/workflowHelpers";

/**
 * Proactive sourcing: a company invites a specific freelancer to one of its own
 * open listings.
 *
 * Before this existed, Search Freelancers dead-ended at "View Profile" — a company
 * could find the right person and then had no way to reach them, so the whole
 * sourcing surface led nowhere. An invite creates a notification carrying a deep
 * link into the listing's apply flow, and is recorded on the freelancer's profile
 * metadata so the same person isn't invited to the same gig repeatedly.
 */
export async function inviteFreelancerToProject(
  freelancerId: string,
  projectId: string,
  message?: string,
  roleId?: string,
  isApprentice?: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    return { success: false, error: "Unauthorized" };
  }

  const [company, freelancer, project] = await Promise.all([
    db.company.findUnique({ where: { userId: session.user.id } }),
    db.freelancer.findUnique({
      where: { id: freelancerId },
      include: { user: { select: { id: true, name: true } } },
    }),
    db.project.findUnique({
      where: { id: projectId },
      include: {
        company: { select: { userId: true, companyName: true } },
        roles: {
          orderBy: { sortOrder: "asc" },
          include: { applications: { where: { status: "HIRED" } } },
        },
      },
    }),
  ]);

  if (!company) return { success: false, error: "Company profile not found" };
  if (!freelancer) return { success: false, error: "Freelancer not found" };
  if (!project) return { success: false, error: "Project not found" };

  // A company may only invite to listings it actually owns.
  if (project.company.userId !== session.user.id) {
    return { success: false, error: "You can only invite to your own projects." };
  }

  if (project.status !== "OPEN" && project.status !== "IN_PROGRESS") {
    return { success: false, error: "This project is no longer accepting applications." };
  }

  // Inviting someone who already applied is noise for both sides.
  const existingApplication = await db.application.findFirst({
    where: { projectId, freelancerId },
  });
  if (existingApplication) {
    return { success: false, error: "This freelancer has already applied to this project." };
  }

  // Role validation. Zero-role projects skip this entirely and keep the original
  // single-hire invite behaviour.
  let chosenRole: (typeof project.roles)[number] | undefined;
  if (project.roles.length > 0) {
    if (!roleId) return { success: false, error: "This project uses roles — select one to invite for." };
    chosenRole = project.roles.find((r) => r.id === roleId);
    if (!chosenRole) return { success: false, error: "That role does not belong to this project." };

    const primaries = chosenRole.applications.filter((a) => !a.isApprentice).length;
    if (isApprentice && !chosenRole.allowApprentice) {
      return { success: false, error: "This role does not accept apprentices." };
    }
    if (!isApprentice && primaries >= chosenRole.slots) {
      return {
        success: false,
        error: "All " + chosenRole.slots + " slot(s) for this role are filled" +
          (chosenRole.allowApprentice ? " — invite as an apprentice instead." : "."),
      };
    }
  } else if (roleId) {
    return { success: false, error: "This project does not use roles." };
  }

  const meta = parseFreelancerMetadata(freelancer.bio);
  const invites = meta.projectInvites ?? [];

  if (invites.some((i) => i.projectId === projectId && i.status === "PENDING")) {
    return { success: false, error: "You have already invited this freelancer to this project." };
  }

  meta.projectInvites = [
    ...invites,
    {
      projectId,
      projectTitle: project.title,
      companyId: company.id,
      companyName: project.company.companyName,
      message: message?.trim() || undefined,
      roleId: chosenRole?.id,
      roleName: chosenRole?.name,
      isApprentice: chosenRole ? !!isApprentice : undefined,
      status: "PENDING",
      invitedAt: new Date().toISOString(),
    },
  ];

  await db.freelancer.update({
    where: { id: freelancerId },
    data: { bio: serializeFreelancerMetadata(getFreelancerBioText(freelancer.bio), meta) },
  });

  await db.notification.create({
    data: {
      userId: freelancer.user.id,
      title: "You've Been Invited to Apply",
      message:
        project.company.companyName + " invited you to apply for \"" + project.title + "\"" +
        (chosenRole ? " as " + (isApprentice ? "an apprentice on " : "") + chosenRole.name : "") + "." +
        (message?.trim() ? " Message: \"" + message.trim() + "\"" : ""),
    },
  });

  revalidatePath("/company/freelancers");
  revalidatePath("/freelancer/dashboard");
  return { success: true };
}

/**
 * Open listings a company can invite to, with a flag marking any the freelancer
 * has already been invited to or applied for, so the picker can disable them
 * rather than failing after the click.
 */
export async function getInvitableProjects(
  freelancerId: string
): Promise<
  {
    id: string;
    title: string;
    status: string;
    alreadyInvited: boolean;
    alreadyApplied: boolean;
    roles: { id: string; name: string; slots: number; filled: number; allowApprentice: boolean }[];
  }[]
> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) return [];

  const company = await db.company.findUnique({ where: { userId: session.user.id } });
  if (!company) return [];

  const [projects, freelancer, applications] = await Promise.all([
    db.project.findMany({
      where: { companyId: company.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      select: {
        id: true,
        title: true,
        status: true,
        roles: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            slots: true,
            allowApprentice: true,
            applications: { where: { status: "HIRED", isApprentice: false }, select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.freelancer.findUnique({ where: { id: freelancerId }, select: { bio: true } }),
    db.application.findMany({ where: { freelancerId }, select: { projectId: true } }),
  ]);

  const invites = parseFreelancerMetadata(freelancer?.bio).projectInvites ?? [];
  const appliedIds = new Set(applications.map((a) => a.projectId));

  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    alreadyInvited: invites.some((i) => i.projectId === p.id && i.status === "PENDING"),
    alreadyApplied: appliedIds.has(p.id),
    roles: p.roles.map((r) => ({
      id: r.id,
      name: r.name,
      slots: r.slots,
      filled: r.applications.length,
      allowApprentice: r.allowApprentice,
    })),
  }));
}

/**
 * Freelancer responds to an invitation.
 *
 * Accepting deliberately does NOT create an Application here — the freelancer is
 * routed into the existing apply flow so screening questions, role selection and
 * capacity checks all run exactly as for a normal application. This action only
 * records the freelancer's answer, so there is no parallel hiring system.
 */
export async function respondToInvite(
  projectId: string,
  decision: "DISMISS"
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    return { success: false, error: "Unauthorized" };
  }

  // Scoped to the signed-in freelancer, so one cannot act on another's invite.
  const freelancer = await db.freelancer.findUnique({
    where: { userId: session.user.id },
    select: { id: true, bio: true },
  });
  if (!freelancer) return { success: false, error: "Freelancer profile not found" };

  const meta = parseFreelancerMetadata(freelancer.bio);
  const invite = meta.projectInvites?.find(
    (i) => i.projectId === projectId && i.status === "PENDING"
  );
  if (!invite) return { success: false, error: "No pending invitation for this project." };

  invite.status = "DISMISSED";
  invite.respondedAt = new Date().toISOString();

  await db.freelancer.update({
    where: { id: freelancer.id },
    data: { bio: serializeFreelancerMetadata(getFreelancerBioText(freelancer.bio), meta) },
  });

  // Tell the company their invitation was turned down, using the existing
  // notification system rather than a new channel.
  const invitingCompany = await db.company.findUnique({
    where: { id: invite.companyId },
    select: { userId: true },
  });
  if (invitingCompany) {
    await db.notification.create({
      data: {
        userId: invitingCompany.userId,
        title: "Invitation Declined",
        message:
          (session.user.name || "A freelancer") +
          " declined your invitation to \"" + invite.projectTitle + "\"" +
          (invite.roleName ? " (" + invite.roleName + ")" : "") + ".",
      },
    });
  }

  revalidatePath("/freelancer/dashboard");
  return { success: true };
}
