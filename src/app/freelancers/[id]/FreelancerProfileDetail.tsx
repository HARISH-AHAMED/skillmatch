"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toggleSaveFreelancer } from "@/actions/savedFreelancerActions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  User,
  Mail,
  Award,
  Star,
  Clock,
  X,
  Pencil,
  ExternalLink,
  Briefcase,
  CheckCircle,
  FileText,
  Heart,
  Globe,
  Image as ImageIcon,
  Video,
  FileCode,
  ArrowLeft,
} from "lucide-react";
import { getFreelancerBioText } from "@/lib/workflowHelpers";

interface ReviewReceivedItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date | string;
  reviewer: {
    name: string | null;
  };
  project: {
    title: string;
    budget: number;
  };
}

interface CompletedApplicationItem {
  id: string;
  project: {
    id: string;
    title: string;
    budget: number;
    company: {
      companyName: string;
    };
  };
}

interface FreelancerProfileDetailProps {
  freelancer: {
    id: string;
    bio: string | null;
    skills: string[];
    experienceYears: number;
    portfolioUrl: string | null;
    resumeUrl: string | null;
    rating: number;
    completedProjects: number;
    completionRate: number;
    professionalHeadline: string | null;
    experience: any;
    certifications: any;
    portfolioItems: any;
    responseTime: string | null;
    availabilityStatus: string | null;
    verificationBadges: string[];
    domain: string | null;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      createdAt: Date | string;
      reviewsReceived: ReviewReceivedItem[];
    };
    applications: CompletedApplicationItem[];
  };
  /**
   * Platform-issued credentials, verifiable at /verify/{publicId}. Kept separate
   * from the self-reported `certifications` JSON so the UI can show which ones
   * are actually backed by completed work.
   */
  earnedCertificates?: {
    publicId: string;
    roleTitle: string;
    projectTitle: string;
    issuerName: string;
    issuedAt: Date | string;
    revokedAt: Date | string | null;
  }[];
  initialSaved: boolean;
  currentUserId?: string | null;
}

