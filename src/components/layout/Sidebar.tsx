"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ExternalLink,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
} from "lucide-react";
import { useMemo } from "react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Tooltip } from "@/components/ui/Feedback";
import { NavIcon } from "./icons";
import { isActive, navForRole, primaryActionForRole } from "@/lib/nav";
import { useSession } from "@/lib/session";
import { workspacesForUser, applicationsForCompany, applicationsForFreelancer, getCompanyByUserId, getFreelancerByUserId } from "@/data/queries";
import { cn } from "@/lib/utils";

export function SidebarContent({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { session, signOut } = useSession();

  const groups = useMemo(() => (session ? navForRole(session.role) : []), [session]);
  const workspaces = useMemo(
    () => (session ? workspacesForUser(session.userId, session.role) : []),
    [session],
  );
  const badges = useMemo(() => {
    if (!session) return { applicants: 0, applications: 0 };
    if (session.role === "COMPANY") {
      const company = getCompanyByUserId(session.userId);
      return {
        applicants: company
          ? applicationsForCompany(company.id).filter((a) => a.status === "PENDING").length
          : 0,
        applications: 0,
      };
    }
    const freelancer = getFreelancerByUserId(session.userId);
    return {
      applicants: 0,
      applications: freelancer
        ? applicationsForFreelancer(freelancer.id).filter(
            (a) => a.status === "PENDING" || a.status === "SHORTLISTED",
          ).length
        : 0,
    };
  }, [session]);

  if (!session) return null;

  const primary = primaryActionForRole(session.role);

  return (
    <div className="flex h-full flex-col bg-[var(--color-brand-ink)] text-white">
      {/* Brand */}
      <div
        className={cn(
          "flex h-[68px] shrink-0 items-center border-b border-white/10",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Link href="/" aria-label="FRIVVO home" onClick={onNavigate}>
          {collapsed ? <LogoMark size={32} /> : <Logo size={32} inverse />}
        </Link>
        {!collapsed && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="hidden h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Primary action */}
      {primary && (
        <div className={cn("shrink-0 border-b border-white/10", collapsed ? "p-2" : "p-3")}>
          <Link
            href={primary.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand)] font-medium text-white transition-colors hover:bg-[var(--color-brand-hover)]",
              collapsed ? "h-10 w-10 mx-auto" : "h-10 px-4 text-[13.5px]",
            )}
          >
            <NavIcon name={primary.icon} className="h-4 w-4 shrink-0" />
            {!collapsed && primary.label}
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group, gi) => (
          <div key={group.title ?? gi} className={gi > 0 ? "mt-5" : ""}>
            {group.title && !collapsed && (
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/40">
                {group.title}
              </p>
            )}
            {group.title && collapsed && gi > 0 && (
              <div className="mx-3 mb-2 h-px bg-white/10" />
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                const count = item.badgeKey === "applicants"
                  ? badges.applicants
                  : item.badgeKey === "applications"
                    ? badges.applications
                    : 0;
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center rounded-[var(--radius-md)] transition-colors duration-[var(--motion-fast)]",
                      collapsed ? "h-10 w-10 justify-center mx-auto" : "h-10 gap-3 px-3",
                      active
                        ? "bg-white/[0.14] text-white"
                        : "text-white/65 hover:bg-white/[0.07] hover:text-white",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-brand-bright)]"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    )}
                    <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                          {item.label}
                        </span>
                        {count > 0 && (
                          <span className="rounded-full bg-[var(--color-brand)] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-white">
                            {count}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && count > 0 && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-brand-bright)]" />
                    )}
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip content={item.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Dynamic workspaces section (§4.2) */}
        {workspaces.length > 0 && (
          <div className="mt-5">
            {!collapsed ? (
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/40">
                Workspaces
              </p>
            ) : (
              <div className="mx-3 mb-2 h-px bg-white/10" />
            )}
            <ul className="flex flex-col gap-0.5">
              {workspaces.map((w) => {
                const active = pathname.includes(w.applicationId);
                const link = (
                  <Link
                    href={w.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center rounded-[var(--radius-md)] transition-colors",
                      collapsed ? "h-10 w-10 justify-center mx-auto" : "h-10 gap-3 px-3",
                      active
                        ? "bg-white/[0.14] text-white"
                        : "text-white/65 hover:bg-white/[0.07] hover:text-white",
                    )}
                  >
                    <LayoutGrid className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate text-[13px]">{w.label}</span>
                        <span
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(w.href, "_blank");
                          }}
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </span>
                      </>
                    )}
                  </Link>
                );
                return (
                  <li key={w.applicationId}>
                    {collapsed ? (
                      <Tooltip content={w.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer: profile + sign out */}
      <div className={cn("shrink-0 border-t border-white/10", collapsed ? "p-2" : "p-3")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            {onToggle && (
              <Tooltip content="Expand sidebar" side="right">
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label="Expand sidebar"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            <Tooltip content={session.name} side="right">
              <Link href={session.profileHref} onClick={onNavigate} className="p-1">
                <Avatar src={session.image} name={session.name} size="sm" />
              </Link>
            </Tooltip>
            <Tooltip content="Sign out" side="right">
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        ) : (
          <>
            <Link
              href={session.profileHref}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-[var(--radius-md)] p-2 transition-colors hover:bg-white/[0.07]"
            >
              <Avatar src={session.image} name={session.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">
                  {session.name}
                </span>
                <span className="block truncate text-[11.5px] text-white/50">
                  {session.role === "COMPANY"
                    ? "Company account"
                    : session.role === "ADMIN"
                      ? "Platform admin"
                      : "Freelancer"}
                </span>
              </span>
              <UserCircle className="h-4 w-4 shrink-0 text-white/40" />
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="mt-1 flex h-9 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 text-[13px] text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 lg:hidden" style={{ zIndex: 300 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(12,24,18,0.5)]"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-0 h-full w-[280px]"
          >
            <SidebarContent collapsed={false} onNavigate={onClose} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="absolute -right-11 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-md)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
