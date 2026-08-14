"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Role } from "@prisma/client";
import { Menu, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface DashboardLayoutProps {
  role: Role;
  userName?: string | null;
  children: React.ReactNode;
}

export function DashboardLayout({ role, userName, children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile navigation drawer whenever pathname transitions/changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);


  return (
    <div className="flex h-screen bg-[#F5F6F8] text-[#1A1D29] overflow-hidden relative">

      {/* Mobile Top Navigation Header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-[60px] bg-white border-b border-[#E3E5EA] px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(true)}
            className="h-10 w-10 -ml-2 text-[#5B6272] hover:text-[#1A1D29] rounded-full hover:bg-[#F0F3F9] cursor-pointer flex items-center justify-center shrink-0 transition-colors"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="h-7 w-7 rounded-lg bg-[#EAF1FE] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#2159C9]" aria-hidden="true" />
          </div>
          <span className="font-semibold text-sm text-[#1A1D29] tracking-tight">Talentra</span>
        </div>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-[#1A1D29]/50 z-35 md:hidden"
            />
            {/* Mobile close button positioned outside the sidebar drawer */}
            <div className="fixed left-[268px] top-4 z-50 md:hidden animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-10 w-10 text-[#1A1D29] bg-white border border-[#E3E5EA] rounded-full cursor-pointer flex items-center justify-center shadow-md"
                title="Close navigation menu"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Responsive Sidebar container */}
      <div
        className={`
          fixed inset-y-0 left-0 w-[260px] z-40 transform transition-transform duration-[260ms] ease-out md:static md:translate-x-0 md:h-screen shrink-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Render standard Sidebar but pass hidden on mobile class */}
        <Sidebar role={role} userName={userName} className="w-full" />
      </div>

      {/* Main content body viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full pt-[60px] md:pt-0 bg-[#F5F6F8]">
        <main className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>

    </div>
  );
}

