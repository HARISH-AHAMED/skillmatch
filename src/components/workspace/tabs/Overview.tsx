"use client";

import { Activity, CalendarClock, CheckSquare, CircleDollarSign, FileText, Plus, Target, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Textarea, Input, Select } from "@/components/ui/Field";
import { Alert, EmptyState, Progress } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Application, Project, ProjectUpdate, Role } from "@/lib/types";
import { getApplicationFinancials, getProjectFinancialSummary } from "@/lib/domain";
import type { WorkspaceData } from "@/data/server/workspace";
import { formatDateTime, formatMoney, relativeTime } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";

export function WorkspaceOverview({
  data,
  project,
  application,
  viewerRole,
  onNavigate,
}: {
  data: WorkspaceData;
  project: Project;
  application: Application;
  viewerRole: Role;
  onNavigate: (tab: string) => void;
}) {
  const toast = useToast();
  const now = useNow();
  const [updates, setUpdates] = useState<ProjectUpdate[]>(() => data.updates);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<ProjectUpdate["status"]>("IN_PROGRESS");

  const summary = getProjectFinancialSummary(project.compensation, data.paymentItems, data.ledger);
  const mine = getApplicationFinancials(application.id, {
    items: data.paymentItems,
    logs: data.workLogs,
    periods: data.stipendPeriods,
    ledger: data.ledger,
  });
  const team = data.team;
  const tasks = data.tasks;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const readiness = data.readiness;

  const upcoming = useMemo(
    () =>
      data.meetings
        .filter((m) => m.status === "SCHEDULED" && new Date(m.startsAt).getTime() > now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [data.meetings, now],
  );

  const isCompany = viewerRole === "COMPANY";

  /* Financial tiles — computed from the payment tables and the ledger (§10.4),
     never parsed from update text. */
  const tiles = isCompany
    ? [
        { label: "Project budget", value: formatMoney(summary.budget, summary.currency), icon: <Wallet />, tone: "neutral" as const },
        { label: "Committed", value: formatMoney(summary.committed, summary.currency), icon: <CircleDollarSign />, tone: "info" as const, help: "Funded but not yet released" },
        { label: "Released", value: formatMoney(summary.released, summary.currency), icon: <CircleDollarSign />, tone: "brand" as const },
        { label: "Remaining", value: formatMoney(summary.remaining, summary.currency), icon: <Target />, tone: "warning" as const },
      ]
    : [
        { label: "Released to you", value: formatMoney(mine.totalReleased, summary.currency), icon: <Wallet />, tone: "brand" as const },
        {
          label: "Committed for you",
          value: formatMoney(
            mine.items.reduce((s, i) => s + (i.fundedAmount - i.releasedAmount), 0),
            summary.currency,
          ),
          icon: <CircleDollarSign />,
          tone: "info" as const,
          help: "Funded and waiting on delivery",
        },
        {
          label: "Your stages",
          value: `${mine.items.filter((i) => i.status === "RELEASED").length}/${mine.items.length || (project.compensation.type === "HOURLY" ? mine.logs.length : 0)}`,
          icon: <CheckSquare />,
          tone: "neutral" as const,
          help: project.compensation.type === "HOURLY" ? "work logs approved" : "released",
        },
        {
          label: "Tasks open",
          value: tasks.filter((t) => t.status !== "DONE").length,
          icon: <CheckSquare />,
          tone: "warning" as const,
        },
      ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
      <div className="flex min-w-0 flex-col gap-5">
        {/* ---- Financial tiles ---- */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                  {t.label}
                </p>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] [&>svg]:h-3.5 [&>svg]:w-3.5 ${
                    t.tone === "brand"
                      ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
                      : t.tone === "info"
                        ? "bg-[var(--color-info-bg)] text-[var(--color-info-fg)]"
                        : t.tone === "warning"
                          ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)]"
                          : "bg-[var(--color-neutral-bg)] text-[var(--color-neutral-fg)]"
                  }`}
                >
                  {t.icon}
                </span>
              </div>
              <p className="mt-2 text-[20px] font-semibold leading-none tracking-[-0.018em] tabular-nums text-[var(--color-text-primary)]">
                {t.value}
              </p>
              {t.help && (
                <p className="mt-1.5 text-[11.5px] text-[var(--color-text-muted)]">{t.help}</p>
              )}
            </div>
          ))}
        </div>

        {/* ---- Completion readiness (company) ---- */}
        {isCompany && (
          <Alert
            tone={readiness.ready ? "success" : "warning"}
            title={
              readiness.ready
                ? "This project is ready to complete"
                : "Not ready to complete yet"
            }
            action={
              readiness.ready ? (
                <Button
                  size="sm"
                  onClick={() =>
                    toast.success(
                      "Project completed",
                      "Certificates have been issued to every hired freelancer.",
                    )
                  }
                >
                  Mark complete
                </Button>
              ) : undefined
            }
          >
            {readiness.ready
              ? "Every payment obligation is settled. Completing will issue certificates to each hired freelancer and open reviews for both sides."
              : readiness.reason}
          </Alert>
        )}

        {/* ---- Progress ---- */}
        <Card padding="md">
          <CardHeader
            title="Delivery progress"
            description="Task completion and payment progress, side by side."
            icon={<Activity />}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Progress
                value={tasks.length ? (doneTasks / tasks.length) * 100 : 0}
                label="Tasks completed"
              />
              <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
                {doneTasks} of {tasks.length} tasks done
              </p>
            </div>
            <div>
              <Progress
                value={summary.progress}
                label={project.compensation.type === "UNPAID" ? "Engagement progress" : "Payment released"}
              />
              <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
                {project.compensation.type === "UNPAID"
                  ? "Non-monetary engagement"
                  : `${formatMoney(summary.released, summary.currency)} of ${formatMoney(summary.budget, summary.currency)}`}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-4">
            {[
              { label: "Open tasks", tab: "tasks", icon: <CheckSquare className="h-3.5 w-3.5" /> },
              { label: "Funding", tab: "milestones", icon: <CircleDollarSign className="h-3.5 w-3.5" /> },
              { label: "Deliverables", tab: "deliverables", icon: <FileText className="h-3.5 w-3.5" /> },
              { label: "Chat", tab: "messages", icon: <Users className="h-3.5 w-3.5" /> },
            ].map((q) => (
              <Button key={q.tab} variant="secondary" size="sm" leftIcon={q.icon} onClick={() => onNavigate(q.tab)}>
                {q.label}
              </Button>
            ))}
          </div>
        </Card>

        {/* ---- Activity feed ---- */}
        <Card padding="md">
          <CardHeader
            title="Project updates"
            description="Narrative status posts. Financial figures always come from the payment tables, never from these."
            icon={<Activity />}
            action={
              <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setComposing(true)}>
                Post update
              </Button>
            }
          />

          {updates.length === 0 ? (
            <EmptyState
              compact
              icon={<Activity />}
              title="No updates yet"
              description="Post one so everyone on the engagement knows where things stand."
              action={{ label: "Post the first update", onClick: () => setComposing(true) }}
            />
          ) : (
            <ol className="flex flex-col">
              {updates.map((u, i) => (
                <li key={u.id} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full ${
                        u.status === "COMPLETED"
                          ? "bg-[var(--color-brand)]"
                          : u.status === "IN_PROGRESS"
                            ? "bg-[var(--color-info-fg)]"
                            : "bg-[var(--color-warning-fg)]"
                      }`}
                    />
                    {i < updates.length - 1 && (
                      <span className="w-px flex-1 bg-[var(--color-border)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                        {u.title}
                      </h4>
                      <Badge
                        tone={
                          u.status === "COMPLETED"
                            ? "brand"
                            : u.status === "IN_PROGRESS"
                              ? "info"
                              : "warning"
                        }
                        size="sm"
                      >
                        {u.status.replace("_", " ").toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.65] text-[var(--color-text-secondary)]">
                      {u.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar src={u.createdByAvatar} name={u.createdByName} size="xs" />
                      <span className="text-[11.5px] text-[var(--color-text-muted)]">
                        {u.createdByName} · {relativeTime(u.createdAt)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* ---- Sidebar ---- */}
      <aside className="flex min-w-0 flex-col gap-4">
        <Card padding="md">
          <CardHeader title="Team" icon={<Users />} divided={false} className="mb-3" />
          <ul className="flex flex-col gap-2.5">
            {team.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5">
                <Avatar src={m.freelancer.avatarUrl} name={m.freelancer.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-[var(--color-text-primary)]">
                    {m.freelancer.name}
                    {m.id === application.id && (
                      <span className="text-[var(--color-brand-active)]"> (you)</span>
                    )}
                  </p>
                  <p className="truncate text-[11.5px] text-[var(--color-text-muted)]">
                    {m.roleName ?? "Contributor"}
                  </p>
                </div>
                {m.isApprentice && (
                  <Badge tone="info" size="sm">
                    Apprentice
                  </Badge>
                )}
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            block
            className="mt-3"
            onClick={() => onNavigate("team")}
          >
            View roster
          </Button>
        </Card>

        <Card padding="md">
          <CardHeader
            title="Upcoming meetings"
            icon={<CalendarClock />}
            divided={false}
            className="mb-3"
          />
          {upcoming.length === 0 ? (
            <p className="text-[12.5px] leading-[1.5] text-[var(--color-text-muted)]">
              Nothing scheduled.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {upcoming.slice(0, 3).map((m) => (
                <li
                  key={m.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3"
                >
                  <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                    {m.title}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                    {formatDateTime(m.startsAt)} · {m.durationMinutes} min
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="secondary"
            size="sm"
            block
            className="mt-3"
            onClick={() => onNavigate("meetings")}
          >
            All meetings
          </Button>
        </Card>

        <Card padding="md">
          <CardHeader title="Engagement" divided={false} className="mb-3" />
          <dl className="flex flex-col gap-2.5">
            {[
              ["Model", project.compensation.type],
              ["Currency", project.compensation.currency],
              ["Duration", project.duration || "—"],
              ["Commitment", project.timingType],
              ["Team size", `${team.length} hired`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <dt className="text-[12.5px] text-[var(--color-text-secondary)]">{label}</dt>
                <dd className="text-right text-[12.5px] font-medium text-[var(--color-text-primary)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </aside>

      {/* ---- Post update modal ---- */}
      <Modal
        open={composing}
        onClose={() => setComposing(false)}
        title="Post a project update"
        description="Visible to everyone on this engagement."
        footer={
          <>
            <Button variant="secondary" onClick={() => setComposing(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || !body.trim()}
              onClick={() => {
                setUpdates((prev) => [
                  {
                    id: `upd-local-${Date.now()}`,
                    projectId: project.id,
                    createdById: "local",
                    createdByName: isCompany ? project.company.companyName : application.freelancer.name,
                    createdByAvatar: isCompany
                      ? project.company.logoUrl
                      : application.freelancer.avatarUrl,
                    title: title.trim(),
                    description: body.trim(),
                    status,
                    createdAt: new Date().toISOString(),
                  },
                  ...prev,
                ]);
                setTitle("");
                setBody("");
                setComposing(false);
                toast.success("Update posted", "Everyone on the engagement has been notified.");
              }}
            >
              Post update
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Title" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Stage 2 submitted for review"
            />
          </Field>
          <Field label="What happened" required>
            <Textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Both surfaces are migrated and behind the flag at 25% rollout…"
            />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectUpdate["status"])}>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
