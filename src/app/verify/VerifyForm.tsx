"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, ScanLine, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { CERTIFICATES } from "@/data/queries";

export function VerifyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError("Enter a certificate ID to verify.");
      return;
    }
    router.push(`/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <section className="relative overflow-hidden bg-[var(--color-brand-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(6,199,85,0.26), transparent 70%)" }}
      />
      <div className="container-app relative py-16 md:py-20">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand-bright)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Public verification
          </span>

          <h1 className="mt-5 text-[28px] font-semibold leading-[1.18] tracking-[-0.024em] text-white md:text-[36px]">
            Verify a FRIVVO certificate
          </h1>
          <p className="mt-3.5 text-[15px] leading-[1.65] text-white/65">
            Enter the certificate ID printed on the document. No account, no login — anyone
            checking a candidate&apos;s claim can confirm it in one step.
          </p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-2.5 sm:flex-row">
            <div className="flex-1">
              <Input
                inputSize="lg"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="XXXXX-XXXXX"
                aria-label="Certificate ID"
                leftIcon={<ScanLine />}
                className="h-[52px] border-white/15 bg-white/[0.08] font-mono tracking-[0.14em] text-white placeholder:text-white/35 focus:border-[var(--color-brand-bright)]"
              />
            </div>
            <Button
              type="submit"
              size="xl"
              className="h-[52px] shrink-0 px-7"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Verify
            </Button>
          </form>

          {error && (
            <div className="mt-4 text-left">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <div className="mt-8 rounded-[var(--radius-lg)] border border-white/12 bg-white/[0.05] p-4 text-left">
            <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-white/50">
              Try a sample
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {CERTIFICATES.slice(0, 3).map((c) => (
                <button
                  key={c.publicId}
                  type="button"
                  onClick={() => router.push(`/verify/${c.publicId}`)}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 font-mono text-[12px] tracking-[0.1em] text-white/80 transition-colors hover:border-[var(--color-brand-bright)] hover:text-white"
                >
                  {c.publicId}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
