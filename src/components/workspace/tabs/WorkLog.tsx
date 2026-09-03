"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, FileText, Filter } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Feedback";
import type { WorkspaceData } from "@/data/server/workspace";
import type { Application, Project, Role, Task, WorkLog, WorkLogStatus } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";

/* ============================================================================
   WORK LOG TIMELINE

   Answers "what happened on the 14th", which no flat list does.

   What fills the spine depends on how the engagement pays. An hourly project
   has work logs — hours, rates, review state — and they are the record. Every
   other model has no work logs at all (the entries carry an hourly rate
   snapshot), so the completed tasks stand in: the same day-by-day walk over
   what actually got finished.
   ========================================================================= */

const STATUS_TONE: Record<WorkLogStatus, "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

const STATUS_LABEL: Record<WorkLogStatus, string> = {
  PENDING: "Awaiting review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/** A day on the timeline, with its entries and the totals they add up to. */
interface DayGroup {
  date: string;
  entries: WorkLog[];
  hours: number;
  /** Value of the approved entries only — rejected work is worth nothing. */
  approvedValue: number;
  currency: string;
  pending: number;
  rejected: number;
}

function groupByDate(logs: WorkLog[]): DayGroup[] {
  const days = new Map<string, WorkLog[]>();

  for (const log of logs) {
    // The column is date-only; slice defensively in case a full ISO string
    // reaches here, so two entries on one day cannot land in separate groups.
    const key = log.workDate.slice(0, 10);
    days.set(key, [...(days.get(key) ?? []), log]);
  }

  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, entries]) => ({
      date,
      entries: [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      hours: entries.reduce((sum, l) => sum + (l.status === "REJECTED" ? 0 : l.hours), 0),
      approvedValue: entries
        .filter((l) => l.status === "APPROVED")
        .reduce((sum, l) => sum + l.hours * l.rateSnapshot, 0),
      currency: entries[0]?.currency ?? "USD",
      pending: entries.filter((l) => l.status === "PENDING").length,
      rejected: entries.filter((l) => l.status === "REJECTED").length,
    }));
}

