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
    <div className="flex h-screen bg-[#f4f8ff] text-slate-800 overflow-hidden relative">
      
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/50 px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-center shrink-0"
            title="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#002d59] to-[#3ac0ff] flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-sm text-[#002d59] tracking-tight">Talentra</span>
        </div>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-35 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Responsive Sidebar container */}
      <div
        className={`
          fixed inset-y-0 left-0 w-64 bg-[#f8faff] z-40 transform transition-transform duration-300 md:static md:translate-x-0 md:h-screen shrink-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button overlay */}
        <div className="absolute top-5 right-5 md:hidden z-50">
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer flex items-center justify-center"
            title="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Render standard Sidebar but pass hidden on mobile class */}
        <Sidebar role={role} userName={userName} className="border-none w-full" />
      </div>

      {/* Main content body viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full pt-14 md:pt-0">
        <main className="flex-grow p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

    </div>
  );
}
