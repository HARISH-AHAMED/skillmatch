"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Star, Briefcase, Zap, ChevronRight, Medal, X, Sparkles, Award, BarChart3, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopFreelancerItem {
  id: string;
  rank: number;
  name: string;
  image: string | null;
  headline: string | null;
  skills: string[];
  rating: number;
  completedProjects: number;
  avgAiScore: number;
  compositeScore: number;
  availabilityStatus: string | null;
  domain: string | null;
}

interface TopFreelancersProps {
  topFreelancers: TopFreelancerItem[];
}

const rankStyles = [
  {
    bg: "from-[#152C55] via-[#1E3D71] to-[#152C55]",
    text: "text-[#8F5E08]",
    glow: " border-[#1A1D29]/25 ring-1 ring-[#152C55]/10",
    badge: "bg-[#152C55] text-white border-[#1A1D29]",
    icon: "text-[#8F5E08]",
    titleColor: "text-[#1A1D29]",
  },
  {
    bg: "from-[#EAF1FE] via-[#F0F3F9] to-[#EAF1FE]",
    text: "text-[#5B6272]",
    glow: " border-[#E3E5EA] ring-1 ring-[#2E6BEA]/60",
    badge: "bg-[#EAF1FE]/10 text-[#1A1D29] border-[#C7CBD6]/25",
    icon: "text-[#5B6272]",
    titleColor: "text-[#1A1D29]",
  },
  {
    bg: "from-[#F0F3F9] via-[#E8F1FE] to-[#F0F3F9]",
    text: "text-[#2159C9]",
    glow: " border-[#C7CBD6]/25 ring-1 ring-[#2E6BEA]/10",
    badge: "bg-[#EAF1FE]/10 text-[#1A1D29] border-[#E3E5EA]/30",
    icon: "text-[#2159C9]",
    titleColor: "text-[#1A1D29]",
  },
];

function getMedalIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-[#8F5E08]" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-[#5B6272]" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-[#2159C9]" />;
  return null;
}

function getAvailabilityDot(status: string | null) {
  switch (status) {
    case "AVAILABLE":
      return <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#14713D] border-2 border-white" title="Available" />;
    case "BUSY":
      return <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#FFF3DC] border-2 border-white" title="Busy" />;
    default:
      return <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#EAF1FE] border-2 border-white" title="Unavailable" />;
  }
}

const DOMAIN_TABS = [
  { value: "ALL", label: "Overall Ranking" },
  { value: "Software Engineering", label: "Software Engineering" },
  { value: "Data & AI", label: "Data & AI" },
  { value: "Design & UX", label: "Design & UX" },
  { value: "Marketing & Sales", label: "Marketing & Sales" },
  { value: "Product & Project Management", label: "Product & Management" },
  { value: "Writing & Translation", label: "Writing & Translation" },
  { value: "Admin & Support", label: "Admin & Support" },
  { value: "Finance & Accounting", label: "Finance & Accounting" },
  { value: "Legal", label: "Legal" },
  { value: "Other", label: "Other" },
];

