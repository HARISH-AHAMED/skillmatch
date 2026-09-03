import type {
  AvailabilityStatus,
  Company,
  EducationEntry,
  Freelancer,
  PortfolioItem,
  ProjectInvite,
  TeamMember,
} from "@/lib/types";
import {
  DEFAULT_CURRENCY,
  getCompanyDescriptionText,
  getFreelancerBioText,
  parseCompanyMetadata,
  parseFreelancerMetadata,
} from "@/lib/workflowHelpers";
import type { Prisma } from "@prisma/client";
import type { CompanyRow, FreelancerRow } from "./include";
import { iso, jsonArray, opt, str } from "./scalars";
import { placeholderImage } from "@/lib/media";

/* ============================================================================
   PROFILE ADAPTERS

   The backend keeps the long tail of profile data — education, languages,
   verification flags, invites, recruiter team — inside the JSON metadata block
   appended to Freelancer.bio / Company.description. These mappers read it with
   the backend's own parsers, so the frontend never re-implements that format.
   ========================================================================= */

/** Aggregates the profile types carry but the profile rows do not store. */
export interface FreelancerExtras {
  reviewCount?: number;
  totalEarnings?: number;
  hourlyRate?: number;
  currency?: string;
}

export interface CompanyExtras {
  rating?: number;
  reviewCount?: number;
  totalHires?: number;
  totalSpend?: number;
}

/* -------------------------------------------------------------- helpers --- */

const LANGUAGE_LEVELS = ["Native", "Fluent", "Professional", "Conversational", "Basic"];

/**
 * The backend stores languages as plain strings, sometimes already carrying a
 * level in parentheses ("Spanish (Fluent)"). The profile UI wants the two parts
 * separately, so split when a level is present and default to Professional when
 * it is not.
 */
function toLanguage(raw: string): { name: string; level: string } {
  const match = raw.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (match) return { name: match[1].trim(), level: match[2].trim() };
  const known = LANGUAGE_LEVELS.find((l) => raw.toLowerCase().endsWith(" " + l.toLowerCase()));
  if (known) return { name: raw.slice(0, -known.length).trim(), level: known };
  return { name: raw.trim(), level: "Professional" };
}

/**
 * Freelancer.experience holds the rate-and-preferences settings object written
 * by `updateFreelancerCalendarAndProfile`. It is the only home the schema has
 * for a freelancer's own rate, so the profile editor owns this column and the
 * work-history list the design once captured is no longer stored (see
 * migration/EXCEPTIONS.md #1).
 *
 * Rows written before that decision hold an array of experience entries
 * instead; those read as no settings, and the rate falls back to the rate on
 * the freelancer's most recent work log.
 */
export interface ProfileSettings {
  hourlyRate?: number;
  currency?: string;
}

export function readProfileSettings(value: Prisma.JsonValue | null | undefined): ProfileSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const raw = value as Record<string, unknown>;
  const rate = Number(raw.hourlyRate);

  return {
    hourlyRate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
    currency: typeof raw.currency === "string" && raw.currency ? raw.currency : undefined,
  };
}

function toEducation(
  raw: { school: string; degree: string; fieldOfStudy: string; startYear: string; endYear: string },
  index: number,
): EducationEntry {
  return {
    id: "edu-" + index,
    school: raw.school ?? "",
    degree: raw.degree ?? "",
    field: raw.fieldOfStudy || undefined,
    startYear: raw.startYear ?? "",
    endYear: raw.endYear || undefined,
  };
}

/**
 * Portfolio entries were stored as `{ type, url, fileUrl }` before the new
 * design settled on `{ imageUrl, link, tags }`. Read both spellings.
 */
function toPortfolioItem(raw: unknown, index: number): PortfolioItem {
  const p = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(p.id ?? "pf-" + index),
    title: String(p.title ?? "Untitled"),
    description: String(p.description ?? ""),
    imageUrl: String(p.imageUrl ?? p.fileUrl ?? "") || placeholderImage(String(p.id ?? index)),
    link: p.link ? String(p.link) : p.url ? String(p.url) : undefined,
    tags: Array.isArray(p.tags) ? (p.tags as string[]) : p.type ? [String(p.type)] : [],
  };
}

function toTeamMember(raw: unknown, index: number): TeamMember {
  const t = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(t.id ?? "tm-" + index),
    name: String(t.name ?? ""),
    title: String(t.title ?? t.role ?? t.designation ?? ""),
    avatarUrl: String(t.avatarUrl ?? t.photoUrl ?? ""),
    linkedin: t.linkedin ? String(t.linkedin) : undefined,
  };
}

/**
 * Headlines are written as "Senior Designer · Berlin, DE" by the profile form.
 * Anything without that separator simply has no location to show.
 */
function extractLocation(headline: string | null | undefined): string {
  if (!headline) return "";
  const parts = headline.split(/\s+[·|—-]\s+/);
  return parts.length > 1 ? parts[parts.length - 1].trim() : "";
}

/* ----------------------------------------------------------- freelancer --- */

