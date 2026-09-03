"use client";

import { Calendar, ChevronLeft, ChevronRight, CheckSquare, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Feedback";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/session";
import { createTask, deleteTask, updateTaskStatus } from "@/actions/collaborationActions";
import { TASK_COLUMNS, TASK_STATUSES } from "@/lib/constants";
import type { Project, Role, Task, TaskStatus } from "@/lib/types";
import type { WorkspaceData } from "@/data/server/workspace";
import { cn, daysUntil, formatDate } from "@/lib/utils";

/** Movement is button-driven and clamped at both ends (§15.3). */
function adjacentTaskStatus(current: TaskStatus, dir: "forward" | "back"): TaskStatus {
  const i = TASK_STATUSES.indexOf(current);
  const next = dir === "forward" ? i + 1 : i - 1;
  return TASK_STATUSES[Math.max(0, Math.min(TASK_STATUSES.length - 1, next))];
}

const PRIORITY_TONE = {
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "neutral",
} as const;

/** A board change that has been made but not yet confirmed by the server. */
type OptimisticChange =
  | { kind: "create"; task: Task }
  | { kind: "move"; id: string; status: TaskStatus }
  | { kind: "delete"; id: string };

export function WorkspaceTasks({
  data,
  project,
  viewerRole,
}: {
  data: WorkspaceData;
  project: Project;
  viewerRole: Role;
}) {
  const toast = useToast();
  const isCompany = viewerRole === "COMPANY";
  const { session } = useSession();

  const router = useRouter();
  const [, startTransition] = useTransition();

  /*
   * The board is the server's list with a pending change laid over it. It used
   * to be a `useState` copy that nothing ever wrote back: creating, moving and
   * deleting a task all edited that copy and stopped there, so every change
   * disappeared on the next render and no one else ever saw it.
   */
  const [tasks, applyOptimistic] = useOptimistic<Task[], OptimisticChange>(
    data.tasks,
    (current, change) => {
      if (change.kind === "create") return [change.task, ...current];
      if (change.kind === "move") {
        return current.map((t) => (t.id === change.id ? { ...t, status: change.status } : t));
      }
      return current.filter((t) => t.id !== change.id);
    },
  );

  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [filterAssignee, setFilterAssignee] = useState("ALL");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as Task["priority"],
    assignee: "",
    dueDate: "",
  });

  const team = data.team;

  const visible = useMemo(
    () =>
      // A freelancer sees the work assigned to them, not the whole board.
      // Unassigned tasks stay visible so nobody's work is invisible until
      // somebody remembers to assign it.
      !isCompany
        ? tasks.filter((t) => !t.assignedToId || t.assignedToId === session?.userId)
        : filterAssignee === "ALL"
          ? tasks
          : tasks.filter((t) => t.assignedToId === filterAssignee),
    [tasks, filterAssignee, isCompany, session?.userId],
  );

  const move = (task: Task, dir: "forward" | "back") => {
    const next = adjacentTaskStatus(task.status, dir);
    if (next === task.status) return;

    startTransition(async () => {
      applyOptimistic({ kind: "move", id: task.id, status: next });
      const result = await updateTaskStatus(project.id, task.id, next);
      if (!result || "error" in result) {
        toast.error("That task could not be moved", (result && "error" in result ? result.error : undefined) ?? "Please try again.");
        return;
      }
      router.refresh();
    });
  };

  const create = () => {
    const title = form.title.trim();
    if (!title) return;

    // The select carries the assignee's *user* id: Task.assignedToId is a User
    // reference, and submitting the freelancer profile id — as this used to —
    // pointed at a row that does not exist.
    const assignee = team.find((a) => a.freelancer.userId === form.assignee);
    const description = form.description.trim();
    const { priority, dueDate } = form;

    setForm({ title: "", description: "", priority: "MEDIUM", assignee: "", dueDate: "" });
    setCreating(false);

    startTransition(async () => {
      applyOptimistic({
        kind: "create",
        task: {
          id: `task-local-${Date.now()}`,
          projectId: project.id,
          title,
          description,
          status: "TODO",
          priority,
          dueDate: dueDate || undefined,
          assignedToId: assignee?.freelancer.userId,
          assignedToName: assignee?.freelancer.name,
          assignedToAvatar: assignee?.freelancer.avatarUrl,
          createdByName: session?.name ?? "You",
          createdAt: new Date().toISOString(),
          labels: [],
        },
      });

      const result = await createTask(
        project.id,
        title,
        description,
        priority,
        dueDate || undefined,
        assignee?.freelancer.userId ?? null,
      );

      if (!result || "error" in result) {
        toast.error(
          "That task could not be created",
          (result && "error" in result ? result.error : undefined) ?? "Please try again.",
        );
        // Hand back what they typed so it is not lost.
        setForm({ title, description, priority, assignee: form.assignee, dueDate });
        setCreating(true);
        return;
      }

      toast.success(
        "Task created",
        assignee ? `${assignee.freelancer.name} has been notified.` : undefined,
      );
      router.refresh();
    });
  };

  const confirmDelete = () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);

    startTransition(async () => {
      applyOptimistic({ kind: "delete", id: target.id });
      const result = await deleteTask(project.id, target.id);
      if (!result || "error" in result) {
        toast.error(
          "That task could not be deleted",
          (result && "error" in result ? result.error : undefined) ?? "Please try again.",
        );
        return;
      }
      toast.success("Task deleted");
      router.refresh();
    });
  };

  return (
    <div>
      <Card padding="md" className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={filterAssignee === "ALL"} onClick={() => setFilterAssignee("ALL")}>
              Everyone
            </Chip>
            {team.map((a) => (
              <Chip
                key={a.id}
                active={filterAssignee === a.freelancer.userId}
                onClick={() => setFilterAssignee(a.freelancer.userId)}
              >
                {a.freelancer.name.split(" ")[0]}
              </Chip>
            ))}
          </div>
          {/*
            Task creation was hidden behind the company role, though the server
            action has always accepted any member of the engagement. A
            freelancer can raise their own work here now.
          */}
          <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
            New task
          </Button>
        </div>
      </Card>

      {/* ---- Board: all four columns always render (§15.1 / R79) ---- */}
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
        {TASK_COLUMNS.map((col) => {
          const items = visible.filter((t) => t.status === col.status);
          return (
            <section
              key={col.status}
              className="flex w-[280px] shrink-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] md:w-auto"
            >
              <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: col.accent }}
                  />
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {col.label}
                  </h3>
                </div>
                <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                  {items.length}
                </span>
              </header>

              <div className="flex min-h-[120px] flex-col gap-2.5 p-2.5">
                {items.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[12.5px] text-[var(--color-text-muted)]">
                    Nothing here
                  </p>
                ) : (
                  items.map((task) => {
                    const days = task.dueDate ? daysUntil(task.dueDate) : null;
                    const overdue = days !== null && days < 0 && task.status !== "DONE";
                    return (
                      <article
                        key={task.id}
                        className="group rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-shadow hover:shadow-[var(--shadow-sm)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[13px] font-medium leading-[1.45] text-[var(--color-text-primary)]">
                            {task.title}
                          </h4>
                          <Badge tone={PRIORITY_TONE[task.priority]} size="sm">
                            {task.priority.toLowerCase()}
                          </Badge>
                        </div>

                        {task.description && (
                          <p className="mt-1.5 line-clamp-2 text-[12px] leading-[1.5] text-[var(--color-text-secondary)]">
                            {task.description}
                          </p>
                        )}

                        {task.labels.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {task.labels.map((l) => (
                              <span
                                key={l}
                                className="rounded-full bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]"
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-2.5">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {task.assignedToName ? (
                              <>
                                <Avatar
                                  src={task.assignedToAvatar}
                                  name={task.assignedToName}
                                  size="xs"
                                />
                                <span className="truncate text-[11px] text-[var(--color-text-muted)]">
                                  {task.assignedToName.split(" ")[0]}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-[var(--color-text-disabled)]">
                                Unassigned
                              </span>
                            )}
                          </div>

                          {task.dueDate && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[11px]",
                                overdue
                                  ? "font-medium text-[var(--color-error-fg)]"
                                  : "text-[var(--color-text-muted)]",
                              )}
                            >
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.dueDate, "short")}
                            </span>
                          )}
                        </div>

                        {/* Movement controls */}
                        <div className="mt-2.5 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => move(task, "back")}
                            disabled={task.status === TASK_STATUSES[0]}
                            aria-label="Move back"
                            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>

                          {isCompany && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(task)}
                              aria-label="Delete task"
                              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] opacity-0 transition-all hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error-fg)] group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => move(task, "forward")}
                            disabled={task.status === TASK_STATUSES[TASK_STATUSES.length - 1]}
                            aria-label="Move forward"
                            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <EmptyState
          className="mt-4"
          icon={<CheckSquare />}
          title="No tasks on this board"
          description="Break the work into tasks so both sides can see what is in flight. Anyone on the engagement can add one."
          action={{ label: "Create the first task", onClick: () => setCreating(true) }}
        />
      )}

      {/* ---- Create task ---- */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button disabled={!form.title.trim()} onClick={create}>
              Create task
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Convert settings surface to TypeScript"
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Convert file by file, keeping the feature flag intact."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assign to">
              <Select
                value={form.assignee}
                onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {team.map((a) => (
                  <option key={a.id} value={a.freelancer.userId}>
                    {a.freelancer.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as Task["priority"] }))
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </Select>
            </Field>
          </div>
          <Field label="Due date">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete "${deleteTarget?.title}"?`}
        message="This removes the task from the board for everyone on the engagement."
        confirmLabel="Delete task"
        destructive
      />
    </div>
  );
}
