"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { X, Send, Briefcase } from "lucide-react";
import { inviteFreelancerToProject, getInvitableProjects } from "@/actions/inviteActions";

interface InvitableRole {
  id: string;
  name: string;
  slots: number;
  filled: number;
  allowApprentice: boolean;
}

interface InvitableProject {
  id: string;
  title: string;
  status: string;
  alreadyInvited: boolean;
  alreadyApplied: boolean;
  roles: InvitableRole[];
}

interface InviteToProjectModalProps {
  freelancerId: string;
  freelancerName: string;
  onClose: () => void;
}

export function InviteToProjectModal({
  freelancerId,
  freelancerName,
  onClose,
}: InviteToProjectModalProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<InvitableProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [roleId, setRoleId] = useState("");
  const [asApprentice, setAsApprentice] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getInvitableProjects(freelancerId)
      .then((list) => {
        if (cancelled) return;
        setProjects(list);
        // Preselect the first listing that can actually be invited to.
        const firstAvailable = list.find((p) => !p.alreadyInvited && !p.alreadyApplied);
        if (firstAvailable) setSelectedId(firstAvailable.id);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your projects.");
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [freelancerId]);

  const selected = projects.find((p) => p.id === selectedId);
  const selectedRoles = selected?.roles ?? [];
  const chosenRole = selectedRoles.find((r) => r.id === roleId);
  const roleFull = chosenRole ? chosenRole.filled >= chosenRole.slots : false;

  useEffect(() => {
    // Clear role choice whenever the project changes so a stale role is never sent.
    setRoleId("");
    setAsApprentice(false);
  }, [selectedId]);

  const handleSend = async () => {
    if (!selectedId) return;
    setSending(true);
    setError("");
    try {
      const res = await inviteFreelancerToProject(
        freelancerId,
        selectedId,
        message,
        roleId || undefined,
        asApprentice
      );
      if (res.success) {
        setSent(true);
        router.refresh();
        setTimeout(onClose, 1400);
      } else {
        setError(res.error || "Failed to send the invitation.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send the invitation.");
    } finally {
      setSending(false);
    }
  };

  const selectable = projects.filter((p) => !p.alreadyInvited && !p.alreadyApplied);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={onClose} />

      <Card className="relative w-full max-w-md p-6 z-10 shadow-2xl space-y-4 text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted hover:text-ink rounded-full hover:bg-surface-soft cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted" />
            Invite to a Project
          </h3>
          <p className="text-xs text-muted">
            Send <strong className="text-ink">{freelancerName}</strong> a direct invitation to apply
            to one of your open listings.
          </p>
        </div>

        {sent ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-sm font-semibold text-success">Invitation sent</p>
            <p className="text-xs text-muted">
              {freelancerName} has been notified and can apply from their dashboard.
            </p>
          </div>
        ) : loadingProjects ? (
          <p className="text-xs text-muted py-6 text-center">Loading your projects…</p>
        ) : projects.length === 0 ? (
          <div className="py-5 text-center space-y-2">
            <p className="text-xs text-muted">You have no open projects to invite to.</p>
            <Button size="sm" onClick={() => router.push("/company/projects/new")} className="cursor-pointer">
              Post a Project
            </Button>
          </div>
        ) : selectable.length === 0 ? (
          <p className="text-xs text-warning py-5 text-center">
            {freelancerName} has already been invited to — or applied for — all of your open
            projects.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                Select Project
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={sending}
                className="w-full h-9 px-3 rounded-xl border border-hairline bg-surface-soft text-xs text-ink focus:ring-1 focus:ring-ink focus:outline-none cursor-pointer"
              >
                {projects.map((p) => {
                  const blocked = p.alreadyInvited || p.alreadyApplied;
                  return (
                    <option key={p.id} value={p.id} disabled={blocked}>
                      {p.title} ({p.status.replace("_", " ").toLowerCase()})
                      {p.alreadyApplied ? " — already applied" : p.alreadyInvited ? " — already invited" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedRoles.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Role *
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  disabled={sending}
                  className="w-full h-9 px-3 rounded-xl border border-hairline bg-surface-soft text-xs text-ink focus:ring-1 focus:ring-ink focus:outline-none cursor-pointer"
                >
                  <option value="">Select a role…</option>
                  {selectedRoles.map((r) => {
                    const full = r.filled >= r.slots;
                    return (
                      <option key={r.id} value={r.id} disabled={full && !r.allowApprentice}>
                        {r.name} — {r.filled}/{r.slots} filled
                        {full ? (r.allowApprentice ? " (apprentice only)" : " (full)") : ""}
                      </option>
                    );
                  })}
                </select>

                {chosenRole?.allowApprentice && (
                  <label className="flex items-center gap-2 text-[11px] text-body cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={asApprentice || roleFull}
                      disabled={sending || roleFull}
                      onChange={(e) => setAsApprentice(e.target.checked)}
                      className="accent-ink cursor-pointer"
                    />
                    Invite as an apprentice (shadow this role)
                    {roleFull && <span className="text-warning">— required, all slots filled</span>}
                  </label>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                Personal Message (optional)
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                placeholder="Why you think they're a good fit for this project…"
                className="w-full px-3 py-2 rounded-xl border border-hairline bg-surface-soft text-xs text-ink focus:ring-1 focus:ring-ink focus:outline-none resize-none"
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSend}
                disabled={sending || !selectedId || (selectedRoles.length > 0 && !roleId)}
                className="flex-1 cursor-pointer gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Sending…" : "Send Invitation"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={sending} className="cursor-pointer">
                Cancel
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
