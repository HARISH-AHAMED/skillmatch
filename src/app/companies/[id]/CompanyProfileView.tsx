"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
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

  // Gallery Upload (only visible to owner)
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>(company.galleryPhotos || []);
  const [galleryVideos, setGalleryVideos] = useState<string[]>(company.galleryVideos || []);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadType, setUploadType] = useState<"PHOTO" | "VIDEO">("PHOTO");
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
      const limit = uploadType === "VIDEO" ? 3.0 : 1.5;
      const fileUrl = await fileToBase64(mediaFile, limit);

      // Update database profile gallery lists
      const updatedPhotos = uploadType === "PHOTO" ? [...galleryPhotos, fileUrl] : galleryPhotos;
      const updatedVideos = uploadType === "VIDEO" ? [...galleryVideos, fileUrl] : galleryVideos;

      const saveRes = await updateCompanyGallery(company.id, updatedPhotos, updatedVideos);
      if (!saveRes.success) {
        throw new Error("Failed to save gallery update in database.");
      }

      if (uploadType === "PHOTO") {
        setGalleryPhotos(updatedPhotos);
      } else {
        setGalleryVideos(updatedVideos);
      }

      alert("Media added to gallery successfully!");
      setMediaFile(null);
      setMediaPreview(null);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to upload file.");
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back Button */}
      <div className="flex items-center">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-slate-600 hover:text-[#002d59] bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
          <span>Back</span>
        </button>
      </div>

      {/* 1. Header Banner */}
      <Card className="overflow-hidden bg-gradient-to-r from-[#002d59] to-[#0a4885] border-0 text-white relative shadow-xl rounded-3xl">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-20 -translate-y-10 scale-150">
          <Building2 className="h-96 w-96 text-white" />
        </div>
        <div className="p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
          {/* Logo & Basic Info */}
          <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6">
            <button
              type="button"
              onClick={() => setZoomedImage(company.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${company.companyName}`)}
              className="h-24 w-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shadow-2xl relative overflow-hidden group cursor-zoom-in hover:brightness-95 transition-all"
              title="Click to view full logo"
            >
              <img
                src={company.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${company.companyName}`}
                alt={company.companyName}
                className="h-full w-full object-contain rounded-2xl group-hover:scale-105 transition-transform"
              />
            </button>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{company.companyName}</h1>
                <Badge variant="accent" className="bg-sky-400/20 text-sky-200 border-sky-300/30 flex items-center gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3 text-sky-300 fill-sky-300/10" /> Verified Company
                </Badge>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-4 gap-y-1.5 text-slate-200 text-xs font-medium">
                <span>{company.industry || "General Industry"}</span>
                <span>•</span>
                <span>{company.companySize || "10-50 Employees"}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 opacity-80" />
                  {company.location || "Remote"}
                </span>
                {company.foundedYear && (
                  <>
                    <span>•</span>
                    <span>Founded {company.foundedYear}</span>
                  </>
                )}
              </div>

              {/* Badges Grid (Header) */}
              <div className="flex flex-wrap gap-1 pt-1 justify-center md:justify-start">
                {company.verificationBadges.map((badge, idx) => (
                  <Badge
                    key={idx}
                    className="text-[9px] font-bold uppercase tracking-wider bg-white/5 border-white/10 text-slate-100 py-0.5 px-2"
                  >
                    ✓ {badge}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons (Follow, Watchlist, Alert, Community) */}
          <div className="flex flex-wrap justify-center gap-2 max-w-sm">
            <Button
              variant={isFollowing ? "outline" : "primary"}
              onClick={handleFollowToggle}
              className={`text-xs gap-1.5 cursor-pointer rounded-xl font-bold border-white/25 hover:border-white ${
                isFollowing ? "bg-white/15 text-white hover:bg-white/20" : "bg-[#3ac0ff] hover:bg-[#3ac0ff]/90 text-white"
              }`}
            >
              <Heart className={`h-4 w-4 ${isFollowing ? "fill-white text-white" : "text-white"}`} />
              {isFollowing ? "Following" : "Follow"} ({followerCount})
            </Button>

            <Button
              variant="outline"
              onClick={handleAlertToggle}
              className={`text-xs gap-1.5 cursor-pointer rounded-xl font-bold bg-white/5 border-white/20 text-white hover:bg-white/10 ${
                isAlerted ? "bg-amber-400/20 text-amber-200 border-amber-400/30" : ""
              }`}
              title="Job Alerts"
            >
              <Bell className={`h-4 w-4 ${isAlerted ? "fill-amber-300" : ""}`} />
              {isAlerted ? "Alerts On" : "Job Alerts"}
            </Button>

            <Button
              variant="outline"
              onClick={handleWatchlistToggle}
              className={`text-xs gap-1.5 cursor-pointer rounded-xl font-bold bg-white/5 border-white/20 text-white hover:bg-white/10 ${
                isWatchlisted ? "bg-rose-400/20 text-rose-200 border-rose-400/30" : ""
              }`}
              title="Watchlist"
            >
              <Bookmark className={`h-4 w-4 ${isWatchlisted ? "fill-rose-300 text-rose-300" : ""}`} />
              {isWatchlisted ? "Watchlisted" : "Watchlist"}
            </Button>

            <Button
              variant="outline"
              onClick={handleCommunityToggle}
              className={`text-xs gap-1.5 cursor-pointer rounded-xl font-bold bg-white/5 border-white/20 text-white hover:bg-white/10 ${
                isCommunity ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30" : ""
              }`}
              title="Talent Community"
            >
              <Users className="h-4 w-4" />
              {isCommunity ? "Community Joined" : "Join Talent"}
            </Button>

            <Button
              variant="outline"
              onClick={handleShare}
              className="text-xs gap-1.5 cursor-pointer rounded-xl font-bold bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
              {copied ? "Link Copied!" : "Share Profile"}
            </Button>

            {/* Edit Profile — only visible to company owner */}
            {isCompanyOwner && (
              <Button
                onClick={() => router.push("/company/profile")}
                className="text-xs gap-1.5 cursor-pointer rounded-xl font-bold bg-amber-400 hover:bg-amber-500 text-[#002d59] border-0 shadow-md"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 2. Content Tabs */}
      <div className="flex border-b border-slate-200 gap-6 pb-2.5 overflow-x-auto scrollbar-none whitespace-nowrap">
        {[
          { id: "overview", label: "Overview", count: null },
          { id: "projects", label: "Open Gigs", count: projects.length },
          { id: "reviews", label: "Reviews & activity", count: reviews.length },
          { id: "gallery_team", label: "Office & team", count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`text-sm font-extrabold pb-2 transition-all cursor-pointer border-b-2 px-1 flex items-center gap-1.5 uppercase tracking-wide shrink-0 ${
              activeTab === tab.id
                ? "border-[#002d59] text-[#002d59] font-black"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-[#002d59] text-white" : "bg-slate-100 text-slate-500"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 3. Tab Content viewports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Changes based on selected tab) */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* About section */}
              <Card className="p-8 bg-white border border-slate-100 shadow-sm space-y-5 rounded-3xl">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#002d59]">About {company.companyName}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {company.description || "No description provided yet."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-slate-100 text-xs">
                  {company.foundedYear && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Founded</span>
                      <strong className="text-slate-800 text-sm mt-0.5 block">{company.foundedYear}</strong>
                    </div>
                  )}
                  {company.companySize && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Company Size</span>
                      <strong className="text-slate-800 text-sm mt-0.5 block">{company.companySize}</strong>
                    </div>
                  )}
                  {company.industry && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Industry</span>
                      <strong className="text-slate-800 text-sm mt-0.5 block">{company.industry}</strong>
                    </div>
                  )}
                </div>
              </Card>

              {/* Core Philosophy sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-white border border-slate-100 shadow-sm space-y-2.5 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#002d59] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-sky-500" /> Mission & Vision
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {company.missionVision || "To deliver absolute quality code and build next-generation scalable payment systems."}
                  </p>
                </Card>
 
                <Card className="p-6 bg-white border border-slate-100 shadow-sm space-y-2.5 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#002d59] flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-500" /> Work Culture
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {company.workCulture || "High ownership, asynchronous speed, extreme simplicity, and focus on craft and developer tools."}
                  </p>
                </Card>
 
                <Card className="p-6 bg-white border border-slate-100 shadow-sm space-y-2.5 rounded-2xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#002d59] flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-indigo-500" /> Hiring Strategy
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {company.hiringPhilosophy || "We hire proactive builders who take pride in writing robust code libraries and designing clean user experiences."}
                  </p>
                </Card>
              </div>

              {/* Perks and benefits */}
              <Card className="p-8 bg-white border border-slate-100 shadow-sm space-y-4 rounded-3xl">
                <div>
                  <h3 className="text-sm font-extrabold text-[#002d59] uppercase tracking-wider">Benefits & Perks</h3>
                  <p className="text-xs text-slate-500 mt-0.5">What we offer to our teams and freelancers</p>
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
                      className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 hover:bg-sky-50/20 hover:border-sky-200 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0" />
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
                  <h3 className="text-base font-bold text-[#002d59]">Open Gigs & Contracts</h3>
                  <p className="text-xs text-slate-500">Apply to project slots listed by the company engineering team</p>
                </div>
              </div>

              {projects.length === 0 ? (
                <Card className="p-10 text-center text-xs text-slate-400 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-2">
                  <Briefcase className="h-10 w-10 text-slate-400" />
                  No open gigs found. Toggle notification alerts to know when the company posts.
                </Card>
              ) : (
                projects.map((project) => {
                  const hasApplied = appliedProjectIds.includes(project.id);
                  const isSaved = savedProjectIds.includes(project.id);

                  return (
                    <Card
                      key={project.id}
                      className="p-6 bg-white border border-slate-100/90 shadow-sm hover:shadow-md transition-all rounded-3xl space-y-4 group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={project.status === "OPEN" ? "success" : project.status === "IN_PROGRESS" ? "warning" : "neutral"} className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">
                              {project.status === "OPEN" ? "Open" : project.status.replace("_", " ").toLowerCase()}
                            </Badge>
                            {project.priority === "HIGH" && <Badge variant="danger">High Priority</Badge>}
                            {project.priority === "MEDIUM" && <Badge variant="secondary">Medium Priority</Badge>}
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Posted {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-[#002d59] group-hover:text-[#3ac0ff] transition-colors">
                            {project.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                            Required Experience: {project.experienceRequired} years
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Gig Budget</span>
                          <span className="text-lg font-black text-[#002d59]">${project.budget}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-3">
                        {project.description}
                      </p>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1">
                          {project.requiredSkills.map((skill: string) => (
                            <Badge key={skill} variant="neutral" className="text-[9px] lowercase font-bold py-0.5">
                              {skill}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {/* Save project */}
                          <button
                            onClick={() => handleSaveProjectToggle(project.id)}
                            className={`p-2 rounded-xl border cursor-pointer transition-all ${
                              isSaved
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-white text-slate-400 hover:text-slate-600 border-slate-200 hover:border-slate-400"
                            }`}
                            title={isSaved ? "Unsave Project" : "Save Project"}
                          >
                            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-amber-600" : ""}`} />
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
                            <Badge variant="neutral" className="px-4 py-1.5 rounded-xl font-bold text-[10px] uppercase">
                              {project.status.replace("_", " ").toLowerCase()}
                            </Badge>
                          ) : hasApplied ? (
                            <Badge variant="success" className="px-4 py-1.5 rounded-xl font-bold text-[10px]">
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
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#002d59] uppercase tracking-wider">Freelancer Ratings Overview</h3>
                    <p className="text-xs text-slate-500">Averages based on projects completed with clients</p>
                  </div>
                  <div className="text-center bg-[#002d59] text-white px-5 py-3 rounded-2xl shadow-md">
                    <span className="text-2xl font-black">{company.reputationScore ? (company.reputationScore / 20).toFixed(1) : "5.0"}</span>
                    <span className="text-[10px] text-sky-200 block font-bold">Out of 5.0</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Communication</span>
                    <strong className="text-slate-800 text-sm mt-0.5 block">{avgCommunication.toFixed(1)} / 5.0</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Payment reliability</span>
                    <strong className="text-slate-800 text-sm mt-0.5 block">{avgPayment.toFixed(1)} / 5.0</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Project Clarity</span>
                    <strong className="text-slate-800 text-sm mt-0.5 block">{avgClarity.toFixed(1)} / 5.0</strong>
                  </div>
                </div>
              </Card>

              {/* Review cards */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <Card className="p-10 text-center text-xs text-slate-400 bg-white border border-slate-100 rounded-3xl flex flex-col items-center gap-2">
                    <MessageSquare className="h-9 w-9 text-slate-300" />
                    No freelancer reviews received yet.
                  </Card>
                ) : (
                  reviews.map((rev) => (
                    <Card key={rev.id} className="p-6 bg-white border border-slate-200/60 shadow-sm rounded-3xl space-y-4 hover:shadow-md transition-all">
                      <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
                        <div>
                          <h4 className="text-xs font-black text-[#002d59]">{rev.project.title}</h4>
                          <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                            Reviewed by {rev.reviewer.name} on {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`h-4 w-4 ${idx < rev.rating ? "fill-amber-500 text-amber-500" : "text-slate-200"}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <MessageSquareQuote className="h-5 w-5 text-sky-500/70 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 font-medium italic leading-relaxed">
                          &quot;{rev.comment}&quot;
                        </p>
                      </div>
 
                      <div className="flex justify-start gap-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
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
              <Card className="p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#002d59] uppercase tracking-wider">Office & Workspace Gallery</h3>
                    <p className="text-xs text-slate-500">Glimpse of our work culture, events, and workspaces</p>
                  </div>
                </div>

                {/* Grid layout of photos */}
                {galleryPhotos.length === 0 && galleryVideos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl py-12 flex flex-col items-center gap-2">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
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
                            className="aspect-video bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden cursor-zoom-in hover:border-sky-300 transition-all relative group shadow-sm"
                          >
                            <img
                              src={url}
                              alt={`Workspace snapshot ${idx + 1}`}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    )}

                    {galleryVideos.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Company Video Showcase</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {galleryVideos.map((url, idx) => (
                            <div key={idx} className="bg-black border border-slate-900 rounded-2xl overflow-hidden aspect-video shadow-sm">
                              <video src={url} controls className="h-full w-full object-contain" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload gallery photos/videos (only available for Company Owner!) */}
                {isCompanyOwner && (
                  <form onSubmit={handleMediaUpload} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl mt-6 space-y-4 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-bold text-[#002d59] flex items-center gap-1.5">
                        <Upload className="h-4 w-4 text-sky-500" /> Upload Media to Gallery
                      </span>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="media_type"
                            checked={uploadType === "PHOTO"}
                            onChange={() => {
                              setUploadType("PHOTO");
                              setMediaFile(null);
                              setMediaPreview(null);
                            }}
                          />
                          Photo
                        </label>
                        <label className="flex items-center gap-1 font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="media_type"
                            checked={uploadType === "VIDEO"}
                            onChange={() => {
                              setUploadType("VIDEO");
                              setMediaFile(null);
                              setMediaPreview(null);
                            }}
                          />
                          Video
                        </label>
                      </div>
                                        <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="flex-grow w-full">
                        <div className="flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-400 p-4 rounded-xl bg-white transition-colors relative cursor-pointer group">
                          <input
                            type="file"
                            accept={uploadType === "PHOTO" ? "image/*" : "video/*"}
                            onChange={handleMediaFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="text-center space-y-1">
                            <Plus className="h-5 w-5 text-slate-400 mx-auto group-hover:scale-110 transition-transform" />
                            <p className="text-[10px] font-bold text-slate-600 uppercase">Select File</p>
                            <p className="text-[9px] text-slate-400 font-medium">
                              Upload {uploadType.toLowerCase()} file (Max {uploadType === "VIDEO" ? "20MB" : "5MB"})
                            </p>
                          </div>
                        </div>
                      </div>  </div>

                      {mediaPreview && uploadType === "PHOTO" && (
                        <div className="h-20 w-32 border border-slate-200 rounded-xl overflow-hidden shrink-0 bg-white relative">
                          <img src={mediaPreview} alt="preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>

                    {mediaFile && (
                      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => {
                            setMediaFile(null);
                            setMediaPreview(null);
                          }}
                          disabled={uploadingMedia}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={uploadingMedia}>
                          {uploadingMedia ? "Uploading..." : `Add ${uploadType === "PHOTO" ? "Photo" : "Video"}`}
                        </Button>
                      </div>
                    )}
                  </form>
                )}
              </Card>

              {/* Team Members */}
              <Card className="p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-5">
                <div>
                  <h3 className="text-sm font-extrabold text-[#002d59] uppercase tracking-wider">Meet the Team</h3>
                  <p className="text-xs text-slate-500">Contact points for hiring and project execution</p>
                </div>

                {teamList.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
                    No team members listed yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {teamList.map((member: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3.5"
                      >
                        <div className="h-11 w-11 rounded-xl bg-sky-100 flex items-center justify-center font-bold text-[#002d59] text-xs border border-sky-200 shrink-0 overflow-hidden">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                          ) : (
                            member.name ? member.name[0].toUpperCase() : "T"
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-[#002d59] truncate">{member.name}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Right Column (Sidebar containing stats, AI Insights, hiring activity and contacts) */}
        <div className="space-y-6">
          {/* AI Company Insights (Premium capability) */}
          <Card className="p-6 bg-[#002d59] text-white border-0 shadow-lg space-y-4 rounded-3xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-y-5 scale-125">
              <BrainCircuit className="h-44 w-44" />
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <div className="p-2 bg-sky-500/20 backdrop-blur-md rounded-xl border border-sky-300/20">
                <BrainCircuit className="h-5 w-5 text-sky-300" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">AI Company Insights</h3>
            </div>
 
            {activeTab === "overview" && (
              <>
                <div className="flex justify-between items-center pt-2 relative z-10">
                  <div>
                    <span className="text-[10px] text-sky-200 block uppercase font-bold tracking-wider">Company Trust Score</span>
                    <span className="text-3xl font-black text-white">{company.trustScore}%</span>
                  </div>
                  <div className="h-14 w-14 rounded-full border-4 border-sky-500/20 border-t-sky-400 flex items-center justify-center font-bold text-sm relative">
                    <span>{company.trustScore}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10 text-xs relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Project Completion Rate</span>
                    <strong className="font-bold text-sky-200">{company.completionRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Freelancer Retention Rate</span>
                    <strong className="font-bold text-sky-200">{company.retentionRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Payment Reliability</span>
                    <strong className="font-bold text-sky-200">{company.paymentReliability}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Reputation Score</span>
                    <strong className="font-bold text-sky-200">{company.reputationScore}%</strong>
                  </div>
                </div>
              </>
            )}

            {activeTab === "projects" && (
              <>
                <div className="flex justify-between items-center pt-2 relative z-10">
                  <div>
                    <span className="text-[10px] text-sky-200 block uppercase font-bold tracking-wider">Project Match Score</span>
                    <span className="text-3xl font-black text-white">96%</span>
                  </div>
                  <div className="h-14 w-14 rounded-full border-4 border-sky-500/20 border-t-sky-400 flex items-center justify-center font-bold text-sm relative">
                    <span>96</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10 text-xs relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Active Hiring Success</span>
                    <strong className="font-bold text-sky-200">{company.hiringSuccessRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Avg Project Budget</span>
                    <strong className="font-bold text-sky-200">
                      ${projects.length > 0 ? Math.round(projects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0) / projects.length) : "1,200"}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Avg Time-to-Hire</span>
                    <strong className="font-bold text-sky-200">{company.avgTimeToHire || "14 days"}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Response Rate</span>
                    <strong className="font-bold text-sky-200">{company.avgResponseTime || "Within 1 hour"}</strong>
                  </div>
                </div>
              </>
            )}

            {activeTab === "reviews" && (
              <>
                <div className="flex justify-between items-center pt-2 relative z-10">
                  <div>
                    <span className="text-[10px] text-sky-200 block uppercase font-bold tracking-wider">Review Reputation</span>
                    <span className="text-3xl font-black text-white">{company.reputationScore}%</span>
                  </div>
                  <div className="h-14 w-14 rounded-full border-4 border-sky-500/20 border-t-sky-400 flex items-center justify-center font-bold text-sm relative">
                    <span>{company.reputationScore}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10 text-xs relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Communication Score</span>
                    <strong className="font-bold text-sky-200">{avgCommunication.toFixed(1)} / 5.0</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Payment Promptness</span>
                    <strong className="font-bold text-sky-200">{avgPayment.toFixed(1)} / 5.0</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Project Requirement Clarity</span>
                    <strong className="font-bold text-sky-200">{avgClarity.toFixed(1)} / 5.0</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Total Verified Reviews</span>
                    <strong className="font-bold text-sky-200">{reviews.length}</strong>
                  </div>
                </div>
              </>
            )}

            {activeTab === "gallery_team" && (
              <>
                <div className="flex justify-between items-center pt-2 relative z-10">
                  <div>
                    <span className="text-[10px] text-sky-200 block uppercase font-bold tracking-wider">Culture Health Index</span>
                    <span className="text-3xl font-black text-white">95%</span>
                  </div>
                  <div className="h-14 w-14 rounded-full border-4 border-sky-500/20 border-t-sky-400 flex items-center justify-center font-bold text-sm relative">
                    <span>95</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/10 text-xs relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Core Team Members</span>
                    <strong className="font-bold text-sky-200">{teamList.length} members</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Founded Year</span>
                    <strong className="font-bold text-sky-200">{company.foundedYear || "N/A"}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Office Photos & Videos</span>
                    <strong className="font-bold text-sky-200">{galleryPhotos.length + galleryVideos.length} items</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Benefits & Perks Listed</span>
                    <strong className="font-bold text-sky-200">{company.benefits.length} benefits</strong>
                  </div>
                </div>
              </>
            )}

            {(activeTab === "overview" || activeTab === "reviews") && company.sentimentAnalysis && (
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-1 text-[11px] relative z-10">
                <span className="font-bold uppercase tracking-wider text-sky-300 block text-[9px]">Review Sentiment Analysis</span>
                <p className="text-slate-200 italic leading-relaxed">
                  &quot;{company.sentimentAnalysis}&quot;
                </p>
              </div>
            )}

            <div className="p-3.5 bg-sky-400/10 border border-sky-400/20 text-sky-100 rounded-2xl space-y-1 text-[11px] relative z-10 font-medium font-sans">
              <span className="font-bold uppercase tracking-wider text-sky-300 block text-[9px] flex items-center gap-1">
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
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#002d59] uppercase tracking-wider">
                {activeTab === "overview" && "Hiring Statistics"}
                {activeTab === "projects" && "Project Statistics"}
                {activeTab === "reviews" && "Reputation Statistics"}
                {activeTab === "gallery_team" && "Culture & Team Stats"}
              </h3>
              <p className="text-xs text-slate-500">
                {activeTab === "overview" && "Platform performance history metrics"}
                {activeTab === "projects" && "Overview of company gig activity"}
                {activeTab === "reviews" && "Contractor ratings overview metrics"}
                {activeTab === "gallery_team" && "Office environment & details summary"}
              </p>
            </div>

            {activeTab === "overview" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Posted Gigs</span>
                  <span className="text-lg font-black text-[#002d59] mt-0.5 block">{projects.length + (reviews.length || 2)}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Active Projects</span>
                  <span className="text-lg font-black text-sky-600 mt-0.5 block">{projects.length}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Completed Gigs</span>
                    <span className="text-lg font-black text-emerald-600 mt-0.5 block">{reviews.length || 0} Gigs</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Avg Response Time</span>
                    <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{company.avgResponseTime || "Within 1 hour"}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Gigs</span>
                  <span className="text-lg font-black text-[#002d59] mt-0.5 block">{projects.length}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Open Gigs</span>
                  <span className="text-lg font-black text-[#002d59] mt-0.5 block">
                    {projects.filter((p: any) => p.status === "OPEN" || p.status === "ACTIVE").length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Closed Gigs</span>
                    <span className="text-lg font-black text-slate-500 mt-0.5 block">
                      {projects.filter((p: any) => p.status !== "OPEN" && p.status !== "ACTIVE").length}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Avg Budget</span>
                    <span className="text-xs font-bold text-emerald-600 mt-0.5 block">
                      ${projects.length > 0 ? Math.round(projects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0) / projects.length) : "1,200"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Reviews</span>
                  <span className="text-lg font-black text-[#002d59] mt-0.5 block">{reviews.length}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Avg Rating</span>
                  <span className="text-lg font-black text-amber-500 mt-0.5 block">
                    {reviews.length ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 5), 0) / reviews.length).toFixed(1) : "5.0"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Rec. Rate</span>
                    <span className="text-lg font-black text-emerald-600 mt-0.5 block">98%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Review Freq.</span>
                    <span className="text-xs font-semibold text-slate-700 mt-0.5 block">Regular</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "gallery_team" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Team Size</span>
                  <span className="text-lg font-black text-[#002d59] mt-0.5 block">{teamList.length}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Gallery Size</span>
                  <span className="text-lg font-black text-[#002d59] mt-0.5 block">{galleryPhotos.length + galleryVideos.length}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl col-span-2 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Company Age</span>
                    <span className="text-lg font-black text-slate-700 mt-0.5 block">
                      {company.foundedYear ? new Date().getFullYear() - company.foundedYear + " yrs" : "N/A"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Listed Perks</span>
                    <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{company.benefits.length} Perks</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Hiring Activity & Skills */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#002d59] uppercase tracking-wider">
                {activeTab === "overview" && "Hiring Activity"}
                {activeTab === "projects" && "Project Activity"}
                {activeTab === "reviews" && "Feedback Activity"}
                {activeTab === "gallery_team" && "Culture Activity"}
              </h3>
              <p className="text-xs text-slate-500">
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
                    <span className="text-slate-500">Hiring Success Rate</span>
                    <strong className="text-slate-800 font-bold text-sm">{company.hiringSuccessRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Average Time to Hire</span>
                    <strong className="text-slate-800 font-bold text-sm">{company.avgTimeToHire || "14 days"}</strong>
                  </div>
                </>
              )}

              {activeTab === "projects" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Avg Time to Fill</span>
                    <strong className="text-slate-800 font-bold text-sm">12 days avg</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Active Bid Frequency</span>
                    <strong className="text-slate-800 font-bold text-sm">High (18 bids/project)</strong>
                  </div>
                </>
              )}

              {activeTab === "reviews" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Contractor Satisfaction</span>
                    <strong className="text-slate-800 font-bold text-sm">4.9 / 5.0</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Milestone Resolution</span>
                    <strong className="text-slate-800 font-bold text-sm">100%</strong>
                  </div>
                </>
              )}

              {activeTab === "gallery_team" && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Freelancer Retention</span>
                    <strong className="text-slate-800 font-bold text-sm">{company.retentionRate}%</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Hiring Philosophy</span>
                    <strong className="text-slate-800 font-bold text-[11px] truncate max-w-[150px]" title={company.hiringPhilosophy || "Growth-oriented"}>
                      {company.hiringPhilosophy || "Growth-oriented"}
                    </strong>
                  </div>
                </>
              )}

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {activeTab === "gallery_team" ? "Core Perks Highlight" : "Most Hired Skills"}
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeTab === "gallery_team" ? (
                    (company.benefits.length > 0 ? company.benefits.slice(0, 4) : ["Flexible Hours", "Health Wellness", "Remote Workspace"]).map((benefit) => (
                      <Badge key={benefit} variant="neutral" className="text-[9px] py-0.5 font-bold">
                        {benefit}
                      </Badge>
                    ))
                  ) : (
                    ["React", "Next.js", "UI/UX Design", "Python", "TypeScript", "PostgreSQL"].map((skill) => (
                      <Badge key={skill} variant="neutral" className="text-[9px] py-0.5 font-bold">
                        {skill}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Section */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#002d59] uppercase tracking-wider">Contact & Socials</h3>
              <p className="text-xs text-slate-500">Official channels for direct communication</p>
            </div>

            <div className="space-y-3 text-xs">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-colors text-slate-700 font-semibold cursor-pointer"
                >
                  <Globe className="h-4.5 w-4.5 text-[#3ac0ff]" />
                  <span className="truncate">{company.website.replace("https://", "").replace("http://", "")}</span>
                </a>
              )}

              {company.linkedin && (
                <a
                  href={company.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-200/40 hover:border-slate-300 transition-colors text-slate-700 font-semibold cursor-pointer"
                >
                  <Building2 className="h-4.5 w-4.5 text-blue-700" />
                  <span className="truncate">LinkedIn Profile</span>
                </a>
              )}
 
              {company.email && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-700 font-semibold">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
 
              {company.phone && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-700 font-semibold">
                  <Phone className="h-4.5 w-4.5 text-slate-400" />
                  <span className="truncate">{company.phone}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Fullscreen Zoom Image overlay */}
      {zoomedImage && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setZoomedImage(null)} />
          <div className="relative max-w-4xl max-h-[85vh] bg-white border border-slate-100 rounded-3xl p-3 z-10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={zoomedImage} alt="Expanded snapshot" className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* 5. Project Proposal Cover Letter Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedProject(null)}
          />

          <Card className="relative w-full max-w-lg p-8 z-10 border-slate-100 bg-white shadow-2xl rounded-3xl">
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-[#002d59] mb-2">Apply for Project Gig</h3>
            <p className="text-xs text-slate-500 mb-6 font-semibold">
              Project: <span className="text-[#002d59]">{selectedProject.title}</span>
            </p>

            {applyMessage && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold border ${
                  applyMessage.includes("submitted")
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                }`}
              >
                {applyMessage}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  Cover Letter / Proposal
                </label>
                <textarea
                  className="w-full min-h-[140px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
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
          </Card>
        </div>
      )}

      {/* 6. Open Project Details Modal */}
      {viewingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setViewingProject(null)}
          />

          <Card className="relative w-full max-w-2xl p-8 z-10 border-slate-100 bg-white shadow-2xl overflow-y-auto max-h-[90vh] rounded-3xl">
            <button
              onClick={() => setViewingProject(null)}
              className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {viewingProject.priority === "HIGH" && <Badge variant="danger">High Priority</Badge>}
                  {viewingProject.priority === "MEDIUM" && <Badge variant="secondary">Medium Priority</Badge>}
                  {viewingProject.priority === "LOW" && <Badge variant="neutral">Low Priority</Badge>}
                </div>
                <h3 className="text-2xl font-black text-[#002d59] leading-tight">{viewingProject.title}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                  <span className="text-slate-800 font-semibold">{company.companyName}</span>
                  <span>•</span>
                  <span>{company.location || "Remote"}</span>
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Budget</span>
                  <span className="text-lg font-black text-[#002d59]">${viewingProject.budget}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Required Experience</span>
                  <span className="text-base font-bold text-slate-800">{viewingProject.experienceRequired} years</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Urgency Priority</span>
                  <span className="text-base font-bold text-slate-800 capitalize">{viewingProject.priority.toLowerCase()}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Description</h4>
                <p className="text-sm text-slate-650 leading-relaxed whitespace-pre-wrap font-medium">
                  {viewingProject.description}
                </p>
              </div>

              {/* Required Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingProject.requiredSkills.map((skill: string) => (
                    <Badge key={skill} variant="neutral" className="text-xs py-1 px-3">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setViewingProject(null)}
                  className="cursor-pointer text-xs"
                >
                  Close
                </Button>
                {viewingProject.status !== "OPEN" ? (
                  <Badge variant="neutral" className="px-6 py-2.5 rounded-xl text-xs font-semibold uppercase">
                    {viewingProject.status.replace("_", " ").toLowerCase()}
                  </Badge>
                ) : appliedProjectIds.includes(viewingProject.id) ? (
                  <Badge variant="success" className="px-6 py-2.5 rounded-xl text-xs font-semibold">
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
          </Card>
        </div>
      )}
    </div>
  );
}
