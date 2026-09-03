import type {
  DeliverableStatus,
  LedgerEntry,
  LedgerEntryType,
  Meeting,
  MeetingAttendee,
  MeetingStatus,
  Message,
  PaymentItem,
  PaymentItemStatus,
  ProjectPriority,
  ProjectUpdate,
  Role,
  SharedFile,
  StipendPeriod,
  Task,
  TaskStatus,
  WorkLog,
  WorkLogStatus,
} from "@/lib/types";
import { DELIVERABLE_REVISION_CAP } from "@/lib/workflowHelpers";
import type {
  LedgerRow,
  MeetingRow,
  MessageRow,
  PaymentItemRow,
  ProjectUpdateRow,
  SharedFileRow,
  StipendPeriodRow,
  TaskRow,
  WorkLogRow,
} from "./include";
import { dec, fileSizeLabel, iso, isoOrUndefined, mimeFromName, opt, str } from "./scalars";

/* ============================================================================
   WORKSPACE ADAPTERS — money, collaboration and scheduling rows.
   ========================================================================= */

/* ---------------------------------------------------------------- money --- */

export function toPaymentItem(row: PaymentItemRow): PaymentItem {
  const assignee = row.application.freelancer.user;
  return {
    id: row.id,
    projectId: row.projectId,
    applicationId: row.applicationId,
    assigneeName: str(assignee.name, "Freelancer"),
    assigneeAvatar: str(assignee.image),
    title: row.title,
    description: opt(row.description),
    sortOrder: row.sortOrder,
    amount: dec(row.amount),
    currency: row.currency,
    status: row.status as PaymentItemStatus,
    dueDate: isoOrUndefined(row.dueDate),
    fundedAmount: dec(row.fundedAmount),
    releasedAmount: dec(row.releasedAmount),
    submissionNote: opt(row.submissionNote),
    reviewNote: opt(row.reviewNote),
    revisionCount: row.revisionCount,
    submittedAt: isoOrUndefined(row.submittedAt),
    reviewedAt: isoOrUndefined(row.reviewedAt),
    releasedAt: isoOrUndefined(row.releasedAt),
    createdAt: iso(row.createdAt),
  };
}

export function toWorkLog(row: WorkLogRow): WorkLog {
  const freelancer = row.application.freelancer.user;
  return {
    id: row.id,
    projectId: row.projectId,
    applicationId: row.applicationId,
    freelancerName: str(freelancer.name, "Freelancer"),
    freelancerAvatar: str(freelancer.image),
    workDate: iso(row.workDate),
    hours: dec(row.hours),
    description: row.description,
    status: row.status as WorkLogStatus,
    rateSnapshot: dec(row.rateSnapshot),
    currency: row.currency,
    reviewNote: opt(row.reviewNote),
    reviewedAt: isoOrUndefined(row.reviewedAt),
    createdAt: iso(row.createdAt),
  };
}

export function toStipendPeriod(row: StipendPeriodRow): StipendPeriod {
  return {
    id: row.id,
    projectId: row.projectId,
    applicationId: row.applicationId,
    freelancerName: str(row.application.freelancer.user.name, "Freelancer"),
    periodIndex: row.periodIndex,
    periodStart: isoOrUndefined(row.periodStart),
    periodEnd: isoOrUndefined(row.periodEnd),
    amount: dec(row.amount),
    currency: row.currency,
    // The period table shares PaymentItemStatus, but a period is only ever
    // pending or paid — anything not released reads as pending.
    // A period the freelancer has raised is distinct from one nobody has
    // touched: the company needs to see which are waiting on it.
    status:
      row.status === "RELEASED" ? "RELEASED" : row.status === "SUBMITTED" ? "SUBMITTED" : "PENDING",
    releasedAt: isoOrUndefined(row.releasedAt),
  };
}

/**
 * Ledger amounts are signed at rest (releases negative). The UI renders the
 * magnitude and takes direction from `type`, so hand it the absolute value.
 */
export function toLedgerEntry(row: LedgerRow, actorName: string): LedgerEntry {
  return {
    id: row.id,
    projectId: row.projectId,
    applicationId: row.applicationId,
    paymentItemId: opt(row.paymentItemId),
    type: row.type as LedgerEntryType,
    amount: Math.abs(dec(row.amount)),
    currency: row.currency,
    actorName,
    note: opt(row.note),
    idempotencyKey: row.idempotencyKey,
    createdAt: iso(row.createdAt),
  };
}

