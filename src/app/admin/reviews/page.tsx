"use client";

import { AlertTriangle, CheckCircle2, EyeOff, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Alert, EmptyState, Progress, Rating } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { KpiTile } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { REVIEWS } from "@/data/queries";
import type { Review } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export default function AdminReviewsPage() {
  const toast = useToast();
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [moderateTarget, setModerateTarget] = useState<Review | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [reason, setReason] = useState("");

  const counts = useMemo(
    () => ({
      ALL: REVIEWS.length,
      FLAGGED: REVIEWS.filter((r) => r.rating <= 3).length,
      COMPANY: REVIEWS.filter((r) => r.reviewerRole === "COMPANY").length,
      FREELANCER: REVIEWS.filter((r) => r.reviewerRole === "FREELANCER").length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    let list = [...REVIEWS];
    if (tab === "FLAGGED") list = list.filter((r) => r.rating <= 3);
    if (tab === "COMPANY") list = list.filter((r) => r.reviewerRole === "COMPANY");
    if (tab === "FREELANCER") list = list.filter((r) => r.reviewerRole === "FREELANCER");
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.reviewerName.toLowerCase().includes(q) ||
          r.revieweeName.toLowerCase().includes(q) ||
          r.comment.toLowerCase().includes(q) ||
          r.projectTitle.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [tab, query]);

  const avg = REVIEWS.length
    ? REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: REVIEWS.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <div>
      <PageHeader
        title="Moderate reviews"
        description="Reviews require a completed project and a genuine engagement, so volume is low by design. Hiding one preserves the record."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total reviews" value={REVIEWS.length} icon={<Star />} tone="neutral" />
        <KpiTile label="Average rating" value={avg.toFixed(2)} icon={<Star />} tone="warning" />
        <KpiTile
          label="Needs attention"
          value={counts.FLAGGED}
          icon={<AlertTriangle />}
          tone="warning"
          deltaLabel="rated 3 or below"
        />
        <KpiTile
          label="Hidden"
          value={hidden.length}
          icon={<EyeOff />}
          tone="neutral"
          deltaLabel="record retained"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3">
            <Tabs
              variant="pill"
              value={tab}
              onChange={setTab}
              items={[
                { id: "ALL", label: "All", count: counts.ALL },
                { id: "FLAGGED", label: "Needs attention", count: counts.FLAGGED },
                { id: "COMPANY", label: "From companies", count: counts.COMPANY },
                { id: "FREELANCER", label: "From freelancers", count: counts.FREELANCER },
              ]}
            />
            <Input
              placeholder="Search reviewer, subject, project or text"
              leftIcon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search reviews"
            />
          </div>

          <div className="mt-5">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Star />}
                title="No reviews match"
                description="Try a different search or switch tabs."
                action={{ label: "Clear search", onClick: () => setQuery("") }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((r) => {
                  const isHidden = hidden.includes(r.id);
                  const flagged = r.rating <= 3;
                  return (
                    <Card key={r.id} padding="md" className={isHidden ? "opacity-60" : ""}>
                      <div className="flex items-start gap-3">
                        <Avatar src={r.reviewerAvatar} name={r.reviewerName} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                                {r.reviewerName}
                                <span className="font-normal text-[var(--color-text-muted)]">
                                  {" "}
                                  reviewed{" "}
                                </span>
                                {r.revieweeName}
                              </p>
                              <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                                {r.projectTitle} · {relativeTime(r.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                tone={r.reviewerRole === "COMPANY" ? "info" : "neutral"}
                                size="sm"
                              >
                                {r.reviewerRole === "COMPANY" ? "Company → talent" : "Talent → company"}
                              </Badge>
                              {flagged && (
                                <Badge tone="warning" size="sm" icon={<AlertTriangle />}>
                                  Low rating
                                </Badge>
                              )}
                              {isHidden && (
                                <Badge tone="neutral" size="sm" icon={<EyeOff />}>
                                  Hidden
                                </Badge>
                              )}
                            </div>
                          </div>

                          <Rating value={r.rating} size="sm" className="mt-2" />

                          <p className="mt-2 text-[13.5px] leading-[1.7] text-[var(--color-text-secondary)]">
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

                          <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
                            {isHidden ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                onClick={() => {
                                  setHidden((p) => p.filter((x) => x !== r.id));
                                  toast.success("Review restored");
                                }}
                              >
                                Restore
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={<EyeOff className="h-3.5 w-3.5" />}
                                onClick={() => {
                                  setModerateTarget(r);
                                  setReason("");
                                }}
                              >
                                Hide from profiles
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" href="/admin/reviews">
                              View engagement
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              Rating distribution
            </h3>
            <div className="mt-3 space-y-1.5">
              {distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-2">
                  <span className="w-3 shrink-0 text-[11px] tabular-nums text-[var(--color-text-muted)]">
                    {d.star}
                  </span>
                  <Progress
                    value={REVIEWS.length ? (d.count / REVIEWS.length) * 100 : 0}
                    size="sm"
                    className="flex-1"
                  />
                  <span className="w-4 shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text-muted)]">
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <h3 className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
              Moderation rules
            </h3>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {[
                "A review requires a completed project and a genuine engagement between the two parties.",
                "One review per project, per direction. Duplicates return the existing review.",
                "Ratings and sub-scores are bounded 1–5 before they reach any aggregate.",
                "Hiding a review removes it from public profiles but preserves the record and the audit trail.",
                "Apprentice reviews accumulate separately and never move a primary rating.",
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

      {/* ---- Moderate modal ---- */}
      <Modal
        open={Boolean(moderateTarget)}
        onClose={() => setModerateTarget(null)}
        title="Hide this review from public profiles"
        description="The record is preserved and remains auditable. Both parties are notified."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModerateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!reason.trim()}
              onClick={() => {
                if (moderateTarget) setHidden((p) => [...p, moderateTarget.id]);
                setModerateTarget(null);
                toast.toast({
                  title: "Review hidden",
                  description: "It no longer appears on public profiles or in aggregates.",
                  tone: "info",
                });
              }}
            >
              Hide review
            </Button>
          </>
        }
      >
        <Alert tone="warning" className="mb-4" title="This affects aggregate scores">
          Hiding a review removes it from the rating average and, for freelancer-to-company reviews,
          from the trust and payment-reliability calculations.
        </Alert>
        <Field
          label="Reason"
          required
          help="Recorded in the admin log against your account."
        >
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contains identifying details about a third party who was not part of the engagement."
          />
        </Field>
      </Modal>
    </div>
  );
}
