import "server-only";
import { db } from "@/lib/db";
import type { AppNotification, Certificate, Review } from "@/lib/types";
import { certificateInclude, reviewInclude } from "@/adapters/include";
import { toCertificate, toNotification, toReview } from "@/adapters/records";
import { getHiddenCertificateIds } from "@/actions/certificateActions";
import { getNotificationRedirectUrl } from "@/actions/notificationActions";

/* ============================================================================
   RECORD READS — reviews, certificates and notifications.
   ========================================================================= */

/* --------------------------------------------------------------- reviews --- */

/** Reviews written about a user. Reviews are keyed by user id, not profile id. */
export async function reviewsFor(revieweeUserId: string): Promise<Review[]> {
  const rows = await db.review.findMany({
    where: { revieweeId: revieweeUserId },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toReview);
}

export async function reviewsBy(reviewerUserId: string): Promise<Review[]> {
  const rows = await db.review.findMany({
    where: { reviewerId: reviewerUserId },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toReview);
}

/** Every review on the platform, for the admin moderation table. */
export async function allReviews(): Promise<Review[]> {
  const rows = await db.review.findMany({
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toReview);
}

/* ---------------------------------------------------------- certificates --- */

/**
 * A freelancer's credentials. Hidden ones are filtered out for public viewers;
 * the owner's own screens pass `includeHidden` so they can toggle visibility.
 */
export async function certificatesFor(
  freelancerId: string,
  includeHidden = false,
): Promise<Certificate[]> {
  const [rows, hidden] = await Promise.all([
    db.certificate.findMany({
      where: { freelancerId, revokedAt: null },
      include: certificateInclude,
      orderBy: { issuedAt: "desc" },
    }),
    getHiddenCertificateIds(freelancerId),
  ]);

  return rows
    .filter((row) => includeHidden || !hidden.includes(row.id))
    .map((row) => toCertificate(row, hidden.includes(row.id)));
}

export async function certificatesIssuedBy(companyId: string): Promise<Certificate[]> {
  const rows = await db.certificate.findMany({
    where: { companyId },
    include: certificateInclude,
    orderBy: { issuedAt: "desc" },
  });
  return rows.map((row) => toCertificate(row));
}

/** Public verification lookup. Revoked certificates still resolve, as designed. */
export async function getCertificate(publicId: string): Promise<Certificate | undefined> {
  if (!publicId) return undefined;
  const row = await db.certificate.findUnique({
    where: { publicId },
    include: certificateInclude,
  });
  return row ? toCertificate(row) : undefined;
}

/* --------------------------------------------------------- notifications --- */

async function withHrefs(rows: Awaited<ReturnType<typeof db.notification.findMany>>) {
  // The destination for a notification is resolved by the backend's own
  // redirect action, so a click lands wherever the platform decides it should.
  return Promise.all(
    rows.map(async (row) => {
      const href = await getNotificationRedirectUrl(row.id);
      return toNotification(row, href ?? undefined);
    }),
  );
}

export async function notificationsFor(userId: string, limit = 8): Promise<AppNotification[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return withHrefs(rows);
}

export async function allNotificationsFor(userId: string): Promise<AppNotification[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return withHrefs(rows);
}
