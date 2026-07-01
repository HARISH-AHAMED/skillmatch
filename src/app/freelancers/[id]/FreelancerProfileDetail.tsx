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
          dot: "bg-emerald-500",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "Available for Hire",
        };
      case "BUSY":
        return {
          dot: "bg-amber-500",
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          label: "Busy / Limited",
        };
      case "UNAVAILABLE":
      default:
        return {
          dot: "bg-rose-500",
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          label: "Unavailable",
        };
    }
  };

  const avail = getAvailabilityConfig(freelancer.availabilityStatus);
  const expList = Array.isArray(freelancer.experience) ? (freelancer.experience as any[]) : [];
  const certList = Array.isArray(freelancer.certifications) ? (freelancer.certifications as any[]) : [];
  const portList = Array.isArray(freelancer.portfolioItems) ? (freelancer.portfolioItems as any[]) : [];

  const getPortfolioIcon = (type: string) => {
    switch (type) {
      case "IMAGE":
        return <ImageIcon className="h-4 w-4 text-indigo-500" />;
      case "VIDEO":
        return <Video className="h-4 w-4 text-amber-500" />;
      case "GITHUB":
        return <FileCode className="h-4 w-4 text-slate-800" />;
      case "WEBSITE":
        return <Globe className="h-4 w-4 text-emerald-600" />;
      case "CASE_STUDY":
        return <FileText className="h-4 w-4 text-sky-500" />;
      default:
        return <ExternalLink className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to list
        </button>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2.5">
          {isOwnProfile ? (
            <Button
              onClick={() => router.push("/freelancer/profile")}
              className="text-xs font-bold h-9 bg-amber-500 hover:bg-amber-600 border-0 text-white rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <Button
              onClick={handleToggleSave}
              disabled={isSaving}
              variant="outline"
              className="text-xs font-bold h-9 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Heart
                className={`h-4.5 w-4.5 transition-colors ${
                  isSaved ? "fill-rose-500 text-rose-500" : "text-slate-400"
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
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 h-9 px-4 rounded-xl transition-colors border border-slate-200/50 shadow-xs"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              View Resume
            </a>
          )}
        </div>
      </div>

      {/* Main Profile Showcase Card */}
      <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm relative">
        {/* Banner with rich gradient */}
        <div className="h-32 bg-gradient-to-r from-[#002d59] via-[#0b4880] to-[#3ac0ff]" />

        <div className="px-6 pb-6 relative">
          {/* Avatar floating and overlapping banner */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-4">
            <div className="flex items-end gap-4.5">
              <button
                type="button"
                onClick={() => freelancer.user.image && setLightboxImage(freelancer.user.image)}
                disabled={!freelancer.user.image}
                className={`h-20 w-20 rounded-3xl bg-white border-4 border-white overflow-hidden flex items-center justify-center font-black text-2xl text-[#002d59] shrink-0 shadow-md relative ${
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
                <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
              </button>

              <div className="space-y-1.5 pb-1">
                <h2 className="text-xl font-black text-[#002d59] tracking-tight leading-none flex items-center gap-2">
                  {freelancer.user.name}
                </h2>
                {freelancer.professionalHeadline ? (
                  <p className="text-xs font-bold text-[#3ac0ff] leading-none">
                    {freelancer.professionalHeadline}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-400 leading-none">Talentra Verified Freelancer</p>
                )}
              </div>
            </div>

            {/* Badges container */}
            <div className="flex flex-wrap gap-1.5 self-start sm:self-end pt-2 sm:pt-0">
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${avail.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${avail.dot}`} />
                {avail.label}
              </span>

              {freelancer.verificationBadges && freelancer.verificationBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 bg-sky-50 text-[9px] font-black text-[#002d59] border border-sky-100 px-2.5 py-0.5 rounded-full shadow-xs"
                >
                  <CheckCircle className="h-3 w-3 text-sky-500 fill-sky-50" />
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Quick contact and response time */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1 text-slate-400">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {freelancer.user.email}
            </span>
            {freelancer.responseTime && (
              <span className="text-slate-400">
                • Response: <strong className="text-slate-700">{freelancer.responseTime}</strong>
              </span>
            )}
            <span>
              • Completion Rate: <strong className="text-emerald-600">{freelancer.completionRate}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Bar */}
          <Card className="p-5 border-slate-200/60 shadow-xs bg-white">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Experience</p>
                <p className="text-lg font-black text-[#002d59] mt-0.5">{freelancer.experienceYears} Years</p>
              </div>
              <div className="border-x border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Rating Score</p>
                <p className="text-lg font-black text-[#002d59] mt-0.5 flex items-center justify-center gap-0.5">
                  <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-400" />
                  {freelancer.rating.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Gigs Done</p>
                <p className="text-lg font-black text-[#002d59] mt-0.5">{freelancer.completedProjects} Jobs</p>
              </div>
            </div>
          </Card>
 
          {/* Biography */}
          <Card className="p-6 border-slate-200/60 shadow-xs bg-white space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Professional Biography</h3>
            <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-4 border border-slate-200 rounded-2xl font-medium">
              &quot;{freelancer.bio || "No professional biography has been provided yet."}&quot;
            </p>
          </Card>

          {/* Work History Timeline */}
          <Card className="p-6 border-slate-200/60 shadow-xs bg-white space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Work Experience Timeline ({expList.length})
            </h3>
            {expList.length === 0 ? (
              <p className="text-xs text-slate-400 italic font-medium py-3">No work history provided.</p>
            ) : (
              <div className="space-y-4">
                {expList.map((exp: any, idx: number) => (
                  <div
                    key={exp.id || idx}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2 text-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-[#002d59] text-sm">{exp.title}</h4>
                        <p className="text-[10px] text-[#3ac0ff] font-bold mt-0.5">{exp.company}</p>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shrink-0">
                        {exp.startDate} to {exp.current ? "Present" : exp.endDate}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-slate-100 mt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Portfolio gallery */}
          <Card className="p-6 border-slate-200/60 shadow-xs bg-white space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Portfolio Showcase Gallery ({portList.length})
            </h3>
            {portList.length === 0 ? (
              <p className="text-xs text-slate-400 italic font-medium py-3">No portfolio items added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portList.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3.5 hover:border-sky-200 transition-colors shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-[#002d59] line-clamp-1 flex items-center gap-1.5">
                          {getPortfolioIcon(item.type)}
                          {item.title}
                        </h4>
                        <Badge variant="neutral" className="text-[8px] uppercase tracking-wider font-black px-1.5 py-0.5 shrink-0">
                          {item.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium line-clamp-3">
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
                              className="aspect-video bg-white border border-slate-200 rounded-lg overflow-hidden h-10 shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity"
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
                            className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden h-28 flex items-center justify-center cursor-zoom-in hover:brightness-95 transition-all shadow-inner mt-1"
                          >
                            <img src={item.fileUrl} alt={item.title} className="h-full w-full object-cover" />
                          </button>
                        )
                      ) : null}

                      {item.type === "VIDEO" && item.fileUrl && (
                        <div className="bg-black border border-slate-900 rounded-xl overflow-hidden h-28 mt-1 flex items-center justify-center">
                          <video src={item.fileUrl} controls className="h-full w-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#3ac0ff] hover:text-[#002d59] transition-colors"
                        >
                          <span>Visit link</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">No link provided</span>
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
          <Card className="p-5 border-slate-200/60 shadow-xs bg-white space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Expertise Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {freelancer.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] font-bold bg-[#002d59]/5 text-[#002d59] border border-[#002d59]/10 px-2.5 py-1 rounded-full uppercase tracking-wide"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>

          {/* Reviews Card */}
          <Card className="p-5 border-slate-200/60 shadow-xs bg-white space-y-3.5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Client Reviews ({freelancer.user.reviewsReceived.length})
            </h3>
            {freelancer.user.reviewsReceived.length === 0 ? (
              <p className="text-xs text-slate-400 italic font-medium py-2">No reviews received yet.</p>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {freelancer.user.reviewsReceived.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="font-bold text-[#002d59] truncate max-w-[70%]">
                        {rev.project.title}
                      </span>
                      <span className="text-[10px] font-extrabold text-amber-500 shrink-0">
                        {rev.rating}★
                      </span>
                    </div>
                    <p className="text-slate-600 italic leading-relaxed font-medium">
                      &quot;{rev.comment}&quot;
                    </p>
                    <p className="text-[9px] text-slate-400 text-right font-semibold">
                      — Reviewed by {rev.reviewer.name || "Client Representative"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Certifications Card */}
          <Card className="p-5 border-slate-200/60 shadow-xs bg-white space-y-3.5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Certifications ({certList.length})
            </h3>
            {certList.length === 0 ? (
              <p className="text-xs text-slate-400 italic font-medium py-2">No credentials listed.</p>
            ) : (
              <div className="space-y-3">
                {certList.map((cert: any, idx: number) => (
                  <div
                    key={cert.id || idx}
                    className="p-3 bg-slate-50/70 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs"
                  >
                    {cert.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(cert.imageUrl)}
                        className="h-10 w-10 border border-slate-200 bg-white rounded-xl overflow-hidden shrink-0 flex items-center justify-center cursor-zoom-in hover:opacity-90"
                        title="Zoom credential image"
                      >
                        <img src={cert.imageUrl} alt={cert.name} className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 shrink-0">
                        <Award className="h-4.5 w-4.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[#002d59] leading-tight truncate">{cert.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {cert.issuer} • {cert.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Platform Projects Done */}
          <Card className="p-5 border-slate-200/60 shadow-xs bg-white space-y-3.5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Completed Projects ({freelancer.applications.length})
            </h3>
            {freelancer.applications.length === 0 ? (
              <p className="text-xs text-slate-400 italic font-medium py-2">No platform projects completed yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {freelancer.applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="font-bold text-[#002d59] truncate">{app.project.title}</h4>
                      <p className="text-[10px] text-slate-500 truncate">Hired by {app.project.company.companyName}</p>
                    </div>
                    <span className="font-black text-[#002d59] shrink-0">${app.project.budget}</span>
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
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          />

          {/* Close button top right */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-slate-900/60 hover:bg-slate-900/80 transition-colors cursor-pointer z-10"
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
