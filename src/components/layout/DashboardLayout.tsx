"use client";

import Link from "next/link";
import { ChevronDown, Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Feedback";
import { LogoMark } from "@/components/brand/Logo";
import { MobileSidebar, SidebarContent } from "./Sidebar";
import { NotificationCenter } from "./NotificationCenter";
import { homeForRole, useRequireRole } from "@/lib/session";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "frivvo.sidebar.collapsed";

export function DashboardLayout({
  role,
  children,
  searchPlaceholder = "Search…",
  onSearch,
}: {
  role: Role | Role[];
  children: React.ReactNode;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
}) {
  const { session, ready, allowed } = useRequireRole(role);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Same reason as the session store: the persisted preference is only
    // readable on the client, so it is applied after the first paint rather
    // than causing a hydration mismatch.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* preference unavailable — fall back to expanded */
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  };

  if (!ready || !allowed || !session) return <DashboardSkeleton />;

  return (
    <div className="flex min-h-screen bg-[var(--color-app)]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden shrink-0 transition-[width] duration-[var(--motion-slow)] ease-out lg:block",
          collapsed ? "w-[68px]" : "w-[260px]",
        )}
        style={{ zIndex: 200 }}
      >
        <SidebarContent collapsed={collapsed} onToggle={toggle} />
      </aside>

      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main column */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-[var(--motion-slow)] ease-out",
          collapsed ? "lg:pl-[68px]" : "lg:pl-[260px]",
        )}
      >
        {/* Top bar */}
        <header
          className="sticky top-0 flex h-[60px] shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/92 px-4 backdrop-blur-md md:px-6"
          style={{ zIndex: 200 }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="lg:hidden" aria-label="FRIVVO home">
            <LogoMark size={30} />
          </Link>

          <div className="hidden min-w-0 max-w-md flex-1 md:block">
            <Input
              inputSize="sm"
              placeholder={searchPlaceholder}
              leftIcon={<Search />}
              onChange={(e) => onSearch?.(e.target.value)}
              className="bg-[var(--color-surface-alt)]"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationCenter />
            <Dropdown
              align="end"
              width={240}
              trigger={
                <span className="flex items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-[var(--color-hover)]">
                  <Avatar src={session.image} name={session.name} size="sm" />
                  <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-[var(--color-text-primary)] sm:block">
                    {session.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                </span>
              }
              items={[
                { label: "Dashboard", href: homeForRole(session.role) },
                { label: "View public profile", href: session.profileHref },
                {
                  label: "Settings",
                  href:
                    session.role === "COMPANY"
                      ? "/company/profile"
                      : session.role === "ADMIN"
                        ? "/admin/settings"
                        : "/freelancer/profile",
                },
                { label: "Help centre", href: "/help", separatorBefore: true },
                { label: "Back to site", href: "/" },
              ]}
            />
          </div>
        </header>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[var(--spacing-content-max)] px-4 py-6 md:px-6 md:py-8 xl:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-[var(--color-app)]">
      <div className="hidden w-[260px] shrink-0 bg-[var(--color-brand-ink)] lg:block" />
      <div className="min-w-0 flex-1">
        <div className="h-[60px] border-b border-[var(--color-border)] bg-[var(--color-surface)]" />
        <div className="mx-auto w-full max-w-[var(--spacing-content-max)] px-4 py-8 md:px-6 xl:px-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-3 h-4 w-96" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[118px] rounded-[var(--radius-lg)]" />
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-80 rounded-[var(--radius-lg)] lg:col-span-2" />
            <Skeleton className="h-80 rounded-[var(--radius-lg)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Marketing/public shell. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[var(--color-app)]">{children}</div>;
}
