"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { revalidatePath as revalidateRoute } from "next/cache";
import { CACHE_TAGS, invalidatePublic } from "@/data/server/cache";

/**
 * PERF — the public directories and marketing pages read through a tagged
 * cache, so a mutation has to drop those entries as well as the rendered
 * routes. Wrapping revalidatePath here keeps the two in step: every existing
 * invalidation point in this file now does both.
 */
function revalidatePath(path: string) {
  revalidateRoute(path);
  invalidatePublic(CACHE_TAGS.projects);
}
import { parseApplicationMetadata, serializeApplicationMetadata } from "@/lib/workflowHelpers";

export interface RoleInput {
  id?: string;
  name: string;
  description?: string;
  slots: number;
  allowApprentice: boolean;
}

/**
 * Replace a project's role definitions.
 *
 * Roles are opt-in: a project with an empty list keeps the original
 * one-candidate-per-listing behaviour, so nothing that worked before changes.
 */
/** ROLE-002 — a sane ceiling on openings for one named role. */
const MAX_ROLE_SLOTS = 100;

/** A role as it now stands in the database, for the caller to re-seed its editor with. */
export interface SavedRole {
  id: string;
  name: string;
  description: string | null;
  slots: number;
  allowApprentice: boolean;
}

export async function saveProjectRoles(
  projectId: string,
  roles: RoleInput[]
): Promise<{ success: boolean; error?: string; roles?: SavedRole[] }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    return { success: false, error: "Unauthorized" };
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { company: { select: { userId: true } }, roles: { include: { applications: true } } },
  });
  if (!project) return { success: false, error: "Project not found" };
  if (project.company.userId !== session.user.id) {
    return { success: false, error: "Not your project." };
  }

  /**
   * ROLE-001 — ownership was checked once, on the *project*, and each submitted
   * role id was then trusted straight into `projectRole.update`. A foreign id
   * was not found in `project.roles`, so `hired` computed as 0 and the
   * capacity-reduction guard below was skipped entirely before the update ran
   * against another project's role.
   */
  const knownRoleIds = new Set(project.roles.map((r) => r.id));
  const unknown = roles.filter((r) => r.id && !knownRoleIds.has(r.id));
  if (unknown.length > 0) {
    return { success: false, error: "One or more roles do not belong to this project." };
  }

  const keptIds = roles.map((r) => r.id).filter(Boolean) as string[];

  // Refuse to delete a role that people have already applied to — silently
  // dropping their applications would lose real work with no trace.
  const removed = project.roles.filter((r) => !keptIds.includes(r.id));
  const blocked = removed.filter((r) => r.applications.length > 0);
  if (blocked.length > 0) {
    return {
      success: false,
      error:
        "These role(s) already have applicants and cannot be removed: " +
        blocked.map((r) => r.name).join(", ") +
        ". Reject or withdraw their applications first, or keep the role and reduce its slot count instead.",
    };
  }

  for (const r of roles) {
    if (!r.name?.trim()) return { success: false, error: "Every role needs a name." };
    if (!Number.isFinite(r.slots) || r.slots < 1) {
      return { success: false, error: "Every role needs at least one slot." };
    }
    // ROLE-002 — slots had a lower bound but no upper one, so a role could be
    // created with a million openings and rendered as such on every roster.
    if (r.slots > MAX_ROLE_SLOTS) {
      return { success: false, error: "A role cannot have more than " + MAX_ROLE_SLOTS + " slots." };
    }
    // Slots may not drop below the primaries already hired into the role.
    if (r.id) {
      const existing = project.roles.find((x) => x.id === r.id);
      const hired = existing
        ? existing.applications.filter((a) => a.status === "HIRED" && !a.isApprentice).length
        : 0;
      if (r.slots < hired) {
        return {
          success: false,
          error:
            "\"" + r.name.trim() + "\" has " + hired + " freelancer(s) already hired, so it cannot be reduced to " +
            r.slots + " slot(s). Release a hire from this role first, or set the slot count to " + hired + " or more.",
        };
      }
    }
  }

  await db.$transaction([
    ...(removed.length > 0
      ? [db.projectRole.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } })]
      : []),
    ...roles.map((r, idx) =>
      r.id
        ? db.projectRole.update({
            where: { id: r.id },
            data: {
              name: r.name.trim(),
              description: r.description?.trim() || null,
              slots: r.slots,
              allowApprentice: r.allowApprentice,
              sortOrder: idx,
            },
          })
        : db.projectRole.create({
            data: {
              projectId,
              name: r.name.trim(),
              description: r.description?.trim() || null,
              slots: r.slots,
              allowApprentice: r.allowApprentice,
              sortOrder: idx,
            },
          })
    ),
  ]);

  // Read back so the caller learns the ids of the roles just created — an
  // editor still holding its local keys would otherwise re-create them.
  const persisted = await db.projectRole.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, description: true, slots: true, allowApprentice: true },
  });

  revalidatePath(`/company/projects/${projectId}`);
  revalidatePath("/company/applicants");
  return { success: true, roles: persisted };
}

