"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { recalculateRecommendationsForFreelancer } from "@/services/aiRecommendation";
import { revalidatePath } from "next/cache";

export async function updateFreelancerProfile(formData: {
  name?: string;
  image?: string;
  bio: string;
  skills: string[]; // List of skills
  experienceYears: number;
  portfolioUrl?: string;
  resumeUrl?: string;
  professionalHeadline?: string;
  experience?: any;
  certifications?: any;
  portfolioItems?: any;
  responseTime?: string;
  availabilityStatus?: string;
  verificationBadges?: string[];
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User record not found in database. Your session may have expired due to database seeding. Please sign out and log back in.");
  }
  const skillsCleaned = formData.skills.map(s => s.toLowerCase().trim()).filter(Boolean);

  // Update User table details if name or image is provided
  if (formData.name !== undefined || formData.image !== undefined) {
    await db.user.update({
      where: { id: userId },
      data: {
        ...(formData.name !== undefined && { name: formData.name }),
        ...(formData.image !== undefined && { image: formData.image }),
      },
    });
  }

  // Update or create freelancer record
  const freelancer = await db.freelancer.upsert({
    where: { userId },
    update: {
      bio: formData.bio,
      skills: skillsCleaned,
      experienceYears: formData.experienceYears,
      portfolioUrl: formData.portfolioUrl || "",
      resumeUrl: formData.resumeUrl || "",
      professionalHeadline: formData.professionalHeadline || "",
      experience: formData.experience || [],
      certifications: formData.certifications || [],
      portfolioItems: formData.portfolioItems || [],
      responseTime: formData.responseTime || "Within 24 hours",
      availabilityStatus: formData.availabilityStatus || "AVAILABLE",
      verificationBadges: formData.verificationBadges || [],
    },
    create: {
      userId,
      bio: formData.bio,
      skills: skillsCleaned,
      experienceYears: formData.experienceYears,
      portfolioUrl: formData.portfolioUrl || "",
      resumeUrl: formData.resumeUrl || "",
      professionalHeadline: formData.professionalHeadline || "",
      experience: formData.experience || [],
      certifications: formData.certifications || [],
      portfolioItems: formData.portfolioItems || [],
      responseTime: formData.responseTime || "Within 24 hours",
      availabilityStatus: formData.availabilityStatus || "AVAILABLE",
      verificationBadges: formData.verificationBadges || [],
      rating: 5.0,
      completedProjects: 0,
      completionRate: 100.0,
    },
  });

  // Calculate new AI matches for this freelancer
  await recalculateRecommendationsForFreelancer(freelancer.id);

  revalidatePath("/freelancer/profile");
  revalidatePath("/freelancer/dashboard");
  
  return { success: true, freelancer };
}

export async function updateCompanyProfile(formData: {
  companyName: string;
  description: string;
  industry: string;
  website: string;
  location: string;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User record not found in database. Your session may have expired due to database seeding. Please sign out and log back in.");
  }

  const company = await db.company.upsert({
    where: { userId },
    update: {
      companyName: formData.companyName,
      description: formData.description,
      industry: formData.industry,
      website: formData.website,
      location: formData.location,
    },
    create: {
      userId,
      companyName: formData.companyName,
      description: formData.description,
      industry: formData.industry,
      website: formData.website,
      location: formData.location,
    },
  });

  revalidatePath("/company/dashboard");
  return { success: true, company };
}
