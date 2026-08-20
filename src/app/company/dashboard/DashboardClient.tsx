"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, Building2, ClipboardList, FileText, Plus, Sparkles, TrendingUp, UserCheck, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, MatchScore, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { KpiTile } from "@/components/ui/Table";
import { Alert, EmptyState, Progress, Rating } from "@/components/ui/Feedback";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import { CompanyOnboardingWizard } from "@/components/company/OnboardingWizard";
import { useSession } from "@/lib/session";
import type { FinancialSummary } from "@/lib/domain";
import type {
  Application,
  Company,
  Freelancer,
  Project,
  WorkspaceSummary,
} from "@/lib/types";

import { formatMoney, pluralize, relativeTime } from "@/lib/utils";

export interface CompanyDashboardData {
  stats: {
    activeProjects: number;
    totalProjects: number;
    applicants: number;
    totalApplicants: number;
    hires: number;
    shortlisted: number;
    spend: number;
    drafts: number;
  };
  projects: Project[];
  active: Project[];
  drafts: Project[];
  applications: Application[];
  pending: Application[];
  workspaces: WorkspaceSummary[];
  recommended: Freelancer[];
  recommendedFor?: Project;
  readyToComplete: Project[];
  summaries: Record<string, FinancialSummary>;
  readiness: Record<string, { ready: boolean; reason?: string }>;
}

