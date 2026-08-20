"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, FileSignature, FileText, GraduationCap, Handshake, History, ListChecks, MessageSquare, Sparkles, Users, Video } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Badge, Chip, MatchScore, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert, Progress } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { PipelineTrack } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { PIPELINE_STAGES } from "@/lib/constants";
import { getApplication, getProject, getProjectTeam, hiredApplications } from "@/data/queries";
import { compensationLine } from "@/components/shared/Cards";
import { formatDate, formatDateTime, formatMoney, relativeTime } from "@/lib/utils";

export default function FreelancerApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const application = getApplication(id);
  const [offerAction, setOfferAction] = useState<"accept" | "decline" | "negotiate" | null>(null);
  const [teamAction, setTeamAction] = useState<"confirm" | "decline" | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [localState, setLocalState] = useState<{
    offer?: "ACCEPTED" | "DECLINED" | "NEGOTIATING";
    team?: "CONFIRMED" | "DECLINED";
    signed?: boolean;
  }>({});

  const project = application ? getProject(application.projectId) : undefined;
  const team = application ? getProjectTeam(application.projectId) : null;

  if (!application || !project) notFound();

  const offerStatus = localState.offer ?? application.offer?.status;
  const teamConfirmed = localState.team === "CONFIRMED" || Boolean(application.teamConfirmedAt);
  const teamDeclined = localState.team === "DECLINED";
  const freelancerSigned = localState.signed ?? application.contract?.freelancerSigned ?? false;

  const stageIndex = Math.max(
    0,
    PIPELINE_STAGES.findIndex(
      (s) => s === application.pipelineHistory[application.pipelineHistory.length - 1]?.stage,
    ),
  );

  const teammates = hiredApplications(application.projectId).filter(
    (a) => a.id !== application.id,
  );

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.push("/freelancer/applications")}
        className="mb-4"
      >
        All applications
      </Button>

      {/* ---- Header ---- */}
      <div className="mb-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="relative h-28 md:h-32">
          <Image src={project.bannerUrl} alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.72)] to-[rgba(12,20,17,0.2)]" />
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusIndicator status={application.status} kind="application" />
                {application.roleName && <Badge tone="brand">{application.roleName}</Badge>}
                {application.isApprentice && (
                  <Badge tone="info" icon={<GraduationCap />}>
                    Apprentice
                  </Badge>
                )}
              </div>
              <h1 className="mt-2.5 text-[22px] font-semibold leading-tight tracking-[-0.018em] text-[var(--color-text-primary)]">
                {project.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[var(--color-text-secondary)]">
                <Link
                  href={`/companies/${project.company.id}`}
                  className="inline-flex items-center gap-2 font-medium hover:text-[var(--color-brand-active)]"
                >
                  <Avatar
                    name={project.company.companyName}
                    src={project.company.logoUrl}
                    size="xs"
                    rounded="md"
                  />
                  {project.company.companyName}
                </Link>
                <span>Applied {relativeTime(application.createdAt)}</span>
                <span>{compensationLine(project)}</span>
              </div>
            </div>
            <MatchScore score={application.aiScore} size={56} showLabel />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ================= TEAM CONFIRMATION ================= */}
          {application.status === "HIRED" && !teamConfirmed && !teamDeclined && (
            <Card padding="lg" className="border-[var(--color-brand)] bg-[var(--color-brand-softer)]">
              <CardHeader
                title="You have been hired — confirm your place"
                description="The company has assembled the team. Confirm to lock your slot, or decline to free it for someone else."
                icon={<Handshake />}
              />

              {team && team.roles.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                    Who you would be working with
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {team.roles.map(({ role, members }) => (
                      <div
                        key={role.id}
                        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                            {role.name}
                          </p>
                          <Badge tone="neutral" size="sm">
                            {members.filter((m) => !m.isApprentice).length} of {role.slots} filled
                          </Badge>
                        </div>
                        {members.length > 0 && (
                          <ul className="mt-2.5 flex flex-col gap-2">
                            {members.map((m) => (
                              <li key={m.id} className="flex items-center gap-2.5">
                                <Avatar
                                  src={m.freelancer.avatarUrl}
                                  name={m.freelancer.name}
                                  size="xs"
                                />
                                <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--color-text-primary)]">
                                  {m.freelancer.name}
                                  {m.id === application.id && (
                                    <span className="text-[var(--color-brand-active)]"> (you)</span>
                                  )}
                                </span>
                                {m.isApprentice && (
                                  <Badge tone="info" size="sm">
                                    Apprentice
                                  </Badge>
                                )}
                                {m.teamConfirmedAt && (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => {
                    setLocalState((s) => ({ ...s, team: "CONFIRMED" }));
                    toast.success(
                      "Team placement confirmed",
                      `${project.company.companyName} has been notified. Your workspace is now open.`,
                    );
                  }}
                >
                  Confirm my place
                </Button>
                <Button variant="secondary" size="lg" onClick={() => setTeamAction("decline")}>
                  Decline placement
                </Button>
              </div>
            </Card>
          )}

          {teamConfirmed && application.status === "HIRED" && (
            <Alert tone="success" title="Your place is confirmed">
              Your workspace is open — tasks, chat, payments and deliverables are all in there.{" "}
              <Link
                href={`/workspace/${application.id}`}
                className="font-semibold underline underline-offset-2"
              >
                Open workspace
              </Link>
            </Alert>
          )}

          {teamDeclined && (
            <Alert tone="warning" title="You declined this placement">
              The slot has been freed for another candidate and the company has been notified.
            </Alert>
          )}

          {/* ================= OFFER LETTER ================= */}
          {application.offer && (
            <Card padding="lg">
              <CardHeader
                title="Offer letter"
                description={`Sent ${relativeTime(application.offer.sentAt)} by ${project.company.companyName}.`}
                icon={<FileText />}
                action={
                  <Badge
                    tone={
                      offerStatus === "ACCEPTED"
                        ? "success"
                        : offerStatus === "DECLINED"
                          ? "error"
                          : offerStatus === "NEGOTIATING"
                            ? "warning"
                            : "info"
                    }
                  >
                    {offerStatus === "NEGOTIATING" ? "Counter-offer sent" : offerStatus}
                  </Badge>
                }
              />

              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                <p className="text-[14px] leading-[1.7] text-[var(--color-text-secondary)]">
                  {application.offer.offerText}
                </p>

                <dl className="mt-4 grid gap-3 border-t border-[var(--color-border-subtle)] pt-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-[11.5px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Amount
                    </dt>
                    <dd className="mt-1 text-[19px] font-semibold tabular-nums tracking-[-0.015em] text-[var(--color-text-primary)]">
                      {formatMoney(application.offer.amount, application.offer.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Model
                    </dt>
                    <dd className="mt-1 text-[14px] font-medium text-[var(--color-text-primary)]">
                      {application.offer.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Currency
                    </dt>
                    <dd className="mt-1 text-[14px] font-medium text-[var(--color-text-primary)]">
                      {application.offer.currency}
                    </dd>
                  </div>
                </dl>

                {application.offer.benefits.length > 0 && (
                  <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-4">
                    <p className="text-[11.5px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Included
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {application.offer.benefits.map((b) => (
                        <Chip key={b} size="sm">
                          {b}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Negotiation history */}
              {application.offer.negotiations.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                    Negotiation history
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {application.offer.negotiations.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                            {n.by === "FREELANCER" ? "Your counter-offer" : "Company response"}
                          </p>
                          <span className="text-[11.5px] text-[var(--color-text-muted)]">
                            {relativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 flex items-center gap-2 text-[13px]">
                          {n.previousAmount && (
                            <span className="text-[var(--color-text-muted)] line-through">
                              {formatMoney(n.previousAmount, n.proposedCurrency)}
                            </span>
                          )}
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {formatMoney(n.proposedAmount, n.proposedCurrency)}
                          </span>
                          {n.outcome && (
                            <Badge tone={n.outcome === "ACCEPTED" ? "success" : "error"} size="sm">
                              {n.outcome}
                            </Badge>
                          )}
                        </p>
                        <p className="mt-2 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                          {n.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {offerStatus === "PENDING" && (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-5">
                  <Button
                    size="lg"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => setOfferAction("accept")}
                  >
                    Accept offer
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => setOfferAction("negotiate")}>
                    Counter-offer
                  </Button>
                  <Button variant="ghost" size="lg" onClick={() => setOfferAction("decline")}>
                    Decline
                  </Button>
                </div>
              )}

              {offerStatus === "NEGOTIATING" && (
                <Alert tone="warning" className="mt-4" title="Waiting on the company">
                  Your counter-offer has been sent. The company can accept it — which returns the
                  offer to you for final acceptance — or keep the original terms.
                </Alert>
              )}
            </Card>
          )}

          {/* ================= CONTRACT ================= */}
          {application.contract && (
            <Card padding="lg">
              <CardHeader
                title="Digital contract"
                description="Both signatures are captured server-side along with the signing IP address."
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
                  label="You"
                  name={application.freelancer.name}
                  signed={freelancerSigned}
                  signedAt={application.contract.freelancerSignedAt}
                  ip={application.contract.freelancerIp}
                />
                <SignatureBlock
                  label={project.company.companyName}
                  name={project.company.companyName}
                  signed={application.contract.clientSigned}
                  signedAt={application.contract.clientSignedAt}
                  ip={application.contract.clientIp}
                />
              </div>

              {!freelancerSigned && (
                <Button
                  className="mt-4"
                  size="lg"
                  leftIcon={<FileSignature className="h-4 w-4" />}
                  onClick={() => {
                    setLocalState((s) => ({ ...s, signed: true }));
                    toast.success(
                      "Contract signed",
                      "Your signature and IP address have been recorded against this contract.",
                    );
                  }}
                >
                  Sign contract
                </Button>
              )}
            </Card>
          )}

          {/* ================= INTERVIEW ================= */}
          {application.interview && application.interview.status !== "CANCELLED" && (
            <Card padding="lg">
              <CardHeader
                title="Interview scheduled"
                icon={<Video />}
                action={<Badge tone="info">{application.interview.status}</Badge>}
              />
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                  {application.interview.title}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--color-text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDateTime(application.interview.scheduledAt)}
                  </span>
                  <span>{application.interview.durationMinutes} minutes</span>
                </p>
                {application.interview.note && (
                  <p className="mt-2.5 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                    {application.interview.note}
                  </p>
                )}
                {application.interview.meetingUrl && (
                  <Button
                    href={application.interview.meetingUrl}
                    size="sm"
                    className="mt-3.5"
                    leftIcon={<Video className="h-3.5 w-3.5" />}
                  >
                    Join meeting
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* ================= COVER LETTER ================= */}
          <Card padding="lg">
            <CardHeader title="Your cover letter" icon={<FileText />} />
            <p className="whitespace-pre-line text-[14px] leading-[1.72] text-[var(--color-text-secondary)]">
              {application.coverLetter}
            </p>
          </Card>

          {/* ================= SCREENING ANSWERS ================= */}
          {application.screeningAnswers.length > 0 && (
            <Card padding="lg">
              <CardHeader title="Your screening answers" icon={<ListChecks />} />
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
        </div>

        {/* ================= SIDEBAR ================= */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card padding="md">
            <CardHeader title="Pipeline" icon={<History />} divided={false} className="mb-4" />
            <PipelineTrack
              stages={PIPELINE_STAGES}
              currentIndex={application.status === "REJECTED" ? stageIndex : stageIndex}
              rejected={application.status === "REJECTED"}
            />
          </Card>

          <Card padding="md">
            <CardHeader title="Activity" divided={false} className="mb-3" />
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
            <CardHeader title="Score breakdown" icon={<Sparkles />} divided={false} className="mb-3" />
            <dl className="flex flex-col gap-2.5">
              {[
                ["Skill match", application.scoreBreakdown.skillMatch, "50%"],
                ["Experience", application.scoreBreakdown.experienceMatch, "20%"],
                ["Rating", application.scoreBreakdown.ratingMatch, "15%"],
                ["Completion rate", application.scoreBreakdown.completionRateMatch, "10%"],
                ["Priority", application.scoreBreakdown.priorityMatch, "5%"],
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
          </Card>

          {teammates.length > 0 && (
            <Card padding="md">
              <CardHeader title="Team" icon={<Users />} divided={false} className="mb-3" />
              <AvatarStack
                people={teammates.map((t) => ({
                  name: t.freelancer.name,
                  avatarUrl: t.freelancer.avatarUrl,
                }))}
                max={5}
                size="md"
              />
              <p className="mt-2.5 text-[12px] leading-[1.5] text-[var(--color-text-muted)]">
                {teammates.length} other {teammates.length === 1 ? "person" : "people"} hired on this
                project.
              </p>
            </Card>
          )}

          {application.status === "HIRED" && teamConfirmed && (
            <Button href={`/workspace/${application.id}`} block size="lg" leftIcon={<MessageSquare className="h-4 w-4" />}>
              Open workspace
            </Button>
          )}

          <Button href={`/freelancer/projects/${project.id}`} variant="secondary" block>
            View the listing
          </Button>
        </aside>
      </div>

      {/* ================= MODALS ================= */}

      <Modal
        open={offerAction === "accept"}
        onClose={() => setOfferAction(null)}
        title="Accept this offer?"
        description="Accepting starts the contract stage. The company signs, then you do."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOfferAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setLocalState((s) => ({ ...s, offer: "ACCEPTED" }));
                setOfferAction(null);
                toast.success(
                  "Offer accepted",
                  `${project.company.companyName} has been notified and the contract has been drafted.`,
                );
              }}
            >
              Accept offer
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
          <div className="flex justify-between gap-4">
            <dt className="text-[13px] text-[var(--color-text-secondary)]">Amount</dt>
            <dd className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              {application.offer &&
                formatMoney(application.offer.amount, application.offer.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[13px] text-[var(--color-text-secondary)]">Project</dt>
            <dd className="text-right text-[13px] font-medium text-[var(--color-text-primary)]">
              {project.title}
            </dd>
          </div>
          {application.roleName && (
            <div className="flex justify-between gap-4">
              <dt className="text-[13px] text-[var(--color-text-secondary)]">Role</dt>
              <dd className="text-[13px] font-medium text-[var(--color-text-primary)]">
                {application.roleName}
                {application.isApprentice && " (Apprentice)"}
              </dd>
            </div>
          )}
        </dl>
      </Modal>

      <Modal
        open={offerAction === "negotiate"}
        onClose={() => setOfferAction(null)}
        title="Send a counter-offer"
        description="The original terms are snapshotted, so the full history stays visible to both sides."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOfferAction(null)}>
              Cancel
            </Button>
            <Button
              disabled={!counterAmount || !counterMessage.trim()}
              onClick={() => {
                setLocalState((s) => ({ ...s, offer: "NEGOTIATING" }));
                setOfferAction(null);
                toast.success(
                  "Counter-offer sent",
                  `${project.company.companyName} has been notified.`,
                );
              }}
            >
              Send counter-offer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Proposed amount"
            required
            help={`Current offer: ${application.offer ? formatMoney(application.offer.amount, application.offer.currency) : "—"}`}
          >
            <Input
              type="number"
              min={0}
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              placeholder="21500"
            />
          </Field>
          <Field label="Currency">
            <Select defaultValue={application.offer?.currency}>
              {["USD", "EUR", "GBP", "INR", "SGD"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Why this amount"
            required
            help="Companies respond far better to a reason tied to scope than to a number alone."
          >
            <Textarea
              rows={4}
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              placeholder="The illustration library as scoped is closer to six weeks than four in my experience…"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={offerAction === "decline"}
        onClose={() => setOfferAction(null)}
        title="Decline this offer?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOfferAction(null)}>
              Keep it open
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setLocalState((s) => ({ ...s, offer: "DECLINED" }));
                setOfferAction(null);
                toast.toast({ title: "Offer declined", tone: "info" });
              }}
            >
              Decline offer
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">
          This closes the offer and frees the role slot. If you would rather adjust the terms, send a
          counter-offer instead — the company can still accept it.
        </p>
      </Modal>

      <Modal
        open={teamAction === "decline"}
        onClose={() => setTeamAction(null)}
        title="Decline your team placement?"
        description="This returns your application to closed and reopens the slot for another candidate."
        footer={
          <>
            <Button variant="secondary" onClick={() => setTeamAction(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setLocalState((s) => ({ ...s, team: "DECLINED" }));
                setTeamAction(null);
                toast.toast({
                  title: "Placement declined",
                  description: "The company has been notified and the slot is open again.",
                  tone: "info",
                });
              }}
            >
              Decline placement
            </Button>
          </>
        }
      >
        <Field
          label="Reason (optional)"
          help="Shared with the company so they understand the withdrawal."
        >
          <Textarea
            rows={3}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="My availability changed since I applied…"
          />
        </Field>
      </Modal>
    </div>
  );
}

function SignatureBlock({
  label,
  name,
  signed,
  signedAt,
  ip,
}: {
  label: string;
  name: string;
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
            {name}
          </p>
          <p className="mt-1.5 text-[11.5px] text-[var(--color-text-muted)]">
            Signed {signedAt ? formatDate(signedAt) : "—"}
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
