import { Prisma } from "@prisma/client";

/* ============================================================================
   PRISMA INCLUDE SHAPES
   One place that declares exactly how much of each row the adapters need, so
   the mappers below can be typed against the real payload instead of `any`.
   ========================================================================= */

export const freelancerInclude = Prisma.validator<Prisma.FreelancerInclude>()({
  user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
});

export const companyInclude = Prisma.validator<Prisma.CompanyInclude>()({
  user: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
});

export const projectInclude = Prisma.validator<Prisma.ProjectInclude>()({
  company: { include: companyInclude },
  roles: { orderBy: { sortOrder: "asc" } },
  compensation: true,
  _count: { select: { applications: true, savedByFreelancers: true } },
});

export const applicationInclude = Prisma.validator<Prisma.ApplicationInclude>()({
  project: { include: projectInclude },
  freelancer: { include: freelancerInclude },
  role: true,
});

export const certificateInclude = Prisma.validator<Prisma.CertificateInclude>()({
  project: { select: { id: true, description: true } },
  company: { select: { id: true, companyName: true, logoUrl: true } },
});

export const reviewInclude = Prisma.validator<Prisma.ReviewInclude>()({
  project: { select: { id: true, title: true } },
  reviewer: { select: { id: true, name: true, image: true, role: true } },
  reviewee: { select: { id: true, name: true } },
});

export const messageInclude = Prisma.validator<Prisma.MessageInclude>()({
  sender: { select: { id: true, name: true, image: true, role: true } },
});

export const sharedFileInclude = Prisma.validator<Prisma.SharedFileInclude>()({
  uploadedBy: { select: { id: true, name: true, image: true } },
});

export const projectUpdateInclude = Prisma.validator<Prisma.ProjectUpdateInclude>()({
  createdBy: { select: { id: true, name: true, image: true } },
});

export const taskInclude = Prisma.validator<Prisma.TaskInclude>()({
  assignedTo: { select: { id: true, name: true, image: true } },
  createdBy: { select: { id: true, name: true } },
});

export const meetingInclude = Prisma.validator<Prisma.MeetingInclude>()({
  organizer: { select: { id: true, name: true } },
  attendees: { include: { user: { select: { id: true, name: true, image: true, role: true } } } },
});

/* --------------------------------------------------- financial includes --- */

const assigneeInclude = {
  freelancer: { include: { user: { select: { name: true, image: true } } } },
} as const;

export const paymentItemInclude = Prisma.validator<Prisma.PaymentItemInclude>()({
  application: { include: assigneeInclude },
});

export const workLogInclude = Prisma.validator<Prisma.WorkLogInclude>()({
  application: { include: assigneeInclude },
});

export const stipendPeriodInclude = Prisma.validator<Prisma.StipendPeriodInclude>()({
  application: { include: assigneeInclude },
});

/* ------------------------------------------------------------- payloads --- */

export type FreelancerRow = Prisma.FreelancerGetPayload<{ include: typeof freelancerInclude }>;
export type CompanyRow = Prisma.CompanyGetPayload<{ include: typeof companyInclude }>;
export type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;
export type ApplicationRow = Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>;
export type CertificateRow = Prisma.CertificateGetPayload<{ include: typeof certificateInclude }>;
export type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;
export type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;
export type SharedFileRow = Prisma.SharedFileGetPayload<{ include: typeof sharedFileInclude }>;
export type ProjectUpdateRow = Prisma.ProjectUpdateGetPayload<{ include: typeof projectUpdateInclude }>;
export type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
export type MeetingRow = Prisma.MeetingGetPayload<{ include: typeof meetingInclude }>;
export type PaymentItemRow = Prisma.PaymentItemGetPayload<{ include: typeof paymentItemInclude }>;
export type WorkLogRow = Prisma.WorkLogGetPayload<{ include: typeof workLogInclude }>;
export type StipendPeriodRow = Prisma.StipendPeriodGetPayload<{ include: typeof stipendPeriodInclude }>;
export type LedgerRow = Prisma.PaymentTransactionGetPayload<object>;
export type NotificationRow = Prisma.NotificationGetPayload<object>;
