"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { LogoWordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { NotificationCenter } from "./NotificationCenter";
import { MARKETING_NAV } from "@/lib/nav";
import { homeForRole, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { session, signOut } = useSession();
  // Remembering the route the menu was opened on means navigation closes it
  // by derivation, with no reset effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const mobileOpen = openedAt === pathname;
  const setMobileOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  // Scroll position lives on the window, not in React. Subscribing to it keeps
  // render pure and avoids an effect that immediately sets state.
  const scrolled = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("scroll", onStoreChange, { passive: true });
      return () => window.removeEventListener("scroll", onStoreChange);
    },
    () => window.scrollY > 8,
    () => false,
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 w-full transition-shadow duration-[var(--motion-base)]",
          scrolled ? "glass-navbar shadow-[var(--shadow-sm)]" : "glass-navbar",
        )}
        style={{ zIndex: 200 }}
      >
        <div className="container-wide">
          <div className="flex h-[68px] items-center justify-between gap-6">
            {/* Left: logo + nav */}
            <div className="flex min-w-0 items-center gap-8">
              <Link href="/" className="shrink-0 text-[23px]" aria-label="FRIVVO home">
                <LogoWordmark className="font-black tracking-[-0.045em]" />
              </Link>
              <nav className="hidden items-center gap-1 lg:flex">
                {MARKETING_NAV.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors",
                        active
                          ? "text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]",
                      )}
                    >
                      {item.label}
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-[var(--color-brand)]"
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: auth */}
            <div className="flex shrink-0 items-center gap-2">
              {session ? (
                <>
                  <NotificationCenter />
                  <Button href={homeForRole(session.role)} variant="secondary" size="sm" className="hidden sm:inline-flex">
                    Dashboard
                  </Button>
                  <Dropdown
                    align="end"
                    width={240}
                    trigger={
                      <span className="flex items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-[var(--color-hover)]">
                        <Avatar src={session.image} name={session.name} size="sm" />
                        <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                      </span>
                    }
                    items={[
                      { label: "Dashboard", href: homeForRole(session.role) },
                      { label: "View public profile", href: session.profileHref },
                      {
                        label:
                          session.role === "COMPANY" ? "Company settings" : "Profile settings",
                        href:
                          session.role === "COMPANY"
                            ? "/company/profile"
                            : session.role === "ADMIN"
                              ? "/admin/settings"
                              : "/freelancer/profile",
                      },
                      {
                        label: "Sign out",
                        icon: <LogOut />,
                        onClick: signOut,
                        destructive: true,
                        separatorBefore: true,
                      },
                    ]}
                  />
                </>
              ) : (
                <>
                  <Button href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                    Log in
                  </Button>
                  <Button href="/register" size="sm">
                    Get started
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
                className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-hover)] lg:hidden"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="sticky top-[68px] overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)] lg:hidden"
            style={{ zIndex: 199 }}
          >
            <nav className="container-wide flex flex-col gap-1 py-4">
              {MARKETING_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[var(--radius-md)] px-3 py-3 text-[15px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-hover)]"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-4">
                {session ? (
                  <>
                    <Button href={homeForRole(session.role)} block size="lg">
                      Go to dashboard
                    </Button>
                    <Button variant="secondary" block size="lg" onClick={signOut}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button href="/register" block size="lg">
                      Create an account
                    </Button>
                    <Button href="/login" variant="secondary" block size="lg">
                      Log in
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
