import type { AppNotification, Certificate, Review, Role } from "@/lib/types";
import { getProjectMetadataDirect } from "@/lib/workflowHelpers";
import type { CertificateRow, NotificationRow, ReviewRow } from "./include";
import { toCertificateConfig } from "./projects";
import { iso, isoOrUndefined, opt, str } from "./scalars";

/* ============================================================================
   RECORD ADAPTERS — certificates, reviews and notifications.
   ========================================================================= */

/* ---------------------------------------------------------- certificate --- */

export function toCertificate(row: CertificateRow, hidden = false): Certificate {
  // A certificate is a snapshot, but its visual template lives with the project
  // it was issued from — that is where the designer saved it.
  const meta = getProjectMetadataDirect(row.project.description);

  return {
    id: row.id,
    publicId: row.publicId,
    projectId: row.projectId,
    freelancerId: row.freelancerId,
    companyId: row.companyId,
    roleTitle: row.roleTitle,
    skills: row.skills,
    durationText: opt(row.durationText),
    summary: opt(row.summary),
    issuerName: row.issuerName,
    issuerLogo: opt(row.company.logoUrl),
    recipientName: row.recipientName,
    projectTitle: row.projectTitle,
    issuedAt: iso(row.issuedAt),
    signer1Name: opt(row.signer1Name),
    signer1Title: opt(row.signer1Title),
    signer2Name: opt(row.signer2Name),
    signer2Title: opt(row.signer2Title),
    revokedAt: isoOrUndefined(row.revokedAt),
    revokeReason: opt(row.revokeReason),
    hidden,
    config: toCertificateConfig(meta.certificate, true),
  };
}

/* --------------------------------------------------------------- review --- */

export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    projectId: row.projectId,
    projectTitle: row.project.title,
    reviewerId: row.reviewerId,
    reviewerName: str(row.reviewer.name, "Member"),
    reviewerAvatar: str(row.reviewer.image),
    reviewerRole: row.reviewer.role as Role,
    revieweeId: row.revieweeId,
    revieweeName: str(row.reviewee.name, "Member"),
    rating: row.rating,
    comment: row.comment,
    communicationScore: row.communicationScore ?? undefined,
    paymentReliabilityScore: row.paymentReliabilityScore ?? undefined,
    projectClarityScore: row.projectClarityScore ?? undefined,
    createdAt: iso(row.createdAt),
  };
}

/* --------------------------------------------------------- notification --- */

/**
 * Notifications are stored as a title and a message. The design colours and
 * icons them by kind, so classify from the title the backend already writes —
 * every producer uses a stable phrase ("Offer Letter Sent", "Payment
 * Released", "Meeting Scheduled", …).
 */
function classify(title: string): AppNotification["kind"] {
  const t = title.toLowerCase();
  if (/(payment|stipend|milestone|funded|released|escrow|invoice)/.test(t)) return "money";
  if (/(message|chat|discussion|reply|question)/.test(t)) return "message";
  if (/(meeting|interview|call|scheduled)/.test(t)) return "meeting";
  if (/(certificate|credential)/.test(t)) return "certificate";
  if (/(team|role|handover|apprentice|invite|invitation)/.test(t)) return "team";
  if (/(application|applicant|offer|contract|hired|shortlist|reject|negotiat)/.test(t))
    return "application";
  return "system";
}

/**
 * `href` is resolved server-side by the existing `getNotificationRedirectUrl`
 * action when the list is built, and passed in here.
 */
export function toNotification(row: NotificationRow, href?: string): AppNotification {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: iso(row.createdAt),
    href,
    kind: classify(row.title),
  };
}
