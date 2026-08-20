"use client";

import Image from "next/image";
import Link from "next/link";
import { Award, CheckCircle2, Star, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/Table";
import { Field, Textarea } from "@/components/ui/Field";
import { EmptyState, RatingInput } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/session";
import {
  applicationsForFreelancer,
  certificatesFor,
  getApplicationFinancials,
  getFreelancerByUserId,
  reviewsBy,
  reviewsFor,
} from "@/data/queries";
import { formatMoney } from "@/lib/utils";
import type { Application } from "@/lib/types";

export default function CompletedProjectsPage() {
  const { session } = useSession();
  const toast = useToast();
  const freelancer = session ? getFreelancerByUserId(session.userId) : undefined;

  const [reviewTarget, setReviewTarget] = useState<Application | null>(null);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [rating, setRating] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [payment, setPayment] = useState(5);
  const [clarity, setClarity] = useState(5);
  const [comment, setComment] = useState("");

  const data = useMemo(() => {
    if (!freelancer) return null;
    const completed = applicationsForFreelancer(freelancer.id).filter(
      (a) => a.status === "HIRED" && a.project.status === "COMPLETED",
    );
    const certificates = certificatesFor(freelancer.id, true);
    const written = reviewsBy(freelancer.id);
    const received = reviewsFor(freelancer.id);
    const earnings = completed.reduce(
      (s, a) => s + getApplicationFinancials(a.id).totalReleased,
      0,
    );
    return { completed, certificates, written, received, earnings };
  }, [freelancer]);

  if (!freelancer || !data) return null;

  const hasReviewed = (a: Application) =>
    reviewed.includes(a.id) ||
    data.written.some((r) => r.projectId === a.projectId);

  return (
    <div>
      <PageHeader
        title="Completed projects"
        description="Every engagement you took through to completion, with what you earned, the certificate issued and the review you left."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Completed engagements"
          value={data.completed.length}
          icon={<CheckCircle2 />}
          tone="brand"
        />
        <KpiTile
          label="Total earned"
          value={formatMoney(data.earnings, freelancer.currency, true)}
          icon={<Wallet />}
          tone="brand"
        />
        <KpiTile
          label="Certificates"
          value={data.certificates.length}
          icon={<Award />}
          tone="info"
        />
        <KpiTile
          label="Average rating"
          value={freelancer.rating.toFixed(1)}
          icon={<Star />}
          tone="warning"
          deltaLabel={`${data.received.length} reviews received`}
        />
      </div>

      <div className="mt-6">
        {data.completed.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 />}
            title="No completed engagements yet"
            description="Once a company marks a project complete, it moves here along with your certificate and the option to review them."
            action={{ label: "Browse open projects", href: "/freelancer/projects" }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {data.completed.map((app) => {
              const fin = getApplicationFinancials(app.id);
              const cert = data.certificates.find((c) => c.projectId === app.projectId);
              const done = hasReviewed(app);

              return (
                <Card key={app.id} padding="none" className="overflow-hidden">
                  <div className="flex flex-col gap-4 p-5 md:flex-row">
                    <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] md:w-40">
                      <Image
                        src={app.project.bannerUrl}
                        alt=""
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                            {app.project.title}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[var(--color-text-secondary)]">
                            <Link
                              href={`/companies/${app.project.company.id}`}
                              className="inline-flex items-center gap-1.5 hover:text-[var(--color-brand-active)]"
                            >
                              <Avatar
                                name={app.project.company.companyName}
                                src={app.project.company.logoUrl}
                                size="xs"
                                rounded="md"
                              />
                              {app.project.company.companyName}
                            </Link>
                            {app.roleName && <span>· {app.roleName}</span>}
                            {app.isApprentice && (
                              <Badge tone="info" size="sm">
                                Apprentice
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge tone="brand">Completed</Badge>
                      </div>

                      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2.5">
                          <dt className="text-[11px] text-[var(--color-text-muted)]">Earned</dt>
                          <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                            {formatMoney(fin.totalReleased, app.project.compensation.currency)}
                          </dd>
                        </div>
                        <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2.5">
                          <dt className="text-[11px] text-[var(--color-text-muted)]">Model</dt>
                          <dd className="mt-0.5 text-[14px] font-semibold text-[var(--color-text-primary)]">
                            {app.project.compensation.type}
                          </dd>
                        </div>
                        <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2.5">
                          <dt className="text-[11px] text-[var(--color-text-muted)]">Certificate</dt>
                          <dd className="mt-0.5 truncate font-mono text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                            {cert ? cert.publicId : "—"}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-4">
                        {cert && (
                          <Button
                            href={`/verify/${cert.publicId}`}
                            size="sm"
                            variant="secondary"
                            leftIcon={<Award className="h-3.5 w-3.5" />}
                          >
                            View certificate
                          </Button>
                        )}
                        {done ? (
                          <Badge tone="success" icon={<CheckCircle2 />}>
                            You reviewed this company
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            leftIcon={<Star className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setReviewTarget(app);
                              setRating(5);
                              setCommunication(5);
                              setPayment(5);
                              setClarity(5);
                              setComment("");
                            }}
                          >
                            Review the company
                          </Button>
                        )}
                        <Button
                          href={`/freelancer/applications/${app.id}`}
                          size="sm"
                          variant="ghost"
                        >
                          Engagement record
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

      {/* ---- Review modal ---- */}
      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={`Review ${reviewTarget?.project.company.companyName}`}
        description="Your sub-scores feed this company's trust score and payment reliability, which every future applicant sees."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!comment.trim()}
              onClick={() => {
                if (reviewTarget) setReviewed((p) => [...p, reviewTarget.id]);
                setReviewTarget(null);
                toast.success(
                  "Review submitted",
                  "The company's trust score and payment reliability have been recalculated.",
                );
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

          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              Break it down
            </p>
            <RatingInput label="Communication" value={communication} onChange={setCommunication} />
            <RatingInput label="Payment reliability" value={payment} onChange={setPayment} />
            <RatingInput label="Project clarity" value={clarity} onChange={setClarity} />
          </div>

          <Field
            label="Your review"
            required
            help="Written reviews help other freelancers decide whether to apply. Be specific and fair."
          >
            <Textarea
              rows={6}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Milestones were funded before I started each one, reviews came back within two days every time, and nobody tried to expand scope inside a fixed stage…"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