export function WorkspaceWorkLog({
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
  // Work logs only exist on an hourly engagement. Everywhere else the finished
  // tasks are what there is to walk through.
  if (project.compensation.type !== "HOURLY") {
    return <CompletedTaskTimeline tasks={data.tasks} />;
  }

  return (
    <HourlyWorkLogTimeline
      data={data}
      project={project}
      application={application}
      viewerRole={viewerRole}
    />
  );
}

function HourlyWorkLogTimeline({
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
  const currency = project.compensation.currency;

  const [status, setStatus] = useState<"ALL" | WorkLogStatus>("ALL");
  const [person, setPerson] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /**
   * A freelancer sees their own entries and nothing else — the same rule the
   * hourly funding panel applies, kept here rather than relaxed for a nicer
   * timeline.
   */
  const mine = useMemo(
    () => data.workLogs.filter((l) => isCompany || l.applicationId === application.id),
    [data.workLogs, isCompany, application.id],
  );

  const people = useMemo(() => {
    const seen = new Map<string, string>();
    for (const log of mine) seen.set(log.applicationId, log.freelancerName);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [mine]);

  const filtered = useMemo(
    () =>
      mine.filter((log) => {
        if (status !== "ALL" && log.status !== status) return false;
        if (person !== "ALL" && log.applicationId !== person) return false;
        const date = log.workDate.slice(0, 10);
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
      }),
    [mine, status, person, from, to],
  );

  const days = useMemo(() => groupByDate(filtered), [filtered]);

  const totals = useMemo(
    () => ({
      hours: days.reduce((sum, d) => sum + d.hours, 0),
      approved: days.reduce((sum, d) => sum + d.approvedValue, 0),
      pending: filtered.filter((l) => l.status === "PENDING").length,
      days: days.length,
    }),
    [days, filtered],
  );

  const filtersApplied = status !== "ALL" || person !== "ALL" || Boolean(from) || Boolean(to);

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Totals for whatever is on screen ---- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Days logged" value={String(totals.days)} />
        <SummaryTile label="Hours" value={totals.hours.toFixed(2)} help="Rejected entries excluded" />
        <SummaryTile
          label="Approved value"
          value={formatMoney(totals.approved, currency, true)}
        />
        <SummaryTile
          label="Awaiting review"
          value={String(totals.pending)}
          help={totals.pending > 0 ? "Entries a reviewer has not decided on" : undefined}
        />
      </div>

      {/* ---- Filters ---- */}
      <Card padding="md">
        <CardHeader
          title="Filter the timeline"
          description="Narrow to a date range, a person, or a review state."
          icon={<Filter />}
          divided={false}
          className="mb-3"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="From">
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="ALL">Every status</option>
              <option value="PENDING">Awaiting review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </Field>
          {isCompany && people.length > 1 && (
            <Field label="Person">
              <Select value={person} onChange={(e) => setPerson(e.target.value)}>
                <option value="ALL">Everyone</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Card>

      {/* ---- The timeline ---- */}
      {days.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<CalendarDays />}
            title={filtersApplied ? "Nothing in that range" : "No work logged yet"}
            description={
              filtersApplied
                ? "No work log falls inside the filters you have set. Widen the dates or clear the status."
                : isCompany
                  ? "Hours logged against this engagement will appear here, grouped by the day the work was done."
                  : "Log your hours from the Funding / Payments tab and they will appear here, grouped by day."
            }
          />
        </Card>
      ) : (
        <Card padding="lg">
          <CardHeader
            title="Work log timeline"
            description="Newest day first. Each stop is one day of work with everything logged against it."
            icon={<Clock />}
          />

          <ol className="relative flex flex-col gap-6">
            {/*
              The spine sits behind the day markers. It stops short of the last
              marker so the line does not run past the final entry.
            */}
            <span
              aria-hidden
              className="absolute top-2 bottom-6 left-[7px] w-px bg-[var(--color-border)]"
            />

            {days.map((day) => (
              <li key={day.date} className="relative pl-7">
                <span
                  aria-hidden
                  className="absolute top-1.5 left-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-brand)] ring-1 ring-[var(--color-brand-border)]"
                />

                {/* Day header */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h4 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                    {formatDate(day.date)}
                  </h4>
                  <span className="text-[12.5px] tabular-nums text-[var(--color-text-secondary)]">
                    {day.hours.toFixed(2)} h
                    {day.approvedValue > 0 && (
                      <> · {formatMoney(day.approvedValue, day.currency, true)} approved</>
                    )}
                  </span>
                  {day.pending > 0 && (
                    <Badge tone="warning" size="sm">
                      {day.pending} awaiting review
                    </Badge>
                  )}
                  {day.rejected > 0 && (
                    <Badge tone="error" size="sm">
                      {day.rejected} rejected
                    </Badge>
                  )}
                </div>

                {/* The entries logged on that day */}
                <ul className="mt-2.5 flex flex-col gap-2.5">
                  {day.entries.map((log) => (
                    <li
                      key={log.id}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          {isCompany && (
                            <Avatar
                              src={log.freelancerAvatar}
                              name={log.freelancerName}
                              size="xs"
                            />
                          )}
                          <span className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                            {isCompany ? log.freelancerName : `${log.hours.toFixed(2)} hours`}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {isCompany && (
                            <span className="text-[12.5px] tabular-nums text-[var(--color-text-secondary)]">
                              {log.hours.toFixed(2)} h
                            </span>
                          )}
                          <Badge tone={STATUS_TONE[log.status]} size="sm">
                            {STATUS_LABEL[log.status]}
                          </Badge>
                        </div>
                      </div>

                      <p className="mt-2 text-[13px] leading-[1.6] whitespace-pre-line text-[var(--color-text-secondary)]">
                        {log.description}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-muted)]">
                        <span className="tabular-nums">
                          {formatMoney(log.hours * log.rateSnapshot, log.currency, true)} at{" "}
                          {formatMoney(log.rateSnapshot, log.currency, true)}/h
                        </span>
                        {log.reviewedAt && <span>Reviewed {formatDate(log.reviewedAt)}</span>}
                      </div>

                      {log.reviewNote && (
                        <p className="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-2.5 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            Reviewer:{" "}
                          </span>
                          {log.reviewNote}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- summary ---- */

function SummaryTile({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help?: string;
}) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] text-[var(--color-text-secondary)]">{label}</p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--color-text-primary)]">
            {value}
          </p>
          {help && <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">{help}</p>}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]">
          <FileText className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------- completed task spine --- */

interface TaskDay {
  date: string;
  tasks: Task[];
}

function groupTasksByDate(tasks: Task[]): TaskDay[] {
  const days = new Map<string, Task[]>();

  for (const task of tasks) {
    // completedAt is stamped when a task is moved to DONE. A task finished
    // before that column existed is grouped under the day it was created,
    // which is the only date it still carries.
    const key = (task.completedAt ?? task.createdAt).slice(0, 10);
    days.set(key, [...(days.get(key) ?? []), task]);
  }

  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, entries]) => ({ date, tasks: entries }));
}

function CompletedTaskTimeline({ tasks }: { tasks: Task[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");

  const done = useMemo(() => tasks.filter((t) => t.status === "DONE"), [tasks]);

  const filtered = useMemo(
    () =>
      done.filter((task) => {
        const date = (task.completedAt ?? task.createdAt).slice(0, 10);
        if (from && date < from) return false;
        if (to && date > to) return false;
        if (query.trim()) {
          const needle = query.trim().toLowerCase();
          const haystack = `${task.title} ${task.description ?? ""} ${task.assignedToName ?? ""}`;
          if (!haystack.toLowerCase().includes(needle)) return false;
        }
        return true;
      }),
    [done, from, to, query],
  );

  const days = useMemo(() => groupTasksByDate(filtered), [filtered]);
  const filtersApplied = Boolean(from || to || query.trim());

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Days with completions" value={String(days.length)} />
        <SummaryTile label="Tasks completed" value={String(filtered.length)} />
        <SummaryTile
          label="Still open"
          value={String(tasks.length - done.length)}
          help="Not yet moved to Done"
        />
        <SummaryTile label="Tasks in total" value={String(tasks.length)} />
      </div>

      <Card padding="md">
        <CardHeader
          title="Find a day"
          description="Pick a date range, or search the tasks completed inside it."
          icon={<Filter />}
          divided={false}
          className="mb-3"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="From">
            <Input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field label="Search">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title, detail or assignee"
            />
          </Field>
        </div>
      </Card>

      {days.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<CalendarDays />}
            title={filtersApplied ? "Nothing in that range" : "Nothing completed yet"}
            description={
              filtersApplied
                ? "No completed task falls inside the dates or the search you have set."
                : "Tasks appear here the day they are moved to Done on the Tasks board."
            }
          />
        </Card>
      ) : (
        <Card padding="lg">
          <CardHeader
            title="Completed work timeline"
            description="Newest day first. Each stop is a day, with everything finished on it."
            icon={<CheckCircle2 />}
          />

          <ol className="relative flex flex-col gap-6">
            <span
              aria-hidden
              className="absolute top-2 bottom-6 left-[7px] w-px bg-[var(--color-border)]"
            />

            {days.map((day) => (
              <li key={day.date} className="relative pl-7">
                <span
                  aria-hidden
                  className="absolute top-1.5 left-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-brand)] ring-1 ring-[var(--color-brand-border)]"
                />

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h4 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                    {formatDate(day.date)}
                  </h4>
                  <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                    {day.tasks.length} completed
                  </span>
                </div>

                <ul className="mt-2.5 flex flex-col gap-2.5">
                  {day.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success-fg)]" />
                          <span className="truncate text-[13.5px] font-medium text-[var(--color-text-primary)]">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {task.assignedToName && (
                            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-secondary)]">
                              <Avatar
                                src={task.assignedToAvatar}
                                name={task.assignedToName}
                                size="xs"
                              />
                              {task.assignedToName}
                            </span>
                          )}
                          <Badge tone="neutral" size="sm">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>

                      {task.description && (
                        <p className="mt-2 text-[13px] leading-[1.6] whitespace-pre-line text-[var(--color-text-secondary)]">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-muted)]">
                        <span>Opened {formatDate(task.createdAt)}</span>
                        {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                        {!task.completedAt && <span>Completion date not recorded</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
