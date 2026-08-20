"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Zap } from "lucide-react";
import { useState } from "react";
import {
  AuthDivider,
  AuthShell,
  COMPANY_PANEL,
  GoogleButton,
  TALENT_PANEL,
} from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { DEMO_ACCOUNTS, homeForRole, useSession } from "@/lib/session";
import type { Role } from "@/lib/types";

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, signInWithGoogle } = useSession();

  const [side, setSide] = useState<"FREELANCER" | "COMPANY">(
    params.get("role") === "COMPANY" ? "COMPANY" : "FREELANCER",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = params.get("next");

  const go = (role: Role) => {
    router.push(next && next.startsWith("/") ? next : homeForRole(role));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = signIn(email, password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const matched = DEMO_ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
    go(matched?.role ?? side);
  };

  const signInAsDemo = (demoEmail: string, role: Role) => {
    setEmail(demoEmail);
    setPassword("frivvo");
    setError(null);
    const result = signIn(demoEmail, "frivvo");
    if (result.ok) go(role);
  };

  return (
    <AuthShell
      panel={side === "COMPANY" ? COMPANY_PANEL : TALENT_PANEL}
      footer={
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          New here?{" "}
          <Link
            href="/register"
            className="font-semibold text-[var(--color-link)] hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <h1 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--color-text-primary)]">
        Welcome back
      </h1>
      <p className="mt-2 text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">
        Sign in to pick up your projects, applications and workspaces exactly where you left them.
      </p>

      {/* Side selector — changes the editorial panel and the post-login destination */}
      <div className="mt-6">
        <Tabs
          variant="segmented"
          value={side}
          onChange={(v) => setSide(v as "FREELANCER" | "COMPANY")}
          items={[
            { id: "FREELANCER", label: "I'm looking for work" },
            { id: "COMPANY", label: "I'm hiring" },
          ]}
        />
      </div>

      <div className="mt-6">
        <GoogleButton onClick={() => { signInWithGoogle(side); go(side); }} />
      </div>

      <AuthDivider label="or sign in with email" />

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && (
          <Alert tone="error" title="Could not sign you in">
            {error}
          </Alert>
        )}

        <Field label="Email address" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputSize="lg"
            placeholder="you@company.com"
            leftIcon={<Mail />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(error)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          required
          hint=""
        >
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            inputSize="lg"
            placeholder="Enter your password"
            leftIcon={<Lock />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(error)}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--color-hover)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </Field>

        <div className="flex items-center justify-between gap-4">
          <Checkbox
            label="Keep me signed in"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <Link
            href="/forgot-password"
            className="text-[13px] font-medium text-[var(--color-link)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" block loading={loading}>
          Sign in
        </Button>
      </form>

      {/* Demo accounts — removed once real auth is wired in */}
      <div className="mt-7 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-emphasis)] bg-[var(--color-surface-alt)] p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          <Zap className="h-3.5 w-3.5" />
          Preview accounts
        </p>
        <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[var(--color-text-secondary)]">
          The UI is running on seeded data. Pick a role to see the product from that side.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => signInAsDemo(a.email, a.role)}
              className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-softer)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {a.label}
                </span>
                <span className="mt-0.5 block text-[12px] leading-[1.45] text-[var(--color-text-secondary)]">
                  {a.description}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand-active)]">
                Enter
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-[12.5px] leading-[1.55] text-[var(--color-text-muted)]">
        By signing in you agree to our{" "}
        <Link href="/legal/terms" className="text-[var(--color-link)] hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="text-[var(--color-link)] hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  );
}
