"use client";

import {
  Ban,
  Check,
  CheckCheck,
  Hash,
  Lock,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  deleteMessage,
  editMessage,
  sendMessage,
  shareFile,
} from "@/actions/collaborationActions";
import { uploadFile } from "@/lib/upload";
import { useSession } from "@/lib/session";
import type { Application, Message, Project, Role } from "@/lib/types";
import { dmChannel, visibleChannelsFor } from "@/lib/domain";
import type { WorkspaceData } from "@/data/server/workspace";
import { MESSAGE_EDIT_WINDOW_MINUTES, MESSAGE_TTL_DAYS } from "@/lib/constants";
import { useNow } from "@/hooks/useNow";
import { cn, formatTime } from "@/lib/utils";

/**
 * How often the thread asks for new messages. The old ten-second interval was
 * a cost ceiling on re-rendering the whole workspace, not a considered cadence;
 * against an endpoint that returns only messages, this reads as live.
 */
const POLL_MS = 2500;

/**
 * A cheap fingerprint of the thread, so a poll that brings back nothing new
 * costs no React work. It covers every field the thread renders and that can
 * change after a message is sent — content and editedAt for edits, deletedAt
 * for tombstones, seen for read receipts.
 */
function signature(messages: Message[]): string {
  return messages
    .map((m) => `${m.id}:${m.seen ? 1 : 0}:${m.deletedAt ?? ""}:${m.editedAt ?? ""}`)
    .join("|");
}

/** Whether the sender may still edit, mirroring the server's own window. */
function withinEditWindow(createdAt: string, now: number): boolean {
  return now - new Date(createdAt).getTime() <= MESSAGE_EDIT_WINDOW_MINUTES * 60_000;
}

