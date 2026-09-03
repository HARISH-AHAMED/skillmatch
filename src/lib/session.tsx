"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signIn as authSignIn, signOut as authSignOut } from "next-auth/react";
import { registerUser } from "@/actions/authActions";
import type { Role } from "./types";

/* ============================================================================
   SESSION

   A thin client view of the Auth.js session the server already established.
   The provider receives the resolved session from the root layout, so the
   first render is correct rather than hydrating from storage, and every
   credential operation goes through Auth.js and the existing registerUser
   action — this module holds no authentication logic of its own.
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

type Result = { ok: true } | { ok: false; error: string };

interface SessionApi {
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<Result>;
  signInWithGoogle: (role?: Role) => void;
  register: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
    companyName?: string;
  }) => Promise<Result>;
  /** Clears the session, then leaves the page so nothing stale survives. */
  signOut: () => Promise<void>;
  completeOnboarding: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/* ---------------------------------------------------------- demo accounts -- */

/**
 * The accounts the database seed creates. The design's demo panel is kept as
 * drawn, pointed at credentials that actually exist rather than at fixtures.
 */
export const DEMO_ACCOUNTS: {
  role: Role;
  email: string;
  password: string;
  label: string;
  description: string;
}[] = [
  {
    role: "FREELANCER",
    email: "freelancer.jane@skillmatch.ai",
    password: "freelancer123",
    label: "Jane — Freelancer",
    description: "Applications in flight and an active workspace with live payment stages.",
  },
  {
    role: "COMPANY",
    email: "company.quantum@skillmatch.ai",
    password: "company123",
    label: "Quantum — Company",
    description: "Open listings, a full applicant pipeline and a funded engagement running.",
  },
  {
    role: "ADMIN",
    email: "admin@skillmatch.ai",
    password: "admin123",
    label: "Platform Admin",
    description: "Full moderation and directory access across the platform.",
  },
];

export function homeForRole(role: Role) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "COMPANY") return "/company/dashboard";
  return "/freelancer/dashboard";
}

/* ----------------------------------------------------------------- provider */

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession: Session | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  // The server is the source of truth. There is no local copy to drift: every
  // mutation below ends in a refresh, which re-renders the layout — and this
  // provider — with the session Auth.js now reports.
  const session = initialSession;

  const signIn = useCallback<SessionApi["signIn"]>(async (email, password) => {
    const normalised = email.trim().toLowerCase();
    if (!normalised || !password) return { ok: false, error: "Enter your email and password." };

    const result = await authSignIn("credentials", {
      email: normalised,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      // Auth.js reports every credential failure identically, and so does the
      // form — an account that exists is not distinguishable from one that
      // does not.
      return { ok: false, error: "Those details do not match an account." };
    }

    router.refresh();
    return { ok: true };
  }, [router]);

  const signInWithGoogle = useCallback<SessionApi["signInWithGoogle"]>((role = "FREELANCER") => {
    void authSignIn("google", { callbackUrl: homeForRole(role) });
  }, []);

  const register = useCallback<SessionApi["register"]>(
    async ({ name, email, password, role, companyName }) => {
      if (!name.trim()) return { ok: false, error: "Enter your name." };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { ok: false, error: "Enter a valid email address." };
      if (password.length < 8)
        return { ok: false, error: "Use at least 8 characters for your password." };
      // ADMIN can never be self-assigned (§6.2 / R2); registerUser enforces the
      // same allowlist server-side.
      if (role !== "FREELANCER" && role !== "COMPANY")
        return { ok: false, error: "Choose whether you are hiring or looking for work." };

      const created = await registerUser({
        // A company signs up under its company name when one was given.
        name: role === "COMPANY" ? companyName?.trim() || name.trim() : name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      if ("error" in created && created.error) return { ok: false, error: created.error };

      return signIn(email, password);
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    /*
     * Clear the session server-side without letting Auth.js navigate, so the
     * client router cache can be dropped while this page is still mounted.
     * Auth.js on its own would assign location straight away, leaving every
     * RSC payload it had already cached for the *previous* session to be
     * replayed on the way back in.
     *
     * `replace` rather than `assign` so Back cannot return to an
     * authenticated page after signing out.
     */
    await authSignOut({ redirect: false });
    router.refresh();
    window.location.replace("/");
  }, [router]);

  const completeOnboarding = useCallback(() => {
    // Onboarding state lives on the company profile the wizard just wrote, so
    // the flag is re-read from the server rather than tracked here.
    router.refresh();
  }, [router]);

  const value = useMemo<SessionApi>(
    () => ({
      session,
      // The session arrives resolved from the server; there is no async
      // hydration step for consumers to wait on.
      ready: true,
      signIn,
      signInWithGoogle,
      register,
      signOut,
      completeOnboarding,
    }),
    [session, signIn, signInWithGoogle, register, signOut, completeOnboarding],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/* ------------------------------------------------------------ route guard -- */

/**
 * Client-side companion to the server guards in `@/data/server/context`. The
 * server has already redirected anyone who does not belong; this keeps the
 * shell from flashing the wrong chrome if a session ends mid-visit.
 */
export function useRequireRole(role: Role | Role[]) {
  const { session, ready } = useSession();
  const router = useRouter();

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
