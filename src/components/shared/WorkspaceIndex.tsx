"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, LayoutGrid, MessageSquare } from "lucide-react";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Badge, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { EmptyState, Progress } from "@/components/ui/Feedback";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { useSession } from "@/lib/session";
import {
  MESSAGES,
  TASKS,
  getApplication,
  getProject,
  getProjectFinancialSummary,
  hiredApplications,
  workspacesForUser,
} from "@/data/queries";
import { formatMoney } from "@/lib/utils";

export function WorkspaceIndex() {
  const { session } = useSession();
  if (!session) return null;

  const workspaces = workspacesForUser(session.userId, session.role);
  const isCompany = session.role === "COMPANY";

  return (
    <div>
      <PageHeader
        title="Project workspaces"
        description={
          isCompany
            ? "One workspace per project with at least one hire. Everything about the engagement lives here — funding, tasks, deliverables, chat, meetings and the team."
            : "Every engagement you have been hired onto and that is still running."
        }
        action={
          isCompany ? (
            <Button href="/company/projects">All projects</Button>
          ) : (
            <Button href="/freelancer/projects" variant="secondary">
              Find more work
            </Button>
          )
        }
      />

      {workspaces.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid />}
          title="No active workspaces"
          description={
            isCompany
              ? "A workspace opens automatically as soon as you hire your first freelancer on a project."
              : "Once a company hires you, a workspace opens here with everything you need to deliver."
          }
          action={
            isCompany
              ? { label: "Review applicants", href: "/company/applicants" }
              : { label: "Browse open projects", href: "/freelancer/projects" }
          }
        />
      ) : (
        <Stagger className="grid gap-4 lg:grid-cols-2">
          {workspaces.map((w) => {
            const project = getProject(w.projectId);
            const application = getApplication(w.applicationId);
            const summary = getProjectFinancialSummary(w.projectId);
            const team = hiredApplications(w.projectId);
            const tasks = TASKS.filter((t) => t.projectId === w.projectId);
            const openTasks = tasks.filter((t) => t.status !== "DONE").length;
            const unread = MESSAGES.filter(
              (m) => m.projectId === w.projectId && !m.seen,
            ).length;

            if (!project || !application) return null;

            return (
              <StaggerItem key={w.applicationId}>
                <Card padding="none" className="overflow-hidden">
                  <div className="flex items-start gap-3.5 border-b border-[var(--color-border-subtle)] p-4">
                    <Avatar
                      name={project.company.companyName}
                      src={project.company.logoUrl}
                      size="lg"
                      rounded="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <Link
                          href={w.href}
                          className="min-w-0 truncate text-[15px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                        >
                          {project.title}
                        </Link>
                        <StatusIndicator status={project.status} kind="project" size="sm" />
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-text-secondary)]">
                        {isCompany
                          ? `${team.length} hired · ${project.compensation.type.toLowerCase()}`
                          : `${project.company.companyName}${application.roleName ? ` · ${application.roleName}` : ""}${application.isApprentice ? " (Apprentice)" : ""}`}
                      </p>
                    </div>
                  </div>

                  <div className="p-4">
                    <Progress
                      value={w.progress}
                      label={
                        project.compensation.type === "UNPAID"
                          ? "Task completion"
                          : "Payment released"
                      }
                    />

                    <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--color-border-subtle)] pt-3.5">
                      <div>
                        <dt className="text-[11px] text-[var(--color-text-muted)]">
                          {project.compensation.type === "UNPAID" ? "Tasks" : "Released"}
                        </dt>
                        <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                          {project.compensation.type === "UNPAID"
                            ? `${tasks.length - openTasks}/${tasks.length}`
                            : formatMoney(summary.released, summary.currency, true)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-[var(--color-text-muted)]">Open tasks</dt>
                        <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                          {openTasks}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-[var(--color-text-muted)]">Team</dt>
                        <dd className="mt-0.5">
                          <AvatarStack
                            people={team.map((t) => ({
                              name: t.freelancer.name,
                              avatarUrl: t.freelancer.avatarUrl,
                            }))}
                            max={3}
                            size="xs"
                          />
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        href={w.href}
                        size="sm"
                        className="flex-1"
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        Open workspace
                      </Button>
                      <Button
                        href={`${w.href}?tab=messages`}
                        variant="secondary"
                        size="sm"
                        aria-label="Open chat"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {unread > 0 && (
                          <Badge tone="brand" size="sm">
                            {unread}
                          </Badge>
                        )}
                      </Button>
                      <a
                        href={w.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open in new tab"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
