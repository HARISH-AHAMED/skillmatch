"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Users,
  Building2,
  UserCircle,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  ClipboardList,
  Star,
  ShieldCheck,
  Building,
  FolderCheck,
  UserSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/NotificationCenter";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
}

interface SidebarProps {
  role: Role;
  userName?: string | null;
  notifications?: NotificationItem[];
  className?: string;
}

export function Sidebar({ role, userName, notifications = [], className }: SidebarProps) {
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<{ id: string; label: string; href: string; applicationIds?: string[] }[]>([]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data);
        }
      } catch (error) {
        console.error("Failed to load workspaces:", error);
      }
    };
    fetchWorkspaces();
  }, []);

  const getNavItems = () => {
    switch (role) {
      case Role.ADMIN:
        return [
          { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
          { name: "Users Management", href: "/admin/users", icon: Users },
          { name: "Freelancers Profile", href: "/admin/freelancers", icon: UserCircle },
          { name: "Companies List", href: "/admin/companies", icon: Building },
          { name: "Projects Monitor", href: "/admin/projects", icon: Briefcase },
          { name: "Moderate Reviews", href: "/admin/reviews", icon: Star },
          { name: "System Settings", href: "/admin/settings", icon: Settings },
        ];
      case Role.COMPANY:
        return [
          { name: "Dashboard", href: "/company/dashboard", icon: LayoutDashboard },
          { name: "My Profile", href: "/company/profile", icon: UserCircle },
          { name: "My Projects", href: "/company/projects", icon: Briefcase },
          { name: "Post New Project", href: "/company/projects/new", icon: PlusCircle },
          { name: "Review Applicants", href: "/company/applicants", icon: ClipboardList },
          { name: "Search Freelancers", href: "/company/freelancers", icon: UserSearch },
          { name: "Freelancer Reviews", href: "/company/reviews", icon: Star },
        ];
      case Role.FREELANCER:
      default:
        return [
          { name: "Dashboard", href: "/freelancer/dashboard", icon: LayoutDashboard },
          { name: "My Profile", href: "/freelancer/profile", icon: UserCircle },
          { name: "Completed Projects", href: "/freelancer/completed-projects", icon: FolderCheck },
          { name: "Browse Projects", href: "/freelancer/projects", icon: Briefcase },
          { name: "Track Applications", href: "/freelancer/applications", icon: FileText },
          { name: "My Ratings & Reviews", href: "/freelancer/reviews", icon: Star },
        ];
    }
  };

  const menuItems = getNavItems();

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className={cn("w-64 border-r border-slate-200/60 bg-[#f8faff] h-screen sticky top-0 flex flex-col justify-between p-6 z-30", className)}>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#002d59] to-[#3ac0ff] flex items-center justify-center shadow-md shadow-[#3ac0ff]/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[#002d59] tracking-tight text-base leading-none">Talentra</h1>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1 inline-block">
                {role} Space
              </span>
            </div>
          </div>
          <NotificationCenter initialNotifications={notifications} align="left" />
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-[#3ac0ff]/15 border border-[#3ac0ff]/30 text-[#002d59] shadow-sm"
                    : "text-slate-600 hover:text-[#002d59] hover:bg-slate-100 border border-transparent"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5", isActive ? "text-[#002d59]" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Active Workspaces Section */}
        {workspaces.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200/80">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block px-4 mb-2">
              Active Workspaces
            </span>
            <div className="space-y-1">
              {workspaces.map((ws) => {
                const isActive =
                  pathname === ws.href ||
                  pathname.startsWith(ws.href + "/") ||
                  (ws.applicationIds && ws.applicationIds.some((id) => pathname.includes(`/workspace/${id}`)));
                return (
                  <Link
                    key={ws.id}
                    href={ws.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer truncate",
                      isActive
                        ? "bg-[#3ac0ff]/15 border border-[#3ac0ff]/30 text-[#002d59] shadow-sm"
                        : "text-slate-600 hover:text-[#002d59] hover:bg-slate-100 border border-transparent"
                    )}
                    title={ws.label}
                  >
                    <FolderCheck className={cn("h-4 w-4 shrink-0", isActive ? "text-[#002d59]" : "text-slate-400")} />
                    <span className="truncate">{ws.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Profile summary & Logout */}
      <div className="border-t border-slate-200/80 pt-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-[#002d59] text-sm border border-slate-200">
            {userName ? userName[0].toUpperCase() : "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-800 truncate">{userName || "User Profile"}</p>
            <p className="text-[10px] text-slate-500 capitalize truncate">{role.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5 text-rose-600" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
