"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "./types";
import { COMPANIES } from "@/data/companies";
import { FREELANCERS } from "@/data/freelancers";

/* ============================================================================
   SESSION — UI-only stand-in for Auth.js. Persists to localStorage so the
   role-based flows behave exactly as they will once the DB is wired in.
   ========================================================================= */

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  image?: string;
  profileId: string;
  profileHref: string;
  /** Set when a company has not finished the onboarding wizard (§6.2). */
  onboardingComplete: boolean;
}

interface SessionApi {
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  signInWithGoogle: (role?: Role) => void;
  register: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
    companyName?: string;
  }) => { ok: true } | { ok: false; error: string };
  signOut: () => void;
  switchTo: (role: Role) => void;
  completeOnboarding: () => void;
}

const KEY = "frivvo.session.v1";

const SessionContext = createContext<SessionApi | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/* ---------------------------------------------------------- demo accounts -- */

export const DEMO_ACCOUNTS: {
  role: Role;
  email: string;
  password: string;
  label: string;
  description: string;
}[] = [
  {
    role: "FREELANCER",
    email: "mei@frivvo.talent",
    password: "frivvo",
    label: "Mei Chen — Freelancer",
    description: "Hired on two engagements, one active workspace with live payment stages.",
  },
  {
    role: "COMPANY",
    email: "talent@northwindlabs.io",
    password: "frivvo",
    label: "Northwind Labs — Company",
    description: "Four projects, 47 applicants in the pipeline, one funded engagement running.",
  },
  {
    role: "ADMIN",
    email: "admin@frivvo.com",
    password: "frivvo",
    label: "Platform Admin",
    description: "Full moderation and directory access across the platform.",
  },
];

function sessionForFreelancer(id: string): Session {
  const f = FREELANCERS.find((x) => x.id === id)!;
  return {
    userId: f.userId,
    name: f.name,
    email: f.email,
    role: "FREELANCER",
    image: f.avatarUrl,
    profileId: f.id,
    profileHref: `/freelancers/${f.id}`,
    onboardingComplete: true,
  };
}

function sessionForCompany(id: string): Session {
  const c = COMPANIES.find((x) => x.id === id)!;
  return {
    userId: c.userId,
    name: c.companyName,
    email: c.email,
    role: "COMPANY",
    image: c.logoUrl,
    profileId: c.id,
    profileHref: `/companies/${c.id}`,
    onboardingComplete: true,
  };
}

const ADMIN_SESSION: Session = {
  userId: "u-admin",
  name: "Platform Admin",
  email: "admin@frivvo.com",
  role: "ADMIN",
  profileId: "admin",
  profileHref: "/admin/dashboard",
  onboardingComplete: true,
};

export function homeForRole(role: Role) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "COMPANY") return "/company/dashboard";
  return "/freelancer/dashboard";
}

/* ----------------------------------------------------------------- provider */

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Hydration has to happen here rather than in a lazy initializer: the
    // server has no localStorage, so reading it during the first render would
    // produce markup the client immediately contradicts.
    try {
      const raw = window.localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* a corrupt entry just means no session */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Session | null) => {
    setSession(next);
    try {
      if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
      else window.localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable — session stays in memory */
    }
  }, []);

  const signIn = useCallback<SessionApi["signIn"]>(
    (email, password) => {
      const normalised = email.trim().toLowerCase();
      if (!normalised || !password) return { ok: false, error: "Enter your email and password." };

      const demo = DEMO_ACCOUNTS.find((a) => a.email === normalised);
      if (demo) {
        const next =
          demo.role === "ADMIN"
            ? ADMIN_SESSION
            : demo.role === "COMPANY"
              ? sessionForCompany("co-northwind")
              : sessionForFreelancer("fl-mei");
        persist(next);
        return { ok: true };
      }

      const freelancer = FREELANCERS.find((f) => f.email.toLowerCase() === normalised);
      if (freelancer) {
        persist(sessionForFreelancer(freelancer.id));
        return { ok: true };
      }
      const company = COMPANIES.find((c) => c.email.toLowerCase() === normalised);
      if (company) {
        persist(sessionForCompany(company.id));
        return { ok: true };
      }

      // Login never creates an account (§6.3 / R3).
      return { ok: false, error: "Those details do not match an account." };
    },
    [persist],
  );

  const signInWithGoogle = useCallback<SessionApi["signInWithGoogle"]>(
    (role = "FREELANCER") => {
      persist(role === "COMPANY" ? sessionForCompany("co-northwind") : sessionForFreelancer("fl-mei"));
    },
    [persist],
  );

  const register = useCallback<SessionApi["register"]>(
    ({ name, email, password, role, companyName }) => {
      if (!name.trim()) return { ok: false, error: "Enter your name." };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { ok: false, error: "Enter a valid email address." };
      if (password.length < 8)
        return { ok: false, error: "Use at least 8 characters for your password." };
      // ADMIN can never be self-assigned (§6.2 / R2).
      if (role !== "FREELANCER" && role !== "COMPANY")
        return { ok: false, error: "Choose whether you are hiring or looking for work." };

      const next: Session =
        role === "COMPANY"
          ? {
              ...sessionForCompany("co-northwind"),
              name: companyName?.trim() || name.trim(),
              email: email.trim().toLowerCase(),
              onboardingComplete: false,
            }
          : {
              ...sessionForFreelancer("fl-samuel"),
              name: name.trim(),
              email: email.trim().toLowerCase(),
              onboardingComplete: true,
            };
      persist(next);
      return { ok: true };
    },
    [persist],
  );

  const signOut = useCallback(() => {
    persist(null);
    router.push("/");
  }, [persist, router]);

  const switchTo = useCallback<SessionApi["switchTo"]>(
    (role) => {
      const next =
        role === "ADMIN"
          ? ADMIN_SESSION
          : role === "COMPANY"
            ? sessionForCompany("co-northwind")
            : sessionForFreelancer("fl-mei");
      persist(next);
      router.push(homeForRole(role));
    },
    [persist, router],
  );

  const completeOnboarding = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, onboardingComplete: true };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const value = useMemo<SessionApi>(
    () => ({
      session,
      ready,
      signIn,
      signInWithGoogle,
      register,
      signOut,
      switchTo,
      completeOnboarding,
    }),
    [session, ready, signIn, signInWithGoogle, register, signOut, switchTo, completeOnboarding],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/* ------------------------------------------------------------ route guard -- */

export function useRequireRole(role: Role | Role[]) {
  const { session, ready } = useSession();
  const router = useRouter();

  // A fresh array every render would re-run the guard effect every render, so
  // the accepted roles are collapsed to a stable string key.
  const allowedKey = (Array.isArray(role) ? role : [role]).join(",");
  const allowed = Boolean(session && allowedKey.split(",").includes(session.role));

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!allowedKey.split(",").includes(session.role)) {
      router.replace(homeForRole(session.role));
    }
  }, [ready, session, router, allowedKey]);

  return { session, ready, allowed };
}
