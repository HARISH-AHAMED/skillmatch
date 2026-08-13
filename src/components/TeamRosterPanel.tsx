"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users2, UserCheck, CircleDashed, GraduationCap, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { handoverRole } from "@/actions/roleActions";

interface TeamMember {
  applicationId: string;
  freelancerId: string;
  name: string | null;
  image: string | null;
  rating: number;
  completedProjects: number;
  isApprentice: boolean;
  teamConfirmedAt: Date | string | null;
  /** Apprentice-only reputation, separate from the primary rating. */
  apprenticeRating?: number;
  apprenticeReviews?: number;
}

interface TeamRole {
  id: string;
  name: string;
  description: string | null;
  slots: number;
  allowApprentice: boolean;
  filled: number;
  members: TeamMember[];
}

interface TeamRosterPanelProps {
  roles: TeamRole[];
  totalSlots: number;
  totalFilled: number;
  isTeamComplete: boolean;
  /** Freelancer viewing their own team sees confirmation status; company sees assembly. */
  viewerRole: "COMPANY" | "FREELANCER";
  /** Highlights the viewer's own card so they can locate themselves instantly. */
  currentFreelancerId?: string;
  /** Opt-in: only the workspace offers handover, so other roster views are unchanged. */
  allowHandover?: boolean;
}

/**
 * The assembled team, broken down by role slot. Shared by the company's assembly
 * view and the freelancer's Team Match reveal so both sides see the same roster.
 */
