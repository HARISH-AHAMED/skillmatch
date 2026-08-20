import "server-only";
import { db } from "@/lib/db";
import type { Role } from "@/lib/types";

/* ============================================================================
   ADMIN READS

   The moderation console lists real User rows rather than deriving an account
   list from the profile tables, so admin-only accounts and accounts without a
   profile are visible too.
   ========================================================================= */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string;
  profileHref: string;
  verified: boolean;
  joined: string;
}

export async function adminUsers(): Promise<AdminUser[]> {
  const rows = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      freelancerProfile: { select: { id: true, verificationBadges: true } },
      companyProfile: { select: { id: true, logoUrl: true, verificationBadges: true } },
    },
  });

  return rows.map((row) => {
    const badges =
      row.companyProfile?.verificationBadges ?? row.freelancerProfile?.verificationBadges ?? [];

    return {
      id: row.id,
      name: row.name ?? row.email ?? "Unnamed account",
      email: row.email ?? "",
      role: row.role as Role,
      avatarUrl: row.companyProfile?.logoUrl || row.image || "",
      profileHref: row.companyProfile
        ? `/companies/${row.companyProfile.id}`
        : row.freelancerProfile
          ? `/freelancers/${row.freelancerProfile.id}`
          : "/admin/users",
      verified: badges.includes("Identity Verified"),
      joined: row.createdAt.toISOString(),
    };
  });
}