/**
 * Roster for a project: every role, its slots, and who currently fills them.
 * Drives both the company's assembly view and the freelancer's team reveal.
 */
export async function getProjectTeam(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      roles: {
        orderBy: { sortOrder: "asc" },
        include: {
          applications: {
            where: { status: "HIRED" },
            include: {
              freelancer: {
                include: {
                  user: { select: { id: true, name: true, image: true } },
                },
              },
            },
          },
        },
      },
      // Hires made before roles existed, or without a role assigned.
      applications: {
        where: { status: "HIRED", roleId: null },
        include: {
          freelancer: { include: { user: { select: { id: true, name: true, image: true } } } },
        },
      },
    },
  });

  if (!project) return null;

  const roles = project.roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    slots: r.slots,
    allowApprentice: r.allowApprentice,
    filled: r.applications.filter((a) => !a.isApprentice).length,
    members: r.applications.map((a) => ({
      applicationId: a.id,
      freelancerId: a.freelancerId,
      name: a.freelancer.user.name,
      image: a.freelancer.user.image,
      rating: a.freelancer.rating,
      completedProjects: a.freelancer.completedProjects,
      userId: a.freelancer.user.id,
      isApprentice: a.isApprentice,
      teamConfirmedAt: a.teamConfirmedAt,
      apprenticeRating: 0,
      apprenticeReviews: 0,
    })),
  }));

  // Apprentice reputation, computed from reviews tied to projects where the
  // person served as an apprentice. Kept separate from Freelancer.rating.
  const apprenticeUserIds = roles.flatMap((r) => r.members.filter((m) => m.isApprentice).map((m) => m.userId));
  if (apprenticeUserIds.length > 0) {
    const [apprenticeApps, reviews] = await Promise.all([
      db.application.findMany({
        where: { isApprentice: true, freelancer: { user: { id: { in: apprenticeUserIds } } } },
        select: { projectId: true, freelancer: { select: { user: { select: { id: true } } } } },
      }),
      db.review.findMany({
        where: { revieweeId: { in: apprenticeUserIds } },
        select: { revieweeId: true, projectId: true, rating: true },
      }),
    ]);
    const byUser = new Map<string, Set<string>>();
    for (const a of apprenticeApps) {
      const uid = a.freelancer.user.id;
      if (!byUser.has(uid)) byUser.set(uid, new Set());
      byUser.get(uid)!.add(a.projectId);
    }
    for (const r of roles) {
      for (const m of r.members) {
        if (!m.isApprentice) continue;
        const pids = byUser.get(m.userId) ?? new Set<string>();
        const mine = reviews.filter((rv) => rv.revieweeId === m.userId && pids.has(rv.projectId));
        m.apprenticeReviews = mine.length;
        m.apprenticeRating = mine.length
          ? Math.round((mine.reduce((s, rv) => s + rv.rating, 0) / mine.length) * 10) / 10
          : 0;
      }
    }
  }

  const totalSlots = roles.reduce((sum, r) => sum + r.slots, 0);
  const totalFilled = roles.reduce((sum, r) => sum + r.filled, 0);

  return {
    projectId: project.id,
    projectTitle: project.title,
    usesRoles: roles.length > 0,
    roles,
    unassignedHires: project.applications.map((a) => ({
      applicationId: a.id,
      freelancerId: a.freelancerId,
      name: a.freelancer.user.name,
      image: a.freelancer.user.image,
    })),
    totalSlots,
    totalFilled,
    /// True once every slot on every role has a primary hire.
    isTeamComplete: roles.length > 0 && totalFilled >= totalSlots,
  };
}

/**
 * Freelancer confirms they want to join after seeing the assembled team.
 * Separate from accepting the offer: the spec's whole point is that a freelancer
 * sees their teammates *before* committing, not after.
 */
export async function confirmTeamMatch(
  applicationId: string,
  decision: "CONFIRM" | "DECLINE",
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    return { success: false, error: "Unauthorized" };
  }

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      freelancer: { include: { user: { select: { id: true } } } },
      project: { select: { title: true, company: { select: { userId: true } } } },
    },
  });

  if (!app) return { success: false, error: "Application not found" };
  if (app.freelancer.user.id !== session.user.id) {
    return { success: false, error: "Not your application." };
  }
  if (app.status !== "HIRED") {
    return { success: false, error: "You have not been placed on this team yet." };
  }
  if (app.teamConfirmedAt) {
    return { success: false, error: "You have already confirmed this team." };
  }

  if (decision === "CONFIRM") {
    await db.application.update({
      where: { id: applicationId },
      data: { teamConfirmedAt: new Date() },
    });
    await db.notification.create({
      data: {
        userId: app.project.company.userId,
        title: "Team Member Confirmed",
        message: `A freelancer confirmed their place on the team for "${app.project.title}".`,
      },
    });
  } else {
    // Declining releases the slot so the company can fill it again.
    await db.application.update({
      where: { id: applicationId },
      data: { status: "REJECTED", teamConfirmedAt: null },
    });
    await db.notification.create({
      data: {
        userId: app.project.company.userId,
        title: "Team Placement Declined",
        message: `A freelancer declined their place on "${app.project.title}".${
          reason ? ` Reason: "${reason}"` : ""
        } The slot is open again.`,
      },
    });
  }

  revalidatePath("/freelancer/applications");
  revalidatePath("/company/applicants");
  return { success: true };
}

