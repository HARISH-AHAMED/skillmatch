"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { MeetingStatus, MeetingAttendeeStatus, ApplicationStatus } from "@prisma/client";
import { requireProjectOwner, requireProjectParty, requireUser } from "@/lib/authz";
import { assertProjectMutable } from "@/lib/lifecycle";

/**
 * Requirement #5 — workspace meetings.
 *
 * Every read and write is scoped through the same project guards the rest of
 * the workspace uses: requireProjectOwner for company mutations,
 * requireProjectParty for reads. A caller-supplied project id is only ever a
 * lookup key — membership is re-derived from the session, so a freelancer
 * cannot reach meetings on a project they are not part of.
 */

type MeetingInput = {
  projectId: string;
  title: string;
  description?: string;
  startsAt: Date | string;
  durationMinutes?: number;
  meetingUrl?: string;
  location?: string;
  /** User ids to invite. Filtered server-side down to genuine project parties. */
  attendeeUserIds?: string[];
};

/** Users who may legitimately attend: the owning company plus hired freelancers. */
async function eligibleAttendeeIds(projectId: string): Promise<Set<string>> {
  const [project, hired] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: { company: { select: { userId: true } } },
    }),
    db.application.findMany({
      where: { projectId, status: ApplicationStatus.HIRED },
      select: { freelancer: { select: { userId: true } } },
    }),
  ]);
  const ids = new Set<string>();
  if (project?.company.userId) ids.add(project.company.userId);
  for (const a of hired) if (a.freelancer.userId) ids.add(a.freelancer.userId);
  return ids;
}

export async function createMeeting(input: MeetingInput) {
  const owner = await requireProjectOwner(input.projectId);
  if (!owner.ok) return { success: false, error: owner.error };

  const project = await db.project.findUnique({
    where: { id: input.projectId },
    select: {
      status: true,
      title: true,
      company: { select: { userId: true, companyName: true } },
    },
  });
  if (!project) return { success: false, error: "Project not found." };

  const mutable = assertProjectMutable(project.status, "schedule meetings for");
  if (!mutable.ok) return { success: false, error: mutable.error };

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { success: false, error: "Provide a valid meeting date and time." };
  }
  if (!input.title.trim()) {
    return { success: false, error: "Give the meeting a title." };
  }

  const eligible = await eligibleAttendeeIds(input.projectId);
  // Anything the client sent that is not a genuine party is dropped, not trusted.
  const invited = (input.attendeeUserIds ?? []).filter((id) => eligible.has(id));
  const organizerUserId = project.company.userId;

  const meeting = await db.meeting.create({
    data: {
      projectId: input.projectId,
      organizerUserId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      startsAt,
      durationMinutes: input.durationMinutes ?? 30,
      meetingUrl: input.meetingUrl?.trim() || null,
      location: input.location?.trim() || null,
      attendees: {
        create: Array.from(new Set([organizerUserId, ...invited])).map((userId) => ({
          userId,
          status:
            userId === organizerUserId
              ? MeetingAttendeeStatus.ACCEPTED
              : MeetingAttendeeStatus.INVITED,
        })),
      },
    },
  });

  // Existing notification pipeline — no second system.
  const notifyIds = invited.filter((id) => id !== organizerUserId);
  if (notifyIds.length > 0) {
    const companyName = project.company.companyName ?? "The company";
    await db.notification.createMany({
      data: notifyIds.map((userId) => ({
        userId,
        title: "New meeting scheduled",
        message: companyName + ' scheduled "' + meeting.title + '" for ' + project.title + ".",
      })),
    });
  }

  revalidatePath("/workspace");
  return { success: true, meetingId: meeting.id };
}

export async function updateMeeting(
  meetingId: string,
  patch: Partial<Omit<MeetingInput, "projectId">> & { status?: MeetingStatus }
) {
  const existing = await db.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, projectId: true },
  });
  if (!existing) return { success: false, error: "Meeting not found." };

  const owner = await requireProjectOwner(existing.projectId);
  if (!owner.ok) return { success: false, error: owner.error };

  const startsAt = patch.startsAt ? new Date(patch.startsAt) : undefined;
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    return { success: false, error: "Provide a valid meeting date and time." };
  }

  const updated = await db.meeting.update({
    where: { id: meetingId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
      ...(startsAt ? { startsAt } : {}),
      ...(patch.durationMinutes !== undefined
        ? { durationMinutes: patch.durationMinutes }
        : {}),
      ...(patch.meetingUrl !== undefined ? { meetingUrl: patch.meetingUrl?.trim() || null } : {}),
      ...(patch.location !== undefined ? { location: patch.location?.trim() || null } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    },
    include: { attendees: { select: { userId: true } } },
  });

  const message =
    patch.status === MeetingStatus.CANCELLED
      ? '"' + updated.title + '" was cancelled.'
      : '"' + updated.title + '" was updated.';
  const notifyIds = updated.attendees
    .map((a) => a.userId)
    .filter((id) => id !== updated.organizerUserId);
  if (notifyIds.length > 0) {
    await db.notification.createMany({
      data: notifyIds.map((userId) => ({ userId, title: "Meeting updated", message })),
    });
  }

  revalidatePath("/workspace");
  return { success: true };
}

export async function cancelMeeting(meetingId: string) {
  return updateMeeting(meetingId, { status: MeetingStatus.CANCELLED });
}

/**
 * Upcoming and past meetings for a project workspace. Readable by any party to
 * the project — the owning company and its hired freelancers — and nobody else.
 */
export async function getProjectMeetings(projectId: string) {
  const party = await requireProjectParty(projectId);
  if (!party.ok) {
    return { success: false as const, error: party.error, upcoming: [], past: [] };
  }

  const meetings = await db.meeting.findMany({
    where: { projectId },
    orderBy: { startsAt: "asc" },
    include: {
      organizer: { select: { id: true, name: true, image: true } },
      attendees: {
        select: {
          status: true,
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  const now = Date.now();
  const isPast = (m: (typeof meetings)[number]) =>
    m.status === MeetingStatus.COMPLETED ||
    m.startsAt.getTime() + m.durationMinutes * 60_000 < now;

  return {
    success: true as const,
    upcoming: meetings.filter((m) => !isPast(m)),
    past: meetings.filter(isPast).reverse(),
  };
}

/** An attendee accepting or declining their own invitation. */
export async function respondToMeeting(meetingId: string, status: MeetingAttendeeStatus) {
  const user = await requireUser();
  if (!user.ok) return { success: false, error: user.error };

  // Located by the (meeting, user) pair, so a caller can only change their own row.
  const attendee = await db.meetingAttendee.findUnique({
    where: { meetingId_userId: { meetingId, userId: user.data.userId } },
    select: { id: true },
  });
  if (!attendee) return { success: false, error: "You are not invited to this meeting." };

  await db.meetingAttendee.update({ where: { id: attendee.id }, data: { status } });
  revalidatePath("/workspace");
  return { success: true };
}
