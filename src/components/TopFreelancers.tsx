"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Star, Briefcase, Zap, ChevronRight, Medal, X, Sparkles, Award } from "lucide-react";
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
    bg: "from-[#181d26] via-[#333840] to-[#181d26]",
    text: "text-amber-600",
    glow: "shadow-sm border-[#181d26]/25 ring-1 ring-[#181d26]/10",
    badge: "bg-[#181d26] text-white border-[#181d26]",
    icon: "text-amber-500",
    titleColor: "text-[#181d26]",
  },
  {
    bg: "from-[#1b61c9] via-[#29aaeb] to-[#1b61c9]",
    text: "text-slate-500",
    glow: "shadow-sm border-slate-200 ring-1 ring-slate-200/60",
    badge: "bg-[#1b61c9]/10 text-[#181d26] border-[#1b61c9]/25",
    icon: "text-slate-400",
    titleColor: "text-[#181d26]",
  },
  {
    bg: "from-[#29aaeb] via-[#7cc9f2] to-[#29aaeb]",
    text: "text-[#a1662f]",
    glow: "shadow-sm border-[#a1662f]/25 ring-1 ring-[#a1662f]/10",
    badge: "bg-[#29aaeb]/10 text-[#181d26] border-[#29aaeb]/30",
    icon: "text-[#a1662f]",
    titleColor: "text-[#181d26]",
  },
];

function getMedalIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-[#a1662f]" />;
  return null;
}

