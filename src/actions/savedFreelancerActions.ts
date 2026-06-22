"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleSaveFreelancer(freelancerId: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;
  const company = await db.company.findUnique({
    where: { userId },
  });

  if (!company) {
    return { error: "Company profile not found" };
  }

  try {
    const existing = await db.savedFreelancer.findUnique({
      where: {
        companyId_freelancerId: {
          companyId: company.id,
          freelancerId,
        },
      },
    });

    if (existing) {
      await db.savedFreelancer.delete({
        where: {
          id: existing.id,
        },
      });
      revalidatePath("/company/freelancers");
      return { success: true, saved: false };
    } else {
      await db.savedFreelancer.create({
        data: {
          companyId: company.id,
          freelancerId,
        },
      });
      revalidatePath("/company/freelancers");
      return { success: true, saved: true };
    }
  } catch (error: any) {
    console.error("Error toggling saved freelancer:", error);
    return { error: error.message || "Failed to toggle saved status" };
  }
}
