"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  Pencil,
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
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      reviewsReceived: ReviewReceivedItem[];
    };
    applications: CompletedApplicationItem[];
  };
  initialSaved: boolean;
  currentUserId?: string | null;
}

export function FreelancerProfileDetail({
  freelancer,
  initialSaved,
  currentUserId,
}: FreelancerProfileDetailProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isOwnProfile = !!currentUserId && currentUserId === freelancer.user.id;

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
          dot: "bg-[#14713D]",
          badge: "bg-[#E4F7EC] text-[#147A44] border-[#BFE9D2]",
          label: "Available for Hire",
        };
      case "BUSY":
        return {
          dot: "bg-[#96620A]",
          badge: "bg-[#FFF3DC] text-[#8F5E08] border-[#F5DEB0]",
          label: "Busy / Limited",
        };
      case "UNAVAILABLE":
      default:
        return {
          dot: "bg-[#C22B2B]",
          badge: "bg-[#FDEAEA] text-[#BC2A2A] border-[#F5C2C2]",
          label: "Unavailable",
        };
    }
  };

  const avail = getAvailabilityConfig(freelancer.availabilityStatus);
  const expList = Array.isArray(freelancer.experience) ? (freelancer.experience as any[]) : [];
  const portList = Array.isArray(freelancer.portfolioItems) ? (freelancer.portfolioItems as any[]) : [];

  const getPortfolioIcon = (type: string) => {
    switch (type) {
      case "IMAGE":
        return <ImageIcon className="h-4 w-4 text-[#2159C9]" />;
      case "VIDEO":
        return <Video className="h-4 w-4 text-[#8F5E08]" />;
      case "GITHUB":
        return <FileCode className="h-4 w-4 text-[#1A1D29]" />;
      case "WEBSITE":
        return <Globe className="h-4 w-4 text-[#1A1D29]" />;
      case "CASE_STUDY":
        return <FileText className="h-4 w-4 text-[#2159C9]" />;
      default:
        return <ExternalLink className="h-4 w-4 text-[#2159C9]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-[#5B6272] hover:text-[#1A1D29] transition-colors cursor-pointer bg-white border border-[#E3E5EA] px-3.5 py-1.5 rounded-full"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to list
        </button>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2.5">
          {isOwnProfile ? (
            <Button
              onClick={() => router.push("/freelancer/profile")}
              className="text-xs font-bold h-9 bg-[#96620A] hover:bg-[#96620A] border-0 text-white rounded-full flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <Button
              onClick={handleToggleSave}
              disabled={isSaving}
              variant="outline"
              className="text-xs font-bold h-9 rounded-full flex items-center gap-1.5 cursor-pointer"
            >
              <Heart
                className={`h-4.5 w-4.5 transition-colors ${
                  isSaved ? "fill-[#D33636] text-[#BC2A2A]" : "text-[#2159C9]"
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
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-[#E8F1FE] hover:bg-[#F0F3F9] text-[#5B6272] h-9 px-4 rounded-full transition-colors border border-[#E3E5EA]/50"
            >
              <FileText className="h-4 w-4 text-[#5B6272]" />
              View Resume
            </a>
          )}
        </div>
      </div>

      {/* Main Profile Showcase Card */}
      <div className="bg-white border border-[#E3E5EA]/60 rounded-lg overflow-hidden relative">
        {/* Banner with rich gradient */}
        <div className="h-32 bg-[#152C55]" />

        <div className="px-6 pb-6 relative">
          {/* Avatar floating and overlapping banner */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-4">
            <div className="flex items-end gap-4.5">
              <button
                type="button"
                onClick={() => freelancer.user.image && setLightboxImage(freelancer.user.image)}
                disabled={!freelancer.user.image}
                className={`h-20 w-20 rounded-full bg-white border-4 border-white overflow-hidden flex items-center justify-center font-semibold text-2xl text-[#1A1D29] shrink-0 shadow-md relative ${
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
                <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-[#14713D] border-2 border-white animate-pulse" />
              </button>

              <div className="space-y-1.5 pb-1">
                <h2 className="text-xl font-semibold text-[#1A1D29] tracking-tight leading-none flex items-center gap-2">
                  {freelancer.user.name}
                </h2>
                {freelancer.professionalHeadline ? (
                  <p className="text-xs font-bold text-[#2159C9] leading-none">
                    {freelancer.professionalHeadline}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-[#2159C9] leading-none">Talentra Verified Freelancer</p>
                )}
              </div>
            </div>

            {/* Badges container */}
            <div className="flex flex-wrap gap-1.5 self-start sm:self-end pt-2 sm:pt-0">
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${avail.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${avail.dot}`} />
                {avail.label}
              </span>

              {freelancer.verificationBadges && freelancer.verificationBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 bg-[#EAF1FE]/5 text-[11px] font-semibold text-[#1A1D29] border border-[#C7CBD6]/20 px-2.5 py-0.5 rounded-full"
                >
                  <CheckCircle className="h-3 w-3 text-[#2159C9] fill-[#2E6BEA]/5" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Quick contact and response time */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-[#5B6272] pt-3 border-t border-[#E3E5EA]">
            <span className="flex items-center gap-1 text-[#2159C9]">
              <Mail className="h-3.5 w-3.5 text-[#2159C9]" />
              {freelancer.user.email}
            </span>
            {freelancer.responseTime && (
              <span className="text-[#2159C9]">
                • Response: <strong className="text-[#5B6272]">{freelancer.responseTime}</strong>
              </span>
            )}
            <span>
              • Completion Rate: <strong className="text-[#1A1D29]">{freelancer.completionRate}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Bar */}
          <Card className="p-5 border-[#E3E5EA]/60 bg-white">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[#2159C9] font-bold uppercase text-[11px] tracking-wider">Experience</p>
                <p className="text-lg font-semibold text-[#1A1D29] mt-0.5">{freelancer.experienceYears} Years</p>
              </div>
              <div className="border-x border-[#E3E5EA]">
                <p className="text-[#2159C9] font-bold uppercase text-[11px] tracking-wider">Rating Score</p>
                <p className="text-lg font-semibold text-[#1A1D29] mt-0.5 flex items-center justify-center gap-0.5">
                  <Star className="h-4.5 w-4.5 text-[#8F5E08] fill-[#B9790A]" />
                  {freelancer.rating.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-[#2159C9] font-bold uppercase text-[11px] tracking-wider">Gigs Done</p>
                <p className="text-lg font-semibold text-[#1A1D29] mt-0.5">{freelancer.completedProjects} Jobs</p>
              </div>
            </div>
          </Card>
 
          {/* Biography */}
          <Card className="p-6 border-[#E3E5EA]/60 bg-white space-y-3">
            <h3 className="text-xs font-semibold uppercase text-[#2159C9] tracking-wider">Professional Biography</h3>
            <p className="text-xs text-[#5B6272] leading-relaxed italic bg-[#F8F9FB] p-4 border border-[#C7CBD6] rounded-lg font-medium">
              &quot;{getFreelancerBioText(freelancer.bio) || "No professional biography has been provided yet."}&quot;
            </p>
          </Card>

          {/* Work History Timeline */}
          <Card className="p-6 border-[#E3E5EA]/60 bg-white space-y-4">
            <h3 className="text-xs font-semibold uppercase text-[#2159C9] tracking-wider">
              Work Experience Timeline ({expList.length})
            </h3>
            {expList.length === 0 ? (
              <p className="text-xs text-[#2159C9] italic font-medium py-3">No work history provided.</p>
            ) : (
              <div className="space-y-4">
                {expList.map((exp: any, idx: number) => (
                  <div
                    key={exp.id || idx}
                    className="p-4 bg-[#F8F9FB]/70 border border-[#E3E5EA] rounded-lg space-y-2 text-xs hover:border-[#C7CBD6] transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-[#1A1D29] text-sm">{exp.title}</h4>
                        <p className="text-[11px] text-[#2159C9] font-bold mt-0.5">{exp.company}</p>
                      </div>
                      <span className="text-[11px] font-bold text-[#5B6272] bg-white border border-[#E3E5EA] px-2.5 py-0.5 rounded-full shrink-0">
                        {exp.startDate} to {exp.current ? "Present" : exp.endDate}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-[11px] text-[#5B6272] leading-relaxed pt-1 border-t border-[#E3E5EA] mt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Portfolio gallery */}
          <Card className="p-6 border-[#E3E5EA]/60 bg-white space-y-4">
            <h3 className="text-xs font-semibold uppercase text-[#2159C9] tracking-wider">
              Portfolio Showcase Gallery ({portList.length})
            </h3>
            {portList.length === 0 ? (
              <p className="text-xs text-[#2159C9] italic font-medium py-3">No portfolio items added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portList.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="p-4 bg-[#F8F9FB]/70 border border-[#E3E5EA] rounded-lg flex flex-col justify-between space-y-3.5 hover:border-[#C7CBD6]/20 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-[#1A1D29] line-clamp-1 flex items-center gap-1.5">
                          {getPortfolioIcon(item.type)}
                          {item.title}
                        </h4>
                        <Badge variant="neutral" className="text-[11px] uppercase tracking-wider font-semibold px-1.5 py-0.5 shrink-0">
                          {item.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#5B6272] leading-relaxed font-medium line-clamp-3">
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
                              className="aspect-video bg-white border border-[#E3E5EA] rounded-full overflow-hidden h-10 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
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
                            className="w-full bg-white border border-[#C7CBD6] rounded-full overflow-hidden h-28 flex items-center justify-center cursor-zoom-in hover:brightness-95 transition-all shadow-inner mt-1"
                          >
                            <img src={item.fileUrl} alt={item.title} className="h-full w-full object-cover" />
                          </button>
                        )
                      ) : null}

                      {item.type === "VIDEO" && item.fileUrl && (
                        <div className="bg-black border border-[#1A1D29] rounded-lg overflow-hidden h-28 mt-1 flex items-center justify-center">
                          <video src={item.fileUrl} controls className="h-full w-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#E3E5EA] flex justify-end">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2159C9] hover:text-[#1A1D29] transition-colors"
                        >
                          <span>Visit link</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#2159C9] italic">No link provided</span>
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
          <Card className="p-5 border-[#E3E5EA]/60 bg-white space-y-3">
            <h3 className="text-xs font-semibold uppercase text-[#2159C9] tracking-wider">Expertise Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {freelancer.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-[11px] font-bold bg-[#152C55]/5 text-[#1A1D29] border border-[#1A1D29]/10 px-2.5 py-1 rounded-full uppercase tracking-wide"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>

          {/* Reviews Card */}
          <Card className="p-5 border-[#E3E5EA]/60 bg-white space-y-3.5">
            <h3 className="text-xs font-semibold uppercase text-[#2159C9] tracking-wider">
              Client Reviews ({freelancer.user.reviewsReceived.length})
            </h3>
            {freelancer.user.reviewsReceived.length === 0 ? (
              <p className="text-xs text-[#2159C9] italic font-medium py-2">No reviews received yet.</p>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {freelancer.user.reviewsReceived.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center border-b border-[#E3E5EA] pb-1.5">
                      <span className="font-bold text-[#1A1D29] truncate max-w-[70%]">
                        {rev.project.title}
                      </span>
                      <span className="text-[11px] font-semibold text-[#1A1D29] shrink-0">
                        {rev.rating}/5
                      </span>
                    </div>
                    <p className="text-[#5B6272] italic leading-relaxed font-medium">
                      &quot;{rev.comment}&quot;
                    </p>
                    <p className="text-[11px] text-[#2159C9] text-right font-semibold">
                      — Reviewed by {rev.reviewer.name || "Client Representative"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Platform Projects Done */}
          <Card className="p-5 border-[#E3E5EA]/60 bg-white space-y-3.5">
            <h3 className="text-xs font-semibold uppercase text-[#2159C9] tracking-wider">
              Completed Projects ({freelancer.applications.length})
            </h3>
            {freelancer.applications.length === 0 ? (
              <p className="text-xs text-[#2159C9] italic font-medium py-2">No platform projects completed yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {freelancer.applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg flex justify-between items-center text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="font-bold text-[#1A1D29] truncate">{app.project.title}</h4>
                      <p className="text-[11px] text-[#5B6272] truncate">Hired by {app.project.company.companyName}</p>
                    </div>
                    <span className="font-semibold text-[#1A1D29] shrink-0">${app.project.budget}</span>
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
          <div className="absolute inset-0 bg-[#1A1D29]/50 cursor-zoom-out" onClick={() => setLightboxImage(null)} />

          {/* Close button top right */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-[#152C55]/70 hover:bg-[#152C55] transition-colors cursor-pointer z-10"
            title="Close image overlay"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Image */}
          <div className="relative max-w-full max-h-[85vh] z-10 animate-in zoom-in-95 duration-200 rounded-lg overflow-hidden shadow-lg bg-black flex items-center justify-center">
            <img src={lightboxImage} alt="profile lightbox" className="object-contain max-h-[80vh] max-w-[90vw]" />
          </div>
        </div>
      )}
    </div>
  );
}