export function TopFreelancers({ topFreelancers }: TopFreelancersProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<string>("ALL");

  if (topFreelancers.length === 0) return null;

  const filtered = activeDomain === "ALL" 
    ? topFreelancers 
    : topFreelancers.filter(f => (f.domain || "Other") === activeDomain);

  const reranked = filtered
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((f, idx) => ({ ...f, rank: idx + 1 }));

  const rest = reranked.slice(0, expanded ? 10 : 7);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E5EA] pb-4 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#152C55]">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <h2 className="flex items-center gap-2 text-2xl font-bold leading-tight tracking-tight text-[#1A1D29]">
              Top Talent Leaderboard
              <Sparkles className="h-3.5 w-3.5 text-[#1A1D29]" />
            </h2>
            <p className="text-[11px] text-[#5B6272] font-normal tracking-wide">Dynamic ranking calculated from client satisfaction, AI performance scores, and milestones completed.</p>
          </div>
        </div>
        <div className="w-fit rounded-lg border border-[#E3E5EA] bg-white px-5 py-3 text-left">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F0F3F9]">
            <Star className="h-3 w-3 fill-[#F1F2F4] text-[#5B6272]" />
          </span>
          <p className="mt-1.5 text-2xl font-bold leading-none text-[#1A1D29]">{reranked.length}</p>
          <p className="mt-1 max-w-[90px] text-[11px] font-semibold uppercase leading-tight tracking-wider text-[#5B6272]">Specialists Ranked</p>
        </div>
      </div>

      {/* Domain tabs selector */}
      <div className="flex overflow-x-auto whitespace-nowrap pb-3 mb-2 gap-2 scrollbar-thin scrollbar-thumb-[#F0F3F9] scrollbar-track-transparent">
        {DOMAIN_TABS.map(tab => {
          const count = tab.value === "ALL" 
            ? topFreelancers.length 
            : topFreelancers.filter(f => (f.domain || "Other") === tab.value).length;
            
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveDomain(tab.value)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium transition-all border shrink-0 flex items-center gap-1.5",
                activeDomain === tab.value
                  ? "bg-[#152C55] text-white border-[#1A1D29]"
                  : "bg-white text-[#5B6272] border-[#E3E5EA] hover:bg-[#F8F9FB] hover:text-[#1A1D29] cursor-pointer"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[11px] font-medium",
                activeDomain === tab.value 
                  ? "bg-white/20 text-white" 
                  : "bg-[#F8F9FB] text-[#5B6272]"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Aligned unified ranking list */}
      <div className="bg-white border border-[#E3E5EA] rounded-lg overflow-hidden">
        {rest.length === 0 ? (
          <div className="p-10 text-center bg-white space-y-2">
            <p className="text-sm font-bold text-[#5B6272]">No Specialists Ranked Yet</p>
            <p className="text-xs text-[#5B6272]">There are currently no active freelancers in this domain with milestones completed.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E3E5EA]/80">
            {rest.map((f) => {
              const isRank1 = f.rank === 1;
              const isRank2 = f.rank === 2;
              const isRank3 = f.rank === 3;
              const isTop3 = isRank1 || isRank2 || isRank3;

              const highlightClass = isRank1
                ? "bg-[#FFF3DC] hover:bg-[#FFF3DC]"
                : isRank2
                ? "bg-[#F8F9FB] hover:bg-[#E8F1FE]"
                : "bg-white hover:bg-[#F8F9FB]";

              return (
                <div
                  key={f.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 transition-all duration-200 group",
                    highlightClass
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Rank Badge */}
                    <div className="flex w-[70px] shrink-0 items-center gap-3 text-left">
                      <span className={cn(
                        "text-sm font-bold",
                        isRank1 ? "text-[#8F5E08]" : isRank2 ? "text-[#5B6272]" : isRank3 ? "text-[#2159C9]" : "text-[#5B6272]"
                      )}>
                        #{f.rank}
                      </span>
                      <Star className={cn(
                        "h-4 w-4",
                        isRank1 ? "fill-[#B9790A] text-[#8F5E08]" : isRank2 ? "fill-[#F1F2F4] text-[#5B6272]" : isRank3 ? "fill-[#2E6BEA] text-[#2159C9]" : "text-[#2159C9]"
                      )} />
                    </div>

                    {/* Avatar */}
                    <button
                      type="button"
                      onClick={() => f.image && setLightboxImage(f.image)}
                      disabled={!f.image}
                      className={cn(
                        "relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[#C7CBD6] bg-[#F8F9FB] p-0 text-left",
                        f.image ? "cursor-zoom-in hover:opacity-95 transition-all" : ""
                      )}
                      title={f.image ? "Click to view full image" : undefined}
                    >
                      {f.image ? (
                        <img src={f.image} alt={f.name} className="h-full w-full object-cover transition-transform group-" />
                      ) : (
                        <div className={cn(
                          "h-full w-full flex items-center justify-center text-sm font-bold text-white",
                          "bg-[#F1F2F4]"
                        )}>
                          {f.name[0]?.toUpperCase()}
                        </div>
                      )}
                      {getAvailabilityDot(f.availabilityStatus)}
                    </button>

                    {/* Name + Title */}
                    <div className="hidden min-w-0 text-left xl:block">
                      <p
                        onClick={() => router.push(`/freelancers/${f.id}`)}
                        className="text-xs font-bold text-[#1A1D29] truncate cursor-pointer hover:text-[#1A1D29] hover:underline transition-colors"
                      >
                        {f.name}
                      </p>
                      <p
                        onClick={() => router.push(`/freelancers/${f.id}`)}
                        className="text-[11px] font-semibold text-[#5B6272] truncate mt-0.5 cursor-pointer hover:text-[#1A1D29] transition-colors"
                      >
                        {f.headline || "Elite Specialist"}
                      </p>
                    </div>
                  </div>

                  {/* Right columns: metrics + composite score */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                    {/* Stats chips */}
                    <div className="flex items-center gap-6 text-xs font-semibold text-[#1A1D29]">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-4 w-4 text-[#1A1D29]" />
                        {f.completedProjects}
                      </span>
                      <span className="flex items-center gap-1 text-[#1A1D29]">
                        <Zap className="h-3.5 w-3.5" />
                        {f.avgAiScore.toFixed(0)}%
                      </span>
                    </div>

                    {/* Composite badge */}
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "rounded-full border border-transparent bg-[#E8F1FE] px-3 py-1.5 text-xs font-bold",
                        isRank1 ? "text-[#2159C9]" : "text-[#1A1D29]"
                      )}>
                        {f.compositeScore.toFixed(1)}
                      </span>
                      <button
                        onClick={() => router.push(`/freelancers/${f.id}`)}
                        className="p-1 rounded-full hover:bg-[#F0F3F9] text-[#5B6272] hover:text-[#1A1D29] transition-all cursor-pointer border border-transparent hover:border-[#E3E5EA]/50"
                        title="View Profile"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expanded list toggler */}
        {reranked.length > 7 && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="mx-auto my-4 flex w-fit items-center justify-center gap-2 rounded-full border border-[#E3E5EA] bg-white px-8 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1A1D29] transition-colors hover:bg-[#F8F9FB] cursor-pointer"
          >
            {expanded ? "Show less" : `Show ${reranked.length - 7} more`}
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded ? "-rotate-90" : "rotate-90")} />
          </button>
        )}
      </div>

      {/* Lightbox Zoom-In Modal Overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-[#1A1D29]/50 cursor-zoom-out" onClick={() => setLightboxImage(null)} />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-[#152C55]/70 hover:bg-[#152C55] transition-colors cursor-pointer z-10"
            title="Close image overlay"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative max-w-full max-h-[85vh] z-10 animate-in zoom-in-95 duration-200 rounded-lg overflow-hidden shadow-lg bg-black flex items-center justify-center">
            <img src={lightboxImage} alt="lightbox preview" className="object-contain max-h-[80vh] max-w-[90vw]" />
          </div>
        </div>
      )}
    </div>
  );
}

