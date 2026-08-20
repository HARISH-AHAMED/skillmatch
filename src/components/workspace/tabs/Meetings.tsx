"use client";

import {
  CalendarClock,
  CalendarPlus,
  Check,
  Clock,
  MapPin,
  Video,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Feedback";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/session";
import type { Meeting, Project, Role } from "@/lib/types";
import type { WorkspaceData } from "@/data/server/workspace";
import { cn, formatTime } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";

const RSVP_META = {
  ACCEPTED: { label: "Going", tone: "success" as const },
  DECLINED: { label: "Not going", tone: "error" as const },
  INVITED: { label: "No reply", tone: "neutral" as const },
};

export function WorkspaceMeetings({
  data,
  project,
  viewerRole,
}: {
  data: WorkspaceData;
  project: Project;
  viewerRole: Role;
}) {
  const toast = useToast();
  const { session } = useSession();
  const isCompany = viewerRole === "COMPANY";
  const userId = session?.userId ?? "";
  const now = useNow();

  const [meetings, setMeetings] = useState<Meeting[]>(() =>
    data.meetings,
  );
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [scheduling, setScheduling] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Meeting | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "30",
    meetingUrl: "",
    location: "",
    attendees: [] as string[],
  });

  const team = data.team;

  /* Past = cancelled/completed, or the end time has already passed (§16.4). */
  const { upcoming, past } = useMemo(() => {
    const isPast = (m: Meeting) =>
      m.status === "COMPLETED" ||
      new Date(m.startsAt).getTime() + m.durationMinutes * 60_000 < now;

    return {
      upcoming: meetings
        .filter((m) => !isPast(m))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      past: meetings.filter(isPast).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    };
  }, [meetings, now]);

  const rsvp = (meetingId: string, status: "ACCEPTED" | "DECLINED") => {
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              attendees: m.attendees.map((a) =>
                a.userId === userId ? { ...a, status } : a,
              ),
            }
          : m,
      ),
    );
    toast.success(status === "ACCEPTED" ? "You're going" : "Declined", "The organiser has been notified.");
  };

  const schedule = () => {
    if (!form.title.trim() || !form.date || !form.time) return;
    const startsAt = new Date(`${form.date}T${form.time}`).toISOString();

    // Attendees are filtered to genuine project parties (§16.2).
    const eligible = new Set(team.map((t) => t.freelancer.userId));
    const invited = form.attendees.filter((id) => eligible.has(id));

    setMeetings((prev) => [
      ...prev,
      {
        id: `meet-local-${Date.now()}`,
        projectId: project.id,
        organizerUserId: userId,
        organizerName: project.company.companyName,
        title: form.title.trim(),
        description: form.description.trim(),
        startsAt,
        durationMinutes: Number(form.duration),
        meetingUrl: form.meetingUrl.trim() || undefined,
        location: form.location.trim() || undefined,
        status: "SCHEDULED",
        attendees: [
          {
            userId,
            name: project.company.companyName,
            avatarUrl: project.company.logoUrl,
            role: "COMPANY",
            status: "ACCEPTED",
          },
          ...invited.map((id) => {
            const t = team.find((x) => x.freelancer.userId === id)!;
            return {
              userId: id,
              name: t.freelancer.name,
              avatarUrl: t.freelancer.avatarUrl,
              role: "FREELANCER" as const,
              status: "INVITED" as const,
            };
          }),
        ],
      },
    ]);
    setForm({
      title: "",
      description: "",
      date: "",
      time: "",
      duration: "30",
      meetingUrl: "",
      location: "",
      attendees: [],
    });
    setScheduling(false);
    toast.success("Meeting scheduled", `${invited.length} attendees have been notified.`);
  };

  const list = view === "upcoming" ? upcoming : past;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          variant="segmented"
          value={view}
          onChange={(v) => setView(v as "upcoming" | "past")}
          items={[
            { id: "upcoming", label: "Upcoming", count: upcoming.length },
            { id: "past", label: "Past", count: past.length },
          ]}
        />
        {isCompany && (
          <Button
            size="sm"
            leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}
            onClick={() => setScheduling(true)}
          >
            Schedule meeting
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title={view === "upcoming" ? "No meetings scheduled" : "No past meetings"}
          description={
            view === "upcoming"
              ? isCompany
                ? "Schedule a call and every project party gets an invitation with an RSVP."
                : "The company has not scheduled anything yet."
              : "Meetings move here once their end time passes."
          }
          action={
            isCompany && view === "upcoming"
              ? { label: "Schedule a meeting", onClick: () => setScheduling(true) }
              : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((meeting) => {
            const me = meeting.attendees.find((a) => a.userId === userId);
            const cancelled = meeting.status === "CANCELLED";
            const start = new Date(meeting.startsAt);
            return (
              <li key={meeting.id}>
                <Card padding="md" className={cn(cancelled && "opacity-70")}>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Date block */}
                    <div
                      className={cn(
                        "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)]",
                        cancelled
                          ? "bg-[var(--color-neutral-bg)]"
                          : "bg-[var(--color-brand-soft)]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10.5px] font-semibold uppercase tracking-[0.06em]",
                          cancelled
                            ? "text-[var(--color-text-muted)]"
                            : "text-[var(--color-brand-active)]",
                        )}
                      >
                        {start.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span
                        className={cn(
                          "text-[22px] font-semibold leading-none tabular-nums",
                          cancelled
                            ? "text-[var(--color-text-muted)]"
                            : "text-[var(--color-brand-active)]",
                        )}
                      >
                        {start.getDate()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3
                            className={cn(
                              "text-[15px] font-semibold text-[var(--color-text-primary)]",
                              cancelled && "line-through",
                            )}
                          >
                            {meeting.title}
                          </h3>
                          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--color-text-secondary)]">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime(meeting.startsAt)} · {meeting.durationMinutes} min
                            </span>
                            {meeting.location && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {meeting.location}
                              </span>
                            )}
                          </p>
                        </div>
                        {cancelled ? (
                          <Badge tone="error">Cancelled</Badge>
                        ) : (
                          me && <Badge tone={RSVP_META[me.status].tone}>{RSVP_META[me.status].label}</Badge>
                        )}
                      </div>

                      {meeting.description && (
                        <p className="mt-2 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                          {meeting.description}
                        </p>
                      )}

                      {/* Attendees */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {meeting.attendees.map((a) => (
                          <span
                            key={a.userId}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[11.5px]",
                              a.status === "ACCEPTED"
                                ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-fg)]"
                                : a.status === "DECLINED"
                                  ? "border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-fg)]"
                                  : "border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]",
                            )}
                          >
                            <Avatar src={a.avatarUrl} name={a.name} size="xs" />
                            {a.name.split(" ")[0]}
                            {a.status === "ACCEPTED" && <Check className="h-3 w-3" />}
                            {a.status === "DECLINED" && <X className="h-3 w-3" />}
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      {!cancelled && view === "upcoming" && (
                        <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
                          {meeting.meetingUrl && (
                            <Button
                              href={meeting.meetingUrl}
                              size="sm"
                              leftIcon={<Video className="h-3.5 w-3.5" />}
                            >
                              Join
                            </Button>
                          )}
                          {me && me.status !== "ACCEPTED" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Check className="h-3.5 w-3.5" />}
                              onClick={() => rsvp(meeting.id, "ACCEPTED")}
                            >
                              Accept
                            </Button>
                          )}
                          {me && me.status !== "DECLINED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<X className="h-3.5 w-3.5" />}
                              onClick={() => rsvp(meeting.id, "DECLINED")}
                            >
                              Decline
                            </Button>
                          )}
                          {isCompany && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-auto text-[var(--color-error-fg)]"
                              onClick={() => setCancelTarget(meeting)}
                            >
                              Cancel meeting
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* ---- Schedule modal ---- */}
      <Modal
        open={scheduling}
        onClose={() => setScheduling(false)}
        title="Schedule a meeting"
        description="Only genuine project parties can be invited — anyone else is dropped."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScheduling(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.title.trim() || !form.date || !form.time}
              onClick={schedule}
            >
              Schedule & notify
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Stage 2 review & sign-off"
            />
          </Field>

          <Field label="Agenda">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Walk through the performance report and agree whether stage 2 is approved."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" required>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </Field>
            <Field label="Time" required>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </Field>
            <Field label="Duration">
              <Select
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              >
                {["15", "30", "45", "60", "90", "120", "180"].map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meeting link">
              <Input
                type="url"
                value={form.meetingUrl}
                onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value }))}
                placeholder="https://meet.frivvo.app/…"
              />
            </Field>
            <Field label="Or a location">
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Amsterdam office, room 2"
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-[var(--color-text-secondary)]">
              Invite
            </p>
            <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              {team.map((t) => (
                <Checkbox
                  key={t.id}
                  checked={form.attendees.includes(t.freelancer.userId)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      attendees: e.target.checked
                        ? [...f.attendees, t.freelancer.userId]
                        : f.attendees.filter((id) => id !== t.freelancer.userId),
                    }))
                  }
                  label={
                    <span className="inline-flex items-center gap-2">
                      <Avatar src={t.freelancer.avatarUrl} name={t.freelancer.name} size="xs" />
                      {t.freelancer.name}
                      {t.roleName && (
                        <span className="text-[var(--color-text-muted)]">· {t.roleName}</span>
                      )}
                    </span>
                  }
                />
              ))}
              {team.length === 0 && (
                <p className="text-[12.5px] text-[var(--color-text-muted)]">
                  No freelancers hired on this project yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          setMeetings((prev) =>
            prev.map((m) => (m.id === cancelTarget?.id ? { ...m, status: "CANCELLED" } : m)),
          );
          toast.toast({
            title: "Meeting cancelled",
            description: "Every attendee has been notified.",
            tone: "info",
          });
        }}
        title={`Cancel "${cancelTarget?.title}"?`}
        message="Every attendee will be notified. The meeting stays on the record as cancelled rather than disappearing."
        confirmLabel="Cancel meeting"
        destructive
      />
    </div>
  );
}
