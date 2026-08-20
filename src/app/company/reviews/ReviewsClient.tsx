"use client";

import Link from "next/link";
import { CheckCircle2, MessageSquare, Star, Users } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/Table";
import { Field, Textarea } from "@/components/ui/Field";
import { EmptyState, Rating, RatingInput } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { submitReview } from "@/actions/reviewActions";
import type { Application, Project, Review } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export function ReviewsClient({
  completedProjects,
  hires,
  written,
  received,
  trustScore,
}: {
  completedProjects: Project[];
  hires: Application[];
  written: Review[];
  received: Review[];
  trustScore: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState("pending");
  const [reviewTarget, setReviewTarget] = useState<Application | null>(null);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const data = useMemo(() => {
    const writtenProjectFreelancer = new Set(
      written.map((r) => `${r.projectId}:${r.revieweeId}`),
    );
    return {
      completedProjects,
      pending: hires.filter(
        (h) =>
          !writtenProjectFreelancer.has(`${h.projectId}:${h.freelancerId}`) &&
          !reviewed.includes(h.id),
      ),
      done: hires.filter(
        (h) =>
          writtenProjectFreelancer.has(`${h.projectId}:${h.freelancerId}`) ||
          reviewed.includes(h.id),
      ),
      written,
      received,
    };
  }, [completedProjects, hires, written, received, reviewed]);

  const avgReceived = data.received.length
    ? data.received.reduce((s, r) => s + r.rating, 0) / data.received.length
    : 0;

  return (
    <div>
      <PageHeader
        title="Freelancer reviews"
        description="Review the people you worked with, and read what they said about working with you. Reviews require a completed project on both sides."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Awaiting your review"
          value={data.pending.length}
          icon={<Star />}
          tone="warning"
        />
        <KpiTile
          label="Reviews written"
          value={data.written.length}
          icon={<MessageSquare />}
          tone="info"
        />
        <KpiTile
          label="Your rating"
          value={avgReceived ? avgReceived.toFixed(1) : "—"}
          icon={<Star />}
          tone="brand"
          deltaLabel={`from ${data.received.length} freelancer reviews`}
        />
        <KpiTile
          label="Trust score"
          value={trustScore}
          icon={<CheckCircle2 />}
          tone="brand"
          deltaLabel="recomputed on every new review"
        />
      </div>

      <div className="mt-6">
        <Tabs
          items={[
            { id: "pending", label: "To review", count: data.pending.length },
            { id: "written", label: "You wrote", count: data.written.length },
            { id: "received", label: "About you", count: data.received.length },
          ]}
          value={tab}
          onChange={setTab}
          className="mb-5"
        />

        {/* ---- Pending ---- */}
        {tab === "pending" && (
          <>
            {data.pending.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 />}
                title="Nothing waiting on you"
                description="Reviews open once a project is marked complete. You have reviewed everyone you worked with."
                action={{ label: "View projects", href: "/company/projects" }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {data.pending.map((a) => (
                  <Card key={a.id} padding="md">
                    <div className="flex flex-wrap items-center gap-4">
                      <Avatar src={a.freelancer.avatarUrl} name={a.freelancer.name} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/company/freelancers/${a.freelancer.id}`}
                            className="text-[15px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                          >
                            {a.freelancer.name}
                          </Link>
                          {a.isApprentice && (
                            <Badge tone="info" size="sm">
                              Apprentice
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
                          {a.project.title}
                          {a.roleName ? ` · ${a.roleName}` : ""}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                          Completed {relativeTime(a.updatedAt)}
                        </p>
                      </div>
                      <Button
                        leftIcon={<Star className="h-4 w-4" />}
                        onClick={() => {
                          setReviewTarget(a);
                          setRating(5);
                          setComment("");
                        }}
                      >
                        Write review
                      </Button>
                    </div>
                    {a.isApprentice && (
                      <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-info-bg)] p-2.5 text-[12px] leading-[1.55] text-[var(--color-info-fg)]">
                        This was an apprentice placement. Your review feeds their separate apprentice
                        score and never moves their primary rating.
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---- Written ---- */}
        {tab === "written" && (
          <>
            {data.written.length === 0 ? (
              <EmptyState
                icon={<MessageSquare />}
                title="No reviews written yet"
                description="Reviews you write appear on the freelancer's public profile."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {data.written.map((r) => (
                  <Card key={r.id} padding="md">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {r.revieweeName}
                        </p>
                        <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                          {r.projectTitle} · {relativeTime(r.createdAt)}
                        </p>
                      </div>
                      <Rating value={r.rating} size="sm" showValue={false} />
                    </div>
                    <p className="mt-2.5 text-[13.5px] leading-[1.7] text-[var(--color-text-secondary)]">
                      {r.comment}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---- Received ---- */}
        {tab === "received" && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              {data.received.length === 0 ? (
                <EmptyState
                  icon={<Star />}
                  title="No reviews about you yet"
                  description="Freelancers can review you once a project completes. Their sub-scores drive your trust score."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {data.received.map((r) => (
                    <Card key={r.id} padding="md">
                      <div className="flex items-start gap-3">
                        <Avatar src={r.reviewerAvatar} name={r.reviewerName} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                                {r.reviewerName}
                              </p>
                              <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                                {r.projectTitle} · {relativeTime(r.createdAt)}
                              </p>
                            </div>
                            <Rating value={r.rating} size="sm" showValue={false} />
                          </div>
                          <p className="mt-2.5 text-[13.5px] leading-[1.7] text-[var(--color-text-secondary)]">
                            {r.comment}
                          </p>
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
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <aside>
              <Card padding="md">
                <CardHeader
                  title="How your scores are built"
                  icon={<Users />}
                  divided={false}
                  className="mb-3"
                />
                <ul className="flex flex-col gap-2.5">
                  {[
                    "Trust score averages the communication, payment reliability and project clarity sub-scores across every review.",
                    "Payment reliability is the payment sub-score alone.",
                    "Both recompute the moment a new review lands — there is no manual adjustment.",
                    "Every applicant sees these numbers on your listings.",
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
        )}
      </div>

      {/* ---- Review modal ---- */}
      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={`Review ${reviewTarget?.freelancer.name}`}
        description={
          reviewTarget?.isApprentice
            ? "This was an apprentice placement, so your review feeds their apprentice score rather than their primary rating."
            : "Your review appears on their public profile and moves their overall rating."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!comment.trim()}
              onClick={() => {
                const target = reviewTarget;
                setReviewTarget(null);
                if (!target) return;
                startTransition(async () => {
                  try {
                    await submitReview(
                      target.projectId,
                      target.freelancer.userId,
                      rating,
                      comment,
                    );
                    setReviewed((p) => [...p, target.id]);
                    router.refresh();
                    toast.success("Review submitted", "Their profile has been updated.");
                  } catch (error) {
                    toast.toast({
                      title:
                        error instanceof Error ? error.message : "Could not submit your review",
                      tone: "error",
                    });
                  }
                });
              }}
            >
              Submit review
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
            <p className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
              Overall rating
            </p>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          <Field
            label="Your review"
            required
            help="Specific reviews are far more useful than generous ones. Name what they actually did."
          >
            <Textarea
              rows={6}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="They flagged the two decisions that would be expensive to reverse in week one rather than week ten, which is the single most useful thing a contractor has done for us this year…"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