function getAvailabilityDot(status: string | null) {
  switch (status) {
    case "AVAILABLE":
      return <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" title="Available" />;
    case "BUSY":
      return <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-amber-400 border-2 border-white shadow-sm" title="Busy" />;
    default:
      return <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-slate-300 border-2 border-white shadow-sm" title="Unavailable" />;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dddddd] pb-4 text-left">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[12px] bg-[#181d26] flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-[#181d26] tracking-tight flex items-center gap-1.5">
              Top Talent Leaderboard
              <Sparkles className="h-3.5 w-3.5 text-[#181d26]" />
            </h2>
            <p className="text-[10px] text-[#41454d] font-normal tracking-wide">Dynamic ranking calculated from client satisfaction, AI performance scores, and milestones completed.</p>
          </div>
        </div>
        <div className="text-[10px] font-medium text-[#181d26] uppercase tracking-wider bg-[#f8fafc] border border-[#dddddd] rounded-full px-3 py-1 w-fit">
          {reranked.length} Specialists Ranked
        </div>
      </div>

      {/* Domain tabs selector */}
      <div className="flex overflow-x-auto whitespace-nowrap pb-3 mb-2 gap-2 scrollbar-thin scrollbar-thumb-[#dddddd] scrollbar-track-transparent">
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
                "px-4 py-2 rounded-[12px] text-xs font-medium transition-all border shrink-0 flex items-center gap-1.5",
                activeDomain === tab.value
                  ? "bg-[#181d26] text-white border-[#181d26]"
                  : "bg-white text-[#41454d] border-[#dddddd] hover:bg-[#f8fafc] hover:text-[#181d26] cursor-pointer"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-[6px] text-[9px] font-medium",
                activeDomain === tab.value 
                  ? "bg-white/20 text-white" 
                  : "bg-[#f8fafc] text-[#41454d]"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Aligned unified ranking list */}
      <div className="bg-white border border-[#dddddd] rounded-[12px] overflow-hidden shadow-xs">
        {rest.length === 0 ? (
          <div className="p-10 text-center bg-white space-y-2">
            <p className="text-sm font-bold text-slate-700">No Specialists Ranked Yet</p>
            <p className="text-xs text-slate-400">There are currently no active freelancers in this domain with milestones completed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {rest.map((f) => {
              const isRank1 = f.rank === 1;
              const isRank2 = f.rank === 2;
              const isRank3 = f.rank === 3;
              const isTop3 = isRank1 || isRank2 || isRank3;

              const highlightClass = isRank1
                ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-400"
                : isRank2
                ? "bg-slate-400/5 hover:bg-slate-400/10 border-l-4 border-l-slate-400"
                : isRank3
                ? "bg-orange-500/5 hover:bg-orange-500/10 border-l-4 border-l-orange-400"
                : "hover:bg-slate-50/50 border-l-4 border-l-transparent";

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
                    <div className="w-12 shrink-0 flex items-center gap-1 text-left">
                      <span className={cn(
                        "text-xs font-black",
                        isRank1 ? "text-amber-600" : isRank2 ? "text-slate-600" : isRank3 ? "text-orange-600" : "text-slate-400"
                      )}>
                        #{f.rank}
                      </span>
                      {getMedalIcon(f.rank)}
                    </div>

                    {/* Avatar */}
                    <button
                      type="button"
                      onClick={() => f.image && setLightboxImage(f.image)}
                      disabled={!f.image}
                      className={cn(
                        "h-10 w-10 rounded-xl shrink-0 overflow-hidden bg-slate-50 border p-0 text-left relative shadow-2xs",
                        isRank1 ? "border-amber-300 ring-2 ring-amber-400/20" : isRank2 ? "border-slate-300 ring-2 ring-slate-300/10" : isRank3 ? "border-orange-300 ring-2 ring-orange-300/10" : "border-slate-200",
                        f.image ? "cursor-zoom-in hover:opacity-95 transition-all" : ""
                      )}
                      title={f.image ? "Click to view full image" : undefined}
                    >
                      {f.image ? (
                        <img src={f.image} alt={f.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className={cn(
                          "h-full w-full flex items-center justify-center text-sm font-black text-white",
                          isRank1 ? "bg-amber-400" : isRank2 ? "bg-slate-400" : isRank3 ? "bg-orange-400" : "bg-slate-300"
                        )}>
                          {f.name[0]?.toUpperCase()}
                        </div>
                      )}
                      {getAvailabilityDot(f.availabilityStatus)}
                    </button>

                    {/* Name + Title */}
                    <div className="min-w-0 text-left">
                      <p
                        onClick={() => router.push(`/freelancers/${f.id}`)}
                        className="text-xs font-black text-[#181d26] truncate cursor-pointer hover:text-[#181d26] hover:underline transition-colors"
                      >
                        {f.name}
                      </p>
                      <p
                        onClick={() => router.push(`/freelancers/${f.id}`)}
                        className="text-[9px] font-semibold text-slate-400 truncate mt-0.5 cursor-pointer hover:text-[#181d26] transition-colors"
                      >
                        {f.headline || "Elite Specialist"}
                      </p>
                    </div>
                  </div>

                  {/* Right columns: metrics + composite score */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                    {/* Stats chips */}
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        {f.rating.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-[#181d26]" />
                        {f.completedProjects}
                      </span>
                      <span className="flex items-center gap-1 text-[#181d26]">
                        <Zap className="h-3.5 w-3.5" />
                        {f.avgAiScore.toFixed(0)}%
                      </span>
                    </div>

                    {/* Composite badge */}
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] font-black border rounded-xl px-2.5 py-1",
                        isRank1
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : isRank2
                          ? "bg-slate-50 text-slate-700 border-slate-200"
                          : isRank3
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-slate-50 text-[#181d26] border-slate-200"
                      )}>
                        {f.compositeScore.toFixed(1)}
                      </span>
                      <button
                        onClick={() => router.push(`/freelancers/${f.id}`)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#181d26] transition-all cursor-pointer border border-transparent hover:border-slate-200/50"
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
            className="w-full flex items-center justify-center gap-1.5 py-3.5 text-[10px] font-black uppercase tracking-wider text-[#181d26] hover:text-[#181d26] border-t border-slate-100 transition-colors cursor-pointer bg-slate-50/20"
          >
            {expanded ? "Show less" : `Show ${reranked.length - 7} more`}
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded ? "rotate-90" : "rotate-0")} />
          </button>
        )}
      </div>

      {/* Lightbox Zoom-In Modal Overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-[#181d26]/80 backdrop-blur-sm cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-[#181d26]/70 hover:bg-[#181d26] transition-colors cursor-pointer z-10"
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

