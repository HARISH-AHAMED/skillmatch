"use client";

import React, { useState } from "react";
import { PanelRightOpen, Trophy } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";

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
          className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 cursor-pointer flex-col items-center gap-3 rounded-l-[12px] border border-r-0 border-[#E3E5EA] bg-white px-2.5 py-5 text-[#1A1D29] transition-colors hover:bg-[#F8F9FB]"
        >
          <PanelRightOpen className="h-4 w-4" />
          <Trophy className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">
            Leaderboard
          </span>
        </button>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        className="max-w-[560px]"
        title={
          <span className="flex items-center gap-2.5">
            <Trophy className="h-[18px] w-[18px] text-[#5B6272]" aria-hidden="true" /> Leaderboard
          </span>
        }
      >
        {children}
      </Drawer>
    </>
  );
}
