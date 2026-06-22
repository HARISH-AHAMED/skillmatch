"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

// 1. Update Detailed Company Profile Details
export async function updateCompanyDetailedProfile(formData: {
  companyName: string;
  description: string;
  industry: string;
  website: string;
  location: string;
  logoUrl?: string;
  companySize?: string;
  foundedYear?: number;
  linkedin?: string;
  email?: string;
  phone?: string;
  missionVision?: string;
  workCulture?: string;
  hiringPhilosophy?: string;
  benefits?: string[];
  teamMembers?: any; // JSON array of managers
  galleryPhotos?: string[];
  galleryVideos?: string[];
  verificationBadges?: string[];
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User record not found.");
  }

  // Update user name/image also
  await db.user.update({
    where: { id: userId },
    data: {
      name: formData.companyName,
      ...(formData.logoUrl && { image: formData.logoUrl }),
    },
  });

  const company = await db.company.upsert({
    where: { userId },
    update: {
      companyName: formData.companyName,
      description: formData.description,
      industry: formData.industry,
      website: formData.website,
      location: formData.location,
      logoUrl: formData.logoUrl ?? "",
      companySize: formData.companySize ?? "10-50 employees",
      foundedYear: formData.foundedYear ?? 2020,
      linkedin: formData.linkedin ?? "",
      email: formData.email ?? "",
      phone: formData.phone ?? "",
      missionVision: formData.missionVision ?? "",
      workCulture: formData.workCulture ?? "",
      hiringPhilosophy: formData.hiringPhilosophy ?? "",
      benefits: formData.benefits ?? [],
      teamMembers: formData.teamMembers ?? [],
      galleryPhotos: formData.galleryPhotos ?? [],
      galleryVideos: formData.galleryVideos ?? [],
      verificationBadges: formData.verificationBadges ?? [],
    },
    create: {
      userId,
      companyName: formData.companyName,
      description: formData.description,
      industry: formData.industry,
      website: formData.website,
      location: formData.location,
      logoUrl: formData.logoUrl ?? "",
      companySize: formData.companySize ?? "10-50 employees",
      foundedYear: formData.foundedYear ?? 2020,
      linkedin: formData.linkedin ?? "",
      email: formData.email ?? "",
      phone: formData.phone ?? "",
      missionVision: formData.missionVision ?? "",
      workCulture: formData.workCulture ?? "",
      hiringPhilosophy: formData.hiringPhilosophy ?? "",
      benefits: formData.benefits ?? [],
      teamMembers: formData.teamMembers ?? [],
      galleryPhotos: formData.galleryPhotos ?? [],
      galleryVideos: formData.galleryVideos ?? [],
      verificationBadges: formData.verificationBadges ?? [],
    },
  });

  revalidatePath("/company/dashboard");
  revalidatePath("/company/profile");
  revalidatePath(`/companies/${company.id}`);
  
  return { success: true, company };
}

// Helper to toggle strings in arrays
async function toggleArrayItem(companyId: string, userId: string, field: "followers" | "watchlistUsers" | "talentCommunity" | "jobAlertsUsers") {
  const company = await db.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error("Company not found");
  }

  const currentList = (company[field] as string[]) || [];
  const exists = currentList.includes(userId);
  let updatedList: string[];

  if (exists) {
    updatedList = currentList.filter((id) => id !== userId);
  } else {
    updatedList = [...currentList, userId];
  }

  await db.company.update({
    where: { id: companyId },
    data: {
      [field]: updatedList,
    },
  });

  revalidatePath(`/companies/${companyId}`);
  return { success: true, active: !exists };
}

// 2. Toggle Follow Company
export async function toggleFollowCompany(companyId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return toggleArrayItem(companyId, session.user.id, "followers");
}

// 3. Toggle Job Alerts
export async function toggleJobAlerts(companyId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return toggleArrayItem(companyId, session.user.id, "jobAlertsUsers");
}

// 4. Toggle Watchlist
export async function toggleWatchlist(companyId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return toggleArrayItem(companyId, session.user.id, "watchlistUsers");
}

// 5. Toggle Talent Community
export async function toggleTalentCommunity(companyId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return toggleArrayItem(companyId, session.user.id, "talentCommunity");
}

// 6. Toggle Save Project
export async function toggleSaveProject(projectId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FREELANCER) {
    throw new Error("Unauthorized: Only freelancers can save projects");
  }

  const freelancer = await db.freelancer.findUnique({
    where: { userId: session.user.id },
  });

  if (!freelancer) {
    throw new Error("Freelancer profile not found");
  }

  const existingSave = await db.savedProject.findUnique({
    where: {
      freelancerId_projectId: {
        freelancerId: freelancer.id,
        projectId,
      },
    },
  });

  let saved = false;
  if (existingSave) {
    await db.savedProject.delete({
      where: { id: existingSave.id },
    });
  } else {
    await db.savedProject.create({
      data: {
        freelancerId: freelancer.id,
        projectId,
      },
    });
    saved = true;
  }

  revalidatePath("/freelancer/projects");
  revalidatePath("/freelancer/dashboard");
  
  return { success: true, saved };
}

// 7. Update Company Gallery Photos/Videos
export async function updateCompanyGallery(companyId: string, photos: string[], videos: string[]) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.COMPANY) {
    throw new Error("Unauthorized");
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
  });

  if (!company || company.userId !== session.user.id) {
    throw new Error("Unauthorized: You do not own this company profile");
  }

  const updated = await db.company.update({
    where: { id: companyId },
    data: {
      galleryPhotos: photos,
      galleryVideos: videos,
    },
  });

  revalidatePath(`/companies/${companyId}`);
  return { success: true, company: updated };
}
