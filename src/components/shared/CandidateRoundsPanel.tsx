"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { submitRoundResponse } from "@/actions/roundActions";
import { ROUND_STATUS_LABEL, roundDeadlinePassed, roundStatusTone } from "@/lib/rounds";
import { roundRuntimeMode, roundSubmissionPrompt } from "@/lib/workflowHelpers";
import type { ApplicationRoundProgress } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

/**
 * The candidate's side of the selection rounds: what has been asked of them,
 * what they sent, and how each round was decided. Only a round the recruiter
 * has opened accepts a response, and only until its deadline.
 */
export function CandidateRoundsPanel({
  applicationId,
  rounds,
  closed,
}: {
  applicationId: string;
  rounds: ApplicationRoundProgress[];
  closed: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [text, setText] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string[]>>({});

  if (rounds.length === 0) return null;

  const linksFor = (roundId: string) => links[roundId] ?? [""];

  const submit = (round: ApplicationRoundProgress, attendanceConfirmed?: boolean) => {
    startTransition(async () => {
      const result = await submitRoundResponse(applicationId, round.roundId, {
        text: text[round.roundId],
        links: linksFor(round.roundId),
        attendanceConfirmed,
      });
      if (!result.success) {
        toast.error("That could not be sent", result.error ?? "Please try again.");
        return;
      }
      setText((p) => ({ ...p, [round.roundId]: "" }));
      setLinks((p) => ({ ...p, [round.roundId]: [""] }));
      toast.success(
        attendanceConfirmed ? "Attendance confirmed" : "Response sent",
        "The recruiter has been notified.",
      );
      router.refresh();
    });
  };

  return (
    <Card padding="lg">
      <CardHeader
        title="Selection rounds"
        description="Where this application stands, and anything waiting on you."
        icon={<ListChecks />}
      />
      <ul className="flex flex-col gap-3">
        {rounds.map((round, i) => {
          const mode = roundRuntimeMode(round.roundType);
          const overdue = roundDeadlinePassed(round.deadline);
          const open = round.status === "AWAITING_CANDIDATE" && !closed;

          return (
            <li
              key={round.roundId}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
            >
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
              </div>

              {round.instructions && (
                <p className="mt-2 text-[13px] leading-[1.65] whitespace-pre-line text-[var(--color-text-secondary)]">
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

              {/* ---- The round is open: respond ---- */}
              {open && overdue && (
                <Alert tone="warning" className="mt-3">
                  The deadline for this round has passed. Contact the recruiter if you still want to
                  respond.
                </Alert>
              )}

              {open && !overdue && mode === "LIVE_SESSION" && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => submit(round, true)}
                  >
                    Confirm attendance
                  </Button>
                  <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                    The recruiter is notified as soon as you confirm.
                  </span>
                </div>
              )}

              {open && !overdue && mode === "CANDIDATE_SUBMIT" && (
                <div className="mt-3 flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3.5">
                  <p className="text-[12.5px] text-[var(--color-text-secondary)]">
                    {roundSubmissionPrompt(round.roundType)}
                  </p>
                  <Field label="Your response">
                    <Textarea
                      rows={3}
                      value={text[round.roundId] ?? ""}
                      onChange={(e) =>
                        setText((p) => ({ ...p, [round.roundId]: e.target.value }))
                      }
                      placeholder="Answer here."
                    />
                  </Field>
                  <Field label="Links" hint="Repository, deployment, recording or document.">
                    <div className="flex flex-col gap-2">
                      {linksFor(round.roundId).map((link, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={link}
                            onChange={(e) =>
                              setLinks((p) => {
                                const next = [...linksFor(round.roundId)];
                                next[index] = e.target.value;
                                return { ...p, [round.roundId]: next };
                              })
                            }
                            placeholder="https://"
                          />
                          {linksFor(round.roundId).length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Remove link"
                              onClick={() =>
                                setLinks((p) => ({
                                  ...p,
                                  [round.roundId]: linksFor(round.roundId).filter(
                                    (_, x) => x !== index,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={() =>
                          setLinks((p) => ({
                            ...p,
                            [round.roundId]: [...linksFor(round.roundId), ""],
                          }))
                        }
                        className="self-start"
                      >
                        Add another link
                      </Button>
                    </div>
                  </Field>
                  <Button className="self-start" onClick={() => submit(round)}>
                    Send response
                  </Button>
                </div>
              )}

              {/* ---- What was sent ---- */}
              {round.submission && round.roundType !== "SCREENING_QUESTIONS" && (
                <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3.5">
                  <p className="text-[11.5px] font-medium tracking-[0.04em] text-[var(--color-text-muted)] uppercase">
                    {round.submission.attendanceConfirmed ? "Attendance confirmed" : "Your response"}{" "}
                    · {formatDateTime(round.submission.submittedAt)}
                  </p>
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

              {/* ---- The verdict ---- */}
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
                    <span className="tabular-nums">{round.review.score}/100</span>
                  )}
                  <span>{formatDateTime(round.review.reviewedAt)}</span>
                  {round.review.notes && (
                    <p className="w-full whitespace-pre-line">{round.review.notes}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
