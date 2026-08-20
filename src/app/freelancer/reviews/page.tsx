"use client";

import Link from "next/link";
import { GraduationCap, MessageSquare, Star, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/Table";
import { EmptyState, Progress, Rating } from "@/components/ui/Feedback";
import { useSession } from "@/lib/session";
import { getFreelancerByUserId, reviewsBy, reviewsFor } from "@/data/queries";
import { relativeTime } from "@/lib/utils";

export default function FreelancerReviewsPage() {
  const { session } = useSession();
  const freelancer = session ? getFreelancerByUserId(session.userId) : undefined;

  const data = useMemo(() => {
    if (!freelancer) return null;
    const received = reviewsFor(freelancer.id);
    const written = reviewsBy(freelancer.id);
    const buckets = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: received.filter((r) => Math.round(r.rating) === star).length,
    }));
    return { received, written, buckets };
  }, [freelancer]);

  if (!freelancer || !data) return null;

  return (
    <div>
      <PageHeader
        title="My ratings & reviews"
        description="Written by companies after a completed engagement. Your rating is the mean of non-apprentice reviews, to one decimal place."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Average rating"
          value={freelancer.rating.toFixed(1)}
          icon={<Star />}
          tone="warning"
          deltaLabel={`from ${data.received.length} reviews`}
        />
        <KpiTile
          label="Completion rate"
          value={`${freelancer.completionRate}%`}
          icon={<TrendingUp />}
          tone="brand"
          deltaLabel="delivered in full"
        />
        <KpiTile
          label="Completed projects"
          value={freelancer.completedProjects}
          icon={<MessageSquare />}
          tone="info"
          deltaLabel="derived, not self-reported"
        />
        <KpiTile
          label="Reviews written"
          value={data.written.length}
          icon={<Star />}
          tone="neutral"
          deltaLabel="about companies you worked with"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <Card padding="md">
            <CardHeader
              title="Reviews about you"
              description="Only companies you actually worked with on a completed project can write these."
              icon={<Star />}
            />

            {data.received.length === 0 ? (
              <EmptyState
                compact
                icon={<Star />}
                title="No reviews yet"
                description="Companies can only review you once a project has been marked complete."
                action={{ label: "Browse open projects", href: "/freelancer/projects" }}
              />
            ) : (
              <ul className="flex flex-col gap-5">
                {data.received.map((r) => (
                  <li
                    key={r.id}
                    className="border-b border-[var(--color-border-subtle)] pb-5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar src={r.reviewerAvatar} name={r.reviewerName} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                              {r.reviewerName}
                            </p>
                            <Link
                              href={`/freelancer/completed-projects`}
                              className="text-[12.5px] text-[var(--color-text-secondary)] hover:text-[var(--color-brand-active)]"
                            >
                              {r.projectTitle}
                            </Link>
                          </div>
                          <div className="text-right">
                            <Rating value={r.rating} size="sm" showValue={false} />
                            <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                              {relativeTime(r.createdAt)}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2.5 text-[13.5px] leading-[1.7] text-[var(--color-text-secondary)]">
                          {r.comment}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {data.written.length > 0 && (
            <Card padding="md" className="mt-5">
              <CardHeader
                title="Reviews you wrote"
                description="These feed each company's trust score and payment reliability."
                icon={<MessageSquare />}
              />
              <ul className="flex flex-col gap-4">
                {data.written.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                          {r.revieweeName}
                        </p>
                        <p className="text-[12px] text-[var(--color-text-muted)]">
                          {r.projectTitle} · {relativeTime(r.createdAt)}
                        </p>
                      </div>
                      <Rating value={r.rating} size="sm" showValue={false} />
                    </div>
                    <p className="mt-2 text-[13px] leading-[1.65] text-[var(--color-text-secondary)]">
                      {r.comment}
                    </p>
                    {r.communicationScore && (
                      <dl className="mt-3 flex flex-wrap gap-2">
                        {[
                          ["Communication", r.communicationScore],
                          ["Payment", r.paymentReliabilityScore],
                          ["Clarity", r.projectClarityScore],
                        ].map(([label, value]) => (
                          <div
                            key={label as string}
                            className="rounded-full bg-[var(--color-surface-alt)] px-2.5 py-1 text-[11.5px] text-[var(--color-text-secondary)]"
                          >
                            {label}: <strong>{value}/5</strong>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              Rating distribution
            </h3>
            <div className="mt-4 flex items-center gap-4">
              <div className="text-center">
                <p className="text-[32px] font-semibold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
                  {freelancer.rating.toFixed(1)}
                </p>
                <Rating value={freelancer.rating} size="sm" showValue={false} className="mt-2" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {data.buckets.map((b) => (
                  <div key={b.star} className="flex items-center gap-2">
                    <span className="w-3 shrink-0 text-[11px] tabular-nums text-[var(--color-text-muted)]">
                      {b.star}
                    </span>
                    <Progress
                      value={data.received.length ? (b.count / data.received.length) * 100 : 0}
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
          </Card>

          {freelancer.apprenticeScore && (
            <Card padding="md" className="border-[var(--color-info-border)] bg-[var(--color-info-bg)]">
              <div className="flex items-start gap-2.5">
                <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-info-fg)]" />
                <div>
                  <h3 className="text-[13.5px] font-semibold text-[var(--color-info-fg)]">
                    Apprentice score: {freelancer.apprenticeScore.rating.toFixed(1)}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[var(--color-info-fg)] opacity-90">
                    Averaged from {freelancer.apprenticeScore.reviews} apprentice engagements. It is
                    kept separate on purpose — apprentice work is judged differently, and it never
                    moves your primary rating either way.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card padding="md">
            <h3 className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
              How reviews work
            </h3>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {[
                "A review requires a completed project and a genuine engagement between the two parties.",
                "One review per project, per direction — duplicates return the existing review rather than stacking.",
                "Ratings are bounded 1–5 before they reach any aggregate.",
                "Your completed-project count is derived from real hires, so reviews cannot inflate it.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-brand)]" />
                  <span className="text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
