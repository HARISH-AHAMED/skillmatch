"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  GraduationCap,
  History,
  ListChecks,
  Send,
  Sparkles,
  Star,
  UserCheck,
  UserX,
  Video,
} from "lucide-react";
import { useState, useTransition } from "react";
import { RoundReviewPanel } from "@/components/shared/RoundReviewPanel";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip, MatchScore, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert, Progress, Rating } from "@/components/ui/Feedback";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { PipelineTrack } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { NON_MONETARY_BENEFITS, PIPELINE_STAGES } from "@/lib/constants";
import { hireApplicant, rejectApplicant, shortlistApplicant } from "@/actions/applicationActions";
import {
  cancelInterviewAction,
  respondToNegotiationAction,
  sendOfferLetterAction,
  signDigitalContract,
  transitionApplicationStage,
  updateInterviewAction,
} from "@/actions/workflowActions";
import { getCapacity } from "@/lib/domain";
import type {
  Application,
  ApplicationStatus,
  Certificate,
  Freelancer,
  Project,
  Review,
} from "@/lib/types";
import { formatDate, formatDateTime, formatMoney, relativeTime } from "@/lib/utils";

export function ApplicantDetailClient({
  application,
  project,
  freelancer,
  reviews,
  certificates,
  hired,
}: {
  application: Application;
  project: Project;
  freelancer: Freelancer;
  reviews: Review[];
  certificates: Certificate[];
  hired: Pick<Application, "roleId" | "isApprentice">[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [status, setStatus] = useState<ApplicationStatus | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [hireOpen, setHireOpen] = useState(false);
  const [negotiationResponse, setNegotiationResponse] = useState<"accept" | "reject" | null>(null);
  const [signed, setSigned] = useState(false);

  const [offer, setOffer] = useState({
    amount: "",
    currency: "USD",
    text: "",
    benefits: [] as string[],
  });
  const [interview, setInterview] = useState({
    title: "",
    date: "",
    time: "",
    duration: "45",
    url: "",
    note: "",
  });

  const currentStatus = status ?? application.status;
  const capacity = getCapacity(project, hired, application.roleId);

  const stageIndex = Math.max(
    0,
    PIPELINE_STAGES.findIndex(
      (s) => s === application.pipelineHistory[application.pipelineHistory.length - 1]?.stage,
    ),
  );

  /** Applies one action, reverting the optimistic status if it is refused. */
  const run = (
    action: () => Promise<unknown>,
    onSuccess: () => void,
    onError?: () => void,
  ) => {
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        onError?.();
        toast.error(
          "That action could not be completed",
          error instanceof Error ? error.message : "Please try again.",
        );
        return;
      }
      router.refresh();
      onSuccess();
    });
  };

  const move = (next: ApplicationStatus, message: string) => {
    const previous = status;
    setStatus(next);

    const action =
      next === "HIRED"
        ? () => hireApplicant(application.id)
        : next === "REJECTED"
          ? () => rejectApplicant(application.id)
          : next === "SHORTLISTED"
            ? () => shortlistApplicant(application.id)
            : // Reopening a closed application is a pipeline move, not one of
              // the three dedicated transitions.
              () => transitionApplicationStage(application.id, "Applied");

    run(
      action,
      () => toast.success(message, `${freelancer.name} has been notified.`),
      () => setStatus(previous),
    );
  };

  const doHire = () => {
    if (!application.isApprentice && capacity.roleFull) {
      toast.error(
        "Cannot hire",
        `All ${capacity.roleSlots} slot(s) for this role are already filled. Release a slot before hiring another.`,
      );
      return;
    }
    if (!application.isApprentice && capacity.projectFull) {
      toast.error(
        "Cannot hire",
        `This project already has its full complement of ${capacity.projectLimit} freelancer(s).`,
      );
      return;
    }
    move("HIRED", "Hired");
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.push("/company/applicants")}
        className="mb-4"
      >
        All applicants
      </Button>

      {/* ---- Header ---- */}
      <Card padding="md" className="mb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <Avatar
            src={freelancer.avatarUrl}
            name={freelancer.name}
            size="xl"
            status={freelancer.availabilityStatus}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.018em] text-[var(--color-text-primary)]">
                {freelancer.name}
              </h1>
              <StatusIndicator status={currentStatus} kind="application" />
              {application.isApprentice && (
                <Badge tone="info" icon={<GraduationCap />}>
                  Apprentice application
                </Badge>
              )}
            </div>

            <p className="mt-1.5 text-[14px] text-[var(--color-text-secondary)]">
              {freelancer.professionalHeadline}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-[var(--color-text-muted)]">
              <Rating value={freelancer.rating} count={freelancer.reviewCount} size="sm" />
              <span>{freelancer.experienceYears} years experience</span>
              <span>{freelancer.completedProjects} completed</span>
              <span>{freelancer.completionRate}% completion rate</span>
              <span>{freelancer.location}</span>
              <span>Replies {freelancer.responseTime.toLowerCase()}</span>
            </div>

            <p className="mt-3 text-[12.5px] text-[var(--color-text-secondary)]">
              Applied to{" "}
              <Link
                href={`/company/projects/${project.id}`}
                className="font-medium text-[var(--color-link)] hover:underline"
              >
                {project.title}
              </Link>
              {application.roleName && ` · ${application.roleName}`} ·{" "}
              {relativeTime(application.createdAt)}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-3">
            <MatchScore score={application.aiScore} size={68} />
            <span className="text-[11.5px] text-[var(--color-text-muted)]">AI match score</span>
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-4">
          {currentStatus === "PENDING" && (
            <Button
              leftIcon={<Star className="h-4 w-4" />}
              onClick={() => move("SHORTLISTED", "Applicant shortlisted")}
            >
              Shortlist
            </Button>
          )}
          {(currentStatus === "PENDING" || currentStatus === "SHORTLISTED") && (
            <>
              <Button
                variant="secondary"
                leftIcon={<CalendarClock className="h-4 w-4" />}
                onClick={() => setInterviewOpen(true)}
              >
                {application.interview ? "Reschedule interview" : "Schedule interview"}
              </Button>
              <Button
                variant="secondary"
                leftIcon={<FileText className="h-4 w-4" />}
                onClick={() => {
                  setOffer({
                    amount: String(project.compensation.totalBudget),
                    currency: project.compensation.currency,
                    text: `We would like to bring you onto "${project.title}"${application.roleName ? ` as our ${application.roleName}` : ""}. The terms below reflect the scope discussed.`,
                    benefits: ["Certificate of Completion", "Portfolio Rights"],
                  });
                  setOfferOpen(true);
                }}
              >
                {application.offer ? "Revise offer" : "Send offer letter"}
              </Button>
              <Button
                variant="soft"
                leftIcon={<UserCheck className="h-4 w-4" />}
                onClick={() => setHireOpen(true)}
              >
                Hire
              </Button>
              <Button
                variant="ghost"
                leftIcon={<UserX className="h-4 w-4" />}
                onClick={() => move("REJECTED", "Application closed")}
                className="ml-auto"
              >
                Close application
              </Button>
            </>
          )}
          {currentStatus === "HIRED" && (
            <>
              <Badge tone="success" icon={<CheckCircle2 />}>
                {application.teamConfirmedAt
                  ? "Confirmed on the team"
                  : "Awaiting their confirmation"}
              </Badge>
              <Button href={`/workspace/${application.id}`} size="sm" className="ml-auto">
                Open workspace
              </Button>
            </>
          )}
          {currentStatus === "REJECTED" && (
            <Button variant="secondary" onClick={() => move("PENDING", "Application reopened")}>
              Reconsider this applicant
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ---- Counter-offer waiting ---- */}
          {application.offer?.status === "NEGOTIATING" &&
            application.offer.negotiations.length > 0 && (
              <Card padding="lg" className="border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]">
                <CardHeader
                  title="Counter-offer received"
                  description="Accepting copies their terms onto the offer and returns it to them for final acceptance."
                  icon={<FileText />}
                />
                {application.offer.negotiations.map((n) => (
                  <div key={n.id} className="rounded-[var(--radius-md)] bg-white p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13px] text-[var(--color-text-secondary)]">
                        Original:{" "}
                        <span className="line-through">
                          {formatMoney(n.previousAmount ?? 0, n.proposedCurrency)}
                        </span>
                      </p>
                      <p className="text-[20px] font-semibold tabular-nums tracking-[-0.015em] text-[var(--color-text-primary)]">
                        {formatMoney(n.proposedAmount, n.proposedCurrency)}
                      </p>
                    </div>
                    <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                      {n.message}
                    </p>
                    <p className="mt-2 text-[11.5px] text-[var(--color-text-muted)]">
                      Sent {relativeTime(n.createdAt)}
                    </p>
                  </div>
                ))}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => setNegotiationResponse("accept")}>
                    Accept their terms
                  </Button>
                  <Button variant="secondary" onClick={() => setNegotiationResponse("reject")}>
                    Keep original terms
                  </Button>
                </div>
              </Card>
            )}

          {/* ---- Cover letter ---- */}
          <Card padding="lg">
            <CardHeader title="Cover letter" icon={<FileText />} />
            <p className="whitespace-pre-line text-[14px] leading-[1.72] text-[var(--color-text-secondary)]">
              {application.coverLetter}
            </p>
          </Card>

          {/* ---- Screening answers ---- */}
          {application.screeningAnswers.length > 0 && (
            <Card padding="lg">
              <CardHeader
                title="Screening answers"
                description="Required questions were enforced when this application was submitted."
                icon={<ListChecks />}
              />
              <ul className="flex flex-col gap-4">
                {application.screeningAnswers.map((a, i) => (
                  <li
                    key={a.questionId}
                    className="border-b border-[var(--color-border-subtle)] pb-4 last:border-0 last:pb-0"
                  >
                    <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                      {i + 1}. {a.question}
                    </p>
                    <p className="mt-1.5 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                      {a.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* ---- Selection rounds ---- */}
          <RoundReviewPanel
            applicationId={application.id}
            candidateName={freelancer.name}
            rounds={application.rounds}
            closed={currentStatus === "REJECTED"}
          />

          {/* ---- Offer ---- */}
          {application.offer && (
            <Card padding="lg">
              <CardHeader
                title="Offer letter"
                description={`Sent ${relativeTime(application.offer.sentAt)}.`}
                icon={<FileText />}
                action={
                  <Badge
                    tone={
                      application.offer.status === "ACCEPTED"
                        ? "success"
                        : application.offer.status === "DECLINED"
                          ? "error"
                          : application.offer.status === "NEGOTIATING"
                            ? "warning"
                            : "info"
                    }
                  >
                    {application.offer.status}
                  </Badge>
                }
              />
              <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-4">
                <p className="text-[13.5px] leading-[1.7] text-[var(--color-text-secondary)]">
                  {application.offer.offerText}
                </p>
                <div className="mt-3.5 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-[var(--color-border-subtle)] pt-3.5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                      Amount
                    </p>
                    <p className="mt-0.5 text-[18px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {formatMoney(application.offer.amount, application.offer.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                      Model
                    </p>
                    <p className="mt-0.5 text-[14px] font-medium text-[var(--color-text-primary)]">
                      {application.offer.category}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ---- Contract ---- */}
          {application.contract && (
            <Card padding="lg">
              <CardHeader
                title="Digital contract"
                description="Signatures and IP addresses are captured server-side, never from the client."
                icon={<FileSignature />}
                action={<Badge tone="info">{application.contract.status}</Badge>}
              />
              <ul className="flex flex-col gap-2.5">
                {application.contract.terms.map((t, i) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[10.5px] font-semibold text-[var(--color-text-secondary)]">
                      {i + 1}
                    </span>
                    <span className="text-[13.5px] leading-[1.6] text-[var(--color-text-secondary)]">
                      {t}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 grid gap-3 border-t border-[var(--color-border-subtle)] pt-5 sm:grid-cols-2">
                <SignatureBlock
                  label={freelancer.name}
                  signed={application.contract.freelancerSigned}
                  signedAt={application.contract.freelancerSignedAt}
                  ip={application.contract.freelancerIp}
                />
                <SignatureBlock
                  label="Your company"
                  signed={application.contract.clientSigned || signed}
                  signedAt={application.contract.clientSignedAt}
                  ip={application.contract.clientIp}
                />
              </div>

              {!application.contract.clientSigned && !signed && (
                <Button
                  className="mt-4"
                  leftIcon={<FileSignature className="h-4 w-4" />}
                  onClick={() =>
                    run(
                      () => signDigitalContract(application.id),
                      () => {
                        setSigned(true);
                        toast.success(
                          "Contract signed",
                          "Your signature and IP address have been recorded.",
                        );
                      },
                    )
                  }
                >
                  Sign as {project.company.companyName}
                </Button>
              )}
            </Card>
          )}

          {/* ---- Interview ---- */}
          {application.interview && application.interview.status !== "CANCELLED" && (
            <Card padding="lg">
              <CardHeader
                title="Scheduled interview"
                icon={<Video />}
                action={<Badge tone="info">{application.interview.status}</Badge>}
              />
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                  {application.interview.title}
                </p>
                <p className="mt-1.5 text-[13px] text-[var(--color-text-secondary)]">
                  {formatDateTime(application.interview.scheduledAt)} ·{" "}
                  {application.interview.durationMinutes} minutes
                </p>
                {application.interview.note && (
                  <p className="mt-2.5 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                    {application.interview.note}
                  </p>
                )}
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {application.interview.meetingUrl && (
                    <Button
                      href={application.interview.meetingUrl}
                      size="sm"
                      leftIcon={<Video className="h-3.5 w-3.5" />}
                    >
                      Join
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setInterviewOpen(true)}>
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(() => cancelInterviewAction(application.id), () =>
                        toast.toast({
                          title: "Interview cancelled",
                          description: `${freelancer.name} has been notified.`,
                          tone: "info",
                        }),
                      )
                    }
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ---- Their profile ---- */}
          <Card padding="lg">
            <CardHeader
              title="Profile summary"
              icon={<Briefcase />}
              action={
                <Button href={`/company/freelancers/${freelancer.id}`} variant="link" size="sm">
                  Full profile
                </Button>
              }
            />
            <p className="text-[13.5px] leading-[1.7] text-[var(--color-text-secondary)]">
              {freelancer.bio}
            </p>

            <div className="mt-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                Skills
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {freelancer.skills.map((s) => (
                  <Chip
                    key={s}
                    size="sm"
                    className="capitalize"
                    active={project.requiredSkills.includes(s)}
                  >
                    {project.requiredSkills.includes(s) && <CheckCircle2 className="h-3 w-3" />}
                    {s}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--color-text-muted)]">
                Highlighted skills are required by this project.
              </p>
            </div>

            {certificates.length > 0 && (
              <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                  Verified certificates
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {certificates.map((c) => (
                    <li key={c.id} className="flex items-center gap-2.5">
                      <Award className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--color-text-secondary)]">
                        {c.projectTitle} — {c.issuerName}
                      </span>
                      <Link
                        href={`/verify/${c.publicId}`}
                        className="shrink-0 font-mono text-[11.5px] text-[var(--color-link)] hover:underline"
                      >
                        {c.publicId}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* ---- Reviews ---- */}
          {reviews.length > 0 && (
            <Card padding="lg">
              <CardHeader title="What other companies said" icon={<Star />} />
              <ul className="flex flex-col gap-4">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className="border-b border-[var(--color-border-subtle)] pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {r.reviewerName}
                      </p>
                      <Rating value={r.rating} size="sm" showValue={false} />
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.65] text-[var(--color-text-secondary)]">
                      {r.comment}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ================= SIDEBAR ================= */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card padding="md">
            <CardHeader title="Score breakdown" icon={<Sparkles />} divided={false} className="mb-3" />
            <dl className="flex flex-col gap-2.5">
              {[
                ["Skill match", application.scoreBreakdown.skillMatch, "50%"],
                ["Experience", application.scoreBreakdown.experienceMatch, "20%"],
                ["Rating", application.scoreBreakdown.ratingMatch, "15%"],
                ["Completion rate", application.scoreBreakdown.completionRateMatch, "10%"],
                ["Project priority", application.scoreBreakdown.priorityMatch, "5%"],
              ].map(([label, value, weight]) => (
                <div key={label as string}>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-[12px] text-[var(--color-text-secondary)]">
                      {label} <span className="text-[var(--color-text-muted)]">({weight})</span>
                    </dt>
                    <dd className="text-[12px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {Math.round(value as number)}
                    </dd>
                  </div>
                  <Progress value={value as number} size="sm" className="mt-1" />
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-[var(--color-border-subtle)] pt-3 text-[11.5px] leading-[1.5] text-[var(--color-text-muted)]">
              The score is a deterministic weighted formula, not a black box. It ranks candidates —
              it does not decide for you.
            </p>
          </Card>

          <Card padding="md">
            <CardHeader title="Pipeline" icon={<History />} divided={false} className="mb-4" />
            <PipelineTrack
              stages={PIPELINE_STAGES}
              currentIndex={stageIndex}
              rejected={currentStatus === "REJECTED"}
            />
          </Card>

          <Card padding="md">
            <CardHeader title="History" divided={false} className="mb-3" />
            <ul className="flex flex-col gap-3">
              {[...application.pipelineHistory].reverse().map((ev) => (
                <li key={ev.id} className="flex gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-[var(--color-text-primary)]">
                      {ev.stage}
                    </p>
                    {ev.note && (
                      <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--color-text-secondary)]">
                        {ev.note}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                      {ev.recruiterName} · {relativeTime(ev.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md">
            <CardHeader title="Role capacity" divided={false} className="mb-3" />
            {application.roleId ? (
              <>
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {application.roleName}
                </p>
                <Progress
                  className="mt-2.5"
                  value={capacity.roleHired ?? 0}
                  max={capacity.roleSlots ?? 1}
                  size="sm"
                  label={`${capacity.roleHired ?? 0} of ${capacity.roleSlots ?? 0} slots filled`}
                />
              </>
            ) : (
              <Progress
                value={capacity.hiredPrimaries}
                max={capacity.projectLimit}
                size="sm"
                label={`${capacity.hiredPrimaries} of ${capacity.projectLimit} hired`}
              />
            )}
            {application.isApprentice && (
              <Alert tone="info" className="mt-3">
                Apprentices occupy no slot, so this application can be hired even when the role is
                full.
              </Alert>
            )}
          </Card>
        </aside>
      </div>

      {/* ================= MODALS ================= */}

      <Modal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        title="Send an offer letter"
        description={`${freelancer.name} can accept, decline, or counter with a different amount and a reason.`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOfferOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!offer.amount || !offer.text.trim()}
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() => {
                setOfferOpen(false);
                run(
                  () =>
                    sendOfferLetterAction(
                      application.id,
                      offer.text,
                      Number(offer.amount),
                      // Milestones are configured on the project's payment
                      // stages, not composed here.
                      [],
                      "FIXED",
                      offer.currency,
                      offer.benefits as Parameters<typeof sendOfferLetterAction>[6],
                    ),
                  () => toast.success("Offer sent", `${freelancer.name} has been notified.`),
                );
              }}
            >
              Send offer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
            <Field label="Amount" required>
              <Input
                type="number"
                min={0}
                value={offer.amount}
                onChange={(e) => setOffer((o) => ({ ...o, amount: e.target.value }))}
              />
            </Field>
            <Field label="Currency">
              <Select
                value={offer.currency}
                onChange={(e) => setOffer((o) => ({ ...o, currency: e.target.value }))}
              >
                {["USD", "EUR", "GBP", "INR", "SGD"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Offer message"
            required
            help="Name the scope and the payment model so there is no ambiguity later."
          >
            <Textarea
              rows={5}
              value={offer.text}
              onChange={(e) => setOffer((o) => ({ ...o, text: e.target.value }))}
            />
          </Field>

          <div>
            <p className="mb-2 text-[13px] font-medium text-[var(--color-text-secondary)]">
              Included benefits
            </p>
            <div className="flex flex-wrap gap-2">
              {NON_MONETARY_BENEFITS.map((b) => (
                <Chip
                  key={b}
                  size="sm"
                  active={offer.benefits.includes(b)}
                  onClick={() =>
                    setOffer((o) => ({
                      ...o,
                      benefits: o.benefits.includes(b)
                        ? o.benefits.filter((x) => x !== b)
                        : [...o.benefits, b],
                    }))
                  }
                >
                  {b}
                </Chip>
              ))}
            </div>
          </div>

          <Alert tone="info">
            Accepting the offer moves this application to the contract stage. Both parties sign, and
            the signing IP address is captured server-side.
          </Alert>
        </div>
      </Modal>

      <Modal
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
        title={application.interview ? "Reschedule interview" : "Schedule an interview"}
        description={`${freelancer.name} will be notified with the new details.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setInterviewOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!interview.date || !interview.time}
              onClick={() => {
                setInterviewOpen(false);
                const rescheduling = Boolean(application.interview);
                run(
                  () =>
                    rescheduling
                      ? updateInterviewAction(
                          application.id,
                          interview.date,
                          interview.time,
                          interview.url,
                          interview.note,
                        )
                      : transitionApplicationStage(
                          application.id,
                          "Interview Scheduled",
                          interview.note || interview.title,
                          { date: `${interview.date}T${interview.time}`, meetingLink: interview.url },
                        ),
                  () =>
                    toast.success(
                      rescheduling ? "Interview rescheduled" : "Interview scheduled",
                      `${freelancer.name} has been notified.`,
                    ),
                );
              }}
            >
              {application.interview ? "Reschedule" : "Schedule interview"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Title">
            <Input
              value={interview.title}
              onChange={(e) => setInterview((i) => ({ ...i, title: e.target.value }))}
              placeholder={`${project.title} — panel interview`}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" required>
              <Input
                type="date"
                value={interview.date}
                onChange={(e) => setInterview((i) => ({ ...i, date: e.target.value }))}
              />
            </Field>
            <Field label="Time" required>
              <Input
                type="time"
                value={interview.time}
                onChange={(e) => setInterview((i) => ({ ...i, time: e.target.value }))}
              />
            </Field>
            <Field label="Duration">
              <Select
                value={interview.duration}
                onChange={(e) => setInterview((i) => ({ ...i, duration: e.target.value }))}
              >
                {["30", "45", "60", "90"].map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Meeting link">
            <Input
              type="url"
              value={interview.url}
              onChange={(e) => setInterview((i) => ({ ...i, url: e.target.value }))}
              placeholder="https://meet.frivvo.app/…"
            />
          </Field>
          <Field label="What to prepare" help="Sent with the invitation.">
            <Textarea
              rows={3}
              value={interview.note}
              onChange={(e) => setInterview((i) => ({ ...i, note: e.target.value }))}
              placeholder="45 minutes, two panellists. Bring one piece of work you want to walk through."
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={hireOpen}
        onClose={() => setHireOpen(false)}
        onConfirm={doHire}
        title={`Hire ${freelancer.name}?`}
        message={`This ${application.isApprentice ? "adds them as an apprentice on" : "fills a slot on"} ${application.roleName ?? "the project"} and opens a workspace. If this fills the last primary slot, the remaining open applicants on that role are closed out automatically and the project moves to in-progress.`}
        confirmLabel="Hire and open workspace"
      />

      <ConfirmDialog
        open={negotiationResponse === "accept"}
        onClose={() => setNegotiationResponse(null)}
        onConfirm={() =>
          run(() => respondToNegotiationAction(application.id, "ACCEPT"), () =>
            toast.success(
              "Counter-offer accepted",
              "The proposed terms have been copied onto the offer and returned for their final acceptance.",
            ),
          )
        }
        title="Accept the counter-offer?"
        message="Their proposed amount replaces the original terms. The offer returns to them for a final acceptance, and the full negotiation history is retained."
        confirmLabel="Accept their terms"
      />

      <ConfirmDialog
        open={negotiationResponse === "reject"}
        onClose={() => setNegotiationResponse(null)}
        onConfirm={() =>
          run(() => respondToNegotiationAction(application.id, "REJECT"), () =>
            toast.toast({
              title: "Original terms stand",
              description: `${freelancer.name} has been notified and can still accept or decline.`,
              tone: "info",
            }),
          )
        }
        title="Keep the original terms?"
        message="They will be notified that the counter-offer was not accepted. Your original offer remains open for them to accept or decline."
        confirmLabel="Keep original terms"
      />
    </div>
  );
}

function SignatureBlock({
  label,
  signed,
  signedAt,
  ip,
}: {
  label: string;
  signed: boolean;
  signedAt?: string;
  ip?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-md)] border p-3.5 ${
        signed
          ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)]"
          : "border-dashed border-[var(--color-border-emphasis)] bg-[var(--color-surface-alt)]"
      }`}
    >
      <p className="text-[11.5px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
        {label}
      </p>
      {signed ? (
        <>
          <p className="mt-1.5 font-[cursive] text-[18px] leading-tight text-[var(--color-success-fg)]">
            {label}
          </p>
          <p className="mt-1.5 text-[11.5px] text-[var(--color-text-muted)]">
            Signed {signedAt ? formatDate(signedAt) : "just now"}
            {ip ? ` · IP ${ip}` : ""}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">Awaiting signature</p>
          <div className="mt-2 h-px bg-[var(--color-border-emphasis)]" />
        </>
      )}
    </div>
  );
}