export function toFreelancer(row: FreelancerRow, extras: FreelancerExtras = {}): Freelancer {
  const meta = parseFreelancerMetadata(row.bio);
  const settings = readProfileSettings(row.experience);
  const badges = [...row.verificationBadges];

  // The metadata verification flags are the same badges the directory filters
  // on, so fold them into one list rather than exposing two sources of truth.
  if (meta.identityVerified && !badges.includes("Identity Verified")) badges.push("Identity Verified");
  if (meta.portfolioVerified && !badges.includes("Portfolio Verified")) badges.push("Portfolio Verified");
  if (meta.phoneVerified && !badges.includes("Phone Verified")) badges.push("Phone Verified");

  const invites: ProjectInvite[] = (meta.projectInvites ?? []).map((inv) => ({
    projectId: inv.projectId,
    projectTitle: inv.projectTitle,
    companyId: inv.companyId,
    companyName: inv.companyName,
    message: inv.message,
    roleId: inv.roleId,
    roleName: inv.roleName,
    isApprentice: inv.isApprentice,
    status: inv.status,
    invitedAt: inv.invitedAt,
    respondedAt: inv.respondedAt,
  }));

  return {
    id: row.id,
    userId: row.userId,
    name: str(row.user.name, "Freelancer"),
    email: str(row.user.email),
    avatarUrl: str(row.user.image),
    bannerUrl: row.bannerUrl || placeholderImage(row.id),
    professionalHeadline: str(row.professionalHeadline),
    bio: getFreelancerBioText(row.bio),
    // Freelancer has no location column; the profile form writes it into the
    // headline, so the directory reads it back from there when present.
    location: extractLocation(row.professionalHeadline),
    domain: str(row.domain, "Other"),
    skills: row.skills,
    experienceYears: row.experienceYears,
    rating: row.rating,
    reviewCount: extras.reviewCount ?? 0,
    completedProjects: row.completedProjects,
    completionRate: row.completionRate,
    responseTime: str(row.responseTime, "Within 24 hours"),
    availabilityStatus: (row.availabilityStatus ?? "AVAILABLE") as AvailabilityStatus,
    // The freelancer's own stated rate wins; the rate they are actually
    // engaged at, taken from their latest work log, is the fallback.
    hourlyRate: settings.hourlyRate ?? extras.hourlyRate,
    currency: settings.currency ?? extras.currency ?? DEFAULT_CURRENCY,
    languages: (meta.languages ?? []).map(toLanguage),
    verificationBadges: badges,
    portfolioUrl: opt(row.portfolioUrl),
    resumeUrl: opt(row.resumeUrl),
    education: (meta.education ?? []).map(toEducation),
    portfolioItems: jsonArray<unknown>(row.portfolioItems).map(toPortfolioItem),
    invites,
    totalEarnings: extras.totalEarnings ?? 0,
    gender: (row.gender ?? "ANY") as Freelancer["gender"],
    apprenticeScore: meta.apprenticeScore
      ? { rating: meta.apprenticeScore.rating, reviews: meta.apprenticeScore.reviews }
      : undefined,
  };
}

/* -------------------------------------------------------------- company --- */

export function toCompany(row: CompanyRow, extras: CompanyExtras = {}): Company {
  const meta = parseCompanyMetadata(row.description);

  return {
    id: row.id,
    userId: row.userId,
    companyName: row.companyName,
    email: str(row.email || row.user.email),
    logoUrl: row.logoUrl || row.user.image || placeholderImage(row.id + ":logo"),
    bannerUrl: row.bannerUrl || placeholderImage(row.id),
    description: getCompanyDescriptionText(row.description),
    industry: str(row.industry, "Other"),
    website: opt(row.website),
    location: str(row.location || meta.headquarters),
    officeLocations: row.officeLocations,
    companySize: str(row.companySize, "10-50 employees"),
    foundedYear: row.foundedYear ?? new Date().getFullYear(),
    linkedin: opt(row.linkedin),
    phone: opt(row.phone || meta.businessPhone),
    missionVision: str(row.missionVision),
    workCulture: str(row.workCulture),
    hiringPhilosophy: str(row.hiringPhilosophy),
    galleryPhotos: row.galleryPhotos,
    galleryVideos: row.galleryVideos,
    benefits: row.benefits,
    teamMembers: jsonArray<unknown>(row.teamMembers).map(toTeamMember),
    verificationBadges: row.verificationBadges,
    trustScore: row.trustScore,
    reputationScore: row.reputationScore,
    completionRate: row.completionRate,
    retentionRate: row.retentionRate,
    paymentReliability: row.paymentReliability,
    avgResponseTime: str(row.avgResponseTime, "Within 24 hours"),
    avgTimeToHire: str(row.avgTimeToHire, "14 days"),
    hiringSuccessRate: row.hiringSuccessRate,
    rating: extras.rating ?? 0,
    reviewCount: extras.reviewCount ?? 0,
    followers: row.followers,
    totalHires: extras.totalHires ?? 0,
    totalSpend: extras.totalSpend ?? 0,
  };
}

/* ------------------------------------------------------------ summaries --- */

/** The trimmed company shape embedded in Project.company. */
export function toCompanySummary(row: CompanyRow, extras: CompanyExtras = {}) {
  return {
    id: row.id,
    // The owning user, which is what a DM channel is addressed by.
    userId: row.userId,
    companyName: row.companyName,
    logoUrl: row.logoUrl || row.user.image || placeholderImage(row.id + ":logo"),
    location: str(row.location),
    industry: str(row.industry, "Other"),
    trustScore: row.trustScore,
    rating: extras.rating ?? 0,
  };
}

/** The trimmed freelancer shape embedded in Application.freelancer. */
export function toFreelancerSummary(row: FreelancerRow) {
  return {
    id: row.id,
    userId: row.userId,
    name: str(row.user.name, "Freelancer"),
    avatarUrl: str(row.user.image),
    professionalHeadline: str(row.professionalHeadline),
    skills: row.skills,
    rating: row.rating,
    experienceYears: row.experienceYears,
    location: extractLocation(row.professionalHeadline),
    completedProjects: row.completedProjects,
  };
}

/** Registration date, exposed for the admin directory tables. */
export function joinedAt(row: FreelancerRow | CompanyRow): string {
  return iso(row.user.createdAt);
}
