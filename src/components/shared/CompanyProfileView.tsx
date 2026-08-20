"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  Eye,
  Globe,
  Heart,
  MapPin,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, Progress, Rating } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ProjectCard } from "./Cards";
import type { Company, Project, Review } from "@/lib/types";
import { formatDate, relativeTime } from "@/lib/utils";

export function CompanyProfileView({
  company,
  projects,
  reviews,
  canFollow = true,
}: {
  company: Company;
  projects: Project[];
  reviews: Review[];
  canFollow?: boolean;
}) {
  const toast = useToast();
  const [tab, setTab] = useState("about");
  const [following, setFollowing] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const [community, setCommunity] = useState(false);

  const openProjects = projects.filter((p) => p.status === "OPEN" || p.status === "IN_PROGRESS");

  const tabs = [
    { id: "about", label: "About" },
    { id: "projects", label: "Open roles", count: openProjects.length },
    { id: "culture", label: "Culture & team" },
    { id: "reviews", label: "Reviews", count: reviews.length },
  ];

  const scores = [
    { label: "Trust score", value: company.trustScore, help: "Communication, payment and clarity averaged across all reviews." },
    { label: "Payment reliability", value: company.paymentReliability, help: "Derived from the payment sub-score on every freelancer review." },
    { label: "Completion rate", value: company.completionRate, help: "Share of engagements taken through to a completed state." },
    { label: "Retention", value: company.retentionRate, help: "Freelancers who return for a second engagement." },
  ];

  return (
    <div>
      {/* ---- Banner ---- */}
      <div className="relative h-40 w-full overflow-hidden bg-[var(--color-surface-sunken)] md:h-60">
        <Image src={company.bannerUrl} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.5)] to-transparent" />
      </div>

      <div className="container-wide">
        {/* ---- Header ---- */}
        <div className="-mt-14 md:-mt-16">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <Avatar
                src={company.logoUrl}
                name={company.companyName}
                size="2xl"
                rounded="md"
                ring
                className="-mt-16 md:-mt-20"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)] md:text-[28px]">
                    {company.companyName}
                  </h1>
                  {company.verificationBadges.includes("Identity Verified") && (
                    <ShieldCheck className="h-5 w-5 text-[var(--color-brand)]" aria-label="Verified" />
                  )}
                </div>

                <p className="mt-1.5 text-[14.5px] text-[var(--color-text-secondary)]">
                  {company.industry}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--color-text-muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {company.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {company.companySize}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Founded {company.foundedYear}
                  </span>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-[var(--color-link)] hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-3">
                  <Rating value={company.rating} count={company.reviewCount} />
                  <span className="text-[var(--color-border-emphasis)]">·</span>
                  <span className="text-[13px] text-[var(--color-text-secondary)]">
                    {company.totalHires} hires · replies {company.avgResponseTime.toLowerCase()}
                  </span>
                </div>
              </div>

              {canFollow && (
                <div className="flex shrink-0 flex-col gap-2 md:w-[210px]">
                  <Button
                    block
                    variant={following ? "soft" : "primary"}
                    leftIcon={following ? <Check className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                    onClick={() => {
                      setFollowing((v) => !v);
                      toast.toast({
                        title: following ? "Unfollowed" : `Following ${company.companyName}`,
                        description: following
                          ? undefined
                          : "New projects from this company will surface on your dashboard.",
                        tone: "success",
                      });
                    }}
                  >
                    {following ? "Following" : "Follow company"}
                  </Button>
                  <Button
                    block
                    variant="secondary"
                    leftIcon={alerts ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    onClick={() => {
                      setAlerts((v) => !v);
                      toast.toast({
                        title: alerts ? "Job alerts off" : "Job alerts on",
                        tone: "success",
                      });
                    }}
                  >
                    {alerts ? "Alerts on" : "Get job alerts"}
                  </Button>
                  <Button
                    block
                    variant="ghost"
                    size="sm"
                    leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setCommunity((v) => !v);
                      toast.toast({
                        title: community
                          ? "Left the talent community"
                          : "Joined the talent community",
                        description: community
                          ? undefined
                          : "You will be considered first for invite-only listings.",
                        tone: "success",
                      });
                    }}
                  >
                    {community ? "In talent community" : "Join talent community"}
                  </Button>
                </div>
              )}
            </div>

            {/* Scores */}
            <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {scores.map((s) => (
                <div
                  key={s.label}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-[12.5px] text-[var(--color-text-secondary)]">{s.label}</dt>
                    <dd className="text-[17px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {Math.round(s.value)}
                      <span className="text-[12px] text-[var(--color-text-muted)]">
                        {s.label === "Trust score" ? "" : "%"}
                      </span>
                    </dd>
                  </div>
                  <Progress value={s.value} size="sm" className="mt-2" />
                  <p className="mt-1.5 text-[11px] leading-[1.45] text-[var(--color-text-muted)]">
                    {s.help}
                  </p>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-6">
          <Tabs items={tabs} value={tab} onChange={setTab} />
        </div>

        <div className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
          <div className="flex min-w-0 flex-col gap-5">
            {tab === "about" && (
              <>
                <Card padding="lg">
                  <CardHeader title={`About ${company.companyName}`} icon={<Building2 />} />
                  <p className="text-[14.5px] leading-[1.72] text-[var(--color-text-secondary)]">
                    {company.description}
                  </p>
                </Card>

                <Card padding="lg">
                  <CardHeader title="Mission & vision" icon={<Sparkles />} />
                  <p className="text-[14.5px] leading-[1.72] text-[var(--color-text-secondary)]">
                    {company.missionVision}
                  </p>
                </Card>

                <Card padding="lg">
                  <CardHeader title="How they hire" icon={<Users />} />
                  <p className="text-[14.5px] leading-[1.72] text-[var(--color-text-secondary)]">
                    {company.hiringPhilosophy}
                  </p>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Average time to hire", value: company.avgTimeToHire },
                      { label: "Response time", value: company.avgResponseTime },
                      { label: "Hiring success rate", value: `${company.hiringSuccessRate}%` },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3 text-center"
                      >
                        <dd className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                          {s.value}
                        </dd>
                        <dt className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                          {s.label}
                        </dt>
                      </div>
                    ))}
                  </dl>
                </Card>
              </>
            )}

            {tab === "projects" && (
              <>
                {openProjects.length === 0 ? (
                  <EmptyState
                    icon={<Building2 />}
                    title="No open roles right now"
                    description={`Follow ${company.companyName} to be notified the moment they publish something new.`}
                    action={{ label: "Follow company", onClick: () => setFollowing(true) }}
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {openProjects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        href={`/discover/projects/${p.id}`}
                        showMatch={false}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "culture" && (
              <>
                <Card padding="lg">
                  <CardHeader title="Working here" icon={<Sparkles />} />
                  <p className="text-[14.5px] leading-[1.72] text-[var(--color-text-secondary)]">
                    {company.workCulture}
                  </p>
                  <div className="mt-5">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
                      Benefits
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {company.benefits.map((b) => (
                        <Chip key={b}>{b}</Chip>
                      ))}
                    </div>
                  </div>
                </Card>

                {company.galleryPhotos.length > 0 && (
                  <Card padding="lg">
                    <CardHeader title="Inside the company" icon={<Eye />} />
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {company.galleryPhotos.map((src, i) => (
                        <div
                          key={src}
                          className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"
                        >
                          <Image
                            src={src}
                            alt={`${company.companyName} workplace ${i + 1}`}
                            fill
                            sizes="(max-width: 768px) 50vw, 260px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card padding="lg">
                  <CardHeader title="Who you would work with" icon={<Users />} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {company.teamMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
                      >
                        <Avatar src={m.avatarUrl} name={m.name} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                            {m.name}
                          </p>
                          <p className="truncate text-[12.5px] text-[var(--color-text-secondary)]">
                            {m.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {tab === "reviews" && (
              <Card padding="lg">
                <CardHeader
                  title="What freelancers say"
                  description="Written after a completed engagement, with sub-scores for communication, payment reliability and project clarity."
                  icon={<Star />}
                />
                {reviews.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Star />}
                    title="No reviews yet"
                    description="Reviews appear once an engagement with this company completes."
                  />
                ) : (
                  <ul className="flex flex-col gap-5">
                    {reviews.map((r) => (
                      <li
                        key={r.id}
                        className="border-b border-[var(--color-border-subtle)] pb-5 last:border-0 last:pb-0"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar src={r.reviewerAvatar} name={r.reviewerName} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                                  {r.reviewerName}
                                </p>
                                <p className="text-[12px] text-[var(--color-text-muted)]">
                                  {r.projectTitle} · {relativeTime(r.createdAt)}
                                </p>
                              </div>
                              <Rating value={r.rating} size="sm" showValue={false} />
                            </div>

                            <div className="mt-2.5 flex items-start gap-2.5">
                              <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-border-emphasis)]" />
                              <p className="text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                                {r.comment}
                              </p>
                            </div>

                            {r.communicationScore && (
                              <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                                {[
                                  ["Communication", r.communicationScore],
                                  ["Payment reliability", r.paymentReliabilityScore],
                                  ["Project clarity", r.projectClarityScore],
                                ].map(([label, value]) => (
                                  <div
                                    key={label as string}
                                    className="rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] px-2.5 py-2"
                                  >
                                    <dt className="text-[11px] text-[var(--color-text-muted)]">
                                      {label}
                                    </dt>
                                    <dd className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-[var(--color-text-primary)]">
                                      <Star className="h-3 w-3 fill-[var(--color-star)] text-[var(--color-star)]" />
                                      {value}/5
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>

          {/* ---- Sidebar ---- */}
          <aside className="flex min-w-0 flex-col gap-4">
            <Card padding="md">
              <h3 className="mb-3 text-[14px] font-semibold text-[var(--color-text-primary)]">
                Open roles
              </h3>
              {openProjects.length === 0 ? (
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  Nothing open at the moment.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {openProjects.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/discover/projects/${p.id}`}
                        className="block rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-softer)]"
                      >
                        <p className="line-clamp-2 text-[13px] font-medium text-[var(--color-text-primary)]">
                          {p.title}
                        </p>
                        <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                          {p.applicantCount} applicants · {relativeTime(p.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {company.officeLocations.length > 0 && (
              <Card padding="md">
                <h3 className="mb-3 text-[14px] font-semibold text-[var(--color-text-primary)]">
                  Offices
                </h3>
                <ul className="flex flex-col gap-2">
                  {company.officeLocations.map((loc) => (
                    <li
                      key={loc}
                      className="flex items-start gap-2 text-[13px] text-[var(--color-text-secondary)]"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                      {loc}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card padding="md">
              <h3 className="mb-3 text-[14px] font-semibold text-[var(--color-text-primary)]">
                Verification
              </h3>
              <ul className="flex flex-col gap-2">
                {company.verificationBadges.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--color-brand)]" />
                    <span className="text-[13px] text-[var(--color-text-secondary)]">{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-[var(--color-border-subtle)] pt-3 text-[11.5px] leading-[1.5] text-[var(--color-text-muted)]">
                On FRIVVO since {formatDate(`${company.foundedYear + 3}-01-15`)}.
              </p>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
