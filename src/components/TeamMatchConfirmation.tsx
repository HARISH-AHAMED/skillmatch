"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users2, X } from "lucide-react";
import { getProjectTeam, confirmTeamMatch } from "@/actions/roleActions";
import { TeamRosterPanel } from "@/components/TeamRosterPanel";

interface TeamMatchConfirmationProps {
  applicationId: string;
  projectId: string;
  projectTitle: string;
  companyName: string;
  currentFreelancerId: string;
  onClose: () => void;
}

/**
 * The team-reveal moment: a freelancer sees who else is on the project *before*
 * committing, not after. This is the step the spec identified as missing — the
 * thing that makes team-based hiring different from a generic marketplace.
 */
export function TeamMatchConfirmation({
  applicationId,
  projectId,
  projectTitle,
  companyName,
  currentFreelancerId,
  onClose,
}: TeamMatchConfirmationProps) {
  const router = useRouter();
  const [team, setTeam] = useState<Awaited<ReturnType<typeof getProjectTeam>>>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"CONFIRM" | "DECLINE" | null>(null);
  const [error, setError] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);
  const [done, setDone] = useState<"CONFIRM" | "DECLINE" | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProjectTeam(projectId)
      .then((t) => {
        if (!cancelled) setTeam(t);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the team roster.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handle = async (decision: "CONFIRM" | "DECLINE") => {
    setSubmitting(decision);
    setError("");
    try {
      const res = await confirmTeamMatch(
        applicationId,
        decision,
        decision === "DECLINE" ? declineReason.trim() || undefined : undefined
      );
      if (res.success) {
        setDone(decision);
        router.refresh();
        setTimeout(onClose, 1800);
      } else {
        setError(res.error || "Action failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={onClose} />

      <Card className="relative w-full max-w-lg p-6 z-10 shadow-2xl space-y-4 text-left max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted hover:text-ink rounded-full hover:bg-surface-soft cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Users2 className="h-4 w-4 text-muted" />
            Meet Your Team
          </h3>
          <p className="text-xs text-muted">
            You&apos;ve been placed on <strong className="text-ink">{projectTitle}</strong> at{" "}
            {companyName}. Review who you&apos;d be working with before confirming.
          </p>
        </div>

        {done ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm font-semibold text-ink">
              {done === "CONFIRM" ? "You are on the team" : "Placement declined"}
            </p>
            <p className="text-xs text-muted leading-relaxed">
              {done === "CONFIRM"
                ? "Your place is confirmed. The project workspace is now open to you, and your teammates can see that you have joined."
                : "Your slot has been released back to the company so they can offer it to someone else. This project will no longer appear in your active applications."}
            </p>
          </div>
        ) : loading ? (
          <p className="text-xs text-muted py-8 text-center">Loading the roster…</p>
        ) : !team?.usesRoles ? (
          <p className="text-xs text-muted py-6 text-center">
            This project doesn&apos;t use team roles, so there&apos;s no roster to review.
          </p>
        ) : (
          <TeamRosterPanel
            roles={team.roles}
            totalSlots={team.totalSlots}
            totalFilled={team.totalFilled}
            isTeamComplete={team.isTeamComplete}
            viewerRole="FREELANCER"
            currentFreelancerId={currentFreelancerId}
          />
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        {done ? null : isDeclining ? (
          <div className="space-y-2.5 pt-1">
            <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
              Why are you declining? (optional)
            </label>
            <textarea
              rows={2}
              autoFocus
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Helps the company fill the slot appropriately…"
              className="w-full px-3 py-2 rounded-xl border border-hairline bg-surface-soft text-xs text-ink focus:ring-1 focus:ring-ink focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={submitting !== null}
                onClick={() => handle("DECLINE")}
                className="flex-1 cursor-pointer"
              >
                {submitting === "DECLINE" ? "Declining…" : "Confirm Decline"}
              </Button>
              <Button
                variant="outline"
                disabled={submitting !== null}
                onClick={() => setIsDeclining(false)}
                className="flex-1 cursor-pointer"
              >
                Back
              </Button>
            </div>
          </div>
        ) : (
          /* Primary action on the right, per the spec's reading-order principle. */
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              disabled={submitting !== null}
              onClick={() => setIsDeclining(true)}
              className="flex-1 cursor-pointer"
            >
              Decline
            </Button>
            <Button
              disabled={submitting !== null || loading}
              onClick={() => handle("CONFIRM")}
              className="flex-1 cursor-pointer"
            >
              {submitting === "CONFIRM" ? "Confirming…" : "Confirm & Join"}
            </Button>
          </div>
        )}

        {!done && (
          <p className="text-[10px] text-muted">
            Declining releases your slot so the company can offer it to someone else. Confirming opens
            the project workspace and lets your teammates know you have joined.
          </p>
        )}
      </Card>
    </div>
  );
}
