"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Star, Briefcase, Zap, ChevronRight, Medal, X, Award } from "lucide-react";
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
    bg: "from-amber-400 via-amber-500 to-yellow-600",
    border: "border-amber-250/60 shadow-lg shadow-amber-500/5 ring-4 ring-amber-400/10",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    icon: <Trophy className="h-3.5 w-3.5 text-amber-500" />,
    label: "Champion",
  },
  {
    bg: "from-slate-400 via-slate-500 to-slate-600",
    border: "border-slate-200/80 shadow-md shadow-slate-400/5 ring-4 ring-slate-400/10",
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    icon: <Medal className="h-3.5 w-3.5 text-slate-450" />,
    label: "Challenger",
  },
  {
    bg: "from-orange-400 via-orange-500 to-amber-600",
    border: "border-orange-200/60 shadow-md shadow-orange-500/5 ring-4 ring-orange-450/10",
    badge: "bg-orange-50 text-orange-850 border-orange-200",
    icon: <Medal className="h-3.5 w-3.5 text-orange-500" />,
    label: "Contender",
  },
];

function getAvailabilityDot(status: string | null) {
  switch (status) {
    case "AVAILABLE":
      return <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white shadow-xs" title="Available" />;
    case "BUSY":
      return <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white shadow-xs" title="Busy" />;
    default:
      return <span className="h-2 w-2 rounded-full bg-slate-350 ring-2 ring-white shadow-xs" title="Unavailable" />;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-[#002d59] to-[#3ac0ff]/20 text-[#002d59] shadow-sm">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#002d59] tracking-tight">Top Talent Leaderboard</h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Ranked by performance metrics, project success rates, and AI match scores.</p>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 border border-slate-200/60 rounded-full px-3 py-1 w-fit shrink-0">
          {topFreelancers.length} Freelancers Ranked
        </div>
      </div>

      {/* Podium Cards Grid (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
        {podium.map((f, i) => {
          const style = rankStyles[i];
          const isFirst = i === 0;
          return (
            <div
              key={f.id}
              className={cn(
                "relative rounded-3xl bg-white border overflow-hidden transition-all duration-300",
                "hover:-translate-y-1 hover:shadow-xl group",
                style.border,
                isFirst ? "md:order-2 md:py-6" : isFirst === false && i === 1 ? "md:order-1" : "md:order-3"
              )}
            >
              {/* Top gradient strip */}
              <div className={cn("h-1.5 bg-gradient-to-r w-full", style.bg)} />

              {/* Rank Badge */}
              <div className="absolute top-4 right-4">
                <div className={cn("flex items-center gap-1 text-[9px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs uppercase tracking-wide", style.badge)}>
                  {style.icon}
                  #{f.rank} {style.label}
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => f.image && setLightboxImage(f.image)}
                    disabled={!f.image}
                    className={cn(
                      "relative h-14 w-14 rounded-2xl border bg-slate-50 shrink-0 overflow-hidden flex items-center justify-center shadow-xs",
                      f.image ? "cursor-zoom-in hover:opacity-95 transition-all" : ""
                    )}
                    title={f.image ? "Click to view full image" : undefined}
                  >
                    {f.image ? (
                      <img src={f.image} alt={f.name} className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-200" />
                    ) : (
                      <div className={cn("h-full w-full flex items-center justify-center text-xl font-black text-white bg-gradient-to-br", style.bg)}>
                        {f.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="absolute bottom-0.5 right-0.5 z-10">
                      {getAvailabilityDot(f.availabilityStatus)}
                    </div>
                  </button>
                  <div className="min-w-0">
                    <p
                      onClick={() => router.push(`/freelancers/${f.id}`)}
                      className="text-sm font-black text-[#002d59] leading-tight cursor-pointer hover:text-[#3ac0ff] hover:underline transition-colors truncate"
                    >
                      {f.name}
                    </p>
                    <p
                      onClick={() => router.push(`/freelancers/${f.id}`)}
                      className="text-[10px] text-slate-450 truncate mt-1 cursor-pointer hover:text-[#3ac0ff] transition-colors leading-none font-bold"
                    >
                      {f.headline || "Talentra Specialist"}
                    </p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="space-y-1 bg-slate-50 border border-slate-100/50 p-2.5 rounded-2xl">
                  <div className="flex justify-between items-center text-[9px] font-black text-slate-450 uppercase tracking-wider">
                    <span>Performance Score</span>
                    <span className="text-[#002d59] font-black text-xs">{f.compositeScore.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", style.bg)}
                      style={{ width: `${Math.min(f.compositeScore, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center justify-center gap-0.5 text-amber-500 mb-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </div>
                    <p className="text-xs font-black text-[#002d59]">{f.rating.toFixed(1)}</p>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Rating</p>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center justify-center gap-0.5 text-emerald-500 mb-0.5">
                      <Briefcase className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-black text-[#002d59]">{f.completedProjects}</p>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Projects</p>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center justify-center gap-0.5 text-[#3ac0ff] mb-0.5">
                      <Zap className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-black text-[#002d59]">{f.avgAiScore.toFixed(0)}%</p>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">AI Rank</p>
                  </div>
                </div>

                {/* Skills */}
                {f.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {f.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="text-[9px] font-bold bg-[#002d59]/5 text-[#002d59] border border-[#002d59]/10 rounded-lg px-2 py-0.5"
                      >
                        {s}
                      </span>
                    ))}
                    {f.skills.length > 3 && (
                      <span className="text-[9px] font-bold text-slate-400 self-center pl-0.5">
                        +{f.skills.length - 3}
                      </span>
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
        <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100/80 bg-slate-50/50">
            <p className="text-[10px] font-black text-[#002d59]/80 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#3ac0ff]" />
              Rising Talent (Ranks #4 to #{Math.min(topFreelancers.length, 10)})
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {rest.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/40 transition-colors"
              >
                {/* Rank number */}
                <span className="w-8 text-xs font-black text-slate-400 shrink-0 text-center">#{f.rank}</span>

                {/* Avatar */}
                <button
                  type="button"
                  onClick={() => f.image && setLightboxImage(f.image)}
                  disabled={!f.image}
                  className={cn(
                    "h-10 w-10 rounded-xl shrink-0 overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-0 shadow-2xs relative",
                    f.image ? "cursor-zoom-in hover:opacity-95 transition-all" : ""
                  )}
                  title={f.image ? "Click to view full image" : undefined}
                >
                  {f.image ? (
                    <img src={f.image} alt={f.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-black text-[#002d59] bg-[#002d59]/5">
                      {f.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute bottom-0.5 right-0.5 z-10">
                    {getAvailabilityDot(f.availabilityStatus)}
                  </div>
                </button>

                {/* Name + headline */}
                <div className="flex-1 min-w-0">
                  <p
                    onClick={() => router.push(`/freelancers/${f.id}`)}
                    className="text-xs font-bold text-[#002d59] truncate cursor-pointer hover:text-[#3ac0ff] hover:underline transition-colors"
                  >
                    {f.name}
                  </p>
                  <p
                    onClick={() => router.push(`/freelancers/${f.id}`)}
                    className="text-[10px] text-slate-450 truncate cursor-pointer hover:text-[#3ac0ff] transition-colors font-medium mt-0.5"
                  >
                    {f.headline || "Talentra Professional"}
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 shrink-0 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    {f.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                    {f.completedProjects}
                  </span>
                  <span className="flex items-center gap-1.5 text-[#3ac0ff]">
                    <Zap className="h-3.5 w-3.5" />
                    {f.avgAiScore.toFixed(0)}%
                  </span>
                </div>

                {/* Composite score pill */}
                <div className="shrink-0">
                  <span className="text-[10px] font-black bg-[#f4f8ff] text-[#002d59] border border-slate-200 rounded-lg px-2.5 py-1">
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
              className="w-full flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold text-[#3ac5ff] hover:text-[#002d59] border-t border-slate-100 hover:bg-slate-50/50 transition-all cursor-pointer border-none bg-transparent"
            >
              <span>{expanded ? "Show Less" : `Show ${topFreelancers.length - 7} More Ranks`}</span>
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded ? "rotate-270" : "rotate-90")} />
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
            className="absolute top-5 right-5 p-2 text-white/80 hover:text-white rounded-full bg-slate-900/60 hover:bg-slate-900/80 transition-colors cursor-pointer z-10 border-none"
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
