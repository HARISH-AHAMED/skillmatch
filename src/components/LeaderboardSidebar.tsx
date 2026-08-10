"use client";

import React, { useState } from "react";
import { PanelRightClose, PanelRightOpen, Trophy } from "lucide-react";

/**
 * Leaderboard drawer. Hidden until toggled, then slides in as a fixed overlay
 * on the right edge so the page underneath keeps its layout untouched.
 */
export function LeaderboardSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Edge toggle tab — always available, sits above the page content */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Open leaderboard"
          className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 cursor-pointer flex-col items-center gap-3 rounded-l-[12px] border border-r-0 border-[#dddddd] bg-white px-2.5 py-5 text-[#181d26] shadow-sm transition-colors hover:bg-[#f8fafc]"
        >
          <PanelRightOpen className="h-4 w-4" />
          <Trophy className="h-4 w-4" />
          <span className="text-[10px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">
            Leaderboard
          </span>
        </button>
      )}

      {open && (
        <>
          {/* Click-away scrim */}
          <div
            className="fixed inset-0 z-40 bg-[#181d26]/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[560px] flex-col border-l border-[#dddddd] bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#dddddd] bg-white px-5 py-4">
              <span className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-widest text-[#181d26]">
                <Trophy className="h-4 w-4" /> Leaderboard
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close leaderboard"
                className="cursor-pointer rounded-[8px] border border-transparent p-1.5 text-[#181d26] transition-colors hover:border-[#dddddd] hover:bg-[#f8fafc]"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          </aside>
        </>
      )}
    </>
  );
}
