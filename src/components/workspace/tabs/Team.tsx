"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Mail,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { Alert, EmptyState, Progress, Rating } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Application, Project, Role } from "@/lib/types";
import { getApplicationFinancials, getProjectTeam } from "@/data/queries";
import { formatMoney, relativeTime } from "@/lib/utils";

export function WorkspaceTeam({
  project,
  application,
  viewerRole,
}: {
  project: Project;
  application: Application;
  viewerRole: Role;
}) {
  const toast = useToast();
  const isCompany = viewerRole === "COMPANY";

  const team = useMemo(() => getProjectTeam(project.id), [project.id]);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Application | null>(null);
  const [handover, setHandover] = useState({ roleId: "", from: "", to: "" });

  /* A hire with committed funds or unpaid approved hours cannot be removed (§8.6). */
  const removalBlock = (app: Application) => {
    const fin = getApplicationFinancials(app.id);
    const committed = fin.items.reduce(
      (s, i) => s + Math.max(0, i.fundedAmount - i.releasedAmount),
      0,
    );
    if (committed > 0) {
      return `This freelancer still has ${formatMoney(committed, project.compensation.currency)} committed across ${fin.items.filter((i) => i.fundedAmount > i.releasedAmount).length} payment stage(s). Release or cancel those before removing them.`;
    }
    if (fin.hourlyOutstanding > 0) {
      return `This freelancer has ${formatMoney(fin.hourlyOutstanding, project.compensation.currency)} of approved but unpaid hours. Settle those before removing them.`;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Roster summary ---- */}
      <Card padding="md">
        <CardHeader
          title="Team roster"
          description={`${team.totalFilled} of ${team.totalSlots || project.freelancersLimit} primary slots filled. Apprentices occupy no slot.`}
          icon={<Users />}
          action={
            isCompany && (
              <div className="flex gap-2">
                {team.roles.some(
                  (r) =>
                    r.members.some((m) => m.isApprentice) &&
                    r.members.some((m) => !m.isApprentice),
                ) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<ArrowLeftRight className="h-3.5 w-3.5" />}
                    onClick={() => setHandoverOpen(true)}
                  >
                    Hand over a role
                  </Button>
                )}
                <Button
                  size="sm"
                  href="/company/freelancers"
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                >
                  Invite more
                </Button>
              </div>
            )
          }
        />

        {team.isTeamComplete && (
          <Alert tone="success" className="mb-4" title="Team is complete">
            Every primary slot is filled. The project has moved to in-progress automatically.
          </Alert>
        )}

        {team.roles.length === 0 && team.unassigned.length === 0 && (
          <EmptyState
            compact
            icon={<Users />}
            title="Nobody hired yet"
            description="Hired freelancers appear here with their role, slot and confirmation state."
          />
        )}

        {/* Roles */}
        <div className="flex flex-col gap-4">
          {team.roles.map(({ role, members }) => {
            const primaries = members.filter((m) => !m.isApprentice);
            const apprentices = members.filter((m) => m.isApprentice);
            const open = role.slots - primaries.length;

            return (
              <section
                key={role.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                      {role.name}
                    </h3>
                    {role.description && (
                      <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {role.allowApprentice && (
                      <Badge tone="info" size="sm" icon={<GraduationCap />}>
                        Apprentice allowed
                      </Badge>
                    )}
                    <Badge tone={open > 0 ? "success" : "neutral"} size="sm">
                      {primaries.length} of {role.slots} filled
                    </Badge>
                  </div>
                </div>

                <Progress
                  className="mt-3"
                  value={primaries.length}
                  max={role.slots}
                  size="sm"
                  tone={open > 0 ? "brand" : "neutral"}
                />

                {members.length > 0 && (
                  <ul className="mt-3.5 flex flex-col gap-2.5">
                    {[...primaries, ...apprentices].map((member) => {
                      const fin = getApplicationFinancials(member.id);
                      const blocked = removalBlock(member);
                      return (
                        <li
                          key={member.id}
                          className="flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-3"
                        >
                          <Avatar
                            src={member.freelancer.avatarUrl}
                            name={member.freelancer.name}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/freelancers/${member.freelancer.id}`}
                                className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                              >
                                {member.freelancer.name}
                              </Link>
                              {member.id === application.id && (
                                <span className="text-[12px] text-[var(--color-brand-active)]">
                                  (you)
                                </span>
                              )}
                              {member.isApprentice ? (
                                <Badge tone="info" size="sm" icon={<GraduationCap />}>
                                  Apprentice
                                </Badge>
                              ) : (
                                <Badge tone="brand" size="sm">
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-secondary)]">
                              {member.freelancer.professionalHeadline}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--color-text-muted)]">
                              <Rating value={member.freelancer.rating} size="sm" />
                              {member.teamConfirmedAt ? (
                                <span className="inline-flex items-center gap-1 text-[var(--color-success-fg)]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Confirmed {relativeTime(member.teamConfirmedAt)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[var(--color-warning-fg)]">
                                  <Clock className="h-3 w-3" />
                                  Awaiting confirmation
                                </span>
                              )}
                              {isCompany && fin.totalReleased > 0 && (
                                <span>
                                  {formatMoney(
                                    fin.totalReleased,
                                    project.compensation.currency,
                                  )}{" "}
                                  released
                                </span>
                              )}
                            </div>
                          </div>

                          {isCompany && (
                            <div className="flex shrink-0 gap-1.5">
                              <Button
                                size="xs"
                                variant="ghost"
                                aria-label="Message"
                                title="Message"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                aria-label="Remove from project"
                                title={blocked ?? "Remove from project"}
                                onClick={() => setRemoveTarget(member)}
                                className="text-[var(--color-error-fg)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {open > 0 && (
                  <div className="mt-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-emphasis)] p-3 text-center">
                    <p className="text-[12.5px] text-[var(--color-text-muted)]">
                      {open} {open === 1 ? "slot" : "slots"} still open on this role
                    </p>
                  </div>
                )}
              </section>
            );
          })}

          {/* Unassigned hires */}
          {team.unassigned.length > 0 && (
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
              <h3 className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                Contributors
              </h3>
              <p className="mt-1 text-[12.5px] text-[var(--color-text-secondary)]">
                Hired without a named role — capped by the project limit of{" "}
                {project.freelancersLimit}.
              </p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {team.unassigned.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-3"
                  >
                    <Avatar
                      src={member.freelancer.avatarUrl}
                      name={member.freelancer.name}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/freelancers/${member.freelancer.id}`}
                        className="block truncate text-[13.5px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                      >
                        {member.freelancer.name}
                        {member.id === application.id && (
                          <span className="text-[var(--color-brand-active)]"> (you)</span>
                        )}
                      </Link>
                      <p className="truncate text-[12px] text-[var(--color-text-secondary)]">
                        {member.freelancer.professionalHeadline}
                      </p>
                    </div>
                    {member.teamConfirmedAt && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-brand)]" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Card>

      {/* ---- Apprentice explainer ---- */}
      {team.roles.some((r) => r.role.allowApprentice) && (
        <Card padding="md">
          <CardHeader
            title="How apprentices work here"
            icon={<GraduationCap />}
            divided={false}
            className="mb-3"
          />
          <ul className="flex flex-col gap-2.5">
            {[
              "An apprentice shadows a named role but occupies none of its slots, so they can be hired even when the role is full.",
              "Apprentice reviews accumulate into a separate score and never move the primary rating.",
              "A handover swaps the primary and the apprentice on a role — nobody is removed and the slot count never changes.",
              "Apprentices receive their own certificate at completion, marked as an apprentice contribution.",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
                <span className="text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---- Handover modal ---- */}
      <Modal
        open={handoverOpen}
        onClose={() => setHandoverOpen(false)}
        title="Hand over a role"
        description="Swaps the primary and an apprentice on the same role. The slot count is unchanged and nobody leaves the project."
        footer={
          <>
            <Button variant="secondary" onClick={() => setHandoverOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!handover.roleId || !handover.from || !handover.to}
              onClick={() => {
                setHandoverOpen(false);
                toast.success(
                  "Role handed over",
                  "Both parties have been notified and a pipeline event was added to each application.",
                );
              }}
            >
              Confirm handover
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Role" required>
            <Select
              value={handover.roleId}
              onChange={(e) =>
                setHandover({ roleId: e.target.value, from: "", to: "" })
              }
            >
              <option value="">Select a role…</option>
              {team.roles
                .filter(
                  (r) =>
                    r.members.some((m) => m.isApprentice) &&
                    r.members.some((m) => !m.isApprentice),
                )
                .map((r) => (
                  <option key={r.role.id} value={r.role.id}>
                    {r.role.name}
                  </option>
                ))}
            </Select>
          </Field>

          {handover.roleId && (
            <>
              <Field label="Outgoing primary" required>
                <Select
                  value={handover.from}
                  onChange={(e) => setHandover((h) => ({ ...h, from: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {team.roles
                    .find((r) => r.role.id === handover.roleId)
                    ?.members.filter((m) => !m.isApprentice)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.freelancer.name}
                      </option>
                    ))}
                </Select>
              </Field>

              <Field
                label="Incoming apprentice"
                required
                help="They become the primary; the outgoing person becomes the apprentice."
              >
                <Select
                  value={handover.to}
                  onChange={(e) => setHandover((h) => ({ ...h, to: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {team.roles
                    .find((r) => r.role.id === handover.roleId)
                    ?.members.filter((m) => m.isApprentice)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.freelancer.name}
                      </option>
                    ))}
                </Select>
              </Field>
            </>
          )}
        </div>
      </Modal>

      {/* ---- Remove confirmation ---- */}
      <Modal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title={`Remove ${removeTarget?.freelancer.name} from this project?`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Keep them
            </Button>
            <Button
              variant="danger"
              disabled={Boolean(removeTarget && removalBlock(removeTarget))}
              onClick={() => {
                setRemoveTarget(null);
                toast.toast({
                  title: "Freelancer removed",
                  description: "Their slot has been freed and they have been notified.",
                  tone: "info",
                });
              }}
            >
              Remove from project
            </Button>
          </>
        }
      >
        {removeTarget && removalBlock(removeTarget) ? (
          <Alert tone="error" title="Cannot remove yet">
            {removalBlock(removeTarget)}
          </Alert>
        ) : (
          <p className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">
            This frees their role slot and closes their application. Their history, messages and
            any released payments stay on the record.
          </p>
        )}
      </Modal>
    </div>
  );
}
