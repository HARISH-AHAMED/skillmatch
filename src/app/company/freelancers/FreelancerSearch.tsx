"use client";

import React, { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Search,
  SlidersHorizontal,
  Star,
  Briefcase,
  Clock,
  CheckCircle,
  Award,
  User,
  Mail,
  ExternalLink,
  X,
  ChevronDown,
  Zap,
  Filter,
  BarChart3,
  FileText,
  Image as ImageIcon,
  Globe,
  FileCode,
  Video,
  Heart,
  LayoutGrid,
  Table,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleSaveFreelancer } from "@/actions/savedFreelancerActions";
import { getFreelancerBioText, parseFreelancerMetadata } from "@/lib/workflowHelpers";
import { InviteToProjectModal } from "@/components/InviteToProjectModal";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date | string;
  reviewer: { name: string | null };
  project: { title: string; budget: number };
}

interface HiredApplicationItem {
  id: string;
  project: {
    id: string;
    title: string;
    budget: number;
    company: { companyName: string };
  };
}

interface FreelancerItem {
  id: string;
  bio: string | null;
  skills: string[];
  experienceYears: number;
  rating: number;
  completedProjects: number;
  completionRate: number;
  portfolioUrl: string | null;
  resumeUrl: string | null;
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
    reviewsReceived: ReviewItem[];
  };
  applications: HiredApplicationItem[];
}

interface InitialParams {
  q: string;
  skills: string;
  minExperience: string;
  maxExperience: string;
  minRating: string;
  minCompleted: string;
  availability: string;
  domain: string;
  sortBy: string;
}

interface FreelancerSearchProps {
  /** Viewing company, so invite badges only reflect this company own invites. */
  companyId?: string;
  freelancers: FreelancerItem[];
  savedFreelancerIds: string[];
  savedFreelancers: FreelancerItem[];
  initialParams: InitialParams;
}