/* -------------------------------------------------------- collaboration --- */

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    projectId: row.projectId,
    senderId: row.senderId,
    senderName: str(row.sender.name, "Member"),
    senderAvatar: str(row.sender.image),
    senderRole: row.sender.role as Role,
    content: row.content,
    channel: row.channel,
    seen: row.seen,
    createdAt: iso(row.createdAt),
    // The content is cleared at deletion, so a tombstone carries no text.
    deletedAt: row.deletedAt ? iso(row.deletedAt) : null,
    editedAt: row.editedAt ? iso(row.editedAt) : null,
  };
}

interface DeliverableMeta {
  size?: string;
  status?: DeliverableStatus;
  version?: number;
  feedback?: string;
  revisionCount?: number;
  revisionCap?: number;
  isDeliverable?: boolean;
  previewUrl?: string;
}

/**
 * SharedFile.fileSize carries either a plain size label or, once a file has
 * been marked as a deliverable, a JSON blob holding its review state. Reading
 * both is what tells a chat attachment apart from a deliverable.
 */
function parseFileMeta(raw: string | null): { meta: DeliverableMeta; isDeliverable: boolean } {
  if (!raw) return { meta: {}, isDeliverable: false };
  if (!raw.trim().startsWith("{")) return { meta: { size: raw }, isDeliverable: false };
  try {
    const parsed = JSON.parse(raw) as DeliverableMeta;
    return { meta: parsed, isDeliverable: parsed.isDeliverable ?? true };
  } catch {
    return { meta: { size: raw }, isDeliverable: false };
  }
}

export function toSharedFile(row: SharedFileRow): SharedFile {
  const { meta, isDeliverable } = parseFileMeta(row.fileSize);
  return {
    id: row.id,
    projectId: row.projectId,
    uploadedById: row.uploadedById,
    uploadedByName: str(row.uploadedBy.name, "Member"),
    uploadedByAvatar: str(row.uploadedBy.image),
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    channel: row.channel,
    uploadedAt: iso(row.uploadedAt),
    meta: {
      size: fileSizeLabel(meta.size ?? null),
      mime: mimeFromName(row.fileName),
      isDeliverable,
      status: meta.status,
      version: meta.version,
      feedback: meta.feedback || undefined,
      revisionCount: meta.revisionCount,
      revisionCap: meta.revisionCap ?? DELIVERABLE_REVISION_CAP,
      previewUrl: meta.previewUrl,
    },
  };
}

export function toProjectUpdate(row: ProjectUpdateRow): ProjectUpdate {
  return {
    id: row.id,
    projectId: row.projectId,
    createdById: row.createdById,
    createdByName: str(row.createdBy.name, "Member"),
    createdByAvatar: str(row.createdBy.image),
    title: row.title,
    description: row.description,
    status: (row.status as ProjectUpdate["status"]) ?? "PENDING",
    createdAt: iso(row.createdAt),
  };
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: opt(row.description),
    status: (row.status as TaskStatus) ?? "TODO",
    priority: (row.priority as ProjectPriority) ?? "MEDIUM",
    dueDate: isoOrUndefined(row.dueDate),
    assignedToId: opt(row.assignedToId),
    assignedToName: row.assignedTo?.name ?? undefined,
    assignedToAvatar: row.assignedTo?.image ?? undefined,
    createdByName: str(row.createdBy.name, "Member"),
    createdAt: iso(row.createdAt),
    completedAt: isoOrUndefined(row.completedAt),
    // The task table has no label column; the board renders an empty list
    // rather than the design's sample chips.
    labels: [],
  };
}

/* ------------------------------------------------------------- meetings --- */

export function toMeeting(row: MeetingRow): Meeting {
  const attendees: MeetingAttendee[] = row.attendees.map((attendee) => ({
    userId: attendee.userId,
    name: str(attendee.user.name, "Member"),
    avatarUrl: str(attendee.user.image),
    role: attendee.user.role as Role,
    status: attendee.status,
  }));

  return {
    id: row.id,
    projectId: row.projectId,
    organizerUserId: row.organizerUserId,
    organizerName: str(row.organizer.name, "Organizer"),
    title: row.title,
    description: opt(row.description),
    startsAt: iso(row.startsAt),
    durationMinutes: row.durationMinutes,
    meetingUrl: opt(row.meetingUrl),
    location: opt(row.location),
    status: row.status as MeetingStatus,
    attendees,
  };
}
