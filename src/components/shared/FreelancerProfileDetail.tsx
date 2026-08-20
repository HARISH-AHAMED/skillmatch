"use client";

import Image from "next/image";
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  GraduationCap,
  Languages,
  MapPin,
  MessageSquare,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip, MatchScore } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, Progress, Rating } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import type { Certificate, Freelancer, Review } from "@/lib/types";
import { formatDate, formatMoney, relativeTime } from "@/lib/utils";

const AVAILABILITY_META = {
  AVAILABLE: { label: "Available for work", tone: "success" as const },
  BUSY: { label: "Partly booked", tone: "warning" as const },
  UNAVAILABLE: { label: "Not taking work", tone: "neutral" as const },
};

export function FreelancerProfileDetail({
  freelancer,
  reviews,
  certificates,
  matchScore,
  actions,
}: {
  freelancer: Freelancer;
  reviews: Review[];
  certificates: Certificate[];
  matchScore?: number;
  actions?: React.ReactNode;
}) {
  const toast = useToast();
  const [tab, setTab] = useState("overview");

  const availability = AVAILABILITY_META[freelancer.availabilityStatus];
  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "portfolio", label: "Portfolio", count: freelancer.portfolioItems.length },
    { id: "experience", label: "Experience", count: freelancer.experience.length },
    { id: "certificates", label: "Certificates", count: certificates.length },
    { id: "reviews", label: "Reviews", count: reviews.length },
  ];

  return (
    <div>
      {/* ---------------------------------------------------------- banner -- */}
      <div className="relative h-40 w-full overflow-hidden bg-[var(--color-surface-sunken)] md:h-56">
        <Image
          src={freelancer.bannerUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.45)] to-transparent" />
      </div>

      <div className="container-wide">
        {/* ---------------------------------------------------------- head -- */}
        <div className="-mt-14 md:-mt-16">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <Avatar
                src={freelancer.avatarUrl}
                name={freelancer.name}
                size="2xl"
                ring
                status={freelancer.availabilityStatus}
                className="-mt-16 md:-mt-20"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)] md:text-[28px]">
                    {freelancer.name}
                  </h1>
                  {freelancer.verificationBadges.includes("Identity Verified") && (
                    <ShieldCheck
                      className="h-5 w-5 text-[var(--color-brand)]"
                      aria-label="Identity verified"
                    />
                  )}
                  <Badge tone={availability.tone} dot>
                    {availability.label}
                  </Badge>
                </div>

                <p className="mt-1.5 max-w-2xl text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
                  {freelancer.professionalHeadline}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--color-text-muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {freelancer.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    {freelancer.domain}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Replies {freelancer.responseTime.toLowerCase()}
                  </span>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {freelancer.verificationBadges.map((b) => (
                    <Badge key={b} tone="brand" size="sm" icon={<ShieldCheck />}>
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Right rail */}
              <div className="flex shrink-0 flex-col items-stretch gap-3 md:w-[220px]">
                {matchScore !== undefined && (
                  <div className="flex items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--color-brand-softer)] p-3">
                    <MatchScore score={matchScore} size={46} />
                    <div>
                      <p className="text-[12.5px] font-semibold text-[var(--color-brand-active)]">
                        Match score
                      </p>
                      <p className="text-[11.5px] text-[var(--color-text-secondary)]">
                        against your project
                      </p>
                    </div>
                  </div>
                )}

                {actions ?? (
                  <>
                    <Button block leftIcon={<MessageSquare className="h-4 w-4" />}>
                      Invite to a project
                    </Button>
                    <Button
                      variant="secondary"
                      block
                      leftIcon={<Share2 className="h-4 w-4" />}
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Profile link copied");
                        }
                      }}
                    >
                      Share profile
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stat strip */}
            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
              {[
                {
                  label: "Rating",
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-[var(--color-star)] text-[var(--color-star)]" />
                      {freelancer.rating.toFixed(1)}
                    </span>
                  ),
                  sub: `${freelancer.reviewCount} reviews`,
                },
                {
                  label: "Completed",
                  value: freelancer.completedProjects,
                  sub: "engagements",
                },
                {
                  label: "Completion rate",
                  value: `${freelancer.completionRate}%`,
                  sub: "delivered in full",
                },
                {
                  label: "Experience",
                  value: `${freelancer.experienceYears}y`,
                  sub: freelancer.hourlyRate
                    ? `from ${formatMoney(freelancer.hourlyRate, freelancer.currency)}/hr`
                    : "in this field",
                },
              ].map((s) => (
                <div key={s.label} className="bg-[var(--color-surface)] px-4 py-3.5 text-center">
                  <dd className="text-[19px] font-semibold tabular-nums tracking-[-0.015em] text-[var(--color-text-primary)]">
                    {s.value}
                  </dd>
                  <dt className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
                    {s.label}
                  </dt>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{s.sub}</p>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ---------------------------------------------------------- tabs -- */}
        <div className="mt-6">
          <Tabs items={tabs} value={tab} onChange={setTab} />
        </div>

        <div className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
          <div className="flex min-w-0 flex-col gap-5">
            {/* ---- Overview ---- */}
            {tab === "overview" && (
              <>
                <Card padding="lg">
                  <CardHeader title="About" icon={<FileText />} />
                  <p className="whitespace-pre-line text-[14.5px] leading-[1.72] text-[var(--color-text-secondary)]">
                    {freelancer.bio}
                  </p>
                </Card>

                <Card padding="lg">
                  <CardHeader
                    title="Skills"
                    description="Used to compute match scores against every open project."
                    icon={<Sparkles />}
                  />
                  <div className="flex flex-wrap gap-2">
                    {freelancer.skills.map((s) => (
                      <Chip key={s} active className="capitalize">
                        {s}
                      </Chip>
                    ))}
                  </div>
                </Card>

                {freelancer.portfolioItems.length > 0 && (
                  <Card padding="lg">
                    <CardHeader
                      title="Selected work"
                      icon={<Briefcase />}
                      action={
                        <Button variant="link" size="sm" onClick={() => setTab("portfolio")}>
                          View all
                        </Button>
                      }
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      {freelancer.portfolioItems.slice(0, 2).map((item) => (
                        <PortfolioTile key={item.id} item={item} />
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ---- Portfolio ---- */}
            {tab === "portfolio" && (
              <Card padding="lg">
                <CardHeader
                  title="Portfolio"
                  description="Work published with the client's permission after each engagement."
                  icon={<Briefcase />}
                />
                {freelancer.portfolioItems.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Briefcase />}
                    title="No portfolio items yet"
                    description="Completed engagements can be published here once the client agrees."
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {freelancer.portfolioItems.map((item) => (
                      <PortfolioTile key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* ---- Experience ---- */}
            {tab === "experience" && (
              <>
                <Card padding="lg">
                  <CardHeader title="Experience" icon={<Briefcase />} />
                  <ol className="flex flex-col">
                    {freelancer.experience.map((x, i) => (
                      <li key={x.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                            <Building2 className="h-4 w-4 text-[var(--color-brand-active)]" />
                          </span>
                          {i < freelancer.experience.length - 1 && (
                            <span className="w-px flex-1 bg-[var(--color-border)]" />
                          )}
                        </div>
                        <div className="pb-6">
                          <h4 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                            {x.title}
                          </h4>
                          <p className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
                            {x.company}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                            {x.startDate} — {x.current ? "Present" : x.endDate}
                          </p>
                          {x.description && (
                            <p className="mt-2 text-[13.5px] leading-[1.6] text-[var(--color-text-secondary)]">
                              {x.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </Card>

                <Card padding="lg">
                  <CardHeader title="Education" icon={<GraduationCap />} />
                  <ul className="flex flex-col gap-4">
                    {freelancer.education.map((e) => (
                      <li key={e.id} className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-alt)]">
                          <GraduationCap className="h-4 w-4 text-[var(--color-text-secondary)]" />
                        </span>
                        <div>
                          <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                            {e.school}
                          </h4>
                          <p className="text-[13px] text-[var(--color-text-secondary)]">
                            {e.degree}
                            {e.field ? `, ${e.field}` : ""}
                          </p>
                          <p className="text-[12px] text-[var(--color-text-muted)]">
                            {e.startYear} — {e.endYear}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            )}

            {/* ---- Certificates ---- */}
            {tab === "certificates" && (
              <Card padding="lg">
                <CardHeader
                  title="Verified certificates"
                  description="Issued by FRIVVO at the completion of an engagement. Anyone can verify these."
                  icon={<Award />}
                />
                {certificates.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Award />}
                    title="No public certificates"
                    description="Certificates appear here once an engagement completes and the freelancer chooses to show them."
                  />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {certificates.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)]">
                          <Award className="h-5 w-5 text-[var(--color-brand-active)]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                            {c.projectTitle}
                          </h4>
                          <p className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">
                            {c.roleTitle} · {c.issuerName} · {formatDate(c.issuedAt)}
                          </p>
                          <p className="mt-1 font-mono text-[11.5px] text-[var(--color-text-muted)]">
                            {c.publicId}
                          </p>
                        </div>
                        <Button
                          href={`/verify/${c.publicId}`}
                          variant="secondary"
                          size="sm"
                          rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        >
                          Verify
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {/* ---- Reviews ---- */}
            {tab === "reviews" && (
              <Card padding="lg">
                <CardHeader
                  title="Reviews"
                  description="Left by companies after a completed engagement. Apprentice reviews are kept separately."
                  icon={<Star />}
                />
                {reviews.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Star />}
                    title="No reviews yet"
                    description="Reviews can only be written once a project is marked complete."
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
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                                  {r.reviewerName}
                                </p>
                                <p className="truncate text-[12px] text-[var(--color-text-muted)]">
                                  {r.projectTitle}
                                </p>
                              </div>
                              <div className="text-right">
                                <Rating value={r.rating} size="sm" showValue={false} />
                                <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                                  {relativeTime(r.createdAt)}
                                </p>
                              </div>
                            </div>
                            <p className="mt-2.5 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                              {r.comment}
                            </p>
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
                Rating breakdown
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[30px] font-semibold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
                    {freelancer.rating.toFixed(1)}
                  </p>
                  <Rating value={freelancer.rating} size="sm" showValue={false} className="mt-1.5" />
                  <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                    {freelancer.reviewCount} reviews
                  </p>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {ratingBuckets.map((b) => (
                    <div key={b.star} className="flex items-center gap-2">
                      <span className="w-3 shrink-0 text-[11px] tabular-nums text-[var(--color-text-muted)]">
                        {b.star}
                      </span>
                      <Progress
                        value={reviews.length ? (b.count / reviews.length) * 100 : 0}
                        size="sm"
                        className="flex-1"
                      />
                      <span className="w-4 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text-muted)]">
                        {b.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {freelancer.apprenticeScore && (
                <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-info-bg)] p-3">
                  <p className="text-[12px] font-semibold text-[var(--color-info-fg)]">
                    Apprentice score: {freelancer.apprenticeScore.rating.toFixed(1)}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[var(--color-info-fg)] opacity-90">
                    From {freelancer.apprenticeScore.reviews} apprentice engagements. Kept separate
                    so it never moves the primary rating.
                  </p>
                </div>
              )}
            </Card>

            <Card padding="md">
              <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-[var(--color-text-primary)]">
                <Languages className="h-4 w-4 text-[var(--color-text-muted)]" />
                Languages
              </h3>
              <ul className="flex flex-col gap-2">
                {freelancer.languages.map((l) => (
                  <li key={l.name} className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-[var(--color-text-primary)]">{l.name}</span>
                    <span className="text-[12px] text-[var(--color-text-muted)]">{l.level}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {freelancer.portfolioUrl && (
              <Card padding="md">
                <h3 className="mb-3 text-[14px] font-semibold text-[var(--color-text-primary)]">
                  Links
                </h3>
                <a
                  href={freelancer.portfolioUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] p-2 text-[13px] text-[var(--color-link)] hover:bg-[var(--color-hover)]"
                >
                  Personal site
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function PortfolioTile({ item }: { item: Freelancer["portfolioItems"][number] }) {
  return (
    <article className="group overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-surface-sunken)]">
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 100vw, 320px"
          className="object-cover transition-transform duration-[600ms] group-hover:scale-105"
        />
      </div>
      <div className="p-3.5">
        <h4 className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
          {item.title}
        </h4>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
          {item.description}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <Chip key={t} size="sm" className="capitalize">
              {t}
            </Chip>
          ))}
        </div>
      </div>
    </article>
  );
}
