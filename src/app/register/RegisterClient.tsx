"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Briefcase, Building2, Check, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AuthDivider,
  AuthShell,
  COMPANY_PANEL,
  GoogleButton,
  TALENT_PANEL,
} from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, RadioCard } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { homeForRole, useSession } from "@/lib/session";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------- password meter -- */

function passwordScore(value: string) {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(4, score);
}

const STRENGTH = [
  { label: "Too short", tone: "bg-[var(--color-error-fg)]", text: "text-[var(--color-error-fg)]" },
  { label: "Weak", tone: "bg-[var(--color-error-fg)]", text: "text-[var(--color-error-fg)]" },
  { label: "Fair", tone: "bg-[var(--color-warning-fg)]", text: "text-[var(--color-warning-fg)]" },
  { label: "Good", tone: "bg-[var(--color-info-fg)]", text: "text-[var(--color-info-fg)]" },
  { label: "Strong", tone: "bg-[var(--color-brand)]", text: "text-[var(--color-brand-active)]" },
];

export function RegisterClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { register, signInWithGoogle } = useSession();

  const initialRole = params.get("role") === "COMPANY" ? "COMPANY" : "FREELANCER";
  const [step, setStep] = useState<"role" | "details">(
    params.get("role") ? "details" : "role",
  );
  const [role, setRole] = useState<Role>(initialRole as Role);

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreed) {
      setError("Please accept the Terms and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    const result = register({ name, email, password, role, companyName });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Role-based destination (§6.2 step 5)
    router.push(role === "COMPANY" ? "/company/dashboard?onboarding=1" : homeForRole(role));
  };

  /* ---------------------------------------------------------- step: role -- */

  if (step === "role") {
    return (
      <AuthShell
        panel={role === "COMPANY" ? COMPANY_PANEL : TALENT_PANEL}
        footer={
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[var(--color-link)] hover:underline">
              Log in
            </Link>
          </p>
        }
      >
        <h1 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--color-text-primary)]">
          What brings you to FRIVVO?
        </h1>
        <p className="mt-2 text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">
          This decides which side of the platform you land on. You can always follow projects from
          the other side too.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <RadioCard
            checked={role === "FREELANCER"}
            onSelect={() => setRole("FREELANCER")}
            icon={<Briefcase />}
            title="I'm looking for work"
            description="Build a profile, apply to scoped engagements, and get paid through funded stages."
          />
          <RadioCard
            checked={role === "COMPANY"}
            onSelect={() => setRole("COMPANY")}
            icon={<Building2 />}
            title="I'm hiring"
            description="Publish projects, rank applicants on explainable scores, and run delivery in one workspace."
          />
        </div>

        <Button
          size="lg"
          block
          className="mt-6"
          onClick={() => setStep("details")}
        >
          Continue
        </Button>

        <ul className="mt-7 flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
          {[
            "Free to join — no card required",
            "Your profile is yours; certificates are portable",
            "Every payment movement is recorded on an auditable ledger",
          ].map((point) => (
            <li key={point} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                <Check className="h-2.5 w-2.5 text-[var(--color-brand-active)]" strokeWidth={3} />
              </span>
              <span className="text-[13px] leading-[1.5] text-[var(--color-text-secondary)]">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </AuthShell>
    );
  }

  /* ------------------------------------------------------- step: details -- */

  return (
    <AuthShell
      panel={role === "COMPANY" ? COMPANY_PANEL : TALENT_PANEL}
      footer={
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--color-link)] hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <button
        type="button"
        onClick={() => setStep("role")}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Change account type
      </button>

      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-soft)] px-3 py-1.5">
        {role === "COMPANY" ? (
          <Building2 className="h-3.5 w-3.5 text-[var(--color-brand-active)]" />
        ) : (
          <Briefcase className="h-3.5 w-3.5 text-[var(--color-brand-active)]" />
        )}
        <span className="text-[12.5px] font-semibold text-[var(--color-brand-active)]">
          {role === "COMPANY" ? "Company account" : "Talent account"}
        </span>
      </div>

      <h1 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--color-text-primary)]">
        Create your account
      </h1>
      <p className="mt-2 text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">
        {role === "COMPANY"
          ? "Once you're in, we'll walk you through a short onboarding to set up your company profile."
          : "Takes about a minute. You can finish your profile after you've had a look around."}
      </p>

      <div className="mt-6">
        <GoogleButton
          onClick={() => {
            signInWithGoogle(role);
            router.push(homeForRole(role));
          }}
          label="Sign up with Google"
        />
      </div>

      <AuthDivider label="or use your email" />

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && (
          <Alert tone="error" title="Check the form">
            {error}
          </Alert>
        )}

        <Field label="Full name" htmlFor="name" required>
          <Input
            id="name"
            inputSize="lg"
            autoComplete="name"
            placeholder="Alex Morgan"
            leftIcon={<User />}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        {role === "COMPANY" && (
          <Field
            label="Company name"
            htmlFor="company"
            required
            help="This is the name that appears on your listings and certificates."
          >
            <Input
              id="company"
              inputSize="lg"
              autoComplete="organization"
              placeholder="Northwind Labs"
              leftIcon={<Building2 />}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </Field>
        )}

        <Field label="Work email" htmlFor="reg-email" required>
          <Input
            id="reg-email"
            type="email"
            inputSize="lg"
            autoComplete="email"
            placeholder="you@company.com"
            leftIcon={<Mail />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="reg-password" required>
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            inputSize="lg"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            leftIcon={<Lock />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {password.length > 0 && (
          <div className="-mt-1">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-[var(--motion-base)]",
                    i < score ? STRENGTH[score].tone : "bg-[var(--color-surface-sunken)]",
                  )}
                />
              ))}
            </div>
            <p className={cn("mt-1.5 text-[12px]", STRENGTH[score].text)}>
              {STRENGTH[score].label}
              {score < 3 && " — add length, a number or a symbol"}
            </p>
          </div>
        )}

        <Checkbox
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          label={
            <>
              I agree to the{" "}
              <Link href="/legal/terms" className="text-[var(--color-link)] hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="text-[var(--color-link)] hover:underline">
                Privacy Policy
              </Link>
            </>
          }
        />

        <Button type="submit" size="lg" block loading={loading}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