const AVAILABILITY_OPTIONS = [
  { value: "ALL", label: "All Availability" },
  { value: "AVAILABLE", label: "Available Now" },
  { value: "BUSY", label: "Busy / Limited" },
  { value: "UNAVAILABLE", label: "Unavailable" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "Highest Rated" },
  { value: "experience", label: "Most Experienced" },
  { value: "completed", label: "Most Projects Done" },
  { value: "newest", label: "Recently Joined" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any Rating" },
  { value: "4.5", label: "4.5 & above" },
  { value: "4.0", label: "4.0 & above" },
  { value: "3.5", label: "3.5 & above" },
  { value: "3.0", label: "3.0 & above" },
];

const EXP_OPTIONS = [
  { min: "", max: "", label: "Any Experience" },
  { min: "0", max: "2", label: "0–2 years" },
  { min: "3", max: "5", label: "3–5 years" },
  { min: "6", max: "10", label: "6–10 years" },
  { min: "10", max: "", label: "10+ years" },
];

const COMPLETED_OPTIONS = [
  { value: "", label: "Any" },
  { value: "5", label: "5+ projects" },
  { value: "10", label: "10+ projects" },
  { value: "20", label: "20+ projects" },
  { value: "50", label: "50+ projects" },
];

const DOMAIN_OPTIONS = [
  { value: "ALL", label: "All Domains" },
  { value: "Software Engineering", label: "Software Engineering" },
  { value: "Data & AI", label: "Data & AI" },
  { value: "Design & UX", label: "Design & UX" },
  { value: "Marketing & Sales", label: "Marketing & Sales" },
  { value: "Product & Project Management", label: "Product & Project Management" },
  { value: "Writing & Translation", label: "Writing & Translation" },
  { value: "Admin & Support", label: "Admin & Support" },
  { value: "Finance & Accounting", label: "Finance & Accounting" },
  { value: "Legal", label: "Legal" },
  { value: "Other", label: "Other" },
];

function getAvailabilityConfig(status: string | null) {
  switch (status) {
    case "AVAILABLE":
      return { dot: "bg-success", label: "Available", badge: "bg-success-surface text-success border-success-border/40" };
    case "BUSY":
      return { dot: "bg-star", label: "Busy", badge: "bg-warning-surface text-warning border-warning-border" };
    case "UNAVAILABLE":
      return { dot: "bg-danger", label: "Unavailable", badge: "bg-danger-surface text-danger border-danger-border" };
    default:
      return { dot: "bg-surface-strong", label: "Unknown", badge: "bg-surface-soft text-body border-hairline" };
  }
}

/**
 * Status of this company own invite to a freelancer, read from the existing
 * invite metadata already carried on the freelancer record. Returns null when
 * this company never invited them, so nothing renders.
 */
function getInviteStatus(bio: string | null, companyId?: string) {
  if (!companyId) return null;
  const invites = (parseFreelancerMetadata(bio).projectInvites ?? []).filter(
    (i) => i.companyId === companyId
  );
  if (invites.length === 0) return null;
  const latest = invites[invites.length - 1];
  if (latest.status === "APPLIED") return { label: "Applied", variant: "success" as const };
  if (latest.status === "DISMISSED") return { label: "Declined", variant: "neutral" as const };
  return { label: "Invited", variant: "accent" as const };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= Math.round(rating)
              ? "text-star fill-star"
              : "text-border-strong fill-surface-strong"
          }`}
        />
      ))}
      <span className="text-[10px] font-bold text-body ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export function FreelancerSearch({
  companyId,
  freelancers,
  savedFreelancerIds,
  savedFreelancers,
  initialParams,
}: FreelancerSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Local state for optimistic bookmarks
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(savedFreelancerIds));
  const [savedList, setSavedList] = useState<FreelancerItem[]>(savedFreelancers);

  // Keep state in sync with incoming server data
  useEffect(() => {
    setSavedIds(new Set(savedFreelancerIds));
  }, [savedFreelancerIds]);

  useEffect(() => {
    setSavedList(savedFreelancers);
  }, [savedFreelancers]);

  // Local form state (separate from committed URL state)
  const [q, setQ] = useState(initialParams.q);
  const [skills, setSkills] = useState(initialParams.skills);
  const [minRating, setMinRating] = useState(initialParams.minRating);
  const [minCompleted, setMinCompleted] = useState(initialParams.minCompleted);
  const [availability, setAvailability] = useState(initialParams.availability || "ALL");
  const [domain, setDomain] = useState(initialParams.domain || "ALL");
  const [sortBy, setSortBy] = useState(initialParams.sortBy || "rating");
  const [expRange, setExpRange] = useState(() => {
    const min = initialParams.minExperience;
    const max = initialParams.maxExperience;
    if (!min && !max) return "";
    return `${min}:${max}`;
  });
  const [showFilters, setShowFilters] = useState(true);

  // Lightbox Zoom-In Modal state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  // Proactive sourcing: which freelancer we are inviting, if any.
  const [invitingFreelancer, setInvitingFreelancer] = useState<{ id: string; name: string } | null>(null);

  const buildSearchParams = useCallback(
    (overrides?: Partial<Record<string, string>>) => {
      const state = {
        q,
        skills,
        minRating,
        minCompleted,
        availability,
        domain,
        sortBy,
        expRange,
        ...overrides,
      };

      const [expMin, expMax] = (state.expRange || "").split(":") as [string?, string?];

      const params = new URLSearchParams();
      if (state.q) params.set("q", state.q);
      if (state.skills) params.set("skills", state.skills);
      if (expMin) params.set("minExperience", expMin);
      if (expMax) params.set("maxExperience", expMax);
      if (state.minRating) params.set("minRating", state.minRating);
      if (state.minCompleted) params.set("minCompleted", state.minCompleted);
      if (state.availability && state.availability !== "ALL") params.set("availability", state.availability);
      if (state.domain && state.domain !== "ALL") params.set("domain", state.domain);
      if (state.sortBy && state.sortBy !== "rating") params.set("sortBy", state.sortBy);

      return params.toString();
    },
    [q, skills, minRating, minCompleted, availability, domain, sortBy, expRange]
  );

  const commitSearch = (overrides?: Partial<Record<string, string>>) => {
    const qs = buildSearchParams(overrides);
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    });
  };

  const clearFilters = () => {
    setQ("");
    setSkills("");
    setMinRating("");
    setMinCompleted("");
    setAvailability("ALL");
    setDomain("ALL");
    setSortBy("rating");
    setExpRange("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleToggleSave = async (freelancer: FreelancerItem) => {
    const isCurrentlySaved = savedIds.has(freelancer.id);
    
    // Optimistic UI updates
    const newSavedIds = new Set(savedIds);
    let newSavedList = [...savedList];

    if (isCurrentlySaved) {
      newSavedIds.delete(freelancer.id);
      newSavedList = newSavedList.filter((f) => f.id !== freelancer.id);
    } else {
      newSavedIds.add(freelancer.id);
      // Only append if it's not already in list
      if (!newSavedList.some((f) => f.id === freelancer.id)) {
        newSavedList.push(freelancer);
      }
    }

    setSavedIds(newSavedIds);
    setSavedList(newSavedList);

    const result = await toggleSaveFreelancer(freelancer.id);
    if (result.error) {
      // Revert state if the action failed
      setSavedIds(new Set(savedFreelancerIds));
      setSavedList(savedFreelancers);
      alert(result.error);
    } else {
      router.refresh();
    }
  };

  const activeFilterCount = [
    q,
    skills,
    minRating,
    minCompleted,
    availability !== "ALL" ? availability : "",
    domain !== "ALL" ? domain : "",
    sortBy !== "rating" ? sortBy : "",
    expRange,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 text-left">
      {/* Title + Tabs Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-ink tracking-tight">Find Talent</h1>
          <p className="text-xs text-muted font-normal mt-1">Connect with verified top-tier freelancers and remote specialists.</p>
        </div>
        {/* Tabs as sleek pills */}
        <div className="flex w-fit shrink-0 gap-3">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 rounded-[10px] border px-5 py-2.5 text-xs font-medium transition-all cursor-pointer ${
              activeTab === "search"
                ? "border-[#181d26] bg-[#181d26] text-white"
                : "border-[#dddddd] bg-white text-[#41454d] hover:text-[#181d26]"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 rounded-[10px] border px-5 py-2.5 text-xs font-medium transition-all cursor-pointer ${
              activeTab === "saved"
                ? "border-[#181d26] bg-[#181d26] text-white"
                : "border-[#dddddd] bg-white text-[#41454d] hover:text-[#181d26]"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${activeTab === "saved" ? "fill-danger text-danger" : "text-muted"}`} />
            Bookmarks ({savedList.length})
          </button>
        </div>
      </div>

      {activeTab === "search" && (
        <div className="space-y-4">
          {/* Sticky search header — results scroll underneath, never behind it */}
          <div className="sticky top-0 z-40 -mx-4 space-y-3 border-b border-[#dddddd] bg-white px-4 pb-3 pt-3 shadow-[0_6px_16px_-12px_rgba(24,29,38,0.5)] sm:-mx-6 sm:px-6">
          {/* Search Bar + Sort + Filter toggle row */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center bg-white p-3 rounded-[12px] border border-[#dddddd] shadow-xs">
            {/* Keyword search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, headline, bio keywords..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitSearch({ q: e.currentTarget.value })}
                className="w-full pl-10 pr-10 py-2 rounded-[6px] text-xs bg-white border border-[#dddddd] text-ink focus:border-focus transition-all focus:outline-none"
              />
              {q && (
                <button
                  onClick={() => { setQ(""); commitSearch({ q: "" }); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer border-none bg-transparent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); commitSearch({ sortBy: e.target.value }); }}
                className="w-full lg:w-auto pl-4 pr-9 py-2 rounded-[6px] text-xs font-medium bg-white border border-[#dddddd] text-ink focus:border-focus cursor-pointer appearance-none focus:outline-none min-w-[160px]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-[12px] text-xs font-medium border transition-all cursor-pointer shrink-0 ${
                showFilters
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink border-hairline hover:bg-surface-soft"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className={`h-4.5 w-4.5 rounded-full text-[9px] font-semibold flex items-center justify-center ${
                  showFilters ? "bg-white text-ink" : "bg-ink text-white"
                }`}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Search button */}
            <button
              onClick={() => commitSearch()}
              disabled={isPending}
              className="px-6 py-2.5 rounded-[10px] text-xs font-semibold bg-[#1b61c9] hover:bg-[#1751a8] text-white transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
            >
              <Search className="h-3.5 w-3.5" />
              {isPending ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="bg-white border border-[#dddddd] rounded-2xl p-5 shadow-xs space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-ink" />
                  <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">Filter Freelancers</h3>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-[10px] font-bold text-danger hover:text-danger flex items-center gap-1 cursor-pointer transition-colors border-none bg-transparent"
                  >
                    <X className="h-3 w-3" /> Clear all filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Domain Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Domain
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-border-strong pointer-events-none" />
                    <select
                      value={domain}
                      onChange={(e) => { setDomain(e.target.value); commitSearch({ domain: e.target.value }); }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-surface-soft focus:bg-white border border-[#dddddd] text-ink focus:border-ink focus:ring-ink/10 cursor-pointer appearance-none"
                    >
                      {DOMAIN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-border-strong pointer-events-none" />
                  </div>
                </div>

                {/* Skills Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Skills (comma-separated)
                  </label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-border-strong pointer-events-none" />
                    <input
                      type="text"
                      placeholder="react, node.js..."
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && commitSearch({ skills: e.currentTarget.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 bg-surface-soft focus:bg-white border border-[#dddddd] text-ink focus:border-ink focus:ring-ink/10"
                    />
                  </div>
                </div>

                {/* Experience Range */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Experience Range
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-border-strong pointer-events-none" />
                    <select
                      value={expRange}
                      onChange={(e) => { setExpRange(e.target.value); commitSearch({ expRange: e.target.value }); }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-surface-soft focus:bg-white border border-[#dddddd] text-ink focus:border-ink focus:ring-ink/10 cursor-pointer appearance-none"
                    >
                      {EXP_OPTIONS.map((opt) => (
                        <option
                          key={`${opt.min}:${opt.max}`}
                          value={opt.min || opt.max ? `${opt.min}:${opt.max}` : ""}
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-border-strong pointer-events-none" />
                  </div>
                </div>

                {/* Minimum Rating */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Minimum Rating
                  </label>
                  <div className="relative">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-border-strong pointer-events-none" />
                    <select
                      value={minRating}
                      onChange={(e) => { setMinRating(e.target.value); commitSearch({ minRating: e.target.value }); }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-surface-soft focus:bg-white border border-[#dddddd] text-ink focus:border-ink focus:ring-ink/10 cursor-pointer appearance-none"
                    >
                      {RATING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-border-strong pointer-events-none" />
                  </div>
                </div>

                {/* Completed Projects */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Completed Projects
                  </label>
                  <div className="relative">
                    <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-border-strong pointer-events-none" />
                    <select
                      value={minCompleted}
                      onChange={(e) => { setMinCompleted(e.target.value); commitSearch({ minCompleted: e.target.value }); }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-surface-soft focus:bg-white border border-[#dddddd] text-ink focus:border-ink focus:ring-ink/10 cursor-pointer appearance-none"
                    >
                      {COMPLETED_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-border-strong pointer-events-none" />
                  </div>
                </div>

                {/* Availability */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Availability Status
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-border-strong pointer-events-none" />
                    <select
                      value={availability}
                      onChange={(e) => { setAvailability(e.target.value); commitSearch({ availability: e.target.value }); }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-surface-soft focus:bg-white border border-[#dddddd] text-ink focus:border-ink focus:ring-ink/10 cursor-pointer appearance-none"
                    >
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-border-strong pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Active filter pills summary */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-hairline">
                  <span className="text-[9px] font-semibold text-border-strong uppercase tracking-wider self-center">Active:</span>
                  {q && <FilterPill label={`Keyword: "${q}"`} onRemove={() => { setQ(""); commitSearch({ q: "" }); }} />}
                  {skills && <FilterPill label={`Skills: ${skills}`} onRemove={() => { setSkills(""); commitSearch({ skills: "" }); }} />}
                  {expRange && <FilterPill label={`Exp: ${EXP_OPTIONS.find(o => `${o.min}:${o.max}` === expRange)?.label || expRange}`} onRemove={() => { setExpRange(""); commitSearch({ expRange: "" }); }} />}
                  {minRating && <FilterPill label={`Rating ≥ ${minRating}`} onRemove={() => { setMinRating(""); commitSearch({ minRating: "" }); }} />}
                  {minCompleted && <FilterPill label={`Projects ≥ ${minCompleted}`} onRemove={() => { setMinCompleted(""); commitSearch({ minCompleted: "" }); }} />}
                  {availability && availability !== "ALL" && <FilterPill label={`${availability}`} onRemove={() => { setAvailability("ALL"); commitSearch({ availability: "ALL" }); }} />}
                  {sortBy !== "rating" && <FilterPill label={`Sort: ${SORT_OPTIONS.find(o => o.value === sortBy)?.label}`} onRemove={() => { setSortBy("rating"); commitSearch({ sortBy: "rating" }); }} />}
                </div>
              )}
            </div>
          )}

          {/* Domain quick filters — one click narrows results to a discipline */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto whitespace-nowrap">
            {DOMAIN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setDomain(opt.value); commitSearch({ domain: opt.value }); }}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                  domain === opt.value
                    ? "bg-[#181d26] text-white border-[#181d26] shadow-sm"
                    : "bg-white text-[#41454d] border-hairline hover:border-[#181d26]/30 hover:text-[#181d26]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          </div>
        </div>
      )}

      {activeTab === "search" ? (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{freelancers.length}</span>
              <span className="text-xs font-semibold text-muted">freelancers found</span>
              {isPending && (
                <div className="h-4 w-4 rounded-full border-2 border-link border-t-transparent animate-spin" />
              )}
            </div>

            {/* View Mode Toggle Switch */}
            <div className="flex bg-surface-strong p-1 rounded-xl gap-0.5 self-center">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1 text-[10px] font-bold border-none bg-transparent",
                  viewMode === "card"
                    ? "bg-white text-ink shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                <LayoutGrid className="h-3 w-3" /> Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1 text-[10px] font-bold border-none bg-transparent",
                  viewMode === "table"
                    ? "bg-white text-ink shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                <Table className="h-3 w-3" /> Table
              </button>
            </div>
          </div>

          {/* Freelancer Cards Grid / Table Grid */}
          {freelancers.length === 0 ? (
 <Card className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-surface-strong flex items-center justify-center mx-auto">
                <Search className="h-6 w-6 text-border-strong" />
              </div>
              <p className="text-sm font-bold text-muted">No freelancers match your current filters.</p>
              <p className="text-xs text-border-strong">Try adjusting your search criteria or clearing some filters.</p>
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-link hover:text-ink transition-colors cursor-pointer"
              >
                Clear all filters →
              </button>
            </Card>
          ) : viewMode === "table" ? (
 <Card className="overflow-x-auto p-5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-hairline text-[10px] text-border-strong font-extrabold uppercase tracking-wider">
                    <th className="pb-3.5 pl-2 pt-1">Freelancer</th>
                    <th className="pb-3.5 pt-1 text-center">Availability</th>
                    <th className="pb-3.5 pt-1">Skills</th>
                    <th className="pb-3.5 pt-1 text-center">Rating</th>
                    <th className="pb-3.5 pt-1 text-center">Exp</th>
                    <th className="pb-3.5 pt-1 text-center">Completed</th>
                    <th className="pb-3.5 pt-1 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline font-medium">
                  {freelancers.map((f) => {
                    const avail = getAvailabilityConfig(f.availabilityStatus);
                    const isSaved = savedIds.has(f.id);
                    return (
                      <tr key={f.id} className="hover:bg-surface-soft/50 transition-colors">
                        <td className="py-4 pl-2 text-left pr-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => f.user.image && setLightboxImage(f.user.image)}
                              disabled={!f.user.image}
                              className={cn(
                                "h-8 w-8 rounded-lg border bg-surface-soft flex items-center justify-center font-bold text-ink text-[10px] shrink-0 overflow-hidden relative",
                                f.user.image ? "cursor-zoom-in" : ""
                              )}
                            >
                              {f.user.image ? (
                                <img src={f.user.image} className="h-full w-full object-cover" />
                              ) : (
                                f.user.name ? f.user.name[0].toUpperCase() : "U"
                              )}
                            </button>
                            <div className="overflow-hidden">
                              <button
                                type="button"
                                onClick={() => router.push(`/freelancers/${f.id}`)}
                                className="font-bold text-ink hover:text-link hover:underline cursor-pointer block text-left truncate max-w-[150px]"
                              >
                                {f.user.name}
                              </button>
                              <span className="text-[10px] text-border-strong block truncate max-w-[150px]">
                                {f.professionalHeadline || "Elite Specialist"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 text-center">
                          <Badge variant="neutral" className={cn("text-[9px] py-0.5 px-2", avail.badge)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full mr-1 inline-block animate-pulse", avail.dot)} />
                            {avail.label}
                          </Badge>
                        </td>

                        <td className="py-4 pr-3 text-left">
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {f.skills.slice(0, 3).map((s) => (
                              <Badge key={s} variant="neutral" className="text-[8px] py-0 px-1">{s}</Badge>
                            ))}
                            {f.skills.length > 3 && (
                              <span className="text-[8px] font-semibold text-border-strong self-center">+{f.skills.length - 3}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 text-center">
                          <div className="inline-flex items-center gap-0.5 font-bold text-body">
                            <Star className="h-3.5 w-3.5 fill-star text-star" />
                            <span>{f.rating.toFixed(1)}</span>
                          </div>
                        </td>

                        <td className="py-4 text-center font-bold text-body">
                          {f.experienceYears}y
                        </td>

                        <td className="py-4 text-center font-bold text-ink">
                          {f.completedProjects} Jobs
                        </td>

                        <td className="py-4 text-right pr-2">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleSave(f)}
                              className="p-1.5 rounded-lg hover:bg-surface-soft border border-transparent hover:border-hairline cursor-pointer"
                              title={isSaved ? "Remove bookmark" : "Bookmark"}
                            >
                              <Heart className={cn("h-4 w-4 transition-all duration-150", isSaved ? "fill-danger text-danger scale-105" : "text-border-strong hover:text-danger")} />
                            </button>

                            <Link href={`/freelancers/${f.id}`}>
                              <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2.5 border-ink/20 text-ink">
                                Profile
                              </Button>
                            </Link>

                            {f.resumeUrl && (
                              <a href={f.resumeUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2">
                                  <FileText className="h-3.5 w-3.5 text-muted" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 relative z-10">
              {freelancers.map((freelancer) => (
                <FreelancerCard
                  key={freelancer.id}
                  freelancer={freelancer}
                  isSaved={savedIds.has(freelancer.id)}
                  onToggleSave={() => handleToggleSave(freelancer)}
                  onViewProfile={() => router.push(`/freelancers/${freelancer.id}`)}
                  onInvite={() => setInvitingFreelancer({ id: freelancer.id, name: freelancer.user.name || "this freelancer" })}
                  inviteStatus={getInviteStatus(freelancer.bio, companyId)}
                  onViewImage={setLightboxImage}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Saved Tab Content */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{savedList.length}</span>
              <span className="text-xs font-semibold text-muted">bookmarked talent profiles</span>
            </div>

            {/* View Mode Toggle Switch */}
            <div className="flex bg-surface-strong p-1 rounded-xl gap-0.5 self-center">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1 text-[10px] font-bold border-none bg-transparent",
                  viewMode === "card"
                    ? "bg-white text-ink shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                <LayoutGrid className="h-3 w-3" /> Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1 text-[10px] font-bold border-none bg-transparent",
                  viewMode === "table"
                    ? "bg-white text-ink shadow-xs"
                    : "text-muted hover:text-ink"
                )}
              >
                <Table className="h-3 w-3" /> Table
              </button>
            </div>
          </div>

          {savedList.length === 0 ? (
 <Card className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-surface-strong flex items-center justify-center mx-auto">
                <Heart className="h-6 w-6 text-border-strong" />
              </div>
              <p className="text-sm font-bold text-muted">No bookmarked freelancers yet.</p>
              <p className="text-xs text-border-strong">Click the heart button on any freelancer profile in search results to save them.</p>
              <button
                onClick={() => setActiveTab("search")}
                className="text-xs font-bold text-link hover:text-ink transition-colors cursor-pointer"
              >
                Find Freelancers →
              </button>
            </Card>
          ) : viewMode === "table" ? (
 <Card className="overflow-x-auto p-5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-hairline text-[10px] text-border-strong font-extrabold uppercase tracking-wider">
                    <th className="pb-3.5 pl-2 pt-1">Freelancer</th>
                    <th className="pb-3.5 pt-1 text-center">Availability</th>
                    <th className="pb-3.5 pt-1">Skills</th>
                    <th className="pb-3.5 pt-1 text-center">Rating</th>
                    <th className="pb-3.5 pt-1 text-center">Exp</th>
                    <th className="pb-3.5 pt-1 text-center">Completed</th>
                    <th className="pb-3.5 pt-1 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline font-medium">
                  {savedList.map((f) => {
                    const avail = getAvailabilityConfig(f.availabilityStatus);
                    const isSaved = savedIds.has(f.id);
                    return (
                      <tr key={f.id} className="hover:bg-surface-soft/50 transition-colors">
                        <td className="py-4 pl-2 text-left pr-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => f.user.image && setLightboxImage(f.user.image)}
                              disabled={!f.user.image}
                              className={cn(
                                "h-8 w-8 rounded-lg border bg-surface-soft flex items-center justify-center font-bold text-ink text-[10px] shrink-0 overflow-hidden relative",
                                f.user.image ? "cursor-zoom-in" : ""
                              )}
                            >
                              {f.user.image ? (
                                <img src={f.user.image} className="h-full w-full object-cover" />
                              ) : (
                                f.user.name ? f.user.name[0].toUpperCase() : "U"
                              )}
                            </button>
                            <div className="overflow-hidden">
                              <button
                                type="button"
                                onClick={() => router.push(`/freelancers/${f.id}`)}
                                className="font-bold text-ink hover:text-link hover:underline cursor-pointer block text-left truncate max-w-[150px]"
                              >
                                {f.user.name}
                              </button>
                              <span className="text-[10px] text-border-strong block truncate max-w-[150px]">
                                {f.professionalHeadline || "Elite Specialist"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 text-center">
                          <Badge variant="neutral" className={cn("text-[9px] py-0.5 px-2", avail.badge)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full mr-1 inline-block animate-pulse", avail.dot)} />
                            {avail.label}
                          </Badge>
                        </td>

                        <td className="py-4 pr-3 text-left">
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {f.skills.slice(0, 3).map((s) => (
                              <Badge key={s} variant="neutral" className="text-[8px] py-0 px-1">{s}</Badge>
                            ))}
                            {f.skills.length > 3 && (
                              <span className="text-[8px] font-semibold text-border-strong self-center">+{f.skills.length - 3}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 text-center">
                          <div className="inline-flex items-center gap-0.5 font-bold text-body">
                            <Star className="h-3.5 w-3.5 fill-star text-star" />
                            <span>{f.rating.toFixed(1)}</span>
                          </div>
                        </td>

                        <td className="py-4 text-center font-bold text-body">
                          {f.experienceYears}y
                        </td>

                        <td className="py-4 text-center font-bold text-ink">
                          {f.completedProjects} Jobs
                        </td>

                        <td className="py-4 text-right pr-2">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleSave(f)}
                              className="p-1.5 rounded-lg hover:bg-surface-soft border border-transparent hover:border-hairline cursor-pointer"
                              title={isSaved ? "Remove bookmark" : "Bookmark"}
                            >
                              <Heart className={cn("h-4 w-4 transition-all duration-150", isSaved ? "fill-danger text-danger scale-105" : "text-border-strong hover:text-danger")} />
                            </button>

                            <Link href={`/freelancers/${f.id}`}>
                              <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2.5 border-ink/20 text-ink">
                                Profile
                              </Button>
                            </Link>

                            {f.resumeUrl && (
                              <a href={f.resumeUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="xs" variant="outline" className="cursor-pointer text-[9px] font-bold h-7 py-1 px-2">
                                  <FileText className="h-3.5 w-3.5 text-muted" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 relative z-10">
              {savedList.map((freelancer) => (
                <FreelancerCard
                  key={freelancer.id}
                  freelancer={freelancer}
                  isSaved={savedIds.has(freelancer.id)}
                  onToggleSave={() => handleToggleSave(freelancer)}
                  onViewProfile={() => router.push(`/freelancers/${freelancer.id}`)}
                  onInvite={() => setInvitingFreelancer({ id: freelancer.id, name: freelancer.user.name || "this freelancer" })}
                  inviteStatus={getInviteStatus(freelancer.bio, companyId)}
                  onViewImage={setLightboxImage}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox Zoom-In Modal Overlay */}
      {invitingFreelancer && (
        <InviteToProjectModal
          freelancerId={invitingFreelancer.id}
          freelancerName={invitingFreelancer.name}
          onClose={() => setInvitingFreelancer(null)}
        />
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-ink/80 backdrop-blur-sm cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-ink/70 hover:bg-ink transition-colors cursor-pointer z-10"
            title="Close image overlay"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative max-w-full max-h-[85vh] z-10 animate-in zoom-in-95 duration-200 rounded-2xl overflow-hidden shadow-2xl bg-black flex items-center justify-center">
            <img src={lightboxImage} alt="lightbox preview" className="object-contain max-h-[80vh] max-w-[90vw]" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FilterPill({ label, onRemove }: { label?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-ink/5 text-ink border border-ink/15 text-[9px] font-bold px-2 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="text-ink/50 hover:text-ink cursor-pointer transition-colors">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function FreelancerCard({
  freelancer,
  isSaved,
  onToggleSave,
  onViewProfile,
  onInvite,
  inviteStatus,
  onViewImage,
}: {
  freelancer: FreelancerItem;
  isSaved: boolean;
  onToggleSave: () => void;
  onViewProfile: () => void;
  onInvite: () => void;
  inviteStatus: { label: string; variant: "success" | "neutral" | "accent" } | null;
  onViewImage: (img: string) => void;
}) {
  const avail = getAvailabilityConfig(freelancer.availabilityStatus);

  return (
    <div className="bg-white border border-[#dddddd] rounded-3xl shadow-xs hover:shadow-md hover:border-link/50 hover:-translate-y-0.5 transition-all duration-200 flex flex-col group overflow-hidden relative">
      {/* Premium accent bar at top */}
      <div className="relative h-1 w-full bg-gradient-to-r from-ink to-link" />

      <div className="p-6 flex flex-col flex-1 space-y-4">
        {/* Avatar + Name + Headline */}
        <div className="flex items-start gap-4">
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => freelancer.user.image && onViewImage(freelancer.user.image)}
            disabled={!freelancer.user.image}
            className={`h-14 w-14 rounded-2xl bg-ink/5 border border-[#dddddd] flex items-center justify-center font-semibold text-ink text-xl shrink-0 overflow-hidden shadow-2xs relative ${
              freelancer.user.image ? "cursor-zoom-in hover:opacity-95 transition-all" : ""
            }`}
            title={freelancer.user.image ? "Click to expand image" : undefined}
          >
            {freelancer.user.image ? (
              <img
                src={freelancer.user.image}
                alt={freelancer.user.name || "User"}
                className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-200"
              />
            ) : (
              freelancer.user.name ? freelancer.user.name[0].toUpperCase() : "U"
            )}
            <span className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white shadow-sm ${avail.dot}`} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                onClick={onViewProfile}
                className="text-sm font-semibold text-ink leading-snug truncate hover:underline hover:text-link-active transition-colors cursor-pointer"
              >
                {freelancer.user.name}
              </h3>
              {/* Bookmark Button */}
              <button
                suppressHydrationWarning
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave();
                }}
                className="p-1.5 rounded-xl hover:bg-surface-soft border border-transparent hover:border-hairline/60 transition-all shrink-0 cursor-pointer -mt-1"
                title={isSaved ? "Remove Bookmark" : "Bookmark Freelancer"}
              >
                <Heart
                  className={`h-4 w-4 transition-all duration-200 ${
                    isSaved
                      ? "fill-danger text-danger scale-110"
                      : "text-border-strong hover:text-danger/70 hover:scale-105"
                  }`}
                />
              </button>
            </div>
            {freelancer.professionalHeadline && (
              <p className="text-[10px] text-link font-bold truncate leading-tight mt-1">
                {freelancer.professionalHeadline}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full border tracking-wide uppercase shrink-0 ${avail.badge}`}>
                {avail.label}
              </span>
              {isSaved && (
                <span className="text-[8px] font-semibold text-danger bg-danger-surface border border-danger-border px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 animate-in fade-in zoom-in-95 duration-150">
                  <Heart className="h-2 w-2 fill-danger text-danger" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-surface-soft/60 border border-hairline/30 rounded-2xl p-3 text-center">
          <div>
            <p className="text-sm font-semibold text-ink">{freelancer.experienceYears}y</p>
            <p className="text-[8px] text-border-strong font-extrabold uppercase tracking-widest mt-0.5">Exp</p>
          </div>
          <div className="border-x border-hairline/50">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="h-3 w-3 text-star fill-star" />
              <p className="text-sm font-semibold text-ink">{freelancer.rating.toFixed(1)}</p>
            </div>
            <p className="text-[8px] text-border-strong font-extrabold uppercase tracking-widest mt-0.5">Rating</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{freelancer.completedProjects}</p>
            <p className="text-[8px] text-border-strong font-extrabold uppercase tracking-widest mt-0.5">Done</p>
          </div>
        </div>

        {/* Bio snippet */}
        {getFreelancerBioText(freelancer.bio) && (
          <p className="text-[10px] text-muted leading-relaxed font-medium line-clamp-2 italic">
            &quot;{getFreelancerBioText(freelancer.bio)}&quot;
          </p>
        )}

        {/* Skills Tag List */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {freelancer.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="text-[9px] font-bold bg-surface-soft text-body border border-hairline/50 px-2 py-0.5 rounded-lg shadow-2xs"
            >
              {skill}
            </span>
          ))}
          {freelancer.skills.length > 4 && (
            <span className="text-[8px] font-semibold text-border-strong uppercase tracking-wider self-center pl-0.5">
              +{freelancer.skills.length - 4} more
            </span>
          )}
        </div>

        {/* Bottom Metadata & CTAs */}
        <div className="space-y-3 pt-3 border-t border-hairline mt-auto">
          <div className="flex items-center justify-between gap-3 text-[10px] text-border-strong font-bold">
            {freelancer.responseTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-border-strong shrink-0" />
                Responds {freelancer.responseTime.toLowerCase()}
              </span>
            )}
            {freelancer.verificationBadges && freelancer.verificationBadges.length > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <CheckCircle className="h-3 w-3 text-link shrink-0" />
                <span className="text-[9px] text-link-active font-semibold uppercase tracking-wider">Verified</span>
              </div>
            )}
          </div>

          {inviteStatus && (
            <div className="pb-2">
              <Badge variant={inviteStatus.variant} className="text-[9px]">
                {inviteStatus.label}
              </Badge>
            </div>
          )}

          <div className="flex gap-2">
            <button
              suppressHydrationWarning
              onClick={onViewProfile}
              className="flex-1 py-2.5 text-xs font-bold bg-ink hover:bg-primary-active text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <User className="h-3.5 w-3.5" />
              View Profile
            </button>
            <button
              suppressHydrationWarning
              onClick={onInvite}
              title="Invite this freelancer to one of your open projects"
              className="flex-1 py-2.5 text-xs font-bold bg-white hover:bg-surface-soft text-ink border border-[#dddddd] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Invite
            </button>
            {freelancer.resumeUrl && (
              <a
                href={freelancer.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2.5 text-xs font-bold bg-surface-strong hover:bg-surface-strong text-body rounded-xl transition-all cursor-pointer flex items-center justify-center border border-[#dddddd] shadow-2xs shrink-0"
                title="View Resume"
              >
                <FileText className="h-3.5 w-3.5 text-muted" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
