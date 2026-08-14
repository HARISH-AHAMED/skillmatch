"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { fileToBase64 } from "@/lib/utils";
import { applyToProject } from "@/actions/applicationActions";
import {
  toggleFollowCompany,
  toggleJobAlerts,
  toggleWatchlist,
  toggleTalentCommunity,
  toggleSaveProject,
  updateCompanyGallery,
} from "@/actions/companyActions";
import {
  Building2,
  MapPin,
  Globe,
  Star,
  Users,
  Briefcase,
  Award,
  ShieldCheck,
  Share2,
  Bell,
  Heart,
  Calendar,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Video,
  Image as ImageIcon,
  Phone,
  Mail,
  Plus,
  X,
  Upload,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  MessageSquareQuote,
  ShieldAlert,
  Pencil,
} from "lucide-react";
import { getProjectDescriptionText, getCompanyDescriptionText, getProjectMetadataDirect, formatProjectBudget } from "@/lib/workflowHelpers";

interface CompanyProfileViewProps {
  company: {
    id: string;
    companyName: string;
    description: string | null;
    industry: string | null;
    website: string | null;
    location: string | null;
    logoUrl: string | null;
    companySize: string | null;
    foundedYear: number | null;
    linkedin: string | null;
    email: string | null;
    phone: string | null;
    missionVision: string | null;
    workCulture: string | null;
    hiringPhilosophy: string | null;
    galleryPhotos: string[];
    galleryVideos: string[];
    benefits: string[];
    teamMembers: any; // array of { name, role, photoUrl }
    verificationBadges: string[];
    bannerUrl?: string | null;
    officeLocations?: string[];
    trustScore: number;
    reputationScore: number;
    sentimentAnalysis: string | null;
    completionRate: number;
    retentionRate: number;
    paymentReliability: number;
    avgResponseTime: string | null;
    avgTimeToHire: string | null;
    hiringSuccessRate: number;
    followers: string[];
    watchlistUsers: string[];
    talentCommunity: string[];
    jobAlertsUsers: string[];
  };
  projects: any[];
  reviews: any[];
  currentUserId?: string | null;
  isCompanyOwner: boolean;
  isFreelancer: boolean;
  initialAppliedProjectIds: string[];
  initialSavedProjectIds: string[];
  initialFollowState: boolean;
  initialAlertState: boolean;
  initialWatchlistState: boolean;
  initialCommunityState: boolean;
}

