"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CalendarClock, MapPin, Link2, Users, Plus, X, Check, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatTimestamp } from "@/lib/dates";
import {
  getProjectMeetings,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  respondToMeeting,
} from "@/actions/meetingActions";

/**
 * Requirement #5 — Workspace → Meetings.
 *
 * Every read and write goes through the meeting server actions, which re-derive
 * project membership from the session. Nothing here is trusted as authorization:
 * a freelancer who somehow renders this with another project's id still gets an
 * empty list, because `getProjectMeetings` refuses non-parties.
 */

type Attendee = {
  status: string;
  user: { id: string; name: string | null; image: string | null };
};

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | Date;
  durationMinutes: number;
  meetingUrl: string | null;
  location: string | null;
  status: string;
  organizerUserId: string;
  organizer: { id: string; name: string | null; image: string | null };
  attendees: Attendee[];
};

interface Props {
  projectId: string;
  /** Company users may schedule and cancel; freelancers may respond to their own invite. */
  isCompany: boolean;
  currentUserId: string;
  /** Hired freelancers, offered as invitees. The server re-filters this list. */
  invitees?: { id: string; name: string | null }[];
}

/** Deterministic clock rendering — see the SSR-001 note in lib/dates. */
function formatTime(value: Date | string): string {
  const d = new Date(value);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix} UTC`;
}

function statusBadge(status: string) {
  if (status === "CANCELLED") return <Badge variant="danger">Cancelled</Badge>;
  if (status === "COMPLETED") return <Badge variant="neutral">Completed</Badge>;
  return <Badge variant="success">Scheduled</Badge>;
}

function attendeeBadge(status: string) {
  if (status === "ACCEPTED") return <Badge variant="success" className="text-[11px]">Accepted</Badge>;
  if (status === "DECLINED") return <Badge variant="danger" className="text-[11px]">Declined</Badge>;
  return <Badge variant="neutral" className="text-[11px]">Invited</Badge>;
}

export function WorkspaceMeetings({ projectId, isCompany, currentUserId, invitees = [] }: Props) {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [past, setPast] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getProjectMeetings(projectId);
    if (!res.success) {
      setError(res.error ?? "You do not have access to these meetings.");
      setUpcoming([]);
      setPast([]);
    } else {
      setError(null);
      setUpcoming(res.upcoming as unknown as Meeting[]);
      setPast(res.past as unknown as Meeting[]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
    setDuration(30);
    setMeetingUrl("");
    setLocation("");
    setSelected([]);
  };

  const handleCreate = async () => {
    if (!title.trim() || !date || !time) {
      setError("A title, date and time are required.");
      return;
    }
    setBusyId("new");
    const res = await createMeeting({
      projectId,
      title,
      description,
      // Interpreted as UTC so the stored instant does not depend on the browser.
      startsAt: `${date}T${time}:00.000Z`,
      durationMinutes: Number(duration) || 30,
      meetingUrl: meetingUrl || undefined,
      location: location || undefined,
      attendeeUserIds: selected,
    });
    setBusyId(null);
    if (!res.success) {
      setError(res.error ?? "Could not schedule the meeting.");
      return;
    }
    resetForm();
    setShowForm(false);
    await load();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this meeting? Attendees will be notified.")) return;
    setBusyId(id);
    const res = await cancelMeeting(id);
    setBusyId(null);
    if (!res.success) setError(res.error ?? "Could not cancel the meeting.");
    await load();
  };

  const handleComplete = async (id: string) => {
    setBusyId(id);
    await updateMeeting(id, { status: "COMPLETED" as never });
    setBusyId(null);
    await load();
  };

  const handleRespond = async (id: string, status: "ACCEPTED" | "DECLINED") => {
    setBusyId(id);
    const res = await respondToMeeting(id, status as never);
    setBusyId(null);
    if (!res.success) setError(res.error ?? "Could not record your response.");
    await load();
  };

  const renderMeeting = (m: Meeting, isPast: boolean) => {
    const mine = m.attendees.find((a) => a.user.id === currentUserId);
    return (
      <Card key={m.id} className="border border-[#E3E5EA] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-[#1A1D29]">{m.title}</h4>
              {statusBadge(m.status)}
            </div>
            <p className="mt-1 text-[11px] font-medium text-[#5B6272]">
              {formatTimestamp(m.startsAt)} · {formatTime(m.startsAt)} · {m.durationMinutes} min
            </p>
            <p className="mt-0.5 text-[11px] text-[#5B6272]">
              Organised by {m.organizer.name ?? "the company"}
            </p>
          </div>

          {isCompany && !isPast && m.status === "SCHEDULED" && (
            <div className="flex shrink-0 gap-1.5">
              <Button
                size="xs"
                variant="outline"
                disabled={busyId !== null}
                onClick={() => handleComplete(m.id)}
                className="h-7 cursor-pointer px-2.5 text-[11px] font-bold"
              >
                Mark done
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={busyId !== null}
                onClick={() => handleCancel(m.id)}
                className="h-7 cursor-pointer border-[#BC2A2A]/30 px-2.5 text-[11px] font-bold text-[#BC2A2A]"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {m.description && (
          <p className="mt-2 text-xs leading-relaxed text-[#5B6272]">{m.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[#5B6272]">
          {m.meetingUrl && (
            <a
              href={m.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#2159C9] hover:underline"
            >
              <Link2 className="h-3 w-3" /> Join link
            </a>
          )}
          {m.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {m.location}
            </span>
          )}
          {!m.meetingUrl && !m.location && <span>No link or location set</span>}
        </div>

        <div className="mt-3 border-t border-[#E3E5EA] pt-3">
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#5B6272]">
            <Users className="h-3 w-3" /> Attendees ({m.attendees.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {m.attendees.map((a) => (
              <span
                key={a.user.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E5EA] bg-[#F8F9FB] px-2 py-0.5 text-[11px] text-[#1A1D29]"
              >
                {a.user.name ?? "Member"}
                {attendeeBadge(a.status)}
              </span>
            ))}
          </div>
        </div>

        {/* A freelancer responds to their own invitation only. */}
        {!isCompany && !isPast && mine && m.status === "SCHEDULED" && (
          <div className="mt-3 flex gap-1.5">
            <Button
              size="xs"
              variant="outline"
              disabled={busyId !== null || mine.status === "ACCEPTED"}
              onClick={() => handleRespond(m.id, "ACCEPTED")}
              className="h-7 cursor-pointer px-2.5 text-[11px] font-bold"
            >
              <Check className="mr-1 h-3 w-3" /> Accept
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={busyId !== null || mine.status === "DECLINED"}
              onClick={() => handleRespond(m.id, "DECLINED")}
              className="h-7 cursor-pointer px-2.5 text-[11px] font-bold"
            >
              <X className="mr-1 h-3 w-3" /> Decline
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1A1D29]">
            <CalendarClock className="h-4 w-4" /> Meetings
          </h2>
          <p className="mt-0.5 text-xs text-[#5B6272]">
            Calls and sessions for this project. Attendees are notified through your
            existing notifications.
          </p>
        </div>
        {isCompany && (
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="cursor-pointer text-xs font-bold"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> {showForm ? "Close" : "Schedule meeting"}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[#BC2A2A]/30 bg-[#FDF2F2] px-3 py-2 text-xs font-medium text-[#BC2A2A]">
          {error}
        </div>
      )}

      {isCompany && showForm && (
        <Card className="space-y-3 border border-[#E3E5EA] bg-[#F8F9FB]/50 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title"
            className="w-full rounded-lg border border-[#E3E5EA] bg-white px-3 py-2 text-xs text-[#1A1D29] placeholder:text-[#8A90A0]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Agenda (optional)"
            rows={2}
            className="w-full rounded-lg border border-[#E3E5EA] bg-white px-3 py-2 text-xs text-[#1A1D29] placeholder:text-[#8A90A0]"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-[#E3E5EA] bg-white px-3 py-2 text-xs text-[#1A1D29]"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border border-[#E3E5EA] bg-white px-3 py-2 text-xs text-[#1A1D29]"
            />
            <input
              type="number"
              min={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              placeholder="Minutes"
              className="rounded-lg border border-[#E3E5EA] bg-white px-3 py-2 text-xs text-[#1A1D29]"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="Meeting link (optional)"
              className="rounded-lg border border-[#E3E5EA] bg-white px-3 py-2 text-xs text-[#1A1D29] placeholder:text-[#8A90A0]"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="rounded-lg border border-[#E3E5EA] bg-white px-3 py-2 text-xs text-[#1A1D29] placeholder:text-[#8A90A0]"
            />
          </div>

          {invitees.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5B6272]">
                Invite hired freelancers
              </p>
              <div className="flex flex-wrap gap-1.5">
                {invitees.map((f) => {
                  const on = selected.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setSelected((prev) =>
                          on ? prev.filter((x) => x !== f.id) : [...prev, f.id]
                        )
                      }
                      className={
                        "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold " +
                        (on
                          ? "border-[#152C55] bg-[#152C55] text-white"
                          : "border-[#E3E5EA] bg-white text-[#1A1D29]")
                      }
                    >
                      {f.name ?? "Freelancer"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            size="sm"
            disabled={busyId === "new"}
            onClick={handleCreate}
            className="cursor-pointer text-xs font-bold"
          >
            {busyId === "new" ? "Scheduling..." : "Schedule meeting"}
          </Button>
        </Card>
      )}

      <section className="space-y-3">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5B6272]">
          <Clock className="h-3.5 w-3.5" /> Upcoming ({upcoming.length})
        </h3>
        {loading ? (
          <p className="text-xs text-[#5B6272]">Loading meetings...</p>
        ) : upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#E3E5EA] px-4 py-6 text-center text-xs text-[#5B6272]">
            No upcoming meetings.
          </p>
        ) : (
          upcoming.map((m) => renderMeeting(m, false))
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B6272]">
          Past ({past.length})
        </h3>
        {!loading && past.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#E3E5EA] px-4 py-6 text-center text-xs text-[#5B6272]">
            No past meetings yet.
          </p>
        ) : (
          past.map((m) => renderMeeting(m, true))
        )}
      </section>
    </div>
  );
}