export function WorkspaceChat({
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
  const { session } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const isCompany = viewerRole === "COMPANY";
  const userId = session?.userId ?? "";

  /*
   * The poll's list is the state, seeded from the server render so the first
   * paint is not empty. A message being sent is layered on top so it appears
   * immediately, and React drops that layer by itself once the action settles
   * and the real row arrives — no mirrored copy to keep in step, and nothing to
   * roll back by hand when a send is refused.
   */
  const [serverMessages, setServerMessages] = useState<Message[]>(data.messages);
  const [messages, addOptimistic] = useOptimistic<Message[], Message>(
    serverMessages,
    (current, pending) => [...current, pending],
  );
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  // Ticks every 30s so the edit control disappears when the window lapses.
  const now = useNow(30_000);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [channel, setChannel] = useState("group");
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [attaching, setAttaching] = useState(false);

  const team = data.team;
  const canSee = visibleChannelsFor(viewerRole, userId);

  /* Channel list — the company can neither see nor write the freelancers channel. */
  const channels = useMemo(() => {
    const list = [
      { id: "group", label: "Group", icon: <Hash className="h-3.5 w-3.5" />, description: "Everyone on the project" },
    ];
    if (!isCompany) {
      list.push({
        id: "freelancers",
        label: "Freelancers only",
        icon: <Lock className="h-3.5 w-3.5" />,
        description: "Hired freelancers — the company cannot read this",
      });
    }

    const counterparts = isCompany
      ? team.map((t) => ({ id: t.freelancer.userId, name: t.freelancer.name, avatar: t.freelancer.avatarUrl }))
      : [
          {
            /*
             * The company's *user* id, which is what a DM channel is keyed on.
             *
             * This was `u-${project.companyId}` — a Company row id behind a
             * made-up prefix, and not a user id at all. Every consequence
             * followed from that: the freelancer's client built
             * `dm:<their-user>:u-<company-row>` while the company's client
             * built `dm:<company-user>:<freelancer-user>`, so the two sides
             * were writing to and reading from different channels and neither
             * ever saw the other. The server now also rejects the fabricated
             * id outright, because a DM counterpart has to be a real party to
             * the project.
             */
            id: project.company.userId,
            name: project.company.companyName,
            avatar: project.company.logoUrl,
          },
          ...team
            .filter((t) => t.id !== application.id)
            .map((t) => ({
              id: t.freelancer.userId,
              name: t.freelancer.name,
              avatar: t.freelancer.avatarUrl,
            })),
        ];

    for (const c of counterparts) {
      list.push({
        id: dmChannel(userId, c.id),
        label: c.name,
        icon: <Avatar src={c.avatar} name={c.name} size="xs" />,
        description: "Direct message",
      });
    }
    return list;
  }, [isCompany, team, userId, project, application]);

  const visible = useMemo(
    () =>
      messages
        .filter((m) => m.channel === channel && canSee(m.channel))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages, channel, canSee],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visible.length, channel]);

  /*
   * There is no socket on this deployment, so the other side's messages are
   * picked up by asking the server again.
   *
   * This used to call router.refresh(), which re-runs the entire workspace
   * server tree — payment items, the ledger, work logs, tasks, meetings,
   * completion readiness — every tick, just to learn whether anyone had
   * spoken. That is what made the chat feel slow, and why the interval had to
   * be ten seconds to stay affordable at all.
   *
   * It now polls one endpoint that returns messages and nothing else, which is
   * cheap enough to run every couple of seconds. The response replaces the
   * list wholesale, so an edit, a deletion and a read receipt all arrive by
   * the same path as a new message.
   */
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/workspace/${project.id}/messages`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { messages: Message[] };
        if (cancelled || !Array.isArray(body.messages)) return;
        // Only re-render when something actually moved, so a quiet channel
        // costs one request and no React work.
        setServerMessages((current) =>
          signature(current) === signature(body.messages) ? current : body.messages,
        );
      } catch {
        // A dropped poll is not worth surfacing; the next tick retries.
      }
    };

    const loop = () => {
      timer = setTimeout(async () => {
        await poll();
        if (!cancelled) loop();
      }, POLL_MS);
    };

    // Catch up immediately on mount and whenever the tab is looked at again,
    // rather than waiting out an interval.
    void poll();
    loop();
    document.addEventListener("visibilitychange", poll);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [project.id]);

  /*
   * Read receipts. Fired only when this reader actually has something unread
   * in the channel they are looking at, so an idle tab writes nothing.
   */
  useEffect(() => {
    const unread = visible.some((m) => m.senderId !== userId && !m.seen);
    if (!unread || document.visibilityState !== "visible") return;
    void fetch(`/api/workspace/${project.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    }).catch(() => {});
  }, [visible, userId, project.id, channel]);

  /**
   * This used to append to local state and stop there: nothing was ever sent,
   * so a message vanished on the next render and the other side never saw it.
   */
  const send = () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");

    startTransition(async () => {
      addOptimistic({
        id: `msg-local-${Date.now()}`,
        projectId: project.id,
        senderId: userId,
        senderName: session?.name ?? "You",
        senderAvatar: session?.image ?? "",
        senderRole: viewerRole,
        content,
        channel,
        seen: true,
        createdAt: new Date().toISOString(),
      });

      const result = await sendMessage(project.id, content, channel);

      if (!result || "error" in result) {
        // Give the text back rather than losing what they typed.
        setDraft((current) => current || content);
        toast.error(
          "That message was not sent",
          (result && "error" in result ? result.error : undefined) ?? "Please try again.",
        );
        return;
      }

      // The poll picks the real row up; no full-tree refresh for a message.
      void refetch();
    });
  };

  /** Pulls the thread immediately, rather than waiting out the poll interval. */
  const refetch = async () => {
    try {
      const res = await fetch(`/api/workspace/${project.id}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { messages: Message[] };
      if (Array.isArray(body.messages)) setServerMessages(body.messages);
    } catch {
      // The next tick retries.
    }
  };

  /** Save an edit. The window is also enforced server-side. */
  const saveEdit = () => {
    if (!editing) return;
    const next = editing.draft.trim();
    const target = messages.find((m) => m.id === editing.id);
    if (!next || !target) return setEditing(null);
    if (next === target.content) return setEditing(null);

    setEditing(null);
    startTransition(async () => {
      const result = await editMessage(project.id, editing.id, next);
      if (!result || "error" in result) {
        toast.error(
          "That edit was not saved",
          (result && "error" in result ? result.error : undefined) ?? "Please try again.",
        );
      }
      void refetch();
    });
  };

  const removeMessage = (messageId: string) => {
    setConfirmDelete(null);
    startTransition(async () => {
      const result = await deleteMessage(project.id, messageId);
      if (!result || "error" in result) {
        toast.error(
          "That message was not deleted",
          (result && "error" in result ? result.error : undefined) ?? "Please try again.",
        );
      }
      void refetch();
    });
  };

  /**
   * The paperclip was decoration — a button with no handler. It now puts the
   * file in the workspace's shared files for this channel, which is where the
   * Files tab reads from, so an attachment is not a dead end.
   */
  const attach = async (file: File | undefined) => {
    if (!file) return;
    setAttaching(true);
    try {
      const uploaded = await uploadFile(file);
      if ("error" in uploaded) {
        toast.error("That file could not be uploaded", uploaded.error);
        return;
      }

      const size = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      const shared = await shareFile(project.id, file.name, uploaded.url, size, channel);
      if (!shared || "error" in shared) {
        toast.error(
          "That file could not be shared",
          (shared && "error" in shared ? shared.error : undefined) ?? "Please try again.",
        );
        return;
      }

      toast.success("File shared", `${file.name} is in the workspace files.`);
      router.refresh();
    } finally {
      setAttaching(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const activeChannel = channels.find((c) => c.id === channel);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* ---- Channel rail ---- */}
      <aside className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Channels
        </p>
        <ul className="no-scrollbar flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
          {channels.map((c) => (
            <li key={c.id} className="shrink-0 lg:w-full lg:shrink">
              <button
                type="button"
                onClick={() => setChannel(c.id)}
                className={cn(
                  "flex w-auto items-center gap-2 whitespace-nowrap rounded-full border border-[var(--color-border)] px-3 py-1.5 text-left transition-colors lg:w-full lg:gap-2.5 lg:rounded-[var(--radius-md)] lg:border-0 lg:px-2.5 lg:py-2",
                  channel === c.id
                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]",
                )}
              >
                <span className="shrink-0">{c.icon}</span>
                <span className="min-w-0 max-w-[9rem] truncate text-[13px] font-medium lg:max-w-none lg:flex-1">
                  {c.label}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 hidden border-t border-[var(--color-border-subtle)] pt-3 lg:block">
          <p className="px-2 text-[11.5px] leading-[1.5] text-[var(--color-text-muted)]">
            Messages are retained for {MESSAGE_TTL_DAYS} days, then removed automatically.
          </p>
        </div>
      </aside>

      {/* ---- Thread ---- */}
      <section className="flex h-[min(620px,65svh)] min-h-[380px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] lg:h-[620px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {activeChannel?.icon}
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                {activeChannel?.label}
              </h3>
              <p className="truncate text-[11.5px] text-[var(--color-text-muted)]">
                {activeChannel?.description}
              </p>
            </div>
          </div>
          {channel === "freelancers" && (
            <Badge tone="info" size="sm" icon={<Lock />}>
              Private
            </Badge>
          )}
          {channel === "group" && (
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)]">
              <Users className="h-3.5 w-3.5" />
              {team.length + 1}
            </span>
          )}
        </header>

        {channel === "freelancers" && (
          <div className="shrink-0 px-4 pt-3">
            <Alert tone="info">
              This channel is visible to hired freelancers only. {project.company.companyName}{" "}
              cannot read or post here.
            </Alert>
          </div>
        )}

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-sunken)]">
                <Send className="h-4 w-4 text-[var(--color-text-muted)]" />
              </span>
              <p className="mt-3 text-[13.5px] font-medium text-[var(--color-text-primary)]">
                No messages here yet
              </p>
              <p className="mt-1 max-w-xs text-[12.5px] leading-[1.5] text-[var(--color-text-muted)]">
                Start the conversation — everything in this channel stays scoped to this project.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {visible.map((m, i) => {
                const mine = m.senderId === userId;
                const showAvatar = i === 0 || visible[i - 1].senderId !== m.senderId;
                const isDeleted = !!m.deletedAt;
                const isEditing = editing?.id === m.id;
                // The control is hidden once the window lapses; the action
                // refuses independently, so this is a courtesy, not the rule.
                const canEdit = mine && !isDeleted && withinEditWindow(m.createdAt, now);
                return (
                  <li
                    key={m.id}
                    className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}
                  >
                    <span className={cn("w-8 shrink-0", !showAvatar && "invisible")}>
                      <Avatar src={m.senderAvatar} name={m.senderName} size="sm" />
                    </span>

                    <div
                      className={cn(
                        "flex min-w-0 max-w-[78%] flex-col",
                        mine ? "items-end" : "items-start",
                      )}
                    >
                      {showAvatar && (
                        <p className="mb-1 flex items-center gap-2 text-[11.5px]">
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {mine ? "You" : m.senderName}
                          </span>
                          <span className="rounded-full bg-[var(--color-surface-sunken)] px-1.5 text-[10px] text-[var(--color-text-muted)]">
                            {m.senderRole === "COMPANY" ? "Company" : "Freelancer"}
                          </span>
                          <span className="text-[var(--color-text-muted)]">
                            {formatTime(m.createdAt)}
                          </span>
                        </p>
                      )}

                      {isEditing ? (
                        /* Editing in place, so the message keeps its position
                           in the thread rather than jumping to the composer. */
                        <div className="flex w-full flex-col gap-1.5">
                          <textarea
                            autoFocus
                            value={editing.draft}
                            onChange={(e) =>
                              setEditing({ id: m.id, draft: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                saveEdit();
                              }
                              if (e.key === "Escape") setEditing(null);
                            }}
                            rows={2}
                            aria-label="Edit message"
                            className="min-w-[14rem] resize-none rounded-[var(--radius-lg)] border border-[var(--color-brand)] bg-[var(--color-surface)] px-3 py-2 text-[13.5px] leading-[1.5] focus:outline-none focus:shadow-[var(--shadow-focus)]"
                          />
                          <span className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="font-semibold text-[var(--color-brand-active)]"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="text-[var(--color-text-muted)]"
                            >
                              Cancel
                            </button>
                            <span className="text-[var(--color-text-muted)]">
                              Enter to save · Esc to cancel
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="group/message flex items-center gap-1.5">
                          {/* Own-message controls sit outside the bubble so
                              they never overlap the text. */}
                          {mine && !isDeleted && (
                            <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100">
                              {canEdit && (
                                <button
                                  type="button"
                                  aria-label="Edit message"
                                  onClick={() => setEditing({ id: m.id, draft: m.content })}
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label="Delete message"
                                onClick={() => setConfirmDelete(m.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-error-fg)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          )}

                          <div
                            className={cn(
                              "rounded-[var(--radius-lg)] px-3.5 py-2.5 text-[13.5px] leading-[1.6]",
                              isDeleted
                                ? "border border-dashed border-[var(--color-border)] bg-transparent italic text-[var(--color-text-muted)]"
                                : mine
                                  ? "bg-[var(--color-brand)] text-white"
                                  : "bg-[var(--color-surface-alt)] text-[var(--color-text-primary)]",
                            )}
                          >
                            {isDeleted ? (
                              <span className="flex items-center gap-1.5">
                                <Ban className="h-3.5 w-3.5 shrink-0" />
                                This message was deleted
                              </span>
                            ) : (
                              m.content
                            )}
                          </div>
                        </div>
                      )}

                      {/* Time, edited marker and read receipt on one line. */}
                      {!isEditing && (
                        <span className="mt-1 flex items-center gap-1.5 text-[10.5px] text-[var(--color-text-muted)]">
                          {!showAvatar && <span>{formatTime(m.createdAt)}</span>}
                          {m.editedAt && !isDeleted && <span>edited</span>}
                          {mine && !isDeleted && (
                            <span
                              title={m.seen ? "Seen" : "Sent"}
                              aria-label={m.seen ? "Seen" : "Sent"}
                              className={cn(
                                "flex items-center",
                                m.seen && "text-[var(--color-brand-active)]",
                              )}
                            >
                              {m.seen ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-3">
          <div className="flex items-end gap-2">
            <button
              type="button"
              aria-label="Attach a file"
              disabled={attaching}
              onClick={() => fileInput.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)] disabled:cursor-wait disabled:opacity-60"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              onChange={(e) => attach(e.target.files?.[0])}
            />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={`Message ${activeChannel?.label}…`}
              aria-label="Message"
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[14px] leading-[1.5] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:outline-none focus:shadow-[var(--shadow-focus)]"
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-[var(--color-text-muted)]">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeMessage(confirmDelete)}
        title="Delete this message?"
        message="Everyone in the channel will see that a message was deleted. The text is removed for good and cannot be restored."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