export function TeamRosterPanel({
  roles,
  totalSlots,
  totalFilled,
  isTeamComplete,
  viewerRole,
  currentFreelancerId,
  allowHandover = false,
}: TeamRosterPanelProps) {
  const router = useRouter();
  const [handingOver, setHandingOver] = React.useState<string | null>(null);

  const doHandover = async (roleId: string, fromId: string, toId: string, toName: string) => {
    if (!confirm("Hand this role over to " + toName + "? They become the active primary and the current primary steps down to apprentice.")) return;
    setHandingOver(fromId);
    try {
      const res = await handoverRole(roleId, fromId, toId);
      if (res.success) router.refresh();
      else alert(res.error || "Handover failed.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Handover failed.");
    } finally {
      setHandingOver(null);
    }
  };

  if (roles.length === 0) return null;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Users2 className="h-4 w-4 text-muted" />
            Team Roster
          </h3>
          <p className="text-[11px] text-muted mt-0.5">
            {isTeamComplete
              ? "Every role slot is filled."
              : `${totalFilled} of ${totalSlots} slots filled across ${roles.length} role${
                  roles.length === 1 ? "" : "s"
                }.`}
          </p>
        </div>
        <Badge variant={isTeamComplete ? "success" : "warning"} className="text-[10px] shrink-0">
          {totalFilled} / {totalSlots}
        </Badge>
      </div>

      {totalFilled === 0 && (
        <p className="text-[11px] text-muted bg-surface-soft border border-hairline rounded-[8px] p-3">
          No one has been hired yet. Each role below shows its open slots — the team appears here as
          people are hired and confirm their place.
        </p>
      )}

      <div className="space-y-3">
        {roles.map((role) => {
          const primaries = role.members.filter((m) => !m.isApprentice);
          const apprentices = role.members.filter((m) => m.isApprentice);
          const empty = Math.max(0, role.slots - primaries.length);

          return (
            <div key={role.id} className="p-3.5 bg-surface-soft border border-hairline rounded-[12px] space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-ink">{role.name}</span>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    primaries.length >= role.slots
                      ? "bg-success-surface text-success border-success-border/40"
                      : "bg-warning-surface text-warning border-warning-border"
                  }`}
                >
                  {primaries.length} / {role.slots} filled
                </span>
              </div>

              {role.description && (
                <p className="text-[11px] text-muted leading-relaxed">{role.description}</p>
              )}

              <div className="space-y-1.5">
                {primaries.map((m) => (
                  <MemberRow
                    key={m.applicationId}
                    member={m}
                    isSelf={m.freelancerId === currentFreelancerId}
                    viewerRole={viewerRole}
                  />
                ))}

                {apprentices.map((m) => (
                  <MemberRow
                    key={m.applicationId}
                    member={m}
                    isSelf={m.freelancerId === currentFreelancerId}
                    viewerRole={viewerRole}
                  />
                ))}

                {/* Unfilled slots are shown rather than hidden, so the gap in the
                    team is visible at a glance instead of having to be counted. */}
                {Array.from({ length: empty }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-2.5 p-2 bg-white border border-dashed border-hairline rounded-[8px]"
                  >
                    <CircleDashed className="h-4 w-4 text-border-strong shrink-0" />
                    <span className="text-[11px] text-border-strong italic">
                      Open slot — not yet filled
                    </span>
                  </div>
                ))}
              </div>

              {/* Handover: needs a primary and an apprentice on this role. The
                  server re-checks role membership, roles and permission. */}
              {allowHandover && primaries.length > 0 && apprentices.length > 0 && (
                <div className="pt-2 border-t border-hairline space-y-1.5">
                  {primaries
                    .filter((p) => viewerRole === "COMPANY" || p.freelancerId === currentFreelancerId)
                    .map((p) =>
                      apprentices.map((a) => (
                        <div key={p.applicationId + a.applicationId} className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] text-muted">
                            Hand <strong className="text-ink">{p.name || "primary"}</strong>&apos;s{" "}
                            {role.name} over to <strong className="text-ink">{a.name || "apprentice"}</strong>
                          </span>
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={handingOver !== null}
                            onClick={() => doHandover(role.id, p.applicationId, a.applicationId, a.name || "the apprentice")}
                            className="cursor-pointer gap-1 shrink-0"
                          >
                            <Repeat className="h-3 w-3" />
                            {handingOver === p.applicationId ? "Handing over..." : "Handover Role"}
                          </Button>
                        </div>
                      ))
                    )}
                </div>
              )}

              {role.allowApprentice && apprentices.length === 0 && (
                <p className="text-[10px] text-muted flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Open to an apprentice
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MemberRow({
  member,
  isSelf,
  viewerRole,
}: {
  member: TeamMember;
  isSelf: boolean;
  viewerRole: "COMPANY" | "FREELANCER";
}) {
  return (
    <div
      className={`flex items-center gap-2.5 p-2 rounded-[8px] border ${
        isSelf ? "bg-white border-ink" : "bg-white border-hairline"
      }`}
    >
      <div className="h-7 w-7 rounded-full bg-ink text-white text-[10px] font-semibold flex items-center justify-center overflow-hidden shrink-0">
        {member.image ? (
          <img src={member.image} alt={member.name || "Member"} className="h-full w-full object-cover" />
        ) : (
          (member.name || "U")[0].toUpperCase()
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/freelancers/${member.freelancerId}`}
          className="text-[11px] font-semibold text-ink hover:text-link hover:underline truncate block"
        >
          {member.name || "Freelancer"}
          {isSelf && <span className="text-[9px] text-link font-medium ml-1">(you)</span>}
        </Link>
        <span className="text-[9px] text-muted">
          ★ {member.rating.toFixed(1)} · {member.completedProjects} gigs
          {member.isApprentice && (
            <span className="text-[#E8A800] ml-1.5">
              {(member.apprenticeReviews ?? 0) > 0
                ? "· apprentice " + (member.apprenticeRating ?? 0).toFixed(1) + "★ (" + member.apprenticeReviews + ")"
                : "· apprentice: unrated"}
            </span>
          )}
        </span>
      </div>

      <Badge variant={member.isApprentice ? "warning" : "secondary"} className="text-[8px] shrink-0">
        {member.isApprentice ? "Apprentice" : "Primary"}
      </Badge>

      {/* Confirmation state matters to both sides: the company needs to know who
          has actually committed, the freelancer needs to see they aren't alone. */}
      {member.teamConfirmedAt ? (
        <span title="Confirmed their place on the team">
          <UserCheck className="h-3.5 w-3.5 text-success shrink-0" />
        </span>
      ) : (
        <span
          className="text-[8px] text-muted uppercase tracking-wider shrink-0"
          title={
            viewerRole === "COMPANY"
              ? "Hired but has not yet confirmed their place"
              : "This teammate has not confirmed yet"
          }
        >
          Pending
        </span>
      )}
    </div>
  );
}
