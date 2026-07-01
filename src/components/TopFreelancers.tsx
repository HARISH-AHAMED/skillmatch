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
}

interface TopFreelancersProps {
  topFreelancers: TopFreelancerItem[];
}

const rankStyles = [
  {
    bg: "from-amber-450 via-yellow-400 to-amber-550",
    text: "text-amber-600",
    glow: "shadow-amber-400/25 border-amber-300/60 ring-2 ring-amber-400/20",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: "text-amber-500",
    titleColor: "text-amber-800",
  },
  {
    bg: "from-slate-400 via-slate-350 to-slate-500",
    text: "text-slate-600",
    glow: "shadow-slate-300/20 border-slate-200/80 ring-2 ring-slate-300/10",
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    icon: "text-slate-450",
    titleColor: "text-slate-800",
  },
  {
    bg: "from-orange-400 via-orange-350 to-amber-600",
    text: "text-orange-650",
    glow: "shadow-orange-200/25 border-orange-200/65 ring-2 ring-orange-300/10",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    icon: "text-orange-500",
    titleColor: "text-orange-850",
  },
];

function getMedalIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500 animate-bounce" style={{ animationDuration: "3s" }} />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-orange-400" />;
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

export function TopFreelancers({ topFreelancers }: TopFreelancersProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (topFreelancers.length === 0) return null;

  // Re-order top 3 to be Silver (2), Gold (1), Bronze (3) visually on desktop for that classic podium layout
  const rank1 = topFreelancers.find(f => f.rank === 1);
  const rank2 = topFreelancers.find(f => f.rank === 2);
  const rank3 = topFreelancers.find(f => f.rank === 3);

  const podiumArray = [
    { item: rank2, styleIndex: 1 },
    { item: rank1, styleIndex: 0 },
    { item: rank3, styleIndex: 2 }
  ].filter(p => p.item !== undefined);

  const rest = topFreelancers.slice(3, expanded ? 10 : 7);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#002d59] to-[#3ac0ff] flex items-center justify-center shadow-md">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#002d59] tracking-tight flex items-center gap-1.5">
              Top Talent Leaderboard
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-pulse" />
            </h2>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wide">Dynamic ranking calculated from client satisfaction, AI performance scores, and milestones completed.</p>
          </div>
        </div>
        <div className="text-[10px] font-black text-[#002d59] uppercase tracking-wider bg-[#3ac0ff]/10 border border-[#3ac0ff]/20 rounded-full px-3 py-1 w-fit">
          {topFreelancers.length} Specialists Ranked
        </div>
      </div>

      {/* Podium Grid — visually Silver, Gold, Bronze on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
        {podiumArray.map((podiumInfo) => {
          const f = podiumInfo.item!;
          const i = podiumInfo.styleIndex;
          const style = rankStyles[i];
          const isGold = i === 0;

          return (
            <div
              key={f.id}
              className={cn(
                "relative rounded-3xl bg-white border overflow-hidden transition-all duration-300 flex flex-col shadow-sm",
                "hover:-translate-y-1 hover:shadow-xl cursor-default group",
                style.glow,
                isGold ? "md:min-h-[350px] border-amber-300" : "md:min-h-[310px]"
              )}
            >
              {/* Premium gradient header strip */}
              <div className={cn("h-2 bg-gradient-to-r w-full shrink-0", style.bg)} />

              {/* Gold Ribbon / Rank Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div className={cn("flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border shadow-2xs uppercase tracking-wider", style.badge)}>
                  {getMedalIcon(f.rank)}
                  <span>Rank #{f.rank}</span>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-grow justify-between space-y-4">
                <div className="space-y-4">
                  {/* Avatar section */}
                  <div className="flex flex-col items-center text-center space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={() => f.image && setLightboxImage(f.image)}
                      disabled={!f.image}
                      className={cn(
                        "relative h-18 w-18 rounded-2xl border-2 shrink-0 overflow-hidden bg-slate-50 p-0 text-left shadow-md",
                        isGold ? "ring-4 ring-amber-400/25 h-20 w-20 rounded-3xl" : "ring-2 ring-slate-100",
                        f.image ? "cursor-zoom-in hover:opacity-95 transition-all" : ""
                      )}
                      title={f.image ? "Click to view full image" : undefined}
                    >
                      {f.image ? (
                        <img src={f.image} alt={f.name} className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-350" />
                      ) : (
                        <div className={cn("h-full w-full flex items-center justify-center text-2xl font-black bg-gradient-to-br text-white", style.bg)}>
                          {f.name[0]?.toUpperCase()}
                        </div>
                      )}
                      {getAvailabilityDot(f.availabilityStatus)}
                    </button>

                    <div className="space-y-1">
                      <h3
                        onClick={() => router.push(`/freelancers/${f.id}`)}
                        className="text-base font-black text-[#002d59] leading-tight cursor-pointer hover:text-[#3ac0ff] hover:underline transition-all"
                      >
                        {f.name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-550 line-clamp-1 leading-snug">
                        {f.headline || "Talentra Elite"}
                      </p>
                    </div>
                  </div>

                  {/* Composite Score Meter */}
                  <div className="space-y-1 bg-slate-50/60 border border-slate-100 rounded-2xl p-3">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span className="uppercase tracking-wider">Composite Rating</span>
                      <span className={cn("font-black text-sm", style.text)}>{f.compositeScore.toFixed(1)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", style.bg)}
                        style={{ width: `${Math.min((f.compositeScore / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 text-center shrink-0">
                  <div className="p-2 bg-[#f8faff] border border-slate-100 rounded-2xl">
                    <div className="flex justify-center mb-0.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    </div>
                    <p className="text-xs font-black text-[#002d59]">{f.rating.toFixed(1)}</p>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Rating</p>
                  </div>
                  <div className="p-2 bg-[#f8faff] border border-slate-100 rounded-2xl">
                    <div className="flex justify-center mb-0.5">
                      <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <p className="text-xs font-black text-[#002d59]">{f.completedProjects}</p>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Done</p>
                  </div>
                  <div className="p-2 bg-[#f8faff] border border-slate-100 rounded-2xl">
                    <div className="flex justify-center mb-0.5">
                      <Zap className="h-3.5 w-3.5 text-sky-500" />
                    </div>
                    <p className="text-xs font-black text-[#002d59]">{f.avgAiScore.toFixed(0)}%</p>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Match</p>
                  </div>
                </div>

                {/* Skills tags list */}
                {f.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center pt-1 shrink-0">
                    {f.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="text-[9px] font-bold bg-slate-50 text-slate-600 border border-slate-200/60 rounded-lg px-2 py-0.5 shadow-2xs"
                      >
                        {s}
                      </span>
                    ))}
                    {f.skills.length > 3 && (
                      <span className="text-[9px] font-black text-slate-400 self-center">
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
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-xs font-black text-[#002d59] uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#3ac0ff]" />
              Rising Talent List — Ranks #4 to #{Math.min(topFreelancers.length, 10)}
            </h3>
          </div>
          <div className="divide-y divide-slate-100/80">
            {rest.map((f) => (
              <div
                key={f.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Rank Badge */}
                  <span className="w-8 text-xs font-black text-slate-400 shrink-0">#{f.rank}</span>

                  {/* Avatar */}
                  <button
                    type="button"
                    onClick={() => f.image && setLightboxImage(f.image)}
                    disabled={!f.image}
                    className={cn(
                      "h-10 w-10 rounded-xl shrink-0 overflow-hidden bg-slate-50 border border-slate-200 p-0 text-left relative shadow-2xs",
                      f.image ? "cursor-zoom-in hover:opacity-95 transition-all" : ""
                    )}
                    title={f.image ? "Click to view full image" : undefined}
                  >
                    {f.image ? (
                      <img src={f.image} alt={f.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-sm font-black text-[#002d59] bg-[#002d59]/5">
                        {f.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </button>

                  {/* Name + Title */}
                  <div className="min-w-0">
                    <p
                      onClick={() => router.push(`/freelancers/${f.id}`)}
                      className="text-xs font-black text-[#002d59] truncate cursor-pointer hover:text-[#3ac0ff] hover:underline transition-colors"
                    >
                      {f.name}
                    </p>
                    <p
                      onClick={() => router.push(`/freelancers/${f.id}`)}
                      className="text-[9px] font-semibold text-slate-400 truncate mt-0.5 cursor-pointer hover:text-[#3ac0ff] transition-colors"
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
                      <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                      {f.completedProjects}
                    </span>
                    <span className="flex items-center gap-1 text-[#3ac0ff]">
                      <Zap className="h-3.5 w-3.5" />
                      {f.avgAiScore.toFixed(0)}%
                    </span>
                  </div>

                  {/* Composite badge */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-slate-100 text-[#002d59] border border-slate-200 rounded-xl px-2.5 py-1">
                      {f.compositeScore.toFixed(1)}
                    </span>
                    <button
                      onClick={() => router.push(`/freelancers/${f.id}`)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#002d59] transition-all cursor-pointer border border-transparent hover:border-slate-200/50"
                      title="View Profile"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Expanded list toggler */}
          {topFreelancers.length > 7 && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="w-full flex items-center justify-center gap-1.5 py-3.5 text-[10px] font-black uppercase tracking-wider text-[#3ac0ff] hover:text-[#002d59] border-t border-slate-100 transition-colors cursor-pointer bg-slate-50/20"
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

