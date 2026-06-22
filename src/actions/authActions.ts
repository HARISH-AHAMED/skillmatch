"use server";

import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export async function registerUser(formData: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}) {
  const email = formData.email.toLowerCase().trim();

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
      role: formData.role,
      passwordHash: formData.passwordHash,
    },
  });

  // Create associated profile
  if (formData.role === Role.FREELANCER) {
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
  } else if (formData.role === Role.COMPANY) {
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

export async function deleteUser(userId: string) {
  if (!userId) return { error: "User ID is required." };
  try {
    await db.user.delete({
      where: { id: userId },
    });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to delete user." };
  }
}

export async function updateUserRole(userId: string, role: Role) {
  if (!userId || !role) return { error: "User ID and Role are required." };
  try {
    await db.user.update({
      where: { id: userId },
      data: { role },
    });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to update user role." };
  }
}

