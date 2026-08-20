"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Plus,
  Receipt,
  Send,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert, EmptyState, Progress } from "@/components/ui/Feedback";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { REVISION_CAP, MAX_DAILY_HOURS } from "@/lib/constants";
import type { Application, LedgerEntry, PaymentItem, Project, Role, WorkLog } from "@/lib/types";
import { getApplicationFinancials, getProjectFinancialSummary } from "@/lib/domain";
import type { WorkspaceData } from "@/data/server/workspace";
import { formatDate, formatMoney, relativeTime } from "@/lib/utils";

export function WorkspaceFunding({
  data,
  project,
  application,
  viewerRole,
}: {
  data: WorkspaceData;
  project: Project;
  application: Application;
  viewerRole: Role;
}) {
  const isCompany = viewerRole === "COMPANY";
  const type = project.compensation.type;

  const [view, setView] = useState<"stages" | "ledger">("stages");

  if (type === "UNPAID") {
    return (
      <Card padding="lg">
        <CardHeader
          title="Non-monetary engagement"
          description="No money moves on this project, so there is nothing to fund or release."
          icon={<ShieldCheck />}
        />
        <div className="rounded-[var(--radius-md)] border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4">
          <p className="text-[13.5px] font-semibold text-[var(--color-warning-fg)]">
            What this engagement provides instead
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {(project.compensation.nonMonetaryBenefits ?? []).map((b) => (
              <li key={b}>
                <Badge tone="warning" size="sm">
                  {b}
                </Badge>
              </li>
            ))}
          </ul>
          {project.compensation.nonMonetaryDetail && (
            <p className="mt-3 text-[13px] leading-[1.6] text-[var(--color-warning-fg)]">
              {project.compensation.nonMonetaryDetail}
            </p>
          )}
        </div>
        <p className="mt-4 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
          Because there are no payment obligations, this project is always ready to complete — the
          certificate is issued as soon as the company marks it done.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <Tabs
        variant="segmented"
        value={view}
        onChange={(v) => setView(v as "stages" | "ledger")}
        items={[
          {
            id: "stages",
            label:
              type === "HOURLY" ? "Work logs" : type === "STIPEND" ? "Stipend periods" : "Payment stages",
          },
          { id: "ledger", label: "Ledger" },
        ]}
        className="mb-5"
      />

      {view === "ledger" ? (
        <LedgerPanel data={data} project={project} application={application} viewerRole={viewerRole} />
      ) : type === "HOURLY" ? (
        <HourlyPanel data={data} project={project} application={application} isCompany={isCompany} />
      ) : type === "STIPEND" ? (
        <StipendPanel data={data} project={project} application={application} isCompany={isCompany} />
      ) : (
        <StagesPanel data={data} project={project} application={application} isCompany={isCompany} />
      )}
    </div>
  );
}

/* ============================================================================
   PAYMENT STAGES (FIXED / MILESTONE)
   ========================================================================= */

function StagesPanel({
  data,
  project,
  application,
  isCompany,
}: {
  data: WorkspaceData;
  project: Project;
  application: Application;
  isCompany: boolean;
}) {
  const toast = useToast();
  const currency = project.compensation.currency;
  const budget = project.compensation.totalBudget;

  const [items, setItems] = useState<PaymentItem[]>(() =>
    data.paymentItems
      .filter((i) => isCompany || i.applicationId === application.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  const [fundTarget, setFundTarget] = useState<PaymentItem | null>(null);
  const [reviewTarget, setReviewTarget] = useState<PaymentItem | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<PaymentItem | null>(null);
  const [submitTarget, setSubmitTarget] = useState<PaymentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentItem | null>(null);
  const [creating, setCreating] = useState(false);

  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [newStage, setNewStage] = useState({ title: "", description: "", amount: "", assignee: "" });

  const totals = useMemo(() => {
    const funded = items.reduce((s, i) => s + i.fundedAmount, 0);
    const released = items.reduce((s, i) => s + i.releasedAmount, 0);
    const planned = items.reduce((s, i) => s + i.amount, 0);
    return { funded, released, planned, committed: funded - released };
  }, [items]);

  const patch = (id: string, next: Partial<PaymentItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...next } : i)));

  /* ---- Rules from §11.5–11.10, with the exact error copy ---- */

  const doFund = () => {
    if (!fundTarget) return;
    const value = Number(amountInput);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a funding amount greater than zero.");
      return;
    }
    if (fundTarget.status === "RELEASED") {
      setError("This stage has already been released and cannot be funded again.");
      return;
    }
    if (fundTarget.fundedAmount + value > fundTarget.amount) {
      setError(
        `Funding ${formatMoney(value, currency)} would exceed this stage's amount of ${formatMoney(fundTarget.amount, currency)}.`,
      );
      return;
    }
    const remainingBudget = budget - totals.funded;
    if (value > remainingBudget) {
      setError(
        `Only ${formatMoney(remainingBudget, currency)} of the project budget remains available to fund.`,
      );
      return;
    }
    patch(fundTarget.id, {
      fundedAmount: fundTarget.fundedAmount + value,
      status: "FUNDED",
    });
    setFundTarget(null);
    setAmountInput("");
    setError(null);
    toast.success(
      "Stage funded",
      `${formatMoney(value, currency)} committed. A FUND entry has been written to the ledger.`,
    );
  };

  const doSubmit = () => {
    if (!submitTarget) return;
    if (submitTarget.status !== "FUNDED" && submitTarget.status !== "CHANGES_REQUESTED") {
      setError("Only a funded stage can be submitted for review.");
      return;
    }
    patch(submitTarget.id, {
      status: "SUBMITTED",
      submissionNote: noteInput,
      submittedAt: new Date().toISOString(),
    });
    setSubmitTarget(null);
    setNoteInput("");
    setError(null);
    toast.success("Submitted for review", `${project.company.companyName} has been notified.`);
  };

  const doReview = (approve: boolean) => {
    if (!reviewTarget) return;
    if (reviewTarget.status !== "SUBMITTED") {
      setError("Only a submitted stage can be reviewed.");
      return;
    }
    if (!approve && reviewTarget.revisionCount >= REVISION_CAP) {
      setError(
        `Revision limit reached (${REVISION_CAP} of ${REVISION_CAP} used). Approve the stage or agree new terms with the freelancer.`,
      );
      return;
    }
    patch(reviewTarget.id, {
      status: approve ? "APPROVED" : "CHANGES_REQUESTED",
      revisionCount: approve ? reviewTarget.revisionCount : reviewTarget.revisionCount + 1,
      reviewNote: noteInput,
      reviewedAt: new Date().toISOString(),
    });
    setReviewTarget(null);
    setNoteInput("");
    setError(null);
    toast.success(
      approve ? "Stage approved" : "Revision requested",
      approve
        ? "You can now release the payment for this stage."
        : `${reviewTarget.revisionCount + 1} of ${REVISION_CAP} revisions used.`,
    );
  };

  const doRelease = () => {
    if (!releaseTarget) return;
    if (releaseTarget.status !== "APPROVED") {
      setError("This stage must be approved before its payment can be released.");
      return;
    }
    if (releaseTarget.fundedAmount < releaseTarget.amount) {
      setError(
        `This stage is only funded to ${formatMoney(releaseTarget.fundedAmount, currency)} of ${formatMoney(releaseTarget.amount, currency)}. Fund it in full before releasing.`,
      );
      return;
    }
    const outstanding = releaseTarget.amount - releaseTarget.releasedAmount;
    if (outstanding <= 0) {
      setError("This stage has already been released in full.");
      return;
    }
    const requested = amountInput ? Number(amountInput) : outstanding;
    if (requested > outstanding) {
      setError(`Only ${formatMoney(outstanding, currency)} remains to be released on this stage.`);
      return;
    }
    const nextReleased = releaseTarget.releasedAmount + requested;
    patch(releaseTarget.id, {
      releasedAmount: nextReleased,
      status: nextReleased >= releaseTarget.amount ? "RELEASED" : "APPROVED",
      releasedAt: new Date().toISOString(),
    });
    setReleaseTarget(null);
    setAmountInput("");
    setError(null);
    toast.success(
      "Payment released",
      `${formatMoney(requested, currency)} released to ${releaseTarget.assigneeName}.`,
    );
  };

  const doCreate = () => {
    const value = Number(newStage.amount);
    if (!newStage.title.trim()) {
      setError("Stage name is required.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a stage amount greater than zero.");
      return;
    }
    if (totals.planned + value > budget) {
      setError(
        `Payment stages would total ${formatMoney(totals.planned + value, currency)}, which exceeds the project budget of ${formatMoney(budget, currency)}.`,
      );
      return;
    }
    const assignee = data.team.find((a) => a.id === newStage.assignee) ?? data.team[0];
    setItems((prev) => [
      ...prev,
      {
        id: `pay-local-${Date.now()}`,
        projectId: project.id,
        applicationId: assignee?.id ?? application.id,
        assigneeName: assignee?.freelancer.name ?? application.freelancer.name,
        assigneeAvatar: assignee?.freelancer.avatarUrl ?? application.freelancer.avatarUrl,
        title: newStage.title.trim(),
        description: newStage.description.trim(),
        sortOrder: prev.length,
        amount: value,
        currency,
        status: "PENDING",
        fundedAmount: 0,
        releasedAmount: 0,
        revisionCount: 0,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewStage({ title: "", description: "", amount: "", assignee: "" });
    setCreating(false);
    setError(null);
    toast.success("Stage created", "Fund it to commit the money before work starts.");
  };

  const doDelete = () => {
    if (!deleteTarget) return;
    const committed = Math.max(deleteTarget.fundedAmount, deleteTarget.releasedAmount);
    if (committed > 0) {
      toast.error(
        "Cannot delete this stage",
        `This stage already has ${formatMoney(committed, currency)} funded or released and cannot be deleted. Release or reverse the funds first.`,
      );
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    toast.success("Stage deleted");
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Planned", value: totals.planned, tone: "neutral" },
          { label: "Funded", value: totals.funded, tone: "info" },
          { label: "Released", value: totals.released, tone: "brand" },
          { label: "Committed", value: totals.committed, tone: "warning" },
        ].map((t) => (
          <div
            key={t.label}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <p className="text-[12px] text-[var(--color-text-secondary)]">{t.label}</p>
            <p className="mt-1.5 text-[19px] font-semibold tabular-nums tracking-[-0.015em] text-[var(--color-text-primary)]">
              {formatMoney(t.value, currency)}
            </p>
          </div>
        ))}
      </div>

      <Card padding="md">
        <CardHeader
          title={isCompany ? "Payment stages" : "Your payment stages"}
          description={
            isCompany
              ? "Fund a stage to commit the money, review the submission, then release. Each freelancer only sees their own stages."
              : "You can only see stages assigned to you. Submit a funded stage once the work is ready for review."
          }
          icon={<CircleDollarSign />}
          action={
            isCompany && (
              <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
                Add stage
              </Button>
            )
          }
        />

        {items.length === 0 ? (
          <EmptyState
            compact
            icon={<CircleDollarSign />}
            title="No payment stages yet"
            description={
              isCompany
                ? "Break the budget into stages so money is committed before each piece of work begins."
                : "The company has not set up any payment stages for you yet."
            }
            action={isCompany ? { label: "Add the first stage", onClick: () => setCreating(true) } : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const outstanding = item.amount - item.releasedAmount;
              const mine = item.applicationId === application.id;
              return (
                <li
                  key={item.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {item.title}
                        </h4>
                        <StatusIndicator status={item.status} kind="payment" size="sm" />
                        {item.revisionCount > 0 && (
                          <Badge tone="warning" size="sm">
                            {item.revisionCount} of {REVISION_CAP} revisions
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-text-muted)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar src={item.assigneeAvatar} name={item.assigneeName} size="xs" />
                          {item.assigneeName}
                        </span>
                        {item.dueDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Due {formatDate(item.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[18px] font-semibold tabular-nums tracking-[-0.015em] text-[var(--color-text-primary)]">
                        {formatMoney(item.amount, currency)}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                        {formatMoney(item.fundedAmount, currency)} funded ·{" "}
                        {formatMoney(item.releasedAmount, currency)} released
                      </p>
                    </div>
                  </div>

                  <Progress
                    className="mt-3"
                    value={item.releasedAmount}
                    max={item.amount}
                    size="sm"
                    tone={item.status === "RELEASED" ? "brand" : "info"}
                  />

                  {item.submissionNote && (
                    <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-3">
                      <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                        Submission note
                      </p>
                      <p className="mt-1 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                        {item.submissionNote}
                      </p>
                    </div>
                  )}

                  {item.reviewNote && (
                    <div
                      className={`mt-2.5 rounded-[var(--radius-sm)] p-3 ${
                        item.status === "CHANGES_REQUESTED"
                          ? "bg-[var(--color-error-bg)]"
                          : "bg-[var(--color-success-bg)]"
                      }`}
                    >
                      <p
                        className={`text-[11.5px] font-semibold uppercase tracking-[0.05em] ${
                          item.status === "CHANGES_REQUESTED"
                            ? "text-[var(--color-error-fg)]"
                            : "text-[var(--color-success-fg)]"
                        }`}
                      >
                        Review feedback
                      </p>
                      <p
                        className={`mt-1 text-[13px] leading-[1.6] ${
                          item.status === "CHANGES_REQUESTED"
                            ? "text-[var(--color-error-fg)]"
                            : "text-[var(--color-success-fg)]"
                        }`}
                      >
                        {item.reviewNote}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
                    {isCompany ? (
                      <>
                        {item.status !== "RELEASED" && item.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<ArrowDownLeft className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setFundTarget(item);
                              setAmountInput(String(item.amount - item.fundedAmount));
                              setError(null);
                            }}
                          >
                            Fund
                          </Button>
                        )}
                        {item.status === "SUBMITTED" && (
                          <Button
                            size="sm"
                            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setReviewTarget(item);
                              setNoteInput("");
                              setError(null);
                            }}
                          >
                            Review submission
                          </Button>
                        )}
                        {item.status === "APPROVED" && outstanding > 0 && (
                          <Button
                            size="sm"
                            leftIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setReleaseTarget(item);
                              setAmountInput(String(outstanding));
                              setError(null);
                            }}
                          >
                            Release {formatMoney(outstanding, currency)}
                          </Button>
                        )}
                        {item.fundedAmount === 0 && item.releasedAmount === 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => setDeleteTarget(item)}
                          >
                            Delete
                          </Button>
                        )}
                      </>
                    ) : (
                      mine &&
                      (item.status === "FUNDED" || item.status === "CHANGES_REQUESTED") && (
                        <Button
                          size="sm"
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setSubmitTarget(item);
                            setNoteInput("");
                            setError(null);
                          }}
                        >
                          Submit for review
                        </Button>
                      )
                    )}

                    {!isCompany && item.status === "PENDING" && (
                      <p className="text-[12.5px] text-[var(--color-text-muted)]">
                        Waiting for {project.company.companyName} to fund this stage.
                      </p>
                    )}
                    {!isCompany && item.status === "SUBMITTED" && (
                      <p className="text-[12.5px] text-[var(--color-text-muted)]">
                        In review with {project.company.companyName}.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ---------------------------------------------------------- modals -- */}

      <Modal
        open={Boolean(fundTarget)}
        onClose={() => {
          setFundTarget(null);
          setError(null);
        }}
        title="Fund this stage"
        description="Funding commits the money. It cannot be withdrawn once committed, only released or reversed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFundTarget(null)}>
              Cancel
            </Button>
            <Button onClick={doFund}>Fund stage</Button>
          </>
        }
      >
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <Field
          label="Amount to fund"
          required
          help={
            fundTarget
              ? `Stage amount ${formatMoney(fundTarget.amount, currency)} · already funded ${formatMoney(fundTarget.fundedAmount, currency)}`
              : undefined
          }
        >
          <Input
            type="number"
            min={0}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
        </Field>
        <p className="mt-3 text-[12.5px] leading-[1.55] text-[var(--color-text-muted)]">
          Project budget remaining to fund:{" "}
          <strong className="text-[var(--color-text-primary)]">
            {formatMoney(budget - totals.funded, currency)}
          </strong>
        </p>
      </Modal>

      <Modal
        open={Boolean(submitTarget)}
        onClose={() => {
          setSubmitTarget(null);
          setError(null);
        }}
        title="Submit this stage for review"
        description="The company reviews and either approves it for release or requests a revision."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubmitTarget(null)}>
              Cancel
            </Button>
            <Button onClick={doSubmit}>Submit for review</Button>
          </>
        }
      >
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <Field
          label="What you delivered"
          help="Be specific about what changed and anything that deviated from the original scope."
        >
          <Textarea
            rows={5}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Both surfaces are migrated and behind the flag at 25% rollout. p95 is 168ms against a 340ms baseline…"
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => {
          setReviewTarget(null);
          setError(null);
        }}
        title="Review submission"
        description={
          reviewTarget
            ? `${reviewTarget.revisionCount} of ${REVISION_CAP} revisions used on this stage.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => doReview(false)}
              disabled={Boolean(reviewTarget && reviewTarget.revisionCount >= REVISION_CAP)}
            >
              Request changes
            </Button>
            <Button onClick={() => doReview(true)}>Approve stage</Button>
          </>
        }
      >
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        {reviewTarget?.submissionNote && (
          <div className="mb-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3.5">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
              Their submission
            </p>
            <p className="mt-1.5 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
              {reviewTarget.submissionNote}
            </p>
          </div>
        )}
        {reviewTarget && reviewTarget.revisionCount >= REVISION_CAP && (
          <Alert tone="warning" className="mb-4" title="Revision limit reached">
            {REVISION_CAP} of {REVISION_CAP} revisions used. Approve the stage or agree new terms
            with the freelancer.
          </Alert>
        )}
        <Field label="Feedback" help="Sent to the freelancer with your decision.">
          <Textarea
            rows={4}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Approved — the prop tables in the appendix are exactly what the in-house team needed."
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(releaseTarget)}
        onClose={() => {
          setReleaseTarget(null);
          setError(null);
        }}
        title="Release payment"
        description="Writes a RELEASE entry to the ledger and pays the freelancer. This cannot be undone except by a compensating entry."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReleaseTarget(null)}>
              Cancel
            </Button>
            <Button onClick={doRelease}>Release payment</Button>
          </>
        }
      >
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <Field
          label="Amount to release"
          required
          help={
            releaseTarget
              ? `Outstanding on this stage: ${formatMoney(releaseTarget.amount - releaseTarget.releasedAmount, currency)}. Partial releases are allowed.`
              : undefined
          }
        >
          <Input
            type="number"
            min={0}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={creating}
        onClose={() => {
          setCreating(false);
          setError(null);
        }}
        title="Add a payment stage"
        description="Each stage belongs to exactly one hired freelancer, so money is isolated per person."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={doCreate}>Create stage</Button>
          </>
        }
      >
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <div className="flex flex-col gap-4">
          <Field label="Stage name" required>
            <Input
              value={newStage.title}
              onChange={(e) => setNewStage((s) => ({ ...s, title: e.target.value }))}
              placeholder="Stage 3 — Traces & settings migration"
            />
          </Field>
          <Field label="What it covers">
            <Textarea
              rows={3}
              value={newStage.description}
              onChange={(e) => setNewStage((s) => ({ ...s, description: e.target.value }))}
              placeholder="The remaining two surfaces, including the JS-to-TS conversion on settings."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={`Amount (${currency})`}
              required
              help={`${formatMoney(budget - totals.planned, currency)} of budget unallocated`}
            >
              <Input
                type="number"
                min={0}
                value={newStage.amount}
                onChange={(e) => setNewStage((s) => ({ ...s, amount: e.target.value }))}
              />
            </Field>
            <Field label="Assign to" required>
              <Select
                value={newStage.assignee}
                onChange={(e) => setNewStage((s) => ({ ...s, assignee: e.target.value }))}
              >
                <option value="">Select a freelancer…</option>
                {data.team.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.freelancer.name}
                    {a.roleName ? ` — ${a.roleName}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title={`Delete "${deleteTarget?.title}"?`}
        message="This stage has no money committed, so it can be removed cleanly. Stages holding funded or released money can never be deleted."
        confirmLabel="Delete stage"
        destructive
      />
    </div>
  );
}

