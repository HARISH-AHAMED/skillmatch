"use server";

import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireAdmin } from "@/lib/authz";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

/**
 * SEC-010. Roles a caller may self-assign at registration. ADMIN is
 * deliberately absent: it is only reachable through updateUserRole, which is
 * itself admin-guarded (SEC-001).
 */
const SELF_ASSIGNABLE_ROLES: Role[] = [Role.FREELANCER, Role.COMPANY];

export async function registerUser(formData: {
  name: string;
  email: string;
  /** Plaintext, hashed server-side. Previously this was named `passwordHash` and stored verbatim (SEC-002). */
  password: string;
  role: Role;
}) {
  const email = formData.email.toLowerCase().trim();

  if (!email || !formData.name?.trim()) {
    return { error: "Name and email are required." };
  }
  if (!formData.password || formData.password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  // SEC-010: the client-supplied role is validated against an allowlist rather
  // than trusted. Anything outside it — including ADMIN — falls back to
  // FREELANCER instead of being written through.
  const role = SELF_ASSIGNABLE_ROLES.includes(formData.role) ? formData.role : Role.FREELANCER;

  // Check if user exists
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "A user with this email address already exists." };
  }

  // Create user
  const user = await db.user.create({
    data: {
      name: formData.name,
      email,
      role,
      // SEC-002: stored as a bcrypt hash, never as the plaintext value.
      passwordHash: await hashPassword(formData.password),
    },
  });

  // Create associated profile
  if (role === Role.FREELANCER) {
    await db.freelancer.create({
      data: {
        userId: user.id,
        bio: "Full stack developer matching digital projects.",
        skills: ["react", "typescript", "tailwind"],
        experienceYears: 1,
        rating: 5.0,
        completedProjects: 0,
        completionRate: 100.0,
      },
    });
  } else if (role === Role.COMPANY) {
    await db.company.create({
      data: {
        userId: user.id,
        companyName: `${formData.name}'s Enterprise`,
        description: "New company workspace.",
        industry: "Technology",
        website: "https://talentra.ai",
        location: "United States",
      },
    });
  }

  return { success: true };
}

/**
 * SEC-001. Both of the actions below previously ran with no authentication of
 * any kind. Server actions are network endpoints — the /admin layout guard
 * does not protect them — so each now calls requireAdmin() directly, refuses
 * the two self-destructive cases, and writes an AdminLog row (the model
 * existed but was never used; see DATA-006).
 */
export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error };
  if (!userId) return { error: "User ID is required." };

  // An admin deleting themselves would strand the session and can orphan the
  // platform if they are the last one.
  if (userId === admin.data.userId) {
    return { error: "You cannot delete your own account." };
  }

  try {
    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
    if (!target) return { error: "User not found." };

    if (target.role === Role.ADMIN) {
      const adminCount = await db.user.count({ where: { role: Role.ADMIN } });
      if (adminCount <= 1) {
        return { error: "Cannot delete the last remaining administrator." };
      }
    }

    await db.$transaction([
      db.user.delete({ where: { id: userId } }),
      db.adminLog.create({
        data: {
          adminId: admin.data.userId,
          action: `Deleted user ${target.email ?? target.id} (role ${target.role})`,
        },
      }),
    ]);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to delete user." };
  }
}

export async function updateUserRole(userId: string, role: Role) {
  const admin = await requireAdmin();
  if (!admin.ok) return { error: admin.error };
  if (!userId || !role) return { error: "User ID and Role are required." };

  // Guard against a value that is not a member of the enum arriving from a
  // direct action invocation rather than the admin UI.
  if (!Object.values(Role).includes(role)) {
    return { error: "Unknown role." };
  }

  try {
    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
    if (!target) return { error: "User not found." };
    if (target.role === role) return { success: true };

    // Demoting the last admin would leave the platform with no one able to
    // administer it, including no one able to undo the demotion.
    if (target.role === Role.ADMIN && role !== Role.ADMIN) {
      const adminCount = await db.user.count({ where: { role: Role.ADMIN } });
      if (adminCount <= 1) {
        return { error: "Cannot demote the last remaining administrator." };
      }
    }

    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { role } }),
      db.adminLog.create({
        data: {
          adminId: admin.data.userId,
          action: `Changed role of ${target.email ?? target.id} from ${target.role} to ${role}`,
        },
      }),
    ]);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to update user role." };
  }
}