export function FreelancerProfileDetail({
  freelancer,
  earnedCertificates = [],
  initialSaved,
  currentUserId,
}: FreelancerProfileDetailProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const isOwnProfile = (currentUserId || session?.user?.id) === freelancer.user.id;
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleToggleSave = async () => {
    setIsSaving(true);
    // Optimistic toggle
    setIsSaved((prev) => !prev);
    try {
      const result = await toggleSaveFreelancer(freelancer.id);
      if (result.error) {
        setIsSaved(initialSaved);
        alert(result.error);
      } else {
        router.refresh();
      }
    } catch (e) {
      setIsSaved(initialSaved);
    } finally {
      setIsSaving(false);
    }
  };

  const getAvailabilityConfig = (status: string | null) => {
    switch (status) {
      case "AVAILABLE":
        return {
          dot: "bg-success",
          badge: "bg-success-surface text-success border-success-border/40",
          label: "Available for Hire",
        };
      case "BUSY":
        return {
          dot: "bg-star",
          badge: "bg-warning-surface text-warning border-warning-border",
          label: "Busy / Limited",
        };
      case "UNAVAILABLE":
      default:
        return {
          dot: "bg-danger",
          badge: "bg-danger-surface text-danger border-danger-border",
          label: "Unavailable",
        };
    }
  };

  const avail = getAvailabilityConfig(freelancer.availabilityStatus);
  const expList = Array.isArray(freelancer.experience) ? (freelancer.experience as any[]) : [];
  const portList = Array.isArray(freelancer.portfolioItems) ? (freelancer.portfolioItems as any[]) : [];

  // Derived trust signals — the kind of aggregate proof LinkedIn/Fiverr surface
  // up front. All computed from data already on the page; no extra queries.
  const reviews = freelancer.user.reviewsReceived;

  const totalEarned = freelancer.applications.reduce(
    (sum, app) => sum + (app.project.budget || 0),
    0
  );

  const clientsServed = new Set(
    freelancer.applications.map((app) => app.project.company.companyName)
  ).size;

  // 5→1 star histogram, plus each bucket's share of the total
  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.rating) === star).length;
    return {
      star,
      count,
      pct: reviews.length ? Math.round((count / reviews.length) * 100) : 0,
    };
  });

  const memberSince = new Date(freelancer.user.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  // Past collaborators, derived from real hired contracts — a company that has
  // worked with someone twice is a stronger signal than one that hasn't.
  const pastCollabs = Object.values(
    freelancer.applications.reduce<Record<string, { name: string; count: number }>>((acc, app) => {
      const name = app.project.company.companyName;
      if (!name) return acc;
      acc[name] = { name, count: (acc[name]?.count ?? 0) + 1 };
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  const getPortfolioIcon = (type: string) => {
    switch (type) {
      case "IMAGE":
        return <ImageIcon className="h-4 w-4 text-link" />;
      case "VIDEO":
        return <Video className="h-4 w-4 text-star" />;
      case "GITHUB":
        return <FileCode className="h-4 w-4 text-ink" />;
      case "WEBSITE":
        return <Globe className="h-4 w-4 text-success" />;
      case "CASE_STUDY":
        return <FileText className="h-4 w-4 text-link" />;
      default:
        return <ExternalLink className="h-4 w-4 text-border-strong" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button + quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-medium text-ink hover:bg-surface-soft transition-colors cursor-pointer bg-white border border-hairline px-3.5 py-2 rounded-[12px] shadow-xs w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          Back to list
        </button>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isOwnProfile ? (
            <Button
              onClick={() => router.push("/freelancer/profile")}
              className="text-xs font-medium h-9 bg-ink hover:bg-body border-0 text-white rounded-[12px] flex items-center gap-1.5 cursor-pointer shadow-xs flex-1 sm:flex-none justify-center"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <Button
              onClick={handleToggleSave}
              disabled={isSaving}
              variant="outline"
              className="text-xs font-medium h-9 rounded-[12px] flex items-center gap-1.5 cursor-pointer shadow-xs flex-1 sm:flex-none justify-center border-hairline text-ink"
            >
              <Heart
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isSaved ? "fill-danger text-danger" : "text-muted"
                }`}
              />
              {isSaved ? "Saved to Bookmarks" : "Bookmark Profile"}
            </Button>
          )}

          {freelancer.resumeUrl && (
            <a
              href={freelancer.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-surface-soft hover:bg-surface-strong text-ink h-9 px-4 rounded-[12px] transition-colors border border-hairline shadow-xs flex-1 sm:flex-none"
            >
              <FileText className="h-4 w-4 text-muted shrink-0" />
              View Resume
            </a>
          )}
        </div>
      </div>


      {/* Main Profile Showcase Card */}
      <div className="bg-white border border-hairline rounded-[12px] overflow-hidden shadow-xs relative">

        {/* Banner */}
        <div className="h-36 bg-ink relative overflow-hidden">
          {/* Subtle accent hairline */}
          <div className="absolute bottom-0 inset-x-0 h-[1px] bg-hairline/20" />
        </div>

        {/* Profile content below banner */}
        <div className="px-8 pb-6 relative text-left">

          {/* Avatar row — overlaps banner by half */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
            {/* Avatar */}
            <button
              type="button"
              onClick={() => freelancer.user.image && setLightboxImage(freelancer.user.image)}
              disabled={!freelancer.user.image}
              className={`h-24 w-24 rounded-3xl bg-white border-4 border-white overflow-hidden flex items-center justify-center font-semibold text-3xl text-ink shrink-0 shadow-xl relative ${
                freelancer.user.image ? "cursor-zoom-in hover:brightness-95 transition-all" : ""
              }`}
              title={freelancer.user.image ? "Click to view full image" : undefined}
            >
              {freelancer.user.image ? (
                <img
                  src={freelancer.user.image}
                  alt={freelancer.user.name || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                freelancer.user.name ? freelancer.user.name[0].toUpperCase() : "U"
              )}
              <span className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full bg-success border-2 border-white shadow-sm" />
            </button>

            {/* Badges — aligned to right on desktop */}
            <div className="flex flex-wrap gap-1.5 self-end pb-1">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${avail.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${avail.dot}`} />
                {avail.label}
              </span>
              {freelancer.verificationBadges && freelancer.verificationBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 bg-link/5 text-[9px] font-semibold text-ink border border-link/20 px-2.5 py-1 rounded-full shadow-xs"
                >
                  <CheckCircle className="h-3 w-3 text-link fill-link/5" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Name + Headline — well below the avatar overlap zone */}
          <div className="mt-4 mb-4 space-y-1">
            <h2 className="text-2xl font-semibold text-ink tracking-tight leading-tight">
              {freelancer.user.name}
            </h2>
            {freelancer.professionalHeadline ? (
              <p className="text-sm font-semibold text-link leading-snug">
                {freelancer.professionalHeadline}
              </p>
            ) : (
              <p className="text-sm font-semibold text-border-strong leading-snug">Talentra Verified Freelancer</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              {freelancer.domain && (
                <Badge variant="secondary" className="text-[10px]">
                  <Briefcase className="h-3 w-3 mr-1 text-muted" />
                  {freelancer.domain}
                </Badge>
              )}
              <Badge variant="neutral" className="text-[10px]">
                <Clock className="h-3 w-3 mr-1 text-muted" />
                Member since {memberSince}
              </Badge>
            </div>
          </div>

          {/* Quick contact and response time */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted pt-4 border-t border-hairline">
            <span className="flex items-center gap-1.5 text-border-strong">
              <Mail className="h-3.5 w-3.5 text-border-strong" />
              {freelancer.user.email}
            </span>
            {freelancer.responseTime && (
              <span className="text-border-strong">
                • Response: <strong className="text-body">{freelancer.responseTime}</strong>
              </span>
            )}
            <span>
              • Completion Rate: <strong className="text-success">{freelancer.completionRate}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Bar */}
 <Card className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-4 text-center divide-x divide-hairline">
              <div>
                <p className="text-border-strong font-semibold uppercase text-[9px] tracking-wider">Experience</p>
                <p className="text-lg font-semibold text-ink mt-0.5">{freelancer.experienceYears} Years</p>
              </div>
              <div>
                <p className="text-border-strong font-semibold uppercase text-[9px] tracking-wider">Rating Score</p>
                <p className="text-lg font-semibold text-ink mt-0.5 flex items-center justify-center gap-0.5">
                  <Star className="h-4 w-4 text-star fill-star" />
                  {freelancer.rating.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-border-strong font-semibold uppercase text-[9px] tracking-wider">Gigs Done</p>
                <p className="text-lg font-semibold text-ink mt-0.5">{freelancer.completedProjects}</p>
              </div>
              <div>
                <p className="text-border-strong font-semibold uppercase text-[9px] tracking-wider">Value Delivered</p>
                <p className="text-lg font-semibold text-ink mt-0.5">
                  ${totalEarned.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-border-strong font-semibold uppercase text-[9px] tracking-wider">Clients Served</p>
                <p className="text-lg font-semibold text-ink mt-0.5">{clientsServed}</p>
              </div>
            </div>
          </Card>
 
          {/* Biography */}
 <Card className="p-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase text-border-strong tracking-wider">Professional Biography</h3>
            <p className="text-xs text-body leading-relaxed italic bg-surface-soft p-4 border border-hairline rounded-2xl font-medium">
              &quot;{getFreelancerBioText(freelancer.bio) || "No professional biography has been provided yet."}&quot;
            </p>
          </Card>

          {/* Work History Timeline */}
 <Card className="p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase text-border-strong tracking-wider">
              Work Experience Timeline ({expList.length})
            </h3>
            {expList.length === 0 ? (
              <p className="text-xs text-border-strong italic font-medium py-3">No work history provided.</p>
            ) : (
              <div className="space-y-4">
                {expList.map((exp: any, idx: number) => (
                  <div
                    key={exp.id || idx}
                    className="p-4 bg-surface-soft/70 border border-hairline rounded-2xl space-y-2 text-xs hover:border-border-strong transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-ink text-sm">{exp.title}</h4>
                        <p className="text-[10px] text-link font-bold mt-0.5">{exp.company}</p>
                      </div>
                      <span className="text-[9px] font-bold text-muted bg-white border border-hairline px-2.5 py-0.5 rounded-full shrink-0">
                        {exp.startDate} to {exp.current ? "Present" : exp.endDate}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-[11px] text-body leading-relaxed pt-1 border-t border-hairline mt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Portfolio gallery */}
 <Card className="p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase text-border-strong tracking-wider">
              Portfolio Showcase Gallery ({portList.length})
            </h3>
            {portList.length === 0 ? (
              <p className="text-xs text-border-strong italic font-medium py-3">No portfolio items added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portList.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="p-4 bg-surface-soft/70 border border-hairline rounded-2xl flex flex-col justify-between space-y-3.5 hover:border-link/20 transition-colors shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-ink line-clamp-1 flex items-center gap-1.5">
                          {getPortfolioIcon(item.type)}
                          {item.title}
                        </h4>
                        <Badge variant="neutral" className="text-[8px] uppercase tracking-wider font-semibold px-1.5 py-0.5 shrink-0">
                          {item.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted leading-relaxed font-medium line-clamp-3">
                        {item.description}
                      </p>

                      {/* Photo grid for zoom-in popups */}
                      {item.images && item.images.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {item.images.map((img: string, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setLightboxImage(img)}
                              className="aspect-video bg-white border border-hairline rounded-lg overflow-hidden h-10 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
                              title="Click to zoom image"
                            >
                              <img src={img} alt="screenshot" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : item.fileUrl ? (
                        item.type === "IMAGE" && (
                          <button
                            type="button"
                            onClick={() => setLightboxImage(item.fileUrl)}
                            className="w-full bg-white border border-hairline rounded-xl overflow-hidden h-28 flex items-center justify-center cursor-zoom-in hover:brightness-95 transition-all shadow-inner mt-1"
                          >
                            <img src={item.fileUrl} alt={item.title} className="h-full w-full object-cover" />
                          </button>
                        )
                      ) : null}

                      {item.type === "VIDEO" && item.fileUrl && (
                        <div className="bg-black border border-ink rounded-xl overflow-hidden h-28 mt-1 flex items-center justify-center">
                          <video src={item.fileUrl} controls className="h-full w-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-hairline flex justify-end">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-link hover:text-ink transition-colors"
                        >
                          <span>Visit link</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[9px] text-border-strong italic">No link provided</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          {/* Skills Card */}
 <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase text-border-strong tracking-wider">Expertise Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {freelancer.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] font-bold bg-ink/5 text-ink border border-ink/10 px-2.5 py-1 rounded-full uppercase tracking-wide"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>

          {/* Reviews Card */}
 <Card className="p-5 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase text-border-strong tracking-wider">
              Client Reviews ({freelancer.user.reviewsReceived.length})
            </h3>
            {freelancer.user.reviewsReceived.length === 0 ? (
              <p className="text-xs text-border-strong italic font-medium py-2">No reviews received yet.</p>
            ) : (
              <>
                {/* Rating distribution — shows whether a high average is broadly
                    earned or carried by a handful of scores. */}
                <div className="pb-3 mb-1 border-b border-hairline space-y-1.5">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-semibold text-ink leading-none">
                      {freelancer.rating.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-border-strong font-medium">
                      from {reviews.length} review{reviews.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {ratingBuckets.map((b) => (
                    <div key={b.star} className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold text-muted w-6 shrink-0 flex items-center gap-0.5">
                        {b.star}
                        <Star className="h-2.5 w-2.5 text-star fill-star" />
                      </span>
                      <div className="flex-1 h-1.5 bg-surface-soft border border-hairline rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ink rounded-full transition-all"
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-medium text-border-strong w-6 text-right shrink-0">
                        {b.count}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {freelancer.user.reviewsReceived.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 bg-surface-soft border border-hairline rounded-2xl space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center border-b border-hairline pb-1.5">
                      <span className="font-bold text-ink truncate max-w-[70%]">
                        {rev.project.title}
                      </span>
                      <span className="text-[10px] font-semibold text-ink shrink-0">
                        {rev.rating}/5
                      </span>
                    </div>
                    <p className="text-body italic leading-relaxed font-medium">
                      &quot;{rev.comment}&quot;
                    </p>
                    <p className="text-[9px] text-border-strong text-right font-semibold">
                      — Reviewed by {rev.reviewer.name || "Client Representative"}
                    </p>
                  </div>
                ))}
                </div>
              </>
            )}
          </Card>

          {/* Certifications Card */}
 <Card className="p-5 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase text-border-strong tracking-wider">
              Certifications ({earnedCertificates.length})
            </h3>
            {/* Platform-issued credentials — backed by completed contracts and
                independently verifiable, so they lead ahead of self-reported ones. */}
            {earnedCertificates.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-success uppercase tracking-wider">
                  Verified by Talentra
                </p>
                {earnedCertificates.map((cert) => (
                  <a
                    key={cert.publicId}
                    href={`/verify/${cert.publicId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block p-3 border rounded-2xl text-xs transition-colors ${
                      cert.revokedAt
                        ? "bg-danger-surface border-danger-border opacity-70"
                        : "bg-success-surface border-success-border/40 hover:border-success"
                    }`}
                    title="Open public verification page"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`h-4 w-4 shrink-0 ${cert.revokedAt ? "text-danger" : "text-success"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink truncate">{cert.roleTitle}</p>
                        <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">
                          {cert.issuerName} • {new Date(cert.issuedAt).getFullYear()}
                          {cert.revokedAt ? " • Revoked" : ""}
                        </p>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            )}

            {earnedCertificates.length === 0 && (
              <p className="text-xs text-border-strong italic font-medium py-2">No credentials listed.</p>
            )}
          </Card>

          {/* Past Collaborators — who they've actually worked with, and repeat clients */}
          {pastCollabs.length > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase text-border-strong tracking-wider">
                Past Collaborations ({pastCollabs.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {pastCollabs.map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1.5 text-[10px] font-medium bg-surface-soft text-ink border border-hairline px-2.5 py-1 rounded-full"
                    title={
                      c.count > 1
                        ? c.count + " contracts with " + c.name
                        : "1 contract with " + c.name
                    }
                  >
                    {c.name}
                    {c.count > 1 && (
                      <span className="text-[9px] font-semibold text-link">×{c.count}</span>
                    )}
                  </span>
                ))}
              </div>
              {pastCollabs.some((c) => c.count > 1) && (
                <p className="text-[10px] text-muted">
                  A ×N marker means that client hired them more than once.
                </p>
              )}
            </Card>
          )}

          {/* Platform Projects Done */}
 <Card className="p-5 space-y-3.5">
            <h3 className="text-xs font-semibold uppercase text-border-strong tracking-wider">
              Completed Projects ({freelancer.applications.length})
            </h3>
            {freelancer.applications.length === 0 ? (
              <p className="text-xs text-border-strong italic font-medium py-2">No platform projects completed yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {freelancer.applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 bg-surface-soft border border-hairline rounded-xl flex justify-between items-center text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="font-bold text-ink truncate">{app.project.title}</h4>
                      <p className="text-[10px] text-muted truncate">Hired by {app.project.company.companyName}</p>
                    </div>
                    <span className="font-semibold text-ink shrink-0">${app.project.budget}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Lightbox Zoom-In Modal Overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/80 backdrop-blur-sm cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          />

          {/* Close button top right */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-ink/70 hover:bg-ink transition-colors cursor-pointer z-10"
            title="Close image overlay"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Image */}
          <div className="relative max-w-full max-h-[85vh] z-10 animate-in zoom-in-95 duration-200 rounded-2xl overflow-hidden shadow-2xl bg-black flex items-center justify-center">
            <img src={lightboxImage} alt="profile lightbox" className="object-contain max-h-[80vh] max-w-[90vw]" />
          </div>
        </div>
      )}
    </div>
  );
}