/* ============================================================================
   HOURLY
   ========================================================================= */

function HourlyPanel({
  data,
  project,
  application,
  isCompany,
}: {
  data: WorkspaceData;
  project: Project;
  application: Application;
  isCompany: boolean;
}) {
  const toast = useToast();
  const currency = project.compensation.currency;
  const rate = project.compensation.hourlyRate ?? 0;
  const maxHours = project.compensation.maxHours;

  const [logs, setLogs] = useState<WorkLog[]>(() =>
    data.workLogs
      .filter((l) => isCompany || l.applicationId === application.id)
      .sort((a, b) => b.workDate.localeCompare(a.workDate)),
  );
  const [adding, setAdding] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<WorkLog | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [form, setForm] = useState({ date: "", hours: "", description: "" });
  const [note, setNote] = useState("");
  const [releaseAmount, setReleaseAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fin = getApplicationFinancials(application.id, {
    items: data.paymentItems,
    logs: data.workLogs,
    periods: data.stipendPeriods,
    ledger: data.ledger,
  });
  const loggedHours = logs.reduce((s, l) => s + (l.status !== "REJECTED" ? l.hours : 0), 0);
  const approvedValue = logs
    .filter((l) => l.status === "APPROVED")
    .reduce((s, l) => s + l.hours * l.rateSnapshot, 0);
  const outstanding = Math.max(0, approvedValue - fin.hourlyPaid);

  const addLog = () => {
    const hours = Number(form.hours);
    if (!Number.isFinite(hours) || hours <= 0) {
      setError("Enter a number of hours greater than zero.");
      return;
    }
    if (hours > MAX_DAILY_HOURS) {
      setError(`A single work log cannot exceed ${MAX_DAILY_HOURS} hours.`);
      return;
    }
    if (!form.date) {
      setError("Select the date the work was done.");
      return;
    }
    if (!form.description.trim()) {
      setError("Describe the work briefly.");
      return;
    }
    if (maxHours && loggedHours + hours > maxHours) {
      const remaining = maxHours - loggedHours;
      setError(
        remaining <= 0
          ? `This engagement's ${maxHours}-hour limit has already been reached.`
          : `Only ${remaining} of the ${maxHours}-hour limit remains.`,
      );
      return;
    }
    if (logs.some((l) => l.workDate === form.date && l.description === form.description.trim())) {
      setError("You have already logged this work on this date.");
      return;
    }

    setLogs((prev) => [
      {
        id: `wl-local-${Date.now()}`,
        projectId: project.id,
        applicationId: application.id,
        freelancerName: application.freelancer.name,
        freelancerAvatar: application.freelancer.avatarUrl,
        workDate: form.date,
        hours,
        description: form.description.trim(),
        status: "PENDING",
        rateSnapshot: rate,
        currency,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setForm({ date: "", hours: "", description: "" });
    setAdding(false);
    setError(null);
    toast.success("Hours logged", "Sent to the company for approval.");
  };

  const reviewLog = (approve: boolean) => {
    if (!reviewTarget) return;
    if (!approve && !note.trim()) {
      setError("A reason is required when rejecting a work log.");
      return;
    }
    setLogs((prev) =>
      prev.map((l) =>
        l.id === reviewTarget.id
          ? {
              ...l,
              status: approve ? "APPROVED" : "REJECTED",
              reviewNote: note.trim() || undefined,
              reviewedAt: new Date().toISOString(),
            }
          : l,
      ),
    );
    setReviewTarget(null);
    setNote("");
    setError(null);
    toast.success(approve ? "Hours approved" : "Hours rejected");
  };

  const doRelease = () => {
    const value = Number(releaseAmount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (outstanding <= 0) {
      setError("This freelancer's approved work has already been paid in full.");
      return;
    }
    if (value > outstanding) {
      setError(
        `Only ${formatMoney(outstanding, currency)} remains payable for this freelancer's approved work.`,
      );
      return;
    }
    setReleasing(false);
    setReleaseAmount("");
    setError(null);
    toast.success("Hourly payment released", `${formatMoney(value, currency)} released.`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Hourly rate", value: formatMoney(rate, currency) + "/hr" },
          {
            label: "Hours logged",
            value: `${loggedHours}${maxHours ? ` / ${maxHours}` : ""}`,
          },
          { label: "Approved value", value: formatMoney(approvedValue, currency) },
          { label: "Outstanding", value: formatMoney(outstanding, currency) },
        ].map((t) => (
          <div
            key={t.label}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <p className="text-[12px] text-[var(--color-text-secondary)]">{t.label}</p>
            <p className="mt-1.5 text-[19px] font-semibold tabular-nums tracking-[-0.015em] text-[var(--color-text-primary)]">
              {t.value}
            </p>
          </div>
        ))}
      </div>

      {maxHours && (
        <Card padding="md">
          <Progress
            value={loggedHours}
            max={maxHours}
            label={`Hour cap — ${maxHours - loggedHours} hours remaining`}
          />
          <p className="mt-2 text-[12.5px] leading-[1.5] text-[var(--color-text-muted)]">
            Approved logs keep the rate that was in force when the work was done, so changing the
            project rate never reprices work already approved.
          </p>
        </Card>
      )}

      <Card padding="md">
        <CardHeader
          title="Work logs"
          description={
            isCompany
              ? "Approve or reject each entry. Only approved hours are payable."
              : "Log hours as you go. Only approved hours are payable."
          }
          icon={<Clock />}
          action={
            isCompany ? (
              outstanding > 0 && (
                <Button
                  size="sm"
                  leftIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setReleaseAmount(String(outstanding));
                    setReleasing(true);
                    setError(null);
                  }}
                >
                  Release {formatMoney(outstanding, currency)}
                </Button>
              )
            ) : (
              <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding(true)}>
                Log hours
              </Button>
            )
          }
        />

        {logs.length === 0 ? (
          <EmptyState
            compact
            icon={<Clock />}
            title="No hours logged yet"
            description={
              isCompany
                ? "Work logs will appear here as the freelancer records them."
                : "Log your hours daily — it is much harder to reconstruct them at the end of a week."
            }
            action={!isCompany ? { label: "Log your first hours", onClick: () => setAdding(true) } : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {log.hours}h
                      </span>
                      <span className="text-[12.5px] text-[var(--color-text-muted)]">
                        {formatDate(log.workDate)}
                      </span>
                      <Badge
                        tone={
                          log.status === "APPROVED"
                            ? "success"
                            : log.status === "REJECTED"
                              ? "error"
                              : "warning"
                        }
                        size="sm"
                      >
                        {log.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                      {log.description}
                    </p>
                    {isCompany && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-muted)]">
                        <Avatar src={log.freelancerAvatar} name={log.freelancerName} size="xs" />
                        {log.freelancerName}
                      </p>
                    )}
                    {log.reviewNote && (
                      <p className="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-error-bg)] p-2.5 text-[12.5px] leading-[1.55] text-[var(--color-error-fg)]">
                        {log.reviewNote}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-[14px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {formatMoney(log.hours * log.rateSnapshot, currency)}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      @ {formatMoney(log.rateSnapshot, currency)}/hr
                    </p>
                    {isCompany && log.status === "PENDING" && (
                      <Button
                        size="xs"
                        onClick={() => {
                          setReviewTarget(log);
                          setNote("");
                          setError(null);
                        }}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---- Modals ---- */}
      <Modal
        open={adding}
        onClose={() => {
          setAdding(false);
          setError(null);
        }}
        title="Log hours"
        description={`Maximum ${MAX_DAILY_HOURS} hours in a single entry.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={addLog}>Log hours</Button>
          </>
        }
      >
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" required>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </Field>
            <Field label="Hours" required help={`Up to ${MAX_DAILY_HOURS} per entry`}>
              <Input
                type="number"
                step="0.5"
                min={0}
                max={MAX_DAILY_HOURS}
                value={form.hours}
                onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
              />
            </Field>
          </div>
          <Field
            label="What you did"
            required
            help="Two entries with the same date and description are blocked, so make each one specific."
          >
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Instrumented the carrier ingest stage — per-carrier counters and drop-reason labels."
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => {
          setReviewTarget(null);
          setError(null);
        }}
        title="Review work log"
        footer={
          <>
            <Button variant="secondary" onClick={() => reviewLog(false)}>
              Reject
            </Button>
            <Button onClick={() => reviewLog(true)}>Approve hours</Button>
          </>
        }
      >
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        {reviewTarget && (
          <div className="mb-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3.5">
            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
              {reviewTarget.hours}h on {formatDate(reviewTarget.workDate)} ·{" "}
              {formatMoney(reviewTarget.hours * reviewTarget.rateSnapshot, currency)}
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
              {reviewTarget.description}
            </p>
          </div>
        )}
        <Field label="Note" help="Required when rejecting — the freelancer needs to know what to change.">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={releasing}
        onClose={() => {
          setReleasing(false);
          setError(null);
        }}
        title="Release approved hours"
        description="Hourly payouts carry no payment stage, so they appear on the ledger directly."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReleasing(false)}>
              Cancel
            </Button>
            <Button onClick={doRelease}>Release payment</Button>
          </>
        }
      >
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <Field
          label="Amount"
          required
          help={`Outstanding approved value: ${formatMoney(outstanding, currency)}`}
        >
          <Input
            type="number"
            min={0}
            value={releaseAmount}
            onChange={(e) => setReleaseAmount(e.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}

/* ============================================================================
   STIPEND
   ========================================================================= */

function StipendPanel({
  data,
  project,
  application,
  isCompany,
}: {
  data: WorkspaceData;
  project: Project;
  application: Application;
  isCompany: boolean;
}) {
  const toast = useToast();
  const currency = project.compensation.currency;
  const amount = project.compensation.stipendAmount ?? 0;
  const frequency = project.compensation.stipendFrequency ?? "MONTHLY";
  const maxPeriods = frequency === "ONE_TIME" ? 1 : (project.compensation.stipendPeriods ?? 1);

  const [periods, setPeriods] = useState(() =>
    data.stipendPeriods
      .filter((p) => isCompany || p.applicationId === application.id)
      .sort((a, b) => a.periodIndex - b.periodIndex),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof periods>();
    for (const p of periods) {
      const list = map.get(p.applicationId) ?? [];
      list.push(p);
      map.set(p.applicationId, list);
    }
    return [...map.entries()];
  }, [periods]);

  const release = (id: string) => {
    setPeriods((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "RELEASED", releasedAt: new Date().toISOString() } : p,
      ),
    );
    toast.success("Stipend released", `${formatMoney(amount, currency)} paid for this period.`);
  };

  return (
    <div className="flex flex-col gap-5">
      <Card padding="md">
        <CardHeader
          title="Stipend schedule"
          description={`${formatMoney(amount, currency)} ${frequency.toLowerCase().replace("_", " ")} for ${maxPeriods} ${maxPeriods === 1 ? "period" : "periods"}. Each period pays exactly once.`}
          icon={<Wallet />}
        />

        {grouped.length === 0 ? (
          <EmptyState
            compact
            icon={<Wallet />}
            title="No stipend periods yet"
            description="Periods appear here once the engagement starts."
          />
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map(([appId, list]) => {
              const released = list.filter((p) => p.status === "RELEASED").length;
              return (
                <div key={appId}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                      {list[0]?.freelancerName}
                    </p>
                    <Badge tone={released >= maxPeriods ? "brand" : "info"} size="sm">
                      {released} of {maxPeriods} released
                    </Badge>
                  </div>

                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {list.map((p) => (
                      <li
                        key={p.id}
                        className={`rounded-[var(--radius-md)] border p-3.5 ${
                          p.status === "RELEASED"
                            ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)]"
                            : "border-[var(--color-border)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                              Period {p.periodIndex}
                            </p>
                            {p.periodStart && (
                              <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                                {formatDate(p.periodStart)} — {formatDate(p.periodEnd!)}
                              </p>
                            )}
                          </div>
                          <p className="text-[14px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                            {formatMoney(p.amount, currency)}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          {p.status === "RELEASED" ? (
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-success-fg)]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Released {p.releasedAt ? relativeTime(p.releasedAt) : ""}
                            </span>
                          ) : (
                            <span className="text-[12px] text-[var(--color-text-muted)]">
                              Not yet released
                            </span>
                          )}
                          {isCompany && p.status === "PENDING" && (
                            <Button size="xs" onClick={() => release(p.id)}>
                              Release
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
   LEDGER
   ========================================================================= */

function LedgerPanel({
  data,
  project,
  application,
  viewerRole,
}: {
  data: WorkspaceData;
  project: Project;
  application: Application;
  viewerRole: Role;
}) {
  const isCompany = viewerRole === "COMPANY";
  const rows: LedgerEntry[] = data.ledger.filter(
    (l) => isCompany || l.applicationId === application.id,
  );
  const summary = getProjectFinancialSummary(project.compensation, data.paymentItems, data.ledger);

  return (
    <Card padding="md">
      <CardHeader
        title="Transaction ledger"
        description="Append-only. Nothing here is ever edited or deleted — a correction is a new compensating entry."
        icon={<BookOpen />}
        action={
          <Badge tone="brand" icon={<ShieldCheck />}>
            Reconciled
          </Badge>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          compact
          icon={<Receipt />}
          title="No transactions yet"
          description="Funding and releases will appear here as they happen."
        />
      ) : (
        <>
          <ul className="flex flex-col">
            {rows.map((row) => {
              const isRelease = row.type === "RELEASE";
              return (
                <li
                  key={row.id}
                  className="flex items-start gap-3.5 border-b border-[var(--color-border-subtle)] py-3.5 last:border-0"
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isRelease
                        ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
                        : "bg-[var(--color-info-bg)] text-[var(--color-info-fg)]"
                    }`}
                  >
                    {isRelease ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13.5px] font-medium text-[var(--color-text-primary)]">
                        {row.note ?? row.type}
                      </p>
                      <p
                        className={`text-[14px] font-semibold tabular-nums ${
                          isRelease
                            ? "text-[var(--color-brand-active)]"
                            : "text-[var(--color-text-primary)]"
                        }`}
                      >
                        {isRelease ? "−" : "+"}
                        {formatMoney(Math.abs(row.amount), row.currency)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                      {row.type} · {row.actorName} · {relativeTime(row.createdAt)}
                    </p>
                    <p className="mt-1 font-mono text-[10.5px] text-[var(--color-text-disabled)]">
                      {row.idempotencyKey}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-4">
            <dl className="grid gap-3 sm:grid-cols-3">
              {[
                ["Total funded", summary.funded],
                ["Total released", summary.released],
                ["Currently committed", summary.committed],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-[11.5px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                    {label}
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {formatMoney(value as number, summary.currency)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-[11.5px] leading-[1.5] text-[var(--color-text-muted)]">
              Cached totals on each stage are written in the same transaction as the ledger entry
              and reconcile against it. Where they disagree, the ledger wins.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
