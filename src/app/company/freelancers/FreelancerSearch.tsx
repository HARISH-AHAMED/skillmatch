"use client";

import React, { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
} from "lucide-react";
import { toggleSaveFreelancer } from "@/actions/savedFreelancerActions";

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
  sortBy: string;
}

interface FreelancerSearchProps {
  freelancers: FreelancerItem[];
  savedFreelancerIds: string[];
  savedFreelancers: FreelancerItem[];
  initialParams: InitialParams;
}

const AVAILABILITY_OPTIONS = [
  { value: "ALL", label: "All Availability" },
  { value: "AVAILABLE", label: "🟢 Available Now" },
  { value: "BUSY", label: "🟡 Busy / Limited" },
  { value: "UNAVAILABLE", label: "🔴 Unavailable" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "Highest Rated" },
  { value: "experience", label: "Most Experienced" },
  { value: "completed", label: "Most Projects Done" },
  { value: "newest", label: "Recently Joined" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any Rating" },
  { value: "4.5", label: "4.5★ and above" },
  { value: "4.0", label: "4.0★ and above" },
  { value: "3.5", label: "3.5★ and above" },
  { value: "3.0", label: "3.0★ and above" },
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

function getAvailabilityConfig(status: string | null) {
  switch (status) {
    case "AVAILABLE":
      return { dot: "bg-emerald-500", label: "Available", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "BUSY":
      return { dot: "bg-amber-400", label: "Busy", badge: "bg-amber-50 text-amber-700 border-amber-200" };
    case "UNAVAILABLE":
      return { dot: "bg-rose-500", label: "Unavailable", badge: "bg-rose-50 text-rose-700 border-rose-200" };
    default:
      return { dot: "bg-slate-300", label: "Unknown", badge: "bg-slate-50 text-slate-600 border-slate-200" };
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= Math.round(rating)
              ? "text-amber-400 fill-amber-400"
              : "text-slate-200 fill-slate-200"
          }`}
        />
      ))}
      <span className="text-[10px] font-bold text-slate-600 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export function FreelancerSearch({
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
  const [sortBy, setSortBy] = useState(initialParams.sortBy || "rating");
  const [expRange, setExpRange] = useState(() => {
    const min = initialParams.minExperience;
    const max = initialParams.maxExperience;
    if (!min && !max) return "";
    return `${min}:${max}`;
  });
  const [showFilters, setShowFilters] = useState(true);

  // Selected profile modal
  const [selectedProfile, setSelectedProfile] = useState<FreelancerItem | null>(null);

  const buildSearchParams = useCallback(
    (overrides?: Partial<Record<string, string>>) => {
      const state = {
        q,
        skills,
        minRating,
        minCompleted,
        availability,
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
      if (state.sortBy && state.sortBy !== "rating") params.set("sortBy", state.sortBy);

      return params.toString();
    },
    [q, skills, minRating, minCompleted, availability, sortBy, expRange]
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
    sortBy !== "rating" ? sortBy : "",
    expRange,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Sticky Search & Tab Controls */}
      <div className="sticky top-0 z-20 bg-[#f4f8ff] -mt-2 py-2 space-y-4">
        {/* Premium Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-2xl shadow-sm px-4">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "search"
                ? "border-[#002d59] text-[#002d59]"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            <Search className="h-4 w-4" />
            Search Talent
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "saved"
                ? "border-[#002d59] text-[#002d59]"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            Saved Freelancers ({savedList.length})
          </button>
        </div>

        {activeTab === "search" && (
          <div className="space-y-4">
            {/* Search Bar + Sort + Filter toggle row */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white p-4 rounded-b-2xl border-t border-slate-100 shadow-sm">
            {/* Keyword search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, headline, or bio keywords..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitSearch({ q: e.currentTarget.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 shadow-sm"
              />
              {q && (
                <button
                  onClick={() => { setQ(""); commitSearch({ q: "" }); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); commitSearch({ sortBy: e.target.value }); }}
                className="pl-4 pr-8 py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-700 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer appearance-none shadow-sm min-w-[160px]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm ${
                showFilters
                  ? "bg-[#002d59] text-white border-[#002d59]"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className={`h-4.5 w-4.5 rounded-full text-[9px] font-black flex items-center justify-center ${
                  showFilters ? "bg-white text-[#002d59]" : "bg-[#002d59] text-white"
                }`}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Search button */}
            <button
              onClick={() => commitSearch()}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#3ac0ff] hover:bg-[#29aaeb] text-white border border-[#3ac0ff]/30 transition-all cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-60"
            >
              <Search className="h-3.5 w-3.5" />
              {isPending ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#002d59]" />
                  <h3 className="text-xs font-black text-[#002d59] uppercase tracking-wider">Filter Freelancers</h3>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <X className="h-3 w-3" /> Clear all filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Skills Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Skills (comma-separated)
                  </label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="react, node.js, typescript"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && commitSearch({ skills: e.currentTarget.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400">Freelancers must match ALL listed skills</p>
                </div>

                {/* Experience Range */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Experience Range
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <select
                      value={expRange}
                      onChange={(e) => { setExpRange(e.target.value); commitSearch({ expRange: e.target.value }); }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer appearance-none"
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
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Minimum Rating */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Minimum Rating
                  </label>
                  <div className="relative">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <select
                      value={minRating}
                      onChange={(e) => { setMinRating(e.target.value); commitSearch({ minRating: e.target.value }); }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer appearance-none"
                    >
                      {RATING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Completed Projects */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Completed Projects
                  </label>
                  <div className="relative">
                    <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <select
                      value={minCompleted}
                      onChange={(e) => { setMinCompleted(e.target.value); commitSearch({ minCompleted: e.target.value }); }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer appearance-none"
                    >
                      {COMPLETED_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Availability */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Availability Status
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <select
                      value={availability}
                      onChange={(e) => { setAvailability(e.target.value); commitSearch({ availability: e.target.value }); }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20 cursor-pointer appearance-none"
                    >
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Active filter pills summary */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider self-center">Active:</span>
                  {q && <FilterPill label={`Keyword: "${q}"`} onRemove={() => { setQ(""); commitSearch({ q: "" }); }} />}
                  {skills && <FilterPill label={`Skills: ${skills}`} onRemove={() => { setSkills(""); commitSearch({ skills: "" }); }} />}
                  {expRange && <FilterPill label={`Exp: ${EXP_OPTIONS.find(o => `${o.min}:${o.max}` === expRange)?.label || expRange}`} onRemove={() => { setExpRange(""); commitSearch({ expRange: "" }); }} />}
                  {minRating && <FilterPill label={`Rating ≥ ${minRating}★`} onRemove={() => { setMinRating(""); commitSearch({ minRating: "" }); }} />}
                  {minCompleted && <FilterPill label={`Projects ≥ ${minCompleted}`} onRemove={() => { setMinCompleted(""); commitSearch({ minCompleted: "" }); }} />}
                  {availability && availability !== "ALL" && <FilterPill label={`${availability === "AVAILABLE" ? "🟢" : availability === "BUSY" ? "🟡" : "🔴"} ${availability}`} onRemove={() => { setAvailability("ALL"); commitSearch({ availability: "ALL" }); }} />}
                  {sortBy !== "rating" && <FilterPill label={`Sort: ${SORT_OPTIONS.find(o => o.value === sortBy)?.label}`} onRemove={() => { setSortBy("rating"); commitSearch({ sortBy: "rating" }); }} />}
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </div>

      {activeTab === "search" ? (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#002d59]">{freelancers.length}</span>
              <span className="text-xs font-semibold text-slate-500">freelancers found</span>
              {isPending && (
                <div className="h-4 w-4 rounded-full border-2 border-[#3ac0ff] border-t-transparent animate-spin" />
              )}
            </div>
          </div>

          {/* Freelancer Cards Grid */}
          {freelancers.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-slate-100 rounded-2xl space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-500">No freelancers match your current filters.</p>
              <p className="text-xs text-slate-400">Try adjusting your search criteria or clearing some filters.</p>
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-[#3ac0ff] hover:text-[#002d59] transition-colors cursor-pointer"
              >
                Clear all filters →
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 relative z-10">
              {freelancers.map((freelancer) => (
                <FreelancerCard
                  key={freelancer.id}
                  freelancer={freelancer}
                  isSaved={savedIds.has(freelancer.id)}
                  onToggleSave={() => handleToggleSave(freelancer)}
                  onViewProfile={() => setSelectedProfile(freelancer)}
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
              <span className="text-sm font-black text-[#002d59]">{savedList.length}</span>
              <span className="text-xs font-semibold text-slate-500">bookmarked talent profiles</span>
            </div>
          </div>

          {savedList.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-slate-100 rounded-2xl space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                <Heart className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">No bookmarked freelancers yet.</p>
              <p className="text-xs text-slate-400">Click the heart button on any freelancer profile in search results to save them.</p>
              <button
                onClick={() => setActiveTab("search")}
                className="text-xs font-bold text-[#3ac0ff] hover:text-[#002d59] transition-colors cursor-pointer"
              >
                Find Freelancers →
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 relative z-10">
              {savedList.map((freelancer) => (
                <FreelancerCard
                  key={freelancer.id}
                  freelancer={freelancer}
                  isSaved={savedIds.has(freelancer.id)}
                  onToggleSave={() => handleToggleSave(freelancer)}
                  onViewProfile={() => setSelectedProfile(freelancer)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <FreelancerProfileModal
          freelancer={selectedProfile}
          isSaved={savedIds.has(selectedProfile.id)}
          onToggleSave={() => handleToggleSave(selectedProfile)}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FilterPill({ label, onRemove }: { label?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[#002d59]/5 text-[#002d59] border border-[#002d59]/15 text-[9px] font-bold px-2 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="text-[#002d59]/50 hover:text-[#002d59] cursor-pointer transition-colors">
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
}: {
  freelancer: FreelancerItem;
  isSaved: boolean;
  onToggleSave: () => void;
  onViewProfile: () => void;
}) {
  const avail = getAvailabilityConfig(freelancer.availabilityStatus);

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm hover:shadow-md hover:border-[#3ac0ff]/40 transition-all duration-200 flex flex-col group overflow-hidden relative">
      {/* Card Header with gradient accent */}
      <div className="relative h-1.5 bg-gradient-to-r from-[#002d59] via-[#1a6baf] to-[#3ac0ff]" />

      <div className="p-5 flex flex-col flex-1 space-y-4">
        {/* Avatar + Name + Headline */}
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#002d59]/10 to-[#3ac0ff]/20 border border-slate-200 flex items-center justify-center font-black text-[#002d59] text-lg shrink-0 overflow-hidden">
            {freelancer.user.image ? (
              <img
                src={freelancer.user.image}
                alt={freelancer.user.name || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              freelancer.user.name ? freelancer.user.name[0].toUpperCase() : "U"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1.5">
              <h3 className="text-sm font-extrabold text-[#002d59] truncate group-hover:text-[#1a6baf] transition-colors leading-normal">
                {freelancer.user.name}
              </h3>
              {/* Heart Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave();
                }}
                className="p-1 rounded-lg hover:bg-slate-100 transition-all shrink-0 cursor-pointer -mt-1"
                title={isSaved ? "Remove Bookmark" : "Bookmark Freelancer"}
              >
                <Heart
                  className={`h-4.5 w-4.5 transition-colors ${
                    isSaved
                      ? "fill-rose-500 text-rose-500"
                      : "text-slate-300 hover:text-rose-450"
                  }`}
                />
              </button>
            </div>
            {freelancer.professionalHeadline && (
              <p className="text-[10px] text-[#3ac0ff] font-bold truncate leading-tight mt-0.5">
                {freelancer.professionalHeadline}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${avail.dot}`} />
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${avail.badge}`}>
                {avail.label}
              </span>
              {isSaved && (
                <span className="text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-in fade-in duration-200">
                  <Heart className="h-2 w-2 fill-rose-500 text-rose-500" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat Row */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-center">
          <div>
            <p className="text-sm font-black text-[#002d59]">{freelancer.experienceYears}y</p>
            <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Exp</p>
          </div>
          <div className="border-x border-slate-200/60">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <p className="text-sm font-black text-[#002d59]">{freelancer.rating.toFixed(1)}</p>
            </div>
            <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Rating</p>
          </div>
          <div>
            <p className="text-sm font-black text-[#002d59]">{freelancer.completedProjects}</p>
            <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Done</p>
          </div>
        </div>

        {/* Bio snippet */}
        {freelancer.bio && (
          <p className="text-[10px] text-slate-550 leading-relaxed font-medium line-clamp-2 italic">
            &quot;{freelancer.bio}&quot;
          </p>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {freelancer.skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="text-[9px] font-bold bg-[#002d59]/5 text-[#002d59] border border-[#002d59]/10 px-2 py-0.5 rounded-full"
            >
              {skill}
            </span>
          ))}
          {freelancer.skills.length > 5 && (
            <span className="text-[9px] font-bold text-slate-400 px-1 py-0.5">
              +{freelancer.skills.length - 5} more
            </span>
          )}
        </div>

        {/* Response time */}
        {freelancer.responseTime && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
            <Clock className="h-3 w-3 text-slate-400" />
            Responds {freelancer.responseTime.toLowerCase()}
          </div>
        )}

        {/* Verification Badges */}
        {freelancer.verificationBadges && freelancer.verificationBadges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {freelancer.verificationBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-0.5 text-[8px] font-black text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full"
              >
                <CheckCircle className="h-2.5 w-2.5 text-sky-500" />
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-2 pt-2 border-t border-slate-100 mt-auto">
          <button
            onClick={onViewProfile}
            className="flex-1 py-2 text-xs font-bold bg-[#002d59] hover:bg-[#1a4a8a] text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <User className="h-3.5 w-3.5" />
            View Full Profile
          </button>
          {freelancer.resumeUrl && (
            <a
              href={freelancer.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              title="View Resume"
            >
              <FileText className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function FreelancerProfileModal({
  freelancer,
  isSaved,
  onToggleSave,
  onClose,
}: {
  freelancer: FreelancerItem;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
}) {
  const avail = getAvailabilityConfig(freelancer.availabilityStatus);
  const expList = Array.isArray(freelancer.experience) ? (freelancer.experience as any[]) : [];
  const certList = Array.isArray(freelancer.certifications) ? (freelancer.certifications as any[]) : [];
  const portList = Array.isArray(freelancer.portfolioItems) ? (freelancer.portfolioItems as any[]) : [];

  const getPortfolioIcon = (type: string) => {
    switch (type) {
      case "IMAGE": return <ImageIcon className="h-4 w-4 text-indigo-500" />;
      case "VIDEO": return <Video className="h-4 w-4 text-amber-500" />;
      case "GITHUB": return <FileCode className="h-4 w-4 text-slate-800" />;
      case "WEBSITE": return <Globe className="h-4 w-4 text-emerald-600" />;
      case "CASE_STUDY": return <FileText className="h-4 w-4 text-sky-500" />;
      default: return <ExternalLink className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white border border-slate-100 shadow-2xl rounded-3xl overflow-y-auto max-h-[92vh] z-10 animate-in zoom-in-95 duration-200">
        {/* Gradient accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-[#002d59] via-[#1a6baf] to-[#3ac0ff] rounded-t-3xl" />

        <div className="p-7 space-y-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Profile Header */}
          <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#002d59]/10 to-[#3ac0ff]/20 border border-slate-200 flex items-center justify-center font-black text-xl text-[#002d59] shrink-0 overflow-hidden">
              {freelancer.user.image ? (
                <img src={freelancer.user.image} alt={freelancer.user.name || ""} className="h-full w-full object-cover" />
              ) : (
                freelancer.user.name ? freelancer.user.name[0].toUpperCase() : "U"
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between pr-8">
                <h2 className="text-xl font-black text-[#002d59] tracking-tight">{freelancer.user.name}</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                  title={isSaved ? "Remove Bookmark" : "Bookmark Freelancer"}
                >
                  <Heart
                    className={`h-5 w-5 transition-colors ${
                      isSaved
                        ? "fill-rose-500 text-rose-500"
                        : "text-slate-300 hover:text-rose-450"
                    }`}
                  />
                </button>
              </div>
              {freelancer.professionalHeadline && (
                <p className="text-xs font-bold text-[#3ac0ff]">{freelancer.professionalHeadline}</p>
              )}
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <Mail className="h-3 w-3" />
                <span>{freelancer.user.email}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${avail.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${avail.dot}`} />
                  {avail.label}
                </span>
                {isSaved && (
                  <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in duration-200">
                    <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                    Saved Talent
                  </span>
                )}
                {freelancer.responseTime && (
                  <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {freelancer.responseTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Verification Badges */}
          {freelancer.verificationBadges?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {freelancer.verificationBadges.map((badge) => (
                <span key={badge} className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 text-[9px] font-black text-[#002d59] px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-2.5 w-2.5 text-sky-500" />
                  {badge}
                </span>
              ))}
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
            <div>
              <p className="text-lg font-black text-[#002d59]">{freelancer.experienceYears}y</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Experience</p>
            </div>
            <div className="border-x border-slate-200/60">
              <p className="text-lg font-black text-[#002d59] flex items-center justify-center gap-0.5">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                {freelancer.rating.toFixed(1)}
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Rating</p>
            </div>
            <div>
              <p className="text-lg font-black text-[#002d59]">{freelancer.completedProjects}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Projects Done</p>
            </div>
          </div>

          {/* Bio */}
          {freelancer.bio && (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Professional Bio</p>
              <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl font-medium">
                &quot;{freelancer.bio}&quot;
              </p>
            </div>
          )}

          {/* Skills */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Skills & Expertise</p>
            <div className="flex flex-wrap gap-1.5">
              {freelancer.skills.map((skill) => (
                <span key={skill} className="text-[10px] font-bold bg-[#002d59]/5 text-[#002d59] border border-[#002d59]/10 px-2.5 py-1 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Work Experience */}
          {expList.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Work Experience ({expList.length})</p>
              <div className="space-y-2.5">
                {expList.map((exp: any, idx: number) => (
                  <div key={exp.id || idx} className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-[#002d59]">{exp.title}</h4>
                      <span className="text-[9px] bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-500">
                        {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#3ac0ff] font-bold">{exp.company}</p>
                    {exp.description && (
                      <p className="text-[10px] text-slate-550 leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certList.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Certifications ({certList.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {certList.map((cert: any, idx: number) => (
                  <div key={cert.id || idx} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl flex items-center gap-3 text-xs">
                    {cert.imageUrl ? (
                      <a href={cert.imageUrl} target="_blank" rel="noopener noreferrer" className="h-9 w-9 border border-slate-200 bg-white rounded-xl overflow-hidden shrink-0 cursor-zoom-in">
                        <img src={cert.imageUrl} alt={cert.name} className="h-full w-full object-cover" />
                      </a>
                    ) : (
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 shrink-0">
                        <Award className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-[#002d59] leading-tight">{cert.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {cert.issuer} • {cert.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio */}
          {portList.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Portfolio Gallery ({portList.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {portList.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl flex flex-col space-y-2 hover:border-sky-200 transition-colors text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {getPortfolioIcon(item.type)}
                        <span className="font-black text-[#002d59] truncate">{item.title}</span>
                      </div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase border border-slate-200 bg-white px-1.5 py-0.5 rounded-full">
                        {item.type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-550 leading-relaxed line-clamp-2">{item.description}</p>
                    {/* Image grid */}
                    {item.images?.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {item.images.map((img: string, i: number) => (
                          <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="aspect-video bg-white border border-slate-200 rounded-lg overflow-hidden h-10 cursor-zoom-in">
                            <img src={img} alt="screenshot" className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-[#3ac0ff] hover:text-[#002d59] flex items-center gap-1 transition-colors mt-auto">
                        Open Link <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platform Projects */}
          {freelancer.applications.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Platform Completed Projects ({freelancer.applications.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {freelancer.applications.map((app) => (
                  <div key={app.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[#002d59]">{app.project.title}</p>
                      <p className="text-[10px] text-slate-550">Hired by {app.project.company.companyName}</p>
                    </div>
                    <span className="font-bold text-emerald-700">${app.project.budget}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client Reviews */}
          {freelancer.user.reviewsReceived.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Client Reviews ({freelancer.user.reviewsReceived.length})
              </p>
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {freelancer.user.reviewsReceived.map((rev) => (
                  <div key={rev.id} className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#002d59] truncate max-w-[70%]">{rev.project.title}</span>
                      <StarRating rating={rev.rating} />
                    </div>
                    <p className="text-[10px] text-slate-650 italic leading-relaxed">&quot;{rev.comment}&quot;</p>
                    <p className="text-[9px] text-slate-400 text-right">— {rev.reviewer.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume Link */}
          {freelancer.resumeUrl && (
            <div className="pt-3 border-t border-slate-100">
              <a
                href={freelancer.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#002d59] hover:text-[#3ac0ff] font-bold bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <FileText className="h-4 w-4 text-slate-500" />
                View Resume / CV
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
