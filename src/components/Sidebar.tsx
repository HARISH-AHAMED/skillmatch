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
  Lock,
  ExternalLink,
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
  const [workspaces, setWorkspaces] = useState<{ id: string; label: string; href: string; applicationIds?: string[]; status?: string }[]>([]);
  const [profileHref, setProfileHref] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);

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
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.href) setProfileHref(data.href);
          if (data.image) setProfileImage(data.image);
          if (data.role) {
            const hasBadge = data.role === "ADMIN" || (data.verificationBadges && data.verificationBadges.includes("ONBOARDING_COMPLETED"));
            setIsOnboarded(!!hasBadge);
          }
        }
      } catch (error) {
        console.error("Failed to load profile info:", error);
      }
    };
    fetchWorkspaces();
    fetchProfile();
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
          { name: "My Projects", href: "/company/projects", icon: Briefcase, exact: true },
          { name: "Post New Project", href: "/company/projects/new", icon: PlusCircle },
          { name: "Review Applicants", href: "/company/applicants", icon: ClipboardList },
          { name: "Project Workspace", href: "/company/workspace", icon: FolderCheck },
          { name: "Search Freelancers", href: "/company/freelancers", icon: UserSearch },
          { name: "Freelancer Reviews", href: "/company/reviews", icon: Star },
        ];
      case Role.FREELANCER:
      default:
        return [
          { name: "Dashboard", href: "/freelancer/dashboard", icon: LayoutDashboard },
          { name: "My Profile", href: "/freelancer/profile", icon: UserCircle },
          { name: "Project Workspace", href: "/freelancer/workspace", icon: FolderCheck },
          { name: "Completed Projects", href: "/freelancer/completed-projects", icon: FolderCheck },
          { name: "Browse Projects", href: "/freelancer/projects", icon: Briefcase },
          { name: "Track Applications", href: "/freelancer/applications", icon: FileText },
          { name: "My Ratings & Reviews", href: "/freelancer/reviews", icon: Star },
        ];
    }
  };

  const menuItems = getNavItems();
  // Organizer console (company/admin) uses the dark navy rail; candidates keep
  // the light rail with pill-highlighted active rows.
  const isOrganizer = role === "COMPANY" || role === "ADMIN";

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className={cn("w-64 h-screen sticky top-0 flex flex-col p-6 z-30 border-r", isOrganizer ? "bg-[#0B1C32] border-[#10396B]" : "bg-white border-[#E2E5EA]", className)}>
      {/* Logo + notifications — always visible at top */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-8 w-8 rounded-[8px] flex items-center justify-center", isOrganizer ? "bg-[#1968E5]" : "bg-[#181D26]")}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className={cn("font-semibold tracking-tight text-base leading-none", isOrganizer ? "text-white" : "text-[#181D26]")}>Talentra</h1>
            <span className={cn("text-[10px] font-medium tracking-wider uppercase mt-1 inline-block", isOrganizer ? "text-[#9FB3CC]" : "text-[#5A6472]")}>
              {role} Space
            </span>
          </div>
        </div>
        <NotificationCenter initialNotifications={notifications} align="left" />
      </div>

      {/* Scrollable nav area — flex-1 + overflow so it never pushes logout off screen */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
        {/* Navigation items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isLocked = !isOnboarded && item.name !== "Dashboard" && item.name !== "My Profile";
            const isActive = !isLocked && (item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/"));
            
            if (isLocked) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-3 py-2.5 text-sm font-normal rounded-md opacity-50 cursor-not-allowed text-[#C7CCD4]"
                  title="Complete onboarding to unlock this section"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-[#C7CCD4]" />
                    <span>{item.name}</span>
                  </div>
                  <Lock className="h-3.5 w-3.5 text-[#C7CCD4]" />
                </div>
              );
            }

            const itemClasses = cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer",
              isOrganizer
                ? isActive
                  ? "bg-[#19457B] text-white font-semibold"
                  : "text-[#9FB3CC] hover:text-white hover:bg-[#10396B]"
                : isActive
                ? "bg-[#EDF5FD] text-[#1968E5] font-semibold"
                : "text-[#333840] hover:text-[#181D26] hover:bg-[#F7F8FA]"
            );
            const iconClasses = cn("h-4 w-4 shrink-0", isOrganizer ? (isActive ? "text-white" : "text-[#9FB3CC]") : isActive ? "text-[#1968E5]" : "text-[#5A6472]");

            // Workspaces are long-lived per-project surfaces — offer a launcher
            // so each project can live in its own tab.
            if (item.name === "Project Workspace") {
              return (
                <div key={item.name} className="group relative flex items-center">
                  <Link href={item.href} className={cn(itemClasses, "flex-1 min-w-0 pr-9")}>
                    <Icon className={iconClasses} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open workspace in a new tab"
                    aria-label="Open workspace in a new tab"
                    className="absolute right-1.5 p-1.5 rounded-md text-[#5A6472] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-[#181d26] hover:bg-[#EDEFF2] transition-all cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              );
            }

            return (
              <Link key={item.name} href={item.href} className={itemClasses}>
                <Icon className={iconClasses} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Active Workspaces Section */}
        {workspaces.length > 0 && isOnboarded && (
          <div className="mt-6 pt-4 border-t border-[#E2E5EA]">
            <span className="text-[10px] font-semibold text-[#5A6472] uppercase tracking-wider block px-3 mb-2">
              Active Workspaces
              <span className="normal-case tracking-normal font-normal text-[#C7CCD4] block mt-0.5">
                Each opens in its own tab
              </span>
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
                      "group flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer",
                      isActive
                        ? "bg-[#F7F8FA] text-[#181d26] font-semibold border-l-2 border-[#181d26]"
                        : "text-[#333840] hover:text-[#181d26] hover:bg-[#F7F8FA]"
                    )}
                    title={`${ws.label} — opens in a new tab`}
                  >
                    <FolderCheck className={cn("h-4 w-4 shrink-0", isActive ? "text-[#181d26]" : "text-[#5A6472]")} />
                    <span className="truncate flex-1 min-w-0">{ws.label}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-[#C7CCD4] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Profile summary & Logout */}
      <div className="border-t border-[#E2E5EA] pt-4 space-y-3">
        {profileHref ? (
          <Link
            href={profileHref}
            className="flex items-center gap-3 px-2 py-1.5 hover:bg-[#F7F8FA] rounded-md transition-colors cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-full bg-[#181d26] flex items-center justify-center font-medium text-white text-xs shrink-0 overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt={userName || "Profile"} className="h-full w-full object-cover" />
              ) : (
                userName ? userName[0].toUpperCase() : "U"
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-[#181d26] truncate">{userName || "User Profile"}</p>
              <p className="text-[10px] text-[#5A6472] capitalize truncate">{role.toLowerCase()}</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="h-8 w-8 rounded-full bg-[#181d26] flex items-center justify-center font-medium text-white text-xs shrink-0 overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt={userName || "Profile"} className="h-full w-full object-cover" />
              ) : (
                userName ? userName[0].toUpperCase() : "U"
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-[#181d26] truncate">{userName || "User Profile"}</p>
              <p className="text-[10px] text-[#5A6472] capitalize truncate">{role.toLowerCase()}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4 text-rose-600" />
          Log Out
        </button>
      </div>
    </aside>
  );
}

