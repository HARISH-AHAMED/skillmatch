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
  // the light rail with blue-filled active rows.
  const isOrganizer = role === "COMPANY" || role === "ADMIN";

  // The two documented rail treatments — no third variant.
  const rail = isOrganizer
    ? {
        shell: "bg-[#152C55] border-r border-transparent",
        logoChip: "bg-white/10",
        logoIcon: "text-white",
        wordmark: "text-white",
        eyebrow: "text-white/60",
        itemIdle: "text-white/70 hover:bg-[#1E3D71] hover:text-white",
        itemActive: "bg-[#1E3D71] text-white font-semibold",
        iconIdle: "text-white/70",
        iconActive: "text-white",
        sectionLabel: "text-white/50",
        sectionHint: "text-white/40",
        divider: "border-white/10",
        subIdle: "text-white/60 hover:bg-[#1E3D71] hover:text-white",
        subActive: "bg-[#1E3D71] text-white font-semibold",
        profileRow: "hover:bg-[#1E3D71]",
        profileName: "text-white",
        profileRole: "text-white/60",
        logout: "text-white/70 hover:bg-[#1E3D71] hover:text-white",
      }
    : {
        shell: "bg-white border-r border-[#E3E5EA]",
        logoChip: "bg-[#EAF1FE]",
        logoIcon: "text-[#2159C9]",
        wordmark: "text-[#1A1D29]",
        eyebrow: "text-[#8A90A0]",
        itemIdle: "text-[#5B6272] hover:bg-[#F0F3F9] hover:text-[#1A1D29]",
        itemActive: "bg-[#EAF1FE] text-[#2159C9] font-semibold",
        iconIdle: "text-[#5B6272]",
        iconActive: "text-[#2159C9]",
        sectionLabel: "text-[#8A90A0]",
        sectionHint: "text-[#8A90A0]",
        divider: "border-[#E3E5EA]",
        subIdle: "text-[#5B6272] hover:bg-[#F0F3F9] hover:text-[#1A1D29]",
        subActive: "bg-[#EAF1FE] text-[#2159C9] font-semibold",
        profileRow: "hover:bg-[#F0F3F9]",
        profileName: "text-[#1A1D29]",
        profileRole: "text-[#5B6272]",
        logout: "text-[#BC2A2A] hover:bg-[#FDEAEA]",
      };

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  // Shared between the linked and unlinked profile rows.
  const avatar = (
    <div
      className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden",
        isOrganizer ? "bg-white/15 text-white" : "bg-[#EAF1FE] text-[#2159C9]"
      )}
    >
      {profileImage ? (
        <img src={profileImage} alt={userName || "Profile"} className="h-full w-full object-cover" />
      ) : (
        userName ? userName[0].toUpperCase() : "U"
      )}
    </div>
  );

  const identity = (
    <div className="overflow-hidden">
      <p className={cn("text-[13px] font-medium truncate", rail.profileName)}>{userName || "User Profile"}</p>
      <p className={cn("text-[11px] capitalize truncate", rail.profileRole)}>{role.toLowerCase()}</p>
    </div>
  );

  return (
    <aside className={cn("w-[260px] h-screen sticky top-0 flex flex-col p-5 z-30", rail.shell, className)}>
      {/* Logo + notifications — always visible at top */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", rail.logoChip)}>
            <Sparkles className={cn("h-4 w-4", rail.logoIcon)} aria-hidden="true" />
          </div>
          <div>
            <h1 className={cn("font-semibold tracking-tight text-base leading-none", rail.wordmark)}>Talentra</h1>
            <span className={cn("text-[11px] font-medium tracking-wider uppercase mt-1 inline-block", rail.eyebrow)}>
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
                  aria-disabled="true"
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 text-[13px] font-medium rounded-lg cursor-not-allowed",
                    isOrganizer ? "text-white/35" : "text-[#B7BBC6]"
                  )}
                  title="Complete onboarding to unlock this section"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    <span>{item.name}</span>
                  </div>
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </div>
              );
            }

            // Navigational selection reads as a background fill, per the system.
            const itemClasses = cn(
              "flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium rounded-lg cursor-pointer",
              "transition-colors duration-[180ms]",
              isActive ? rail.itemActive : rail.itemIdle
            );
            const iconClasses = cn(
              "h-[18px] w-[18px] shrink-0",
              isActive ? rail.iconActive : rail.iconIdle
            );

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
                    className={cn(
                      "absolute right-1.5 p-1.5 rounded-full opacity-0 transition-opacity cursor-pointer",
                      "group-hover:opacity-100 focus-visible:opacity-100",
                      rail.iconIdle,
                      isOrganizer ? "hover:bg-white/10" : "hover:bg-[#F0F3F9]"
                    )}
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
          <div className={cn("mt-6 pt-4 border-t", rail.divider)}>
            <span className={cn("text-[11px] font-semibold uppercase tracking-wider block px-3 mb-2", rail.sectionLabel)}>
              Active Workspaces
              <span className={cn("normal-case tracking-normal font-normal block mt-0.5", rail.sectionHint)}>
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
                      "group flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer",
                      "transition-colors duration-[180ms]",
                      isActive ? rail.subActive : rail.subIdle
                    )}
                    title={`${ws.label} — opens in a new tab`}
                  >
                    <FolderCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate flex-1 min-w-0">{ws.label}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Profile summary & Logout */}
      <div className={cn("border-t pt-4 space-y-1 shrink-0", rail.divider)}>
        {profileHref ? (
          <Link
            href={profileHref}
            className={cn("flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors cursor-pointer", rail.profileRow)}
          >
            {avatar}
            {identity}
          </Link>
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-2">
            {avatar}
            {identity}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium rounded-lg cursor-pointer",
            "transition-colors duration-[180ms]",
            rail.logout
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          Log Out
        </button>
      </div>
    </aside>
  );
}