export function CompanyProfileView({
  company,
  projects,
  reviews,
  currentUserId,
  isCompanyOwner,
  isFreelancer,
  initialAppliedProjectIds,
  initialSavedProjectIds,
  initialFollowState,
  initialAlertState,
  initialWatchlistState,
  initialCommunityState,
}: CompanyProfileViewProps) {
  const router = useRouter();

  // Tabs: overview, projects, reviews, gallery_team
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "reviews" | "gallery_team">("overview");

  // Premium actions states
  const [isFollowing, setIsFollowing] = useState(initialFollowState);
  const [followerCount, setFollowerCount] = useState(company.followers.length);
  const [isAlerted, setIsAlerted] = useState(initialAlertState);
  const [isWatchlisted, setIsWatchlisted] = useState(initialWatchlistState);
  const [isCommunity, setIsCommunity] = useState(initialCommunityState);

  // Open projects list & detail modals
  const [savedProjectIds, setSavedProjectIds] = useState<string[]>(initialSavedProjectIds);
  const [appliedProjectIds, setAppliedProjectIds] = useState<string[]>(initialAppliedProjectIds);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [viewingProject, setViewingProject] = useState<any | null>(null);

  // Apply dialog input
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");

  // Gallery Upload (only photos — video upload coming soon)
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>(company.galleryPhotos || []);
  const [galleryVideos] = useState<string[]>(company.galleryVideos || []);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // Zoomed Image
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Share profile
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      alert("Please log in to follow companies.");
      return;
    }
    try {
      const res = await toggleFollowCompany(company.id);
      setIsFollowing(res.active);
      setFollowerCount((prev) => (res.active ? prev + 1 : prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAlertToggle = async () => {
    if (!currentUserId) {
      alert("Please log in to subscribe to job alerts.");
      return;
    }
    try {
      const res = await toggleJobAlerts(company.id);
      setIsAlerted(res.active);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!currentUserId) {
      alert("Please log in to manage your watchlist.");
      return;
    }
    try {
      const res = await toggleWatchlist(company.id);
      setIsWatchlisted(res.active);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCommunityToggle = async () => {
    if (!currentUserId) {
      alert("Please log in to join the talent community.");
      return;
    }
    try {
      const res = await toggleTalentCommunity(company.id);
      setIsCommunity(res.active);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProjectToggle = async (projectId: string) => {
    if (!isFreelancer) {
      alert("Only freelancers can save projects.");
      return;
    }
    try {
      const res = await toggleSaveProject(projectId);
      if (res.saved) {
        setSavedProjectIds((prev) => [...prev, projectId]);
      } else {
        setSavedProjectIds((prev) => prev.filter((id) => id !== projectId));
      }
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !coverLetter.trim()) return;

    setApplying(true);
    setApplyMessage("");
    try {
      const res = await applyToProject(selectedProject.id, coverLetter);
      if (res.success) {
        setApplyMessage("Application submitted successfully!");
        setAppliedProjectIds((prev) => [...prev, selectedProject.id]);
        setCoverLetter("");
        setTimeout(() => {
          setSelectedProject(null);
          setApplyMessage("");
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setApplyMessage(err.message || "Failed to submit application.");
    } finally {
      setApplying(false);
    }
  };

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleMediaUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFile) return;

    setUploadingMedia(true);
    try {
      let finalUrl = "";
      try {
        const formData = new FormData();
        formData.append("file", mediaFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          finalUrl = url;
        } else {
          // Fallback to base64
          finalUrl = await fileToBase64(mediaFile, 5.0);
        }
      } catch (uploadErr) {
        console.warn("API Upload failed, using Base64 fallback:", uploadErr);
        finalUrl = await fileToBase64(mediaFile, 5.0);
      }

      // Only update photos (video upload is disabled)
      const updatedPhotos = [...galleryPhotos, finalUrl];
      const saveRes = await updateCompanyGallery(company.id, updatedPhotos, galleryVideos);
      if (!saveRes.success) {
        throw new Error("Failed to save gallery update in database.");
      }
      setGalleryPhotos(updatedPhotos);

      alert("Photo added to gallery!");
      setMediaFile(null);
      setMediaPreview(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to process and upload image.");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Review scores calculations
  const totalReviews = reviews.length;
  const avgCommunication = reviews.length
    ? reviews.reduce((sum, r) => sum + (r.communicationScore || 5), 0) / reviews.length
    : 5;
  const avgPayment = reviews.length
    ? reviews.reduce((sum, r) => sum + (r.paymentReliabilityScore || 5), 0) / reviews.length
    : 5;
  const avgClarity = reviews.length
    ? reviews.reduce((sum, r) => sum + (r.projectClarityScore || 5), 0) / reviews.length
    : 5;

  const teamList = Array.isArray(company.teamMembers) ? company.teamMembers : [];

  // Calculate profile completion percent dynamically
  let fieldsCount = 0;
  let filledCount = 0;
  const checkFilled = (val: any) => {
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "string") return val.trim().length > 0;
    if (typeof val === "number") return val > 0;
    return !!val;
  };
  const fieldsToCheck = {
    companyName: company.companyName,
    description: getCompanyDescriptionText(company.description),
    logoUrl: company.logoUrl,
    bannerUrl: company.bannerUrl,
    industry: company.industry,
    website: company.website,
    location: company.location,
    linkedin: company.linkedin,
    email: company.email,
    phone: company.phone,
    missionVision: company.missionVision,
    teamMembers: company.teamMembers,
    galleryPhotos: company.galleryPhotos,
    officeLocations: company.officeLocations
  };
  Object.values(fieldsToCheck).forEach((val) => {
    fieldsCount++;
    if (checkFilled(val)) filledCount++;
  });
  const completionPercent = Math.round((filledCount / fieldsCount) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back Button */}
      <div className="flex items-center">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-body hover:text-ink bg-white border border-hairline hover:border-border-strong rounded-full transition-all duration-200 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-muted" />
          <span>Back</span>
        </button>
      </div>

      {/* 1. Header Banner — LinkedIn-style */}
 <Card className="overflow-hidden">
        {/* Relative wrapper — banner + logo live here, logo sticks out below banner */}
        <div className="relative">
          {/* Banner: rounded-lg top corners, overflow-hidden clips its own content but NOT the logo sibling */}
          <div className="h-40 md:h-52 w-full overflow-hidden rounded-t-[12px] bg-[#152C55]">
            {company.bannerUrl ? (
              <img src={company.bannerUrl} alt="Company Cover Banner" className="h-full w-full object-cover" />
            ) : (
              <>
                <div className="absolute inset-0" />
                <div className="absolute right-0 top-0 opacity-[0.06] pointer-events-none">
                  <Building2 className="h-64 w-64 text-white" />
                </div>
              </>
            )}
          </div>

          {/* Logo — sibling to banner, translate-y-1/2 makes it straddle the banner edge */}
          <button
            type="button"
            onClick={() => setZoomedImage(company.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${company.companyName}`)}
            className="absolute bottom-0 left-5 md:left-8 translate-y-1/2 h-20 w-20 md:h-24 md:w-24 rounded-full bg-white p-1.5 border-4 border-white shadow-lg overflow-hidden group cursor-zoom-in z-20"
            title="Click to view full logo"
          >
            <img
              src={company.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${company.companyName}`}
              alt={company.companyName}
              className="h-full w-full object-contain rounded-md group- transition-transform duration-200"
            />
          </button>
        </div>

        {/* Content — pt accommodates logo overlap (half of logo height + gap) */}
        <div className="px-5 md:px-8 pt-14 md:pt-16 pb-5 md:pb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">

            {/* Left: name + meta — pl-24 on desktop to clear logo footprint */}
            <div className="pl-0 md:pl-28 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-ink leading-snug">{company.companyName}</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink bg-link/10 border border-link/30 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3 text-link" /> Verified
                </span>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-2 gap-y-0.5 text-muted text-xs font-medium mt-1">
                {company.industry && <span>{company.industry}</span>}
                {company.companySize && <><span className="text-border-strong">·</span><span>{company.companySize}</span></>}
                {company.location && (
                  <><span className="text-border-strong">·</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3 text-link" />{company.location}
                  </span></>
                )}
                {company.foundedYear && <><span className="text-border-strong">·</span><span>Est. {company.foundedYear}</span></>}
              </div>
            </div>

            {/* Right: action buttons — compact on mobile (icon + short label), full on desktop */}
            <div className="flex items-center justify-center md:justify-end gap-1.5 flex-wrap shrink-0">
              <button
                onClick={handleFollowToggle}
                className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 h-8 transition-all cursor-pointer ${
                  isFollowing
                    ? "bg-surface-strong text-body hover:bg-surface-strong border border-hairline"
                    : "bg-ink hover:bg-primary-active text-white"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 shrink-0 ${isFollowing ? "fill-danger text-danger" : "text-white"}`} />
                <span className="hidden sm:inline">{isFollowing ? "Following" : "Follow"}</span>
                <span className="text-[11px] opacity-70">({followerCount})</span>
              </button>

              <button
                onClick={handleAlertToggle}
                title="Job Alerts"
                className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 h-8 transition-all cursor-pointer bg-white border border-hairline text-body hover:bg-surface-soft ${isAlerted ? "bg-warning-surface text-warning border-warning-border" : ""}`}
              >
                <Bell className={`h-3.5 w-3.5 shrink-0 ${isAlerted ? "fill-star text-star" : "text-muted"}`} />
                <span className="hidden sm:inline">{isAlerted ? "Alerts On" : "Job Alerts"}</span>
              </button>

              <button
                onClick={handleWatchlistToggle}
                title="Watchlist"
                className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 h-8 transition-all cursor-pointer bg-white border border-hairline text-body hover:bg-surface-soft ${isWatchlisted ? "bg-danger-surface text-danger border-danger-border" : ""}`}
              >
                <Bookmark className={`h-3.5 w-3.5 shrink-0 ${isWatchlisted ? "fill-danger text-danger" : "text-muted"}`} />
                <span className="hidden sm:inline">{isWatchlisted ? "Saved" : "Save"}</span>
              </button>

              <button
                onClick={handleCommunityToggle}
                title="Join Talent Community"
                className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 h-8 transition-all cursor-pointer bg-white border border-hairline text-body hover:bg-surface-soft ${isCommunity ? "bg-success-surface text-success border-success-border" : ""}`}
              >
                <Users className={`h-3.5 w-3.5 shrink-0 ${isCommunity ? "text-success" : "text-muted"}`} />
                <span className="hidden sm:inline">{isCommunity ? "Member" : "Join"}</span>
              </button>

              <button
                onClick={handleShare}
                title="Share Profile"
                className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 h-8 transition-all cursor-pointer bg-white border border-hairline text-body hover:bg-surface-soft"
              >
                <Share2 className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
              </button>

              {isCompanyOwner && (
                <button
                  onClick={() => router.push("/company/profile")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 h-8 transition-all cursor-pointer bg-star hover:bg-star text-ink border-0"
                >
                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Content Tabs */}
      <Tabs
        label="Company profile sections"
        value={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        items={[
          { id: "overview", label: "Overview" },
          { id: "projects", label: "Open Gigs", count: projects.length },
          { id: "reviews", label: "Reviews & activity", count: reviews.length },
          { id: "gallery_team", label: "Office & team" },
        ]}
      />

      {/* 3. Tab Content viewports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Changes based on selected tab) */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* About section */}
 <Card className="p-8 space-y-5">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-ink">About {company.companyName}</h3>
                  <p className="text-sm text-body leading-relaxed whitespace-pre-wrap">
                    {getCompanyDescriptionText(company.description) || "No description provided yet."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-hairline text-xs">
                  {company.foundedYear && (
                    <div>
                      <span className="text-[11px] text-border-strong font-bold uppercase tracking-wider block">Founded</span>
                      <strong className="text-ink text-sm mt-0.5 block">{company.foundedYear}</strong>
                    </div>
                  )}
                  {company.companySize && (
                    <div>
                      <span className="text-[11px] text-border-strong font-bold uppercase tracking-wider block">Company Size</span>
                      <strong className="text-ink text-sm mt-0.5 block">{company.companySize}</strong>
                    </div>
                  )}
                  {company.industry && (
                    <div>
                      <span className="text-[11px] text-border-strong font-bold uppercase tracking-wider block">Industry</span>
                      <strong className="text-ink text-sm mt-0.5 block">{company.industry}</strong>
                    </div>
                  )}
                </div>
              </Card>

              {/* Core Philosophy sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="p-6 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-link" /> Mission & Vision
                  </h4>
                  <p className="text-[11px] text-muted leading-relaxed font-medium">
                    {company.missionVision || "To deliver absolute quality code and build next-generation scalable payment systems."}
                  </p>
                </Card>
 
 <Card className="p-6 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-success" /> Work Culture
                  </h4>
                  <p className="text-[11px] text-muted leading-relaxed font-medium">
                    {company.workCulture || "High ownership, asynchronous speed, extreme simplicity, and focus on craft and developer tools."}
                  </p>
                </Card>
 
 <Card className="p-6 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-link" /> Hiring Strategy
                  </h4>
                  <p className="text-[11px] text-muted leading-relaxed font-medium">
                    {company.hiringPhilosophy || "We hire proactive builders who take pride in writing robust code libraries and designing clean user experiences."}
                  </p>
                </Card>
              </div>

              {/* Office Locations */}
              {company.officeLocations && company.officeLocations.length > 0 && (
 <Card className="p-8 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-link" /> Global Office Locations
                    </h3>
                    <p className="text-xs text-muted mt-0.5">Our physical office branches and active workspace hubs</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    {company.officeLocations.map((loc, idx) => (
                      <div key={idx} className="p-4 bg-surface-soft border border-hairline rounded-lg flex items-center gap-3">
                        <div className="h-8 w-8 bg-link/10 rounded-lg flex items-center justify-center shrink-0">
                          <MapPin className="h-4 w-4 text-ink" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-ink block">{loc}</span>
                          <span className="text-[11px] text-border-strong font-bold uppercase tracking-wider">Active Office</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Perks and benefits */}
 <Card className="p-8 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Benefits & Perks</h3>
                  <p className="text-xs text-muted mt-0.5">What we offer to our teams and freelancers</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                  {(company.benefits.length ? company.benefits : [
                    "Flexible Working Hours",
                    "Remote Friendly",
                    "Fast Payments",
                    "Long-Term Opportunities",
                    "Learning Budget"
                  ]).map((perk, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-surface-soft border border-hairline rounded-lg text-xs font-bold text-body hover:bg-white/5 hover:border-link/20 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-link shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "projects" && (
            <div className="space-y-4 animate-in slide-in-from-bottom-3 duration-250">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h3 className="text-base font-bold text-ink">Open Gigs & Contracts</h3>
                  <p className="text-xs text-muted">Apply to project slots listed by the company engineering team</p>
                </div>
              </div>

              {projects.length === 0 ? (
 <Card className="p-10 text-center text-xs text-border-strong flex flex-col items-center gap-2">
                  <Briefcase className="h-10 w-10 text-border-strong" />
                  No open gigs found. Toggle notification alerts to know when the company posts.
                </Card>
              ) : (
                projects.map((project) => {
                  const hasApplied = appliedProjectIds.includes(project.id);
                  const isSaved = savedProjectIds.includes(project.id);

                  return (
 <Card
                      key={project.id}
                      className="p-6 bg-white border border-hairline/90 hover:shadow-md transition-all rounded-lg space-y-4 group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={project.status === "OPEN" ? "success" : project.status === "IN_PROGRESS" ? "warning" : "neutral"} className="text-[11px] px-2 py-0.5 font-bold uppercase tracking-wider">
                              {project.status === "OPEN" ? "Open" : project.status.replace("_", " ").toLowerCase()}
                            </Badge>
                            {project.priority === "HIGH" && <Badge variant="danger">High Priority</Badge>}
                            {project.priority === "MEDIUM" && <Badge variant="secondary">Medium Priority</Badge>}
                            <span className="text-[11px] font-semibold text-border-strong flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Posted {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-ink group-hover:text-link transition-colors">
                            {project.title}
                          </h4>
                          <span className="text-[11px] text-border-strong font-semibold uppercase block">
                            Required Experience: {project.experienceRequired} years
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-border-strong uppercase font-bold block">Gig Budget</span>
                          <span className="text-lg font-semibold text-ink">{formatProjectBudget(project)}</span>
                        </div>
                      </div>

                      <p className="text-xs text-body leading-relaxed font-medium line-clamp-3">
                        {getProjectDescriptionText(project.description)}
                      </p>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-hairline">
                        <div className="flex flex-wrap gap-1">
                          {project.requiredSkills.map((skill: string) => (
                            <Badge key={skill} variant="neutral" className="text-[11px] lowercase font-bold py-0.5">
                              {skill}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {/* Save project */}
                          <button
                            onClick={() => handleSaveProjectToggle(project.id)}
                            className={`p-2 rounded-full border cursor-pointer transition-all ${
                              isSaved
                                ? "bg-warning-surface text-warning border-warning-border"
                                : "bg-white text-border-strong hover:text-body border-hairline hover:border-border-strong"
                            }`}
                            title={isSaved ? "Unsave Project" : "Save Project"}
                          >
                            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-star" : ""}`} />
                          </button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingProject(project)}
                            className="cursor-pointer text-xs"
                          >
                            View Details
                          </Button>

                          {project.status !== "OPEN" ? (
                            <Badge variant="neutral" className="px-4 py-1.5 rounded-full font-bold text-[11px] uppercase">
                              {project.status.replace("_", " ").toLowerCase()}
                            </Badge>
                          ) : hasApplied ? (
                            <Badge variant="success" className="px-4 py-1.5 rounded-full font-bold text-[11px]">
                              Applied
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!isFreelancer) {
                                  alert("Only logged-in freelancers can apply to projects.");
                                  return;
                                }
                                setSelectedProject(project);
                              }}
                              className="cursor-pointer text-xs font-bold gap-1"
                            >
                              Apply Now <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-3 duration-250">
              {/* Rating metrics summary */}
 <Card className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Freelancer Ratings Overview</h3>
                    <p className="text-xs text-muted">Averages based on projects completed with clients</p>
                  </div>
                  <div className="text-center bg-ink text-white px-5 py-3 rounded-lg shadow-md">
                    <span className="text-2xl font-semibold">{company.reputationScore ? (company.reputationScore / 20).toFixed(1) : "5.0"}</span>
                    <span className="text-[11px] text-white/70 block font-bold">Out of 5.0</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-hairline text-center text-xs">
                  <div>
                    <span className="text-[11px] text-border-strong font-bold block uppercase tracking-wider">Communication</span>
                    <strong className="text-ink text-sm mt-0.5 block">{avgCommunication.toFixed(1)} / 5.0</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-border-strong font-bold block uppercase tracking-wider">Payment reliability</span>
                    <strong className="text-ink text-sm mt-0.5 block">{avgPayment.toFixed(1)} / 5.0</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-border-strong font-bold block uppercase tracking-wider">Project Clarity</span>
                    <strong className="text-ink text-sm mt-0.5 block">{avgClarity.toFixed(1)} / 5.0</strong>
                  </div>
                </div>
              </Card>

              {/* Review cards */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
 <Card className="p-10 text-center text-xs text-border-strong flex flex-col items-center gap-2">
                    <MessageSquare className="h-9 w-9 text-border-strong" />
                    No freelancer reviews received yet.
                  </Card>
                ) : (
                  reviews.map((rev) => (
 <Card key={rev.id} className="p-6 space-y-4 hover:shadow-md transition-all">
                      <div className="flex justify-between items-center pb-3.5 border-b border-hairline">
                        <div>
                          <h4 className="text-xs font-semibold text-ink">{rev.project.title}</h4>
                          <span className="text-[11px] text-border-strong font-semibold block mt-0.5">
                            Reviewed by {rev.reviewer.name} on {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-0.5 text-star">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`h-4 w-4 ${idx < rev.rating ? "fill-star text-star" : "text-border-strong"}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <MessageSquareQuote className="h-5 w-5 text-link shrink-0 mt-0.5" />
                        <p className="text-xs text-body font-medium italic leading-relaxed">
                          &quot;{rev.comment}&quot;
                        </p>
                      </div>
 
                      <div className="flex justify-start gap-6 pt-3 border-t border-hairline text-[11px] text-border-strong font-bold">
                        <span>Communication: {rev.communicationScore || 5}/5</span>
                        <span>Payment Speed: {rev.paymentReliabilityScore || 5}/5</span>
                        <span>Project Clarity: {rev.projectClarityScore || 5}/5</span>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "gallery_team" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-3 duration-250">
              {/* Gallery Photos & Videos */}
 <Card className="p-8 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Office & Workspace Gallery</h3>
                    <p className="text-xs text-muted">Glimpse of our work culture, events, and workspaces</p>
                  </div>
                </div>

                {/* Grid layout of photos */}
                {galleryPhotos.length === 0 && galleryVideos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-border-strong border border-dashed border-hairline rounded-lg py-12 flex flex-col items-center gap-2">
                    <ImageIcon className="h-8 w-8 text-border-strong" />
                    No gallery photos or workspace images uploaded.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {galleryPhotos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {galleryPhotos.map((url, idx) => (
                          <div
                            key={idx}
                            onClick={() => setZoomedImage(url)}
                            className="aspect-video bg-surface-soft border border-hairline rounded-lg overflow-hidden cursor-zoom-in hover:border-link/20 transition-all relative group"
                          >
                            <img
                              src={url}
                              alt={`Workspace snapshot ${idx + 1}`}
                              className="h-full w-full object-cover transition-transform duration-300 group-"
                            />
                            <div className="absolute inset-0 bg-[#1A1D29]/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    )}

                    {galleryVideos.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-hairline">
                        <span className="text-[11px] text-border-strong font-bold uppercase tracking-wider block">Company Video Showcase</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {galleryVideos.map((url, idx) => (
                            <div key={idx} className="bg-black border border-ink rounded-lg overflow-hidden aspect-video">
                              <video src={url} controls className="h-full w-full object-contain" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload gallery photos (Company Owner only) */}
                {isCompanyOwner && (
                  <form onSubmit={handleMediaUpload} className="p-5 bg-surface-soft border border-hairline rounded-lg mt-6 space-y-4 text-xs">
                    <div className="flex justify-between items-center border-b border-hairline pb-2">
                      <span className="font-bold text-ink flex items-center gap-1.5">
                        <Upload className="h-4 w-4 text-link" /> Upload Photo to Gallery
                      </span>
                      <span className="text-[11px] text-border-strong font-semibold uppercase tracking-wider">Max 5MB · Images only</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-grow w-full">
                        <div className="flex items-center justify-center border-2 border-dashed border-hairline hover:border-border-strong p-4 rounded-lg bg-white transition-colors relative cursor-pointer group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleMediaFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="text-center space-y-1">
                            <Plus className="h-5 w-5 text-border-strong mx-auto group- transition-transform" />
                            <p className="text-[11px] font-bold text-body uppercase">Select Photo</p>
                            <p className="text-[11px] text-border-strong font-semibold">PNG, JPG, WebP — max 5MB</p>
                          </div>
                        </div>
                      </div>

                      {mediaPreview && (
                        <div className="h-20 w-32 border border-hairline rounded-lg overflow-hidden shrink-0 bg-white">
                          <img src={mediaPreview} alt="preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>


                    {mediaFile && (
                      <div className="flex justify-end gap-2 border-t border-hairline pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                          disabled={uploadingMedia}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={uploadingMedia}>
                          {uploadingMedia ? "Uploading..." : "Add Photo"}
                        </Button>
                      </div>
                    )}
                  </form>
                )}
              </Card>


              {/* Team Showcase */}
 <Card className="p-8 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Meet the Team</h3>
                  <p className="text-xs text-muted">Contact points for hiring and project execution</p>
                </div>

                {teamList.length === 0 ? (
                  <div className="text-center text-xs text-border-strong py-6 border border-dashed border-hairline rounded-lg">
                    No team members listed yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamList.map((member: any, idx: number) => (
 <Card
                        key={idx}
                        className="p-5 bg-surface-soft/50 border border-hairline rounded-lg space-y-3.5 hover:shadow-md transition-shadow relative overflow-hidden"
                      >
                        {/* Member top details */}
                        <div className="flex gap-4">
                          <div className="h-16 w-16 rounded-lg bg-link/10 flex items-center justify-center font-bold text-ink text-base border border-link/20 shrink-0 overflow-hidden">
                            {member.photoUrl ? (
                              <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                            ) : (
                              member.name ? member.name[0].toUpperCase() : "T"
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="text-sm font-semibold text-ink truncate">{member.name}</h4>
                            <p className="text-[11px] text-border-strong font-bold uppercase tracking-wider truncate">{member.role}</p>
                            {member.linkedinUrl && (
                              <a
                                href={member.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-link hover:underline font-bold"
                              >
                                <Share2 className="h-3 w-3" /> LinkedIn Profile
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Member bio */}
                        {member.bio && (
                          <p className="text-xs text-muted bg-white p-3 border border-hairline rounded-lg italic leading-relaxed">
                            &quot;{member.bio}&quot;
                          </p>
                        )}

                        {/* Member skills */}
                        {member.skills && member.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {member.skills.map((skill: string, sIdx: number) => (
                              <Badge key={sIdx} variant="neutral" className="text-[11px] py-0.5 px-2 bg-white/80 border-hairline">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Right Column (Sidebar containing stats, AI Insights, hiring activity and contacts) */}
        <div className="space-y-6">
          {/* Profile Strength Score Card */}
 <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-ink/5 rounded-lg">
                <Building2 className="h-4.5 w-4.5 text-ink" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">Profile Strength</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-muted">LinkedIn Profile Score</span>
                <span className="font-semibold text-ink">{completionPercent}%</span>
              </div>
              <div className="w-full bg-surface-strong h-2 rounded-lg overflow-hidden">
                <div 
                  className="bg-[#2E6BEA] h-full rounded-lg transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-border-strong font-semibold leading-relaxed">
                {completionPercent < 80 
                  ? "Complete missing sections (cover banner, office locations, showcase details) to maximize recruiter visibility index." 
                  : "Excellent! Your company page profile has completed premium status metrics."}
              </p>
            </div>
          </Card>

          {/* AI Company Insights (Premium capability) */}
 <Card className="p-6 bg-ink text-white border-0 space-y-4 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-y-5 scale-125">
              <BrainCircuit className="h-44 w-44" />
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <div className="p-2 bg-white/10 rounded-lg border border-white/10">
                <BrainCircuit className="h-5 w-5 text-white/70" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider">AI Company Insights</h3>
            </div>
 
            {activeTab === "overview" && (
              <>
                <div className="flex justify-between items-center pt-2 relative z-10">
                  <div>
                    <span className="text-[11px] text-white/70 block uppercase font-bold tracking-wider">Company Trust Score</span>
                    <span className="text-3xl font-semibold text-white">{company.trustScore}%</span>
                  </div>
                  <div className="h-14 w-14 rounded-full border-4 border-white/10 border-t-[#C7CBD6] flex items-center justify-center font-bold text-sm relative">
                    <span>{company.trustScore}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10 text-xs relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Project Completion Rate</span>
                    <strong className="font-bold text-white/70">{company.completionRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Freelancer Retention Rate</span>
                    <strong className="font-bold text-white/70">{company.retentionRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Payment Reliability</span>
                    <strong className="font-bold text-white/70">{company.paymentReliability}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Reputation Score</span>
                    <strong className="font-bold text-white/70">{company.reputationScore}%</strong>
                  </div>
                </div>
              </>
            )}

            {activeTab === "projects" && (
              <>
                <div className="flex justify-between items-center pt-2 relative z-10">
                  <div>
                    <span className="text-[11px] text-white/70 block uppercase font-bold tracking-wider">Project Match Score</span>
                    <span className="text-3xl font-semibold text-white">96%</span>
                  </div>
                  <div className="h-14 w-14 rounded-full border-4 border-white/10 border-t-[#C7CBD6] flex items-center justify-center font-bold text-sm relative">
                    <span>96</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10 text-xs relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Active Hiring Success</span>
                    <strong className="font-bold text-white/70">{company.hiringSuccessRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Avg Project Budget</span>
                    <strong className="font-bold text-white/70">
                      ${projects.length > 0 ? Math.round(projects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0) / projects.length) : "1,200"}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Avg Time-to-Hire</span>
                    <strong className="font-bold text-white/70">{company.avgTimeToHire || "14 days"}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Response Rate</span>
                    <strong className="font-bold text-white/70">{company.avgResponseTime || "Within 1 hour"}</strong>
                  </div>
                </div>
              </>
            )}

            {activeTab === "reviews" && (
              <>
                <div className="flex justify-between items-center pt-2 relative z-10">
                  <div>
                    <span className="text-[11px] text-white/70 block uppercase font-bold tracking-wider">Review Reputation</span>
                    <span className="text-3xl font-semibold text-white">{company.reputationScore}%</span>
                  </div>
                  <div className="h-14 w-14 rounded-full border-4 border-white/10 border-t-[#C7CBD6] flex items-center justify-center font-bold text-sm relative">
                    <span>{company.reputationScore}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10 text-xs relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Communication Score</span>
                    <strong className="font-bold text-white/70">{avgCommunication.toFixed(1)} / 5.0</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Payment Promptness</span>
                    <strong className="font-bold text-white/70">{avgPayment.toFixed(1)} / 5.0</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Project Requirement Clarity</span>
                    <strong className="font-bold text-white/70">{avgClarity.toFixed(1)} / 5.0</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Total Verified Reviews</span>
                    <strong className="font-bold text-white/70">{reviews.length}</strong>
                  </div>
                </div>
              </>
            )}

            {activeTab === "gallery_team" && (
              <>
                <div className="flex justify-between items-center pt-2 relative z-10">
                  <div>
                    <span className="text-[11px] text-white/70 block uppercase font-bold tracking-wider">Culture Health Index</span>
                    <span className="text-3xl font-semibold text-white">95%</span>
                  </div>
                  <div className="h-14 w-14 rounded-full border-4 border-white/10 border-t-[#C7CBD6] flex items-center justify-center font-bold text-sm relative">
                    <span>95</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10 text-xs relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Core Team Members</span>
                    <strong className="font-bold text-white/70">{teamList.length} members</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Founded Year</span>
                    <strong className="font-bold text-white/70">{company.foundedYear || "N/A"}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Office Photos & Videos</span>
                    <strong className="font-bold text-white/70">{galleryPhotos.length + galleryVideos.length} items</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-border-strong font-medium">Benefits & Perks Listed</span>
                    <strong className="font-bold text-white/70">{company.benefits.length} benefits</strong>
                  </div>
                </div>
              </>
            )}

            {(activeTab === "overview" || activeTab === "reviews") && company.sentimentAnalysis && (
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-lg space-y-1 text-[11px] relative z-10">
                <span className="font-bold uppercase tracking-wider text-white/70 block text-[11px]">Review Sentiment Analysis</span>
                <p className="text-border-strong italic leading-relaxed">
                  &quot;{company.sentimentAnalysis}&quot;
                </p>
              </div>
            )}

            <div className="p-3.5 bg-white/5 border border-white/10 text-white/70 rounded-lg space-y-1 text-[11px] relative z-10 font-medium font-sans">
              <span className="font-bold uppercase tracking-wider text-white/70 block text-[11px] flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> AI Predictive Hiring Insight
              </span>
              <p className="leading-relaxed">
                {activeTab === "overview" && (
                  `"Companies with similar hiring patterns successfully complete 94% of projects."`
                )}
                {activeTab === "projects" && (
                  `"Gigs with detailed skill badges attract 3x higher quality applicants."`
                )}
                {activeTab === "reviews" && (
                  `"High payment promptness scores improve company profile visibility by 25%."`
                )}
                {activeTab === "gallery_team" && (
                  `"Companies presenting rich workspace media see 45% higher retention."`
                )}
              </p>
            </div>
          </Card>

          {/* Company Statistics */}
 <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                {activeTab === "overview" && "Hiring Statistics"}
                {activeTab === "projects" && "Project Statistics"}
                {activeTab === "reviews" && "Reputation Statistics"}
                {activeTab === "gallery_team" && "Culture & Team Stats"}
              </h3>
              <p className="text-xs text-muted">
                {activeTab === "overview" && "Platform performance history metrics"}
                {activeTab === "projects" && "Overview of company gig activity"}
                {activeTab === "reviews" && "Contractor ratings overview metrics"}
                {activeTab === "gallery_team" && "Office environment & details summary"}
              </p>
            </div>

            {activeTab === "overview" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg">
                  <span className="text-[11px] text-border-strong font-bold block uppercase">Total Posted Gigs</span>
                  <span className="text-lg font-semibold text-ink mt-0.5 block">{projects.length + (reviews.length || 2)}</span>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg">
                  <span className="text-[11px] text-border-strong font-bold block uppercase">Active Projects</span>
                  <span className="text-lg font-semibold text-link mt-0.5 block">{projects.length}</span>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-border-strong font-bold block uppercase">Completed Gigs</span>
                    <span className="text-lg font-semibold text-success mt-0.5 block">{reviews.length || 0} Gigs</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-border-strong font-bold block uppercase">Avg Response Time</span>
                    <span className="text-xs font-semibold text-body mt-0.5 block">{company.avgResponseTime || "Within 1 hour"}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg">
                  <span className="text-[11px] text-border-strong font-bold block uppercase">Total Gigs</span>
                  <span className="text-lg font-semibold text-ink mt-0.5 block">{projects.length}</span>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg">
                  <span className="text-[11px] text-border-strong font-bold block uppercase">Open Gigs</span>
                  <span className="text-lg font-semibold text-ink mt-0.5 block">
                    {projects.filter((p: any) => p.status === "OPEN" || p.status === "ACTIVE").length}
                  </span>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-border-strong font-bold block uppercase">Closed Gigs</span>
                    <span className="text-lg font-semibold text-muted mt-0.5 block">
                      {projects.filter((p: any) => p.status !== "OPEN" && p.status !== "ACTIVE").length}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-border-strong font-bold block uppercase">Avg Budget</span>
                    <span className="text-xs font-bold text-success mt-0.5 block">
                      ${projects.length > 0 ? Math.round(projects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0) / projects.length) : "1,200"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg">
                  <span className="text-[11px] text-border-strong font-bold block uppercase">Total Reviews</span>
                  <span className="text-lg font-semibold text-ink mt-0.5 block">{reviews.length}</span>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg">
                  <span className="text-[11px] text-border-strong font-bold block uppercase">Avg Rating</span>
                  <span className="text-lg font-semibold text-star mt-0.5 block">
                    {reviews.length ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 5), 0) / reviews.length).toFixed(1) : "5.0"}
                  </span>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-border-strong font-bold block uppercase">Rec. Rate</span>
                    <span className="text-lg font-semibold text-success mt-0.5 block">98%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-border-strong font-bold block uppercase">Review Freq.</span>
                    <span className="text-xs font-semibold text-body mt-0.5 block">Regular</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "gallery_team" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg">
                  <span className="text-[11px] text-border-strong font-bold block uppercase">Team Size</span>
                  <span className="text-lg font-semibold text-ink mt-0.5 block">{teamList.length}</span>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg">
                  <span className="text-[11px] text-border-strong font-bold block uppercase">Gallery Size</span>
                  <span className="text-lg font-semibold text-ink mt-0.5 block">{galleryPhotos.length}</span>
                </div>
                <div className="p-3 bg-surface-soft border border-hairline rounded-lg col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-border-strong font-bold block uppercase">Company Age</span>
                    <span className="text-lg font-semibold text-body mt-0.5 block">
                      {company.foundedYear ? new Date().getFullYear() - company.foundedYear + " yrs" : "N/A"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-border-strong font-bold block uppercase">Listed Perks</span>
                    <span className="text-xs font-semibold text-body mt-0.5 block">{company.benefits.length} Perks</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Hiring Activity & Skills */}
 <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider">
                {activeTab === "overview" && "Hiring Activity"}
                {activeTab === "projects" && "Project Activity"}
                {activeTab === "reviews" && "Feedback Activity"}
                {activeTab === "gallery_team" && "Culture Activity"}
              </h3>
              <p className="text-xs text-muted">
                {activeTab === "overview" && "Skills and rate indicators"}
                {activeTab === "projects" && "Bid and category trends"}
                {activeTab === "reviews" && "Contractor satisfaction indicators"}
                {activeTab === "gallery_team" && "Retention and cultural indicators"}
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              {activeTab === "overview" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Hiring Success Rate</span>
                    <strong className="text-ink font-bold text-sm">{company.hiringSuccessRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Average Time to Hire</span>
                    <strong className="text-ink font-bold text-sm">{company.avgTimeToHire || "14 days"}</strong>
                  </div>
                </>
              )}

              {activeTab === "projects" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Avg Time to Fill</span>
                    <strong className="text-ink font-bold text-sm">12 days avg</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Active Bid Frequency</span>
                    <strong className="text-ink font-bold text-sm">High (18 bids/project)</strong>
                  </div>
                </>
              )}

              {activeTab === "reviews" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Contractor Satisfaction</span>
                    <strong className="text-ink font-bold text-sm">4.9 / 5.0</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Milestone Resolution</span>
                    <strong className="text-ink font-bold text-sm">100%</strong>
                  </div>
                </>
              )}

              {activeTab === "gallery_team" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Freelancer Retention</span>
                    <strong className="text-ink font-bold text-sm">{company.retentionRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Hiring Philosophy</span>
                    <strong className="text-ink font-bold text-[11px] truncate max-w-[150px]" title={company.hiringPhilosophy || "Growth-oriented"}>
                      {company.hiringPhilosophy || "Growth-oriented"}
                    </strong>
                  </div>
                </>
              )}

              <div className="space-y-1.5 pt-2 border-t border-hairline">
                <span className="text-[11px] text-border-strong font-bold uppercase tracking-wider block">
                  {activeTab === "gallery_team" ? "Core Perks Highlight" : "Most Hired Skills"}
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeTab === "gallery_team" ? (
                    (company.benefits.length > 0 ? company.benefits.slice(0, 4) : ["Flexible Hours", "Health Wellness", "Remote Workspace"]).map((benefit) => (
                      <Badge key={benefit} variant="neutral" className="text-[11px] py-0.5 font-bold">
                        {benefit}
                      </Badge>
                    ))
                  ) : (
                    ["React", "Next.js", "UI/UX Design", "Python", "TypeScript", "PostgreSQL"].map((skill) => (
                      <Badge key={skill} variant="neutral" className="text-[11px] py-0.5 font-bold">
                        {skill}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Section */}
 <Card className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Contact & Socials</h3>
              <p className="text-xs text-muted">Official channels for direct communication</p>
            </div>

            <div className="space-y-3 text-xs">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-hairline bg-surface-soft hover:bg-surface-strong hover:border-hairline transition-colors text-body font-semibold cursor-pointer"
                >
                  <Globe className="h-4.5 w-4.5 text-link" />
                  <span className="truncate">{company.website.replace("https://", "").replace("http://", "")}</span>
                </a>
              )}

              {company.linkedin && (
                <a
                  href={company.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-hairline bg-surface-soft hover:bg-surface-strong/40 hover:border-border-strong transition-colors text-body font-semibold cursor-pointer"
                >
                  <Building2 className="h-4.5 w-4.5 text-link" />
                  <span className="truncate">LinkedIn Profile</span>
                </a>
              )}
 
              {company.email && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-hairline bg-surface-soft text-body font-semibold">
                  <Mail className="h-4.5 w-4.5 text-border-strong" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
 
              {company.phone && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-hairline bg-surface-soft text-body font-semibold">
                  <Phone className="h-4.5 w-4.5 text-border-strong" />
                  <span className="truncate">{company.phone}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Fullscreen Zoom Image overlay — an image viewer, not a dialog:
          no header, no card chrome, sized to the image. Shares the system
          scrim but stays structurally separate from Modal. */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1A1D29]/50 cursor-zoom-out" onClick={() => setZoomedImage(null)} />
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            aria-label="Close image"
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1A1D29] transition-colors hover:bg-white cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={zoomedImage}
            alt="Expanded snapshot"
            className="relative z-10 max-h-[85vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}

      {/* 5. Project Proposal Cover Letter Modal */}
      {selectedProject && (
        <Modal open onClose={() => setSelectedProject(null)} size="xl" title="Apply for Project Gig">
          <div className="space-y-4">
            <p className="text-xs text-muted mb-6 font-semibold">
              Project: <span className="text-ink">{selectedProject.title}</span>
            </p>

            {applyMessage && (
              <div
                className={`p-3 rounded-lg mb-4 text-xs font-semibold border ${
                  applyMessage.includes("submitted")
                    ? "bg-success/10 border-success-border/20 text-success"
                    : "bg-danger/10 border-danger-border/20 text-danger"
                }`}
              >
                {applyMessage}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-body">
                  Cover Letter / Proposal
                </label>
                <textarea
                  className="w-full min-h-[140px] px-4 py-2.5 rounded-md text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-hairline text-ink focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:ring-ink/20"
                  placeholder="Outline why you are the perfect contractor for this gig, and list relevant architectural/product achievements..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  required
                  disabled={applying}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProject(null)}
                  disabled={applying}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={applying} className="cursor-pointer">
                  {applying ? "Submitting Application..." : "Submit Proposal"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* 6. Open Project Details Modal */}
      {viewingProject && (
        <Modal open onClose={() => setViewingProject(null)} size="2xl">
          <div className="space-y-4">
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {viewingProject.priority === "HIGH" && <Badge variant="danger">High Priority</Badge>}
                  {viewingProject.priority === "MEDIUM" && <Badge variant="secondary">Medium Priority</Badge>}
                  {viewingProject.priority === "LOW" && <Badge variant="neutral">Low Priority</Badge>}
                </div>
                <h3 className="text-2xl font-semibold text-ink leading-tight">{viewingProject.title}</h3>
                <p className="text-sm text-muted flex items-center gap-1.5 font-medium">
                  <span className="text-ink font-semibold">{company.companyName}</span>
                  <span>•</span>
                  <span>{company.location || "Remote"}</span>
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4.5 bg-surface-soft rounded-lg border border-hairline">
                <div>
                  <span className="text-[11px] text-border-strong uppercase font-bold tracking-wider block">Budget</span>
                  <span className="text-lg font-semibold text-ink">{formatProjectBudget(viewingProject)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-border-strong uppercase font-bold tracking-wider block">Required Experience</span>
                  <span className="text-base font-bold text-ink">{viewingProject.experienceRequired} years</span>
                </div>
                <div>
                  <span className="text-[11px] text-border-strong uppercase font-bold tracking-wider block">Urgency Priority</span>
                  <span className="text-base font-bold text-ink capitalize">{viewingProject.priority.toLowerCase()}</span>
                </div>
              </div>

               {/* Description */}
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-bold text-border-strong uppercase tracking-wider">Project Description</h4>
                <p className="text-sm text-body leading-relaxed whitespace-pre-wrap font-medium">
                  {getProjectDescriptionText(viewingProject.description)}
                </p>
              </div>

              {/* Extra Details if JSON metadata exists */}
              {(() => {
                const meta = getProjectMetadataDirect(viewingProject.description);
                const hasObjectives = meta.objectives && meta.objectives.length > 0;
                const hasDeliverables = meta.deliverables && meta.deliverables.length > 0;
                
                if (!hasObjectives && !hasDeliverables) return null;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-left">
                    {hasObjectives && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-border-strong uppercase tracking-wider">Key Objectives</h4>
                        <ul className="list-disc pl-4 text-xs text-body space-y-1">
                          {meta.objectives.map((obj, i) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hasDeliverables && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-border-strong uppercase tracking-wider">Expected Deliverables</h4>
                        <ul className="list-disc pl-4 text-xs text-body space-y-1">
                          {meta.deliverables.map((del, i) => (
                            <li key={i}>{del}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Required Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-border-strong uppercase tracking-wider">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingProject.requiredSkills.map((skill: string) => (
                    <Badge key={skill} variant="neutral" className="text-xs py-1 px-3">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
                <Button
                  variant="outline"
                  onClick={() => setViewingProject(null)}
                  className="cursor-pointer text-xs"
                >
                  Close
                </Button>
                {viewingProject.status !== "OPEN" ? (
                  <Badge variant="neutral" className="px-6 py-2.5 rounded-full text-xs font-semibold uppercase">
                    {viewingProject.status.replace("_", " ").toLowerCase()}
                  </Badge>
                ) : appliedProjectIds.includes(viewingProject.id) ? (
                  <Badge variant="success" className="px-6 py-2.5 rounded-full text-xs font-semibold">
                    Applied
                  </Badge>
                ) : (
                  <Button
                    onClick={() => {
                      if (!isFreelancer) {
                        alert("Only logged-in freelancers can apply to projects.");
                        return;
                      }
                      setSelectedProject(viewingProject);
                      setViewingProject(null);
                    }}
                    className="cursor-pointer text-xs font-bold gap-1.5"
                  >
                    Apply Now <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
