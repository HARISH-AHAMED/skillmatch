"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Star, Briefcase, Zap, ChevronRight, Medal, X } from "lucide-react";
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
}

interface TopFreelancersProps {
  topFreelancers: TopFreelancerItem[];
}

const rankStyles = [
  {
    bg: "from-amber-400 to-yellow-500",
    glow: "shadow-amber-300/40",
    ring: "ring-amber-400/40",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "text-amber-500",
    label: "Gold",
  },
  {
    bg: "from-slate-400 to-slate-500",
    glow: "shadow-slate-300/40",
    ring: "ring-slate-400/30",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "text-slate-400",
    label: "Silver",
  },
  {
    bg: "from-orange-400 to-amber-600",
    glow: "shadow-orange-200/40",
    ring: "ring-orange-300/30",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    icon: "text-orange-400",
    label: "Bronze",
  },
];

function getMedalIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-orange-400" />;
  return null;
}

function getAvailabilityDot(status: string | null) {
  switch (status) {
    case "AVAILABLE":
      return <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-100" title="Available" />;
    case "BUSY":
      return <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-100" title="Busy" />;
    default:
      return <span className="h-2 w-2 rounded-full bg-slate-300 ring-2 ring-slate-100" title="Unavailable" />;
  }
}

export function TopFreelancers({ topFreelancers }: TopFreelancersProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (topFreelancers.length === 0) return null;

  const podium = topFreelancers.slice(0, 3);
  const rest = topFreelancers.slice(3, expanded ? 10 : 7);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-400/10 border border-amber-200/40">
            <Trophy className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#002d59] tracking-tight">Top Talent Leaderboard</h2>
            <p className="text-[10px] text-slate-400 font-semibold">Ranked by rating · projects completed · AI score</p>
          </div>
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 rounded-full px-3 py-1">
          {topFreelancers.length} Ranked
        </div>
      </div>

      {/* Podium — Top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {podium.map((f, i) => {
          const style = rankStyles[i];
          return (
            <div
              key={f.id}
              className={cn(
                "relative rounded-2xl bg-white border overflow-hidden transition-all duration-300",
                "hover:-translate-y-1 hover:shadow-xl cursor-default",
                i === 0
                  ? "shadow-lg border-amber-200/60 ring-2 ring-amber-300/30"
                  : i === 1
                  ? "shadow-md border-slate-200/80"
                  : "shadow-md border-orange-200/60"
              )}
            >
              {/* Top gradient strip */}
              <div className={cn("h-1.5 bg-gradient-to-r w-full", style.bg)} />

              {/* Rank badge */}
              <div className="absolute top-4 right-4">
                <div className={cn("flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border", style.badge)}>
                  {getMedalIcon(f.rank)}
                  #{f.rank}
                </div>
              </div>

              <div className="p-5 space-y-3.5">
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => f.image && setLightboxImage(f.image)}
                    disabled={!f.image}
                    className={cn(
                      "relative h-12 w-12 rounded-full border-2 shrink-0 overflow-hidden bg-slate-100 text-left p-0",
                      `ring-2 ${style.ring}`,
                      f.image ? "cursor-zoom-in hover:brightness-95 transition-all" : ""
                    )}
                    title={f.image ? "Click to view full image" : undefined}
                  >
                    {f.image ? (
                      <img src={f.image} alt={f.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className={cn("h-full w-full flex items-center justify-center text-lg font-black bg-gradient-to-br text-white", style.bg)}>
                        {f.name[0]?.toUpperCase()}
                      </div>
                    )}
                    {/* Availability */}
                    <div className="absolute bottom-0 right-0 z-10">
                      {getAvailabilityDot(f.availabilityStatus)}
                    </div>
                  </button>
                  <div>
                    <p
                      onClick={() => router.push(`/company/freelancers/${f.id}`)}
                      className="text-sm font-black text-[#002d59] leading-tight cursor-pointer hover:text-[#3ac0ff] hover:underline transition-colors"
                    >
                      {f.name}
                    </p>
                    <p
                      onClick={() => router.push(`/company/freelancers/${f.id}`)}
                      className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 cursor-pointer hover:text-[#3ac0ff] transition-colors"
                    >
                      {f.headline || "Freelancer"}
                    </p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                    <span>Composite Score</span>
                    <span className="text-[#002d59] font-black text-xs">{f.compositeScore.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", style.bg)}
                      style={{ width: `${Math.min((f.compositeScore / 100) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-center gap-0.5 text-amber-500 mb-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </div>
                    <p className="text-xs font-black text-[#002d59]">{f.rating.toFixed(1)}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Rating</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-center gap-0.5 text-emerald-500 mb-0.5">
                      <Briefcase className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-black text-[#002d59]">{f.completedProjects}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Done</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-center gap-0.5 text-[#3ac0ff] mb-0.5">
                      <Zap className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-black text-[#002d59]">{f.avgAiScore.toFixed(0)}%</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">AI</p>
                  </div>
                </div>

                {/* Skills */}
                {f.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {f.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5 uppercase tracking-wide"
                      >
                        {s}
                      </span>
                    ))}
                    {f.skills.length > 3 && (
                      <span className="text-[9px] font-bold text-slate-400">+{f.skills.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranks #4 – #10 as compact rows */}
      {topFreelancers.length > 3 && (
        <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rising Talent — Ranks #4 to #{Math.min(topFreelancers.length, 10)}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {rest.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
              >
                {/* Rank number */}
                <span className="w-7 text-xs font-black text-slate-400 shrink-0">#{f.rank}</span>

                {/* Avatar */}
                <button
                  type="button"
                  onClick={() => f.image && setLightboxImage(f.image)}
                  disabled={!f.image}
                  className={cn(
                    "h-9 w-9 rounded-full shrink-0 overflow-hidden bg-slate-100 border border-slate-200 p-0 text-left",
                    f.image ? "cursor-zoom-in hover:brightness-95 transition-all" : ""
                  )}
                  title={f.image ? "Click to view full image" : undefined}
                >
                  {f.image ? (
                    <img src={f.image} alt={f.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-black text-[#002d59] bg-sky-50">
                      {f.name[0]?.toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Name + headline */}
                <div className="flex-1 min-w-0">
                  <p
                    onClick={() => router.push(`/company/freelancers/${f.id}`)}
                    className="text-xs font-bold text-[#002d59] truncate cursor-pointer hover:text-[#3ac0ff] hover:underline transition-colors"
                  >
                    {f.name}
                  </p>
                  <p
                    onClick={() => router.push(`/company/freelancers/${f.id}`)}
                    className="text-[10px] text-slate-400 truncate cursor-pointer hover:text-[#3ac0ff] transition-colors"
                  >
                    {f.headline || "Freelancer"}
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-5 shrink-0 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    {f.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-emerald-500" />
                    {f.completedProjects}
                  </span>
                  <span className="flex items-center gap-1 text-[#3ac0ff]">
                    <Zap className="h-3 w-3" />
                    {f.avgAiScore.toFixed(0)}%
                  </span>
                </div>

                {/* Composite score pill */}
                <div className="shrink-0">
                  <span className="text-[10px] font-black bg-slate-100 text-[#002d59] border border-slate-200 rounded-full px-2.5 py-0.5">
                    {f.compositeScore.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Show more / less toggle */}
          {topFreelancers.length > 7 && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold text-[#3ac0ff] hover:text-[#002d59] border-t border-slate-100 transition-colors cursor-pointer"
            >
              {expanded ? "Show less" : `Show ${topFreelancers.length - 7} more`}
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded ? "rotate-90" : "rotate-0")} />
            </button>
          )}
        </div>
      )}

      {/* Lightbox Zoom-In Modal Overlay */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-slate-900/60 hover:bg-slate-900/80 transition-colors cursor-pointer z-10"
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