export function DashboardClient({
  company,
  data,
}: {
  company: Company;
  data: CompanyDashboardData;
}) {
  const { session } = useSession();
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => session?.onboardingComplete === false,
  );



  return (
    <div>
      <PageHeader
        title={`${company.companyName} dashboard`}
        description={
          data.stats.applicants > 0
            ? `${data.stats.applicants} applicants are waiting on a first review across ${data.active.length} active projects.`
            : "Everything is reviewed. Here is where your engagements stand."
        }
        action={
          <>
            <Button href="/company/applicants" variant="secondary">
              Review applicants
            </Button>
            <Button href="/company/projects/new" leftIcon={<Plus className="h-4 w-4" />}>
              Post new project
            </Button>
          </>
        }
      />

      {session?.onboardingComplete === false && (
        <Alert
          tone="info"
          className="mb-5"
          title="Finish setting up your company profile"
          action={
            <Button size="sm" onClick={() => setOnboardingOpen(true)}>
              Continue setup
            </Button>
          }
        >
          Companies with a complete profile receive roughly twice as many applications per listing.
        </Alert>
      )}

      {/* ---- KPIs ---- */}
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <KpiTile
            label="Active projects"
            value={data.stats.activeProjects}
            icon={<Briefcase />}
            tone="brand"
            deltaLabel={`${data.stats.totalProjects} total · ${data.stats.drafts} ${pluralize(data.stats.drafts, "draft")}`}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            label="Awaiting review"
            value={data.stats.applicants}
            icon={<ClipboardList />}
            tone="warning"
            deltaLabel={`${data.stats.totalApplicants} applications all time`}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            label="Hired"
            value={data.stats.hires}
            icon={<UserCheck />}
            tone="info"
            deltaLabel={`${data.stats.shortlisted} shortlisted`}
          />
        </StaggerItem>
        <StaggerItem>
          <KpiTile
            label="Released to date"
            value={formatMoney(data.stats.spend, "USD", true)}
            icon={<Wallet />}
            tone="brand"
            deltaLabel="across all engagements"
          />
        </StaggerItem>
      </Stagger>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ---- Drafts ---- */}
          {data.drafts.length > 0 && (
            <Reveal>
              <Card padding="md" className="border-dashed">
                <CardHeader
                  title="Unfinished drafts"
                  description="Autosaved as you went. Publish when the required fields are filled in."
                  icon={<FileText />}
                  divided={false}
                  className="mb-3.5"
                />
                <ul className="flex flex-col gap-2">
                  {data.drafts.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/company/projects/edit/${d.id}`}
                        className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-softer)]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)]">
                          <FileText className="h-4 w-4 text-[var(--color-text-muted)]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-[var(--color-text-primary)]">
                            {d.title || "Untitled draft"}
                          </span>
                          <span className="block text-[11.5px] text-[var(--color-text-muted)]">
                            Last saved {relativeTime(d.updatedAt)}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          )}

          {/* ---- Active projects ---- */}
          <Card padding="md">
            <CardHeader
              title="Active projects"
              icon={<Briefcase />}
              action={
                <Button href="/company/projects" variant="link" size="sm">
                  All projects
                </Button>
              }
            />
            {data.active.length === 0 ? (
              <EmptyState
                compact
                icon={<Briefcase />}
                title="No projects yet — post your first project to start receiving applications."
                description="The wizard takes five steps and autosaves as a draft, so you can stop halfway."
                action={{ label: "Post New Project", href: "/company/projects/new" }}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.active.map((p) => {
                  const summary = data.summaries[p.id];
                  const applicants = data.applications.filter((a) => a.projectId === p.id);
                  const readiness = data.readiness[p.id] ?? { ready: false };
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/company/projects/${p.id}`}
                        className="block rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-hover)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                              {p.title}
                            </h3>
                            <p className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">
                              {p.compensation.type} ·{" "}
                              {formatMoney(p.compensation.totalBudget, p.compensation.currency)} ·{" "}
                              {p.hiredCount} of {p.freelancersLimit} hired
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {readiness.ready && (
                              <Badge tone="brand" size="sm">
                                Ready to complete
                              </Badge>
                            )}
                            <StatusIndicator status={p.status} kind="project" size="sm" />
                          </div>
                        </div>

                        <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-[11px] text-[var(--color-text-muted)]">Applicants</p>
                            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                              {applicants.length}
                              {applicants.filter((a) => a.status === "PENDING").length > 0 && (
                                <span className="ml-1.5 text-[11.5px] font-medium text-[var(--color-warning-fg)]">
                                  {applicants.filter((a) => a.status === "PENDING").length} new
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-[var(--color-text-muted)]">Released</p>
                            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                              {formatMoney(summary.released, summary.currency, true)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-[var(--color-text-muted)]">Committed</p>
                            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                              {formatMoney(summary.committed, summary.currency, true)}
                            </p>
                          </div>
                        </div>

                        {p.compensation.type !== "UNPAID" && (
                          <Progress className="mt-3" value={summary.progress} size="sm" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* ---- Recent applicants ---- */}
          <Card padding="md">
            <CardHeader
              title="Recent applicants"
              description="Sorted by AI match score. The score breaks into five weighted signals on each applicant."
              icon={<ClipboardList />}
              action={
                <Button href="/company/applicants" variant="link" size="sm">
                  Review all
                </Button>
              }
            />
            {data.applications.length === 0 ? (
              <EmptyState
                compact
                icon={<ClipboardList />}
                title="No applications yet"
                description="Applications appear here as soon as your listings go live."
              />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {data.applications.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/company/applicants/${a.id}`}
                      className="flex items-center gap-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5 transition-colors hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-hover)]"
                    >
                      <Avatar
                        src={a.freelancer.avatarUrl}
                        name={a.freelancer.name}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                            {a.freelancer.name}
                          </p>
                          <StatusIndicator status={a.status} kind="application" size="sm" />
                          {a.isApprentice && (
                            <Badge tone="info" size="sm">
                              Apprentice
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-secondary)]">
                          {a.project.title}
                          {a.roleName ? ` · ${a.roleName}` : ""}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                          Applied {relativeTime(a.createdAt)}
                        </p>
                      </div>
                      <MatchScore score={a.aiScore} size={42} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ---- Recommended talent ---- */}
          {data.recommended.length > 0 && data.recommendedFor && (
            <Card padding="md">
              <CardHeader
                title="Recommended talent"
                description={`Top matches for "${data.recommendedFor.title}" — scored against its required skills, experience and priority.`}
                icon={<Sparkles />}
                action={
                  <Button href="/company/freelancers" variant="link" size="sm">
                    Search talent
                  </Button>
                }
              />
              <ul className="flex flex-col gap-2.5">
                {data.recommended.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
                  >
                    <Avatar
                      src={f.avatarUrl}
                      name={f.name}
                      size="md"
                      status={f.availabilityStatus}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/company/freelancers/${f.id}`}
                        className="block truncate text-[13.5px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                      >
                        {f.name}
                      </Link>
                      <p className="truncate text-[12px] text-[var(--color-text-secondary)]">
                        {f.professionalHeadline}
                      </p>
                      <Rating value={f.rating} size="sm" className="mt-1" />
                    </div>
                    {f.matchScore !== undefined && <MatchScore score={f.matchScore} size={40} />}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ================= Sidebar ================= */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <Avatar
                src={company.logoUrl}
                name={company.companyName}
                size="lg"
                rounded="md"
              />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                  {company.companyName}
                </p>
                <p className="truncate text-[12px] text-[var(--color-text-secondary)]">
                  {company.industry}
                </p>
                <Rating value={company.rating} count={company.reviewCount} size="sm" className="mt-1" />
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--color-border-subtle)] pt-4">
              {[
                ["Trust score", company.trustScore],
                ["Payment reliability", `${company.paymentReliability}%`],
                ["Time to hire", company.avgTimeToHire],
                ["Total hires", company.totalHires],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2.5">
                  <dd className="text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {value}
                  </dd>
                  <dt className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{label}</dt>
                </div>
              ))}
            </dl>

            <Button href="/company/profile" variant="secondary" block size="sm" className="mt-3">
              Edit company profile
            </Button>
          </Card>

          <Card padding="md">
            <CardHeader
              title="Pipeline"
              icon={<TrendingUp />}
              divided={false}
              className="mb-3"
            />
            {(
              [
                ["Pending", data.applications.filter((a) => a.status === "PENDING").length, "warning"],
                ["Shortlisted", data.applications.filter((a) => a.status === "SHORTLISTED").length, "info"],
                ["Hired", data.applications.filter((a) => a.status === "HIRED").length, "brand"],
                ["Closed", data.applications.filter((a) => a.status === "REJECTED").length, "neutral"],
              ] as const
            ).map(([label, count, tone]) => (
              <div key={label} className="mb-3 last:mb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] text-[var(--color-text-secondary)]">{label}</span>
                  <span className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {count}
                  </span>
                </div>
                <Progress
                  value={data.applications.length ? (count / data.applications.length) * 100 : 0}
                  size="sm"
                  tone={tone}
                  className="mt-1"
                />
              </div>
            ))}
          </Card>

          <Card padding="md">
            <CardHeader
              title="Active workspaces"
              icon={<Users />}
              divided={false}
              className="mb-3"
            />
            {data.workspaces.length === 0 ? (
              <p className="text-[12.5px] leading-[1.5] text-[var(--color-text-muted)]">
                A workspace opens as soon as you hire your first freelancer on a project.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.workspaces.map((w) => (
                  <li key={w.applicationId}>
                    <Link
                      href={w.href}
                      className="block rounded-[var(--radius-sm)] p-2 transition-colors hover:bg-[var(--color-hover)]"
                    >
                      <p className="truncate text-[12.5px] font-medium text-[var(--color-text-primary)]">
                        {w.label}
                      </p>
                      <Progress value={w.progress} size="sm" className="mt-1.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padding="md" className="bg-[var(--color-brand-ink)] text-white">
            <Building2 className="h-5 w-5 text-[var(--color-brand-bright)]" />
            <h3 className="mt-3 text-[14px] font-semibold">Hiring into roles</h3>
            <p className="mt-1.5 text-[12.5px] leading-[1.6] text-white/65">
              Define named roles with fixed slots and the platform enforces capacity for you. Add an
              apprentice slot and you can mentor someone without spending a slot on them.
            </p>
            <Button
              href="/company/projects/new"
              size="sm"
              variant="secondary"
              className="mt-3.5 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30"
            >
              Post a project
            </Button>
          </Card>
        </aside>
      </div>

      <CompanyOnboardingWizard
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        companyName={company.companyName}
      />
    </div>
  );
}
