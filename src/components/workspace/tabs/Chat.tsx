"use client";

import { Hash, Lock, Paperclip, Send, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { useSession } from "@/lib/session";
import type { Application, Message, Project, Role } from "@/lib/types";
import { MESSAGES, dmChannel, hiredApplications, visibleChannelsFor } from "@/data/queries";
import { MESSAGE_TTL_DAYS } from "@/lib/constants";
import { cn, formatTime } from "@/lib/utils";

export function WorkspaceChat({
  project,
  application,
  viewerRole,
}: {
  project: Project;
  application: Application;
  viewerRole: Role;
}) {
  const { session } = useSession();
  const isCompany = viewerRole === "COMPANY";
  const userId = session?.userId ?? "";

  const [messages, setMessages] = useState<Message[]>(() =>
    MESSAGES.filter((m) => m.projectId === project.id),
  );
  const [channel, setChannel] = useState("group");
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const team = hiredApplications(project.id);
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
            id: `u-${project.companyId}`,
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

  const send = () => {
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-local-${Date.now()}`,
        projectId: project.id,
        senderId: userId,
        senderName: session?.name ?? "You",
        senderAvatar: session?.image ?? "",
        senderRole: viewerRole,
        content: draft.trim(),
        channel,
        seen: true,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
  };

  const activeChannel = channels.find((c) => c.id === channel);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* ---- Channel rail ---- */}
      <aside className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Channels
        </p>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {channels.map((c) => (
            <li key={c.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => setChannel(c.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left transition-colors",
                  channel === c.id
                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]",
                )}
              >
                <span className="shrink-0">{c.icon}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-3">
          <p className="px-2 text-[11.5px] leading-[1.5] text-[var(--color-text-muted)]">
            Messages are retained for {MESSAGE_TTL_DAYS} days, then removed automatically.
          </p>
        </div>
      </aside>

      {/* ---- Thread ---- */}
      <section className="flex h-[620px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
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

                      <div
                        className={cn(
                          "rounded-[var(--radius-lg)] px-3.5 py-2.5 text-[13.5px] leading-[1.6]",
                          mine
                            ? "bg-[var(--color-brand)] text-white"
                            : "bg-[var(--color-surface-alt)] text-[var(--color-text-primary)]",
                        )}
                      >
                        {m.content}
                      </div>

                      {!showAvatar && (
                        <span className="mt-1 text-[10.5px] text-[var(--color-text-muted)]">
                          {formatTime(m.createdAt)}
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
            >
              <Paperclip className="h-4 w-4" />
            </button>
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
    </div>
  );
}
