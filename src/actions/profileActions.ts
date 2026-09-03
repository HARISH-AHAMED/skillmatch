"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { recalculateRecommendationsForFreelancer } from "@/services/aiRecommendation";
import { revalidatePath as revalidateRoute } from "next/cache";
import { CACHE_TAGS, invalidatePublic } from "@/data/server/cache";

/**
 * PERF — the public directories and marketing pages read through a tagged
 * cache, so a mutation has to drop those entries as well as the rendered
 * routes. Wrapping revalidatePath here keeps the two in step: every existing
 * invalidation point in this file now does both.
 */
function revalidatePath(path: string) {
  revalidateRoute(path);
  invalidatePublic(CACHE_TAGS.freelancers, CACHE_TAGS.companies);
}
import { parseFreelancerMetadata, serializeFreelancerMetadata } from "@/lib/workflowHelpers";

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
  gender?: string;
  domain?: string;
  /** Profile banner. Null/empty removes it; undefined leaves it untouched. */
  bannerUrl?: string | null;
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

  // Retrieve existing metadata to avoid overwriting Streaks/Ranks
  const existingFreelancer = await db.freelancer.findUnique({ where: { userId } });
  const existingMeta = parseFreelancerMetadata(existingFreelancer?.bio);
  const fullBio = serializeFreelancerMetadata(formData.bio, existingMeta);

  // Update or create freelancer record
  const freelancer = await db.freelancer.upsert({
    where: { userId },
    update: {
      bio: fullBio,
      skills: skillsCleaned,
      experienceYears: formData.experienceYears,
      portfolioUrl: formData.portfolioUrl || "",
      // Requirement #4 — undefined leaves the existing banner alone; an empty
      // string or null clears it. Legacy profiles simply have none.
      ...(formData.bannerUrl !== undefined ? { bannerUrl: formData.bannerUrl || null } : {}),
      resumeUrl: formData.resumeUrl || "",
      professionalHeadline: formData.professionalHeadline || "",
      experience: formData.experience || [],
      certifications: formData.certifications || [],
      portfolioItems: formData.portfolioItems || [],
      responseTime: formData.responseTime || "Within 24 hours",
      availabilityStatus: formData.availabilityStatus || "AVAILABLE",
      verificationBadges: formData.verificationBadges || [],
      gender: formData.gender || "ANY",
      domain: formData.domain || "Other",
    },
    create: {
      userId,
      bio: fullBio,
      skills: skillsCleaned,
      experienceYears: formData.experienceYears,
      portfolioUrl: formData.portfolioUrl || "",
      // Requirement #4 — undefined leaves the existing banner alone; an empty
      // string or null clears it. Legacy profiles simply have none.
      ...(formData.bannerUrl !== undefined ? { bannerUrl: formData.bannerUrl || null } : {}),
      resumeUrl: formData.resumeUrl || "",
      professionalHeadline: formData.professionalHeadline || "",
      experience: formData.experience || [],
      certifications: formData.certifications || [],
      portfolioItems: formData.portfolioItems || [],
      responseTime: formData.responseTime || "Within 24 hours",
      availabilityStatus: formData.availabilityStatus || "AVAILABLE",
      verificationBadges: formData.verificationBadges || [],
      gender: formData.gender || "ANY",
      domain: formData.domain || "Other",
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
  bannerUrl?: string;
  logoUrl?: string;
  companySize?: string;
  foundedYear?: number;
  linkedin?: string;
  email?: string;
  phone?: string;
  missionVision?: string;
  workCulture?: string;
  hiringPhilosophy?: string;
  galleryPhotos?: string[];
  benefits?: string[];
  teamMembers?: any;
  officeLocations?: string[];
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
      bannerUrl: formData.bannerUrl ?? "",
      logoUrl: formData.logoUrl ?? "",
      companySize: formData.companySize ?? "10-50 employees",
      foundedYear: formData.foundedYear ? Number(formData.foundedYear) : 2020,
      linkedin: formData.linkedin ?? "",
      email: formData.email ?? "",
      phone: formData.phone ?? "",
      missionVision: formData.missionVision ?? "",
      workCulture: formData.workCulture ?? "",
      hiringPhilosophy: formData.hiringPhilosophy ?? "",
      galleryPhotos: formData.galleryPhotos ?? [],
      benefits: formData.benefits ?? [],
      teamMembers: formData.teamMembers ?? [],
      officeLocations: formData.officeLocations ?? [],
    },
    create: {
      userId,
      companyName: formData.companyName,
      description: formData.description,
      industry: formData.industry,
      website: formData.website,
      location: formData.location,
      bannerUrl: formData.bannerUrl ?? "",
      logoUrl: formData.logoUrl ?? "",
      companySize: formData.companySize ?? "10-50 employees",
      foundedYear: formData.foundedYear ? Number(formData.foundedYear) : 2020,
      linkedin: formData.linkedin ?? "",
      email: formData.email ?? "",
      phone: formData.phone ?? "",
      missionVision: formData.missionVision ?? "",
      workCulture: formData.workCulture ?? "",
      hiringPhilosophy: formData.hiringPhilosophy ?? "",
      galleryPhotos: formData.galleryPhotos ?? [],
      benefits: formData.benefits ?? [],
      teamMembers: formData.teamMembers ?? [],
      officeLocations: formData.officeLocations ?? [],
    },
  });

  revalidatePath("/company/dashboard");
  revalidatePath(`/companies/${company.id}`);
  return { success: true, company };
}
