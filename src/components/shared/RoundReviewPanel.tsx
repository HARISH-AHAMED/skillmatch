"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, ExternalLink, ListChecks, Send, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { requestRound, reviewRound } from "@/actions/roundActions";
import { ROUND_MODE_LABEL } from "@/lib/constants";
import { ROUND_STATUS_LABEL, roundDeadlinePassed, roundStatusTone } from "@/lib/rounds";
import { roundRuntimeMode } from "@/lib/workflowHelpers";
import type { ApplicationRoundProgress } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

/**
 * The recruiter's side of the selection rounds: open a round for this
 * candidate, read what came back, and record the verdict. Every round type is
 * driven from here — what it asks for is decided by its runtime mode.
 */
export function RoundReviewPanel({
  applicationId,
  candidateName,
  rounds,
  closed,
}: {
  applicationId: string;
  candidateName: string;
  rounds: ApplicationRoundProgress[];
  closed: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [openRound, setOpenRound] = useState<ApplicationRoundProgress | null>(null);
  const [reviewing, setReviewing] = useState<ApplicationRoundProgress | null>(null);
  const [request, setRequest] = useState({ instructions: "", deadline: "", date: "", time: "", url: "" });
  const [verdict, setVerdict] = useState({ score: "", notes: "" });

  if (rounds.length === 0) return null;

  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error("That could not be saved", result.error ?? "Please try again.");
        return;
      }
      setOpenRound(null);
      setReviewing(null);
      toast.success(message, `${candidateName} has been notified.`);
      router.refresh();
    });
  };

  const beginRequest = (round: ApplicationRoundProgress) => {
    setRequest({
      instructions: round.instructions ?? "",
      deadline: round.deadline ?? "",
      date: "",
      time: "",
      url: round.meetingLink ?? "",
    });
    setOpenRound(round);
  };

  const beginReview = (round: ApplicationRoundProgress) => {
    setVerdict({ score: "", notes: "" });
    setReviewing(round);
  };

  const requestMode = openRound ? roundRuntimeMode(openRound.roundType) : "CANDIDATE_SUBMIT";

  return (
    <>
      <Card padding="lg">
        <CardHeader
          title="Selection rounds"
          description="Open a round for this candidate, then record the outcome."
          icon={<ListChecks />}
        />
        <ul className="flex flex-col gap-3">
          {rounds.map((round, i) => {
            const mode = roundRuntimeMode(round.roundType);
            const overdue =
              round.status === "AWAITING_CANDIDATE" && roundDeadlinePassed(round.deadline);
            return (
              <li
                key={round.roundId}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[11px] font-semibold text-[var(--color-text-secondary)]">
                        {i + 1}
                      </span>
                      <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
                        {round.roundName}
                      </span>
                      <Badge tone={roundStatusTone(round.status)} size="sm">
                        {ROUND_STATUS_LABEL[round.status]}
                      </Badge>
                      <Badge tone="neutral" size="sm">
                        {ROUND_MODE_LABEL[mode]}
                      </Badge>
                      {overdue && (
                        <Badge tone="error" size="sm">
                          Past deadline
                        </Badge>
                      )}
                    </div>
                    {round.instructions && (
                      <p className="mt-2 text-[12.5px] leading-[1.55] whitespace-pre-line text-[var(--color-text-secondary)]">
                        {round.instructions}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-muted)]">
                      {round.deadline && <span>Due {formatDate(round.deadline)}</span>}
                      {round.scheduledAt && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatDateTime(round.scheduledAt)}
                        </span>
                      )}
                      {round.meetingLink && (
                        <a
                          href={round.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--color-brand-active)] hover:underline"
                        >
                          Joining link <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {!closed && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {round.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                          onClick={() => beginRequest(round)}
                        >
                          {mode === "LIVE_SESSION" ? "Schedule" : "Open round"}
                        </Button>
                      )}
                      {round.status === "AWAITING_CANDIDATE" && (
                        <Button size="sm" variant="ghost" onClick={() => beginRequest(round)}>
                          Update request
                        </Button>
                      )}
                      {round.status === "SUBMITTED" && (
                        <Button size="sm" onClick={() => beginReview(round)}>
                          Review
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {round.submission && (
                  <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3.5">
                    <p className="text-[11.5px] font-medium tracking-[0.04em] text-[var(--color-text-muted)] uppercase">
                      {round.submission.attendanceConfirmed ? "Attendance" : "Candidate response"} ·{" "}
                      {formatDateTime(round.submission.submittedAt)}
                    </p>
                    {round.submission.attendanceConfirmed && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-success-fg)]">
                        <CheckCircle2 className="h-4 w-4" /> Confirmed by {candidateName}
                      </p>
                    )}
                    {round.submission.text && (
                      <p className="mt-1.5 text-[13px] leading-[1.65] whitespace-pre-line text-[var(--color-text-secondary)]">
                        {round.submission.text}
                      </p>
                    )}
                    {round.submission.links && round.submission.links.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1">
                        {round.submission.links.map((link) => (
                          <li key={link}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[12.5px] break-all text-[var(--color-brand-active)] hover:underline"
                            >
                              {link} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {round.review && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-[var(--color-text-secondary)]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
                      {round.review.outcome === "PASSED" ? (
                        <CheckCircle2 className="h-4 w-4 text-[var(--color-success-fg)]" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[var(--color-error-fg)]" />
                      )}
                      {round.review.outcome === "PASSED" ? "Cleared" : "Not cleared"}
                    </span>
                    {round.review.score !== undefined && (
                      <span className="tabular-nums">
                        {round.review.score}/100 ·{" "}
                        {round.review.scoreCategory === "BEHAVIORAL"
                          ? "behavioural track"
                          : round.review.scoreCategory === "NONE"
                            ? "unscored track"
                            : "technical track"}
                      </span>
                    )}
                    <span>
                      {round.review.reviewerName} · {formatDateTime(round.review.reviewedAt)}
                    </span>
                    {round.review.notes && (
                      <p className="w-full text-[12.5px] whitespace-pre-line">{round.review.notes}</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ---- Open a round for this candidate ---- */}
      <Modal
        open={openRound !== null}
        onClose={() => setOpenRound(null)}
        title={openRound ? `Open "${openRound.roundName}"` : ""}
        description={
          requestMode === "LIVE_SESSION"
            ? `${candidateName} will be asked to confirm attendance.`
            : requestMode === "REVIEW_ONLY"
              ? "Nothing is asked of the candidate — the round moves straight to review."
              : `${candidateName} will be asked to respond before the deadline.`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenRound(null)}>
              Cancel
            </Button>
            <Button
              disabled={requestMode === "LIVE_SESSION" && (!request.date || !request.time)}
              onClick={() =>
                openRound &&
                run(
                  () =>
                    requestRound(applicationId, openRound.roundId, {
                      instructions: request.instructions,
                      deadline: request.deadline || undefined,
                      scheduledAt:
                        requestMode === "LIVE_SESSION"
                          ? `${request.date}T${request.time}`
                          : undefined,
                      meetingLink: request.url || undefined,
                    }),
                  requestMode === "LIVE_SESSION" ? "Session scheduled" : "Round opened",
                )
              }
            >
              {requestMode === "LIVE_SESSION" ? "Schedule session" : "Open round"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Instructions for the candidate">
            <Textarea
              rows={3}
              value={request.instructions}
              onChange={(e) => setRequest((p) => ({ ...p, instructions: e.target.value }))}
              placeholder="What you want from this round, and what a strong response looks like."
            />
          </Field>

          {requestMode === "LIVE_SESSION" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Date">
                  <Input
                    type="date"
                    value={request.date}
                    onChange={(e) => setRequest((p) => ({ ...p, date: e.target.value }))}
                  />
                </Field>
                <Field label="Time">
                  <Input
                    type="time"
                    value={request.time}
                    onChange={(e) => setRequest((p) => ({ ...p, time: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Joining link" hint="Optional — shown to the candidate with the invite.">
                <Input
                  value={request.url}
                  onChange={(e) => setRequest((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://meet.example.com/session"
                />
              </Field>
            </>
          ) : (
            requestMode !== "REVIEW_ONLY" && (
              <Field label="Response deadline" hint="Submissions are refused after this date.">
                <Input
                  type="date"
                  value={request.deadline}
                  onChange={(e) => setRequest((p) => ({ ...p, deadline: e.target.value }))}
                />
              </Field>
            )
          )}
        </div>
      </Modal>

      {/* ---- Record the verdict ---- */}
      <Modal
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        title={reviewing ? `Review "${reviewing.roundName}"` : ""}
        description="Clearing the round moves the candidate on. Failing it closes the application."
        footer={
          <>
            <Button
              variant="danger"
              leftIcon={<XCircle className="h-4 w-4" />}
              onClick={() =>
                reviewing &&
                run(
                  () =>
                    reviewRound(applicationId, reviewing.roundId, {
                      outcome: "FAILED",
                      score: verdict.score === "" ? undefined : Number(verdict.score),
                      notes: verdict.notes,
                    }),
                  "Round marked as not cleared",
                )
              }
            >
              Not cleared
            </Button>
            <Button
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() =>
                reviewing &&
                run(
                  () =>
                    reviewRound(applicationId, reviewing.roundId, {
                      outcome: "PASSED",
                      score: verdict.score === "" ? undefined : Number(verdict.score),
                      notes: verdict.notes,
                    }),
                  "Round cleared",
                )
              }
            >
              Cleared
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Score" hint="Optional, 0–100. Behavioural rounds are tracked separately.">
            <Input
              type="number"
              min={0}
              max={100}
              value={verdict.score}
              onChange={(e) => setVerdict((p) => ({ ...p, score: e.target.value }))}
              placeholder="e.g. 78"
            />
          </Field>
          <Field label="Reviewer notes" hint="Shared with the candidate on the pipeline.">
            <Textarea
              rows={3}
              value={verdict.notes}
              onChange={(e) => setVerdict((p) => ({ ...p, notes: e.target.value }))}
              placeholder="What decided the outcome."
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
