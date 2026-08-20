"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Search, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CountUp, TextReveal } from "@/components/motion/Motion";
import { EDITORIAL } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { Freelancer } from "@/lib/types";

const POPULAR = ["react", "figma", "machine learning", "technical writing", "seo"];

export function Hero({
  stats,
  people,
}: {
  stats: { freelancers: number; projects: number; released: number; companies: number };
  people: Pick<Freelancer, "id" | "name" | "avatarUrl">[];
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/discover/projects${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <section className="relative overflow-hidden bg-[var(--color-surface)]">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-[0.55] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(6,199,85,0.22) 0%, rgba(6,199,85,0.06) 45%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(6,199,85,0.16) 0%, transparent 70%)",
        }}
      />

      <div className="container-wide relative">
        <div className="grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16 lg:py-24">
          {/* ---- Copy column ---- */}
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-border)] bg-[var(--color-brand-softer)] py-1.5 pl-1.5 pr-3.5"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                <Sparkles className="h-3 w-3" />
                New
              </span>
              <span className="text-[12.5px] font-medium text-[var(--color-brand-active)]">
                Explainable match scores — see every signal behind the number
              </span>
            </motion.div>

            <h1 className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.028em] text-[var(--color-text-primary)] sm:text-[44px] lg:text-[52px]">
              <TextReveal text="Hire the right people." />
              <br />
              <TextReveal
                text="Run the whole engagement here."
                delay={0.18}
                highlight={["engagement"]}
              />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-5 max-w-xl text-[16px] leading-[1.65] text-[var(--color-text-secondary)] text-pretty"
            >
              Publish work, match on scores you can actually explain, hire into named roles, then
              run contracts, funded payment stages, tasks, chat, meetings and deliverables in one
              workspace — ending with a certificate anyone can verify.
            </motion.p>

            {/* Search */}
            <motion.form
              onSubmit={submit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-7 flex w-full max-w-xl flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects, skills or companies"
                  aria-label="Search projects"
                  className="h-[52px] w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] pl-11 pr-4 text-[14.5px] shadow-[var(--shadow-sm)] transition-shadow placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:outline-none focus:shadow-[var(--shadow-focus)]"
                />
              </div>
              <Button type="submit" size="xl" className="h-[52px] shrink-0 px-7" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Explore work
              </Button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.68 }}
              className="mt-4 flex flex-wrap items-center gap-2"
            >
              <span className="text-[12.5px] text-[var(--color-text-muted)]">Popular:</span>
              {POPULAR.map((s) => (
                <Link
                  key={s}
                  href={`/discover/projects?skill=${encodeURIComponent(s)}`}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-1 text-[12px] capitalize text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-active)]"
                >
                  {s}
                </Link>
              ))}
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex">
                  {people.slice(0, 5).map((p, i) => (
                    <span key={p.id} className={i === 0 ? "" : "-ml-2.5"}>
                      <Avatar src={p.avatarUrl} name={p.name} size="sm" ring />
                    </span>
                  ))}
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[13px] font-semibold text-[var(--color-text-primary)]">
                    <Star className="h-3.5 w-3.5 fill-[var(--color-star)] text-[var(--color-star)]" />
                    4.8 average rating
                  </p>
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    across {stats.freelancers}+ verified specialists
                  </p>
                </div>
              </div>
              <div className="h-9 w-px bg-[var(--color-border)]" />
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  <CountUp to={Math.round(stats.released / 1000)} prefix="$" suffix="K+" /> released
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  through an auditable ledger
                </p>
              </div>
            </motion.div>
          </div>

          {/* ---- Visual column ---- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <div className="relative aspect-[4/5] w-full">
              {/* Main image */}
              <div className="absolute inset-0 overflow-hidden rounded-[24px] border border-[var(--color-border)] shadow-[var(--shadow-lg)]">
                <Image
                  src={EDITORIAL.heroPrimary}
                  alt="A distributed team collaborating on a FRIVVO engagement"
                  fill
                  priority
                  sizes="520px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.5)] via-transparent to-transparent" />
              </div>

              {/* Floating: match card */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-8 top-16 w-[228px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-lg)]"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar src={people[0]?.avatarUrl} name={people[0]?.name ?? "Talent"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                      {people[0]?.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Frontend engineer</p>
                  </div>
                  <span className="rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-brand-active)]">
                    94%
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {[
                    ["Skill match", 100],
                    ["Experience", 100],
                    ["Rating", 98],
                  ].map(([label, v]) => (
                    <div key={label as string} className="flex items-center gap-2">
                      <span className="w-[62px] shrink-0 text-[10.5px] text-[var(--color-text-muted)]">
                        {label}
                      </span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
                        <span
                          className="block h-full rounded-full bg-[var(--color-brand)]"
                          style={{ width: `${v}%` }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Floating: payment released */}
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -right-6 bottom-24 w-[212px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-lg)]"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                    <ShieldCheck className="h-4 w-4 text-[var(--color-brand-active)]" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                      Stage 1 released
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Ledger entry #4128</p>
                  </div>
                </div>
                <p className="mt-2.5 text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--color-text-primary)]">
                  $12,000.00
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                  Funded → approved → released
                </p>
              </motion.div>

              {/* Small stacked image */}
              <div className="absolute -bottom-6 left-6 h-[124px] w-[168px] overflow-hidden rounded-[var(--radius-lg)] border-4 border-[var(--color-surface)] shadow-[var(--shadow-md)]">
                <Image
                  src={EDITORIAL.collaboration}
                  alt=""
                  fill
                  sizes="168px"
                  className="object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stat band */}
      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <div className="container-wide">
          <dl className="grid grid-cols-2 divide-x divide-[var(--color-border)] md:grid-cols-4">
            {[
              { label: "Verified specialists", value: stats.freelancers, suffix: "+" },
              { label: "Companies hiring", value: stats.companies, suffix: "" },
              { label: "Projects published", value: stats.projects, suffix: "" },
              { label: "Released on ledger", value: Math.round(stats.released / 1000), prefix: "$", suffix: "K" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "px-4 py-6 text-center md:px-6",
                  i === 2 && "border-l-0 md:border-l",
                  i >= 2 && "border-t border-[var(--color-border)] md:border-t-0",
                )}
              >
                <dt className="order-2 mt-1 text-[12.5px] text-[var(--color-text-secondary)]">
                  {s.label}
                </dt>
                <dd className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] md:text-[28px]">
                  <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
