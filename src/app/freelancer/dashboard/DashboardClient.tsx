"use client";

import Link from "next/link";
import { ArrowRight, Award, Briefcase, CalendarClock, ClipboardList, Mail, Sparkles, Star, TrendingUp, Trophy, Wallet, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/Table";
import { EmptyState, Progress, Rating } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { ApplicationCard, ProjectCard } from "@/components/shared/Cards";
import { respondToInvite } from "@/actions/inviteActions";
import type { ApplicationFinancials } from "@/lib/domain";
import type {
  Application,
  Certificate,
  Freelancer,
  Project,
  WorkspaceSummary,
} from "@/lib/types";
import { formatMoney, relativeTime } from "@/lib/utils";

export interface DashboardData {
  stats: {
    applications: number;
    pending: number;
    shortlisted: number;
    activeProjects: number;
    earnings: number;
    rating: number;
    completed: number;
    certificates: number;
  };
  apps: Application[];
  active: Application[];
  needsAction: Application[];
  recommended: Project[];
  workspaces: WorkspaceSummary[];
  certificates: Certificate[];
  board: Freelancer[];
  financials: Record<string, ApplicationFinancials>;
}

export function DashboardClient({
  freelancer,
  data,
}: {
  freelancer: Freelancer;
  data: DashboardData;
}) {
  const toast = useToast();
  const [dismissedInvites, setDismissedInvites] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const firstName = freelancer.name.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={
          data.needsAction.length > 0
            ? `You have ${data.needsAction.length} ${data.needsAction.length === 1 ? "item" : "items"} waiting on you — offers, interviews or a team placement to confirm.`
            : "Nothing is blocked on you. Here is where your engagements stand."
        }
        action={
          <>
            <Button href="/freelancer/projects" variant="secondary">
              Browse projects
            </Button>
            <Button href="/freelancer/profile">Edit profile</Button>
          </>
        }
      />

      {/* ---- KPI tiles ---- */}
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <KpiTile
            label="Applications"
            value={data.stats.applications}
            icon={<ClipboardList />}
            tone="info"
            deltaLabel={`${data.stats.pending} pending · ${data.stats.shortlisted} shortlisted`}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            label="Active engagements"
            value={data.stats.activeProjects}
            icon={<Briefcase />}
            tone="brand"
            deltaLabel={`${data.stats.completed} completed to date`}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            label="Released to you"
            value={formatMoney(data.stats.earnings, freelancer.currency, true)}
            icon={<Wallet />}
            tone="brand"
            deltaLabel="across all engagements"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            label="Your rating"
            value={data.stats.rating.toFixed(1)}
            icon={<Star />}
            tone="warning"
            deltaLabel={`${freelancer.reviewCount} reviews · ${data.stats.certificates} certificates`}
          />
        </StaggerItem>
      </Stagger>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ================= Main column ================= */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* ---- Needs your attention ---- */}
          {data.needsAction.length > 0 && (
            <Reveal>
              <Card padding="md" className="border-[var(--color-brand-border)] bg-[var(--color-brand-softer)]">
                <CardHeader
                  title="Waiting on you"
                  description="These will not move forward until you respond."
                  icon={<Sparkles />}
                  divided={false}
                  className="mb-4"
                />
                <ul className="flex flex-col gap-2.5">
                  {data.needsAction.map((a) => {
                    const reason =
                      a.status === "HIRED" && !a.teamConfirmedAt
                        ? "Confirm your place on the team"
                        : a.offer?.status === "PENDING"
                          ? `Offer of ${formatMoney(a.offer.amount, a.offer.currency)} — respond or counter`
                          : "Interview scheduled — confirm attendance";
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/freelancer/applications/${a.id}`}
                          className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-colors hover:border-[var(--color-brand)]"
                        >
                          <Avatar
                            src={a.project.company.logoUrl}
                            name={a.project.company.companyName}
                            size="sm"
                            rounded="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                              {a.project.title}
                            </p>
                            <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-brand-active)]">
                              {reason}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </Reveal>
          )}

          {/* ---- Active workspaces ---- */}
          <Card padding="md">
            <CardHeader
              title="Active workspaces"
              description="Every engagement you have been hired onto and that is still running."
              icon={<Briefcase />}
              action={
                data.workspaces.length > 0 && (
                  <Button href="/freelancer/workspace" variant="link" size="sm">
                    View all
                  </Button>
                )
              }
            />
            {data.workspaces.length === 0 ? (
              <EmptyState
                compact
                icon={<Briefcase />}
                title="No active engagements yet"
                description="Once a company hires you, a workspace opens here with tasks, chat, payments and deliverables."
                action={{ label: "Browse open projects", href: "/freelancer/projects" }}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.workspaces.map((w) => {
                  const app = data.active.find((a) => a.id === w.applicationId);
                  const fin = app ? data.financials[app.id] ?? null : null;
                  return (
                    <li key={w.applicationId}>
                      <Link
                        href={w.href}
                        className="block rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-hover)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <Avatar name={w.company} src={w.companyLogo} size="md" rounded="md" />
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                                {w.label}
                              </p>
                              <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-text-secondary)]">
                                {w.company}
                                {app?.roleName ? ` · ${app.roleName}` : ""}
                                {app?.isApprentice ? " (Apprentice)" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {w.unread > 0 && (
                              <Badge tone="brand" size="sm">
                                {w.unread} new
                              </Badge>
                            )}
                            <StatusIndicator status={w.status} kind="project" size="sm" />
                          </div>
                        </div>

                        <div className="mt-3.5 flex flex-wrap items-end justify-between gap-4">
                          <div className="min-w-[180px] flex-1">
                            <Progress
                              value={w.progress}
                              label="Payment progress"
                              size="sm"
                            />
                          </div>
                          {fin && fin.totalReleased > 0 && (
                            <p className="text-[13px] text-[var(--color-text-secondary)]">
                              <span className="font-semibold text-[var(--color-text-primary)]">
                                {formatMoney(
                                  fin.totalReleased,
                                  app?.project.compensation.currency ?? "USD",
                                )}
                              </span>{" "}
                              released
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* ---- Invitations ---- */}
          {freelancer.invites.filter(
            (i) => i.status === "PENDING" && !dismissedInvites.includes(i.projectId),
          ).length > 0 && (
            <Card padding="md">
              <CardHeader
                title="Invitations to apply"
                description="Companies that reached out to you directly."
                icon={<Mail />}
              />
              <ul className="flex flex-col gap-3">
                {freelancer.invites
                  .filter((i) => i.status === "PENDING" && !dismissedInvites.includes(i.projectId))
                  .map((invite) => (
                    <li
                      key={invite.projectId}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={invite.companyName} src={invite.companyLogo} size="md" rounded="md" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                            {invite.projectTitle}
                          </p>
                          <p className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">
                            {invite.companyName}
                            {invite.roleName ? ` · ${invite.roleName}` : ""}
                            {invite.isApprentice ? " (Apprentice)" : ""}
                          </p>
                          {invite.message && (
                            <p className="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2.5 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                              “{invite.message}”
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              href={`/freelancer/projects/${invite.projectId}/apply`}
                              size="sm"
                            >
                              Apply now
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<X className="h-3.5 w-3.5" />}
                              onClick={() => {
                                setDismissedInvites((p) => [...p, invite.projectId]);
                                startTransition(async () => {
                                  const result = await respondToInvite(invite.projectId, "DISMISS");
                                  if (result.success) {
                                    toast.toast({
                                      title: "Invitation dismissed",
                                      description: `${invite.companyName} has been notified.`,
                                      tone: "success",
                                    });
                                    return;
                                  }
                                  setDismissedInvites((p) =>
                                    p.filter((id) => id !== invite.projectId),
                                  );
                                  toast.toast({
                                    title: result.error ?? "Could not dismiss the invitation",
                                    tone: "error",
                                  });
                                });
                              }}
                            >
                              Not interested
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          {/* ---- Recent applications ---- */}
          <Card padding="md">
            <CardHeader
              title="Recent applications"
              icon={<ClipboardList />}
              action={
                <Button href="/freelancer/applications" variant="link" size="sm">
                  Track all
                </Button>
              }
            />
            {data.apps.length === 0 ? (
              <EmptyState
                compact
                icon={<ClipboardList />}
                title="No applications yet"
                description="Find an engagement that fits and apply — it takes three steps."
                action={{ label: "Browse projects", href: "/freelancer/projects" }}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {data.apps.slice(0, 4).map((a) => (
                  <ApplicationCard key={a.id} application={a} />
                ))}
              </div>
            )}
          </Card>

          {/* ---- Recommended ---- */}
          <Card padding="md">
            <CardHeader
              title="Recommended for you"
              description="Ranked by your match score — skills, experience, rating and completion rate."
              icon={<Sparkles />}
              action={
                <Button href="/freelancer/projects" variant="link" size="sm">
                  See all
                </Button>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {data.recommended.map((p) => (
                <ProjectCard key={p.id} project={p} href={`/freelancer/projects/${p.id}`} />
              ))}
            </div>
          </Card>
        </div>

        {/* ================= Sidebar ================= */}
        <aside className="flex min-w-0 flex-col gap-4">
          {/* Profile strength */}
          <Card padding="md">
            <div className="flex items-center gap-3">
              <Avatar
                src={freelancer.avatarUrl}
                name={freelancer.name}
                size="lg"
                status={freelancer.availabilityStatus}
              />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                  {freelancer.name}
                </p>
                <p className="truncate text-[12px] text-[var(--color-text-secondary)]">
                  {freelancer.domain}
                </p>
                <Rating value={freelancer.rating} size="sm" className="mt-1" />
              </div>
            </div>

            <Progress
              className="mt-4"
              value={92}
              label="Profile strength"
              size="sm"
            />
            <p className="mt-2 text-[12px] leading-[1.5] text-[var(--color-text-muted)]">
              Add two more portfolio items to reach 100% and rank higher in company searches.
            </p>
            <Button href="/freelancer/profile" variant="secondary" block size="sm" className="mt-3">
              Complete profile
            </Button>
          </Card>

          {/* Certificates */}
          <Card padding="md">
            <CardHeader
              title="Your certificates"
              icon={<Award />}
              divided={false}
              className="mb-3"
              action={
                <Button href="/freelancer/certificates" variant="link" size="sm">
                  All
                </Button>
              }
            />
            {data.certificates.length === 0 ? (
              <p className="text-[12.5px] leading-[1.55] text-[var(--color-text-muted)]">
                Certificates are issued automatically when an engagement completes.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.certificates.slice(0, 3).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/verify/${c.publicId}`}
                      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] p-2 transition-colors hover:bg-[var(--color-hover)]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)]">
                        <Award className="h-4 w-4 text-[var(--color-brand-active)]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium text-[var(--color-text-primary)]">
                          {c.projectTitle}
                        </span>
                        <span className="block font-mono text-[11px] text-[var(--color-text-muted)]">
                          {c.publicId}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Upcoming */}
          <Card padding="md">
            <CardHeader
              title="Coming up"
              icon={<CalendarClock />}
              divided={false}
              className="mb-3"
            />
            {data.apps.filter((a) => a.interview?.status === "SCHEDULED").length === 0 ? (
              <p className="text-[12.5px] leading-[1.55] text-[var(--color-text-muted)]">
                No interviews or meetings scheduled.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {data.apps
                  .filter((a) => a.interview?.status === "SCHEDULED")
                  .map((a) => (
                    <li
                      key={a.id}
                      className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3"
                    >
                      <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                        {a.interview!.title}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                        {relativeTime(a.interview!.scheduledAt)} ·{" "}
                        {a.interview!.durationMinutes} min
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          {/* Leaderboard */}
          <Card padding="md">
            <CardHeader
              title="Top rated this month"
              icon={<Trophy />}
              divided={false}
              className="mb-3"
            />
            <ol className="flex flex-col gap-2.5">
              {data.board.map((f, i) => (
                <li key={f.id} className="flex items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      i === 0
                        ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)]"
                        : "bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Avatar src={f.avatarUrl} name={f.name} size="xs" />
                  <Link
                    href={`/freelancers/${f.id}`}
                    className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                  >
                    {f.name}
                  </Link>
                  <span className="flex shrink-0 items-center gap-1 text-[12px] tabular-nums text-[var(--color-text-secondary)]">
                    <Star className="h-3 w-3 fill-[var(--color-star)] text-[var(--color-star)]" />
                    {f.rating.toFixed(1)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          {/* Tip */}
          <Card padding="md" className="bg-[var(--color-brand-ink)] text-white">
            <TrendingUp className="h-5 w-5 text-[var(--color-brand-bright)]" />
            <h3 className="mt-3 text-[14px] font-semibold">Raise your match score</h3>
            <p className="mt-1.5 text-[12.5px] leading-[1.6] text-white/65">
              Skill match is half of the score. Adding the exact skill names a listing asks for
              moves it more than anything else on your profile.
            </p>
            <Button
              href="/freelancer/profile"
              size="sm"
              variant="secondary"
              className="mt-3.5 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30"
            >
              Update skills
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