/**
 * Apprentice handover: an apprentice on a role takes over as the active primary
 * when the current primary cannot continue.
 *
 * Smallest safe form — the two applications swap their `isApprentice` flag. The
 * outgoing primary stays on the roster as an apprentice rather than being removed,
 * so no contract history is destroyed and the change is reversible. Because the
 * primary count is unchanged, existing role-capacity guards stay satisfied.
 */
export async function handoverRole(
  roleId: string,
  fromApplicationId: string,
  toApplicationId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  if (fromApplicationId === toApplicationId) {
    return { success: false, error: "Cannot hand a role over to the same person." };
  }

  const role = await db.projectRole.findUnique({
    where: { id: roleId },
    include: {
      project: { select: { id: true, company: { select: { userId: true } } } },
      applications: {
        where: { status: "HIRED" },
        include: { freelancer: { include: { user: { select: { id: true, name: true } } } } },
      },
    },
  });
  if (!role) return { success: false, error: "Role not found" };

  const outgoing = role.applications.find((a) => a.id === fromApplicationId);
  const incoming = role.applications.find((a) => a.id === toApplicationId);

  // Both must be hired members of *this* role — blocks wrong-role and
  // unrelated-freelancer handovers.
  if (!outgoing) return { success: false, error: "The current primary is not on this role." };
  if (!incoming) return { success: false, error: "The apprentice is not on this role." };
  if (outgoing.isApprentice) {
    return { success: false, error: "The selected member is not the active primary." };
  }
  if (!incoming.isApprentice) {
    return { success: false, error: "The selected member is not an apprentice on this role." };
  }

  // Permission: the owning company, or the outgoing primary stepping down.
  const isCompanyOwner = role.project.company.userId === session.user.id;
  const isOutgoingPrimary = outgoing.freelancer.user.id === session.user.id;
  if (!isCompanyOwner && !isOutgoingPrimary) {
    return { success: false, error: "Only the company or the current primary can hand over this role." };
  }

  // Audit trail: append a pipeline event to BOTH applications using the existing
  // pipelineHistory mechanism, so the transition is visible from either side.
  const now = new Date().toISOString();
  const outgoingName = outgoing.freelancer.user.name || "Previous primary";
  const incomingName = incoming.freelancer.user.name || "Apprentice";
  const actorName = session.user.name || "User";

  const withEvent = (coverLetter: string, stage: string, notes: string) => {
    const meta = parseApplicationMetadata(coverLetter);
    meta.pipelineHistory = [
      ...(meta.pipelineHistory || []),
      { stage, timestamp: now, notes, recruiterId: session.user.id, recruiterName: actorName },
    ];
    const MARKER = "\n\nMETADATA_JSON_BLOCK:";
    const originalText = coverLetter.includes(MARKER)
      ? coverLetter.split(MARKER)[0]
      : coverLetter;
    return serializeApplicationMetadata(originalText, meta);
  };

  const handedOverNote =
    "Role " + role.name + " handed over from " + outgoingName + " to " + incomingName +
    ". " + outgoingName + " stepped down to apprentice; " + incomingName + " is now the active primary.";

  await db.$transaction([
    db.application.update({
      where: { id: fromApplicationId },
      data: {
        isApprentice: true,
        coverLetter: withEvent(outgoing.coverLetter, "Role Handed Over", handedOverNote),
      },
    }),
    db.application.update({
      where: { id: toApplicationId },
      data: {
        isApprentice: false,
        coverLetter: withEvent(incoming.coverLetter, "Promoted to Primary", handedOverNote),
      },
    }),
  ]);

  // Tell everyone involved what changed, using the existing notification system.
  await Promise.all([
    db.notification.create({
      data: {
        userId: incoming.freelancer.user.id,
        title: "You are now the primary on " + role.name,
        message:
          "Your apprenticeship on \"" + role.name + "\" has been upgraded — you are now the active primary and own this role going forward.",
      },
    }),
    db.notification.create({
      data: {
        userId: outgoing.freelancer.user.id,
        title: "Role handed over",
        message:
          "You have stepped down from \"" + role.name + "\". " +
          (incoming.freelancer.user.name || "Your apprentice") +
          " is now the active primary. You remain on the team as an apprentice.",
      },
    }),
    ...(role.project.company.userId !== session.user.id
      ? [
          db.notification.create({
            data: {
              userId: role.project.company.userId,
              title: "Role handover completed",
              message:
                "\"" + role.name + "\" was handed over from " +
                (outgoing.freelancer.user.name || "the primary") + " to " +
                (incoming.freelancer.user.name || "their apprentice") + ".",
            },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/workspace/${toApplicationId}`);
  revalidatePath(`/workspace/${fromApplicationId}`);
  revalidatePath("/company/applicants");
  return { success: true };
}
