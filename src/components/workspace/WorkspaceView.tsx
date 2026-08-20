"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CalendarClock,
  CheckSquare,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/Feedback";
import { WORKSPACE_TABS, type WorkspaceTabId } from "@/lib/constants";
import { useSession } from "@/lib/session";
import {
  getApplication,
  getProject,
  getProjectFinancialSummary,
  hiredApplications,
  MESSAGES,
  TASKS,
  SHARED_FILES,
  MEETINGS,
} from "@/data/queries";
import { formatDueDate, formatMoney } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import { WorkspaceOverview } from "./tabs/Overview";
import { WorkspaceFunding } from "./tabs/Funding";
import { WorkspaceTasks } from "./tabs/Tasks";
import { WorkspaceDeliverables } from "./tabs/Deliverables";
import { WorkspaceChat } from "./tabs/Chat";
import { WorkspaceMeetings } from "./tabs/Meetings";
import { WorkspaceTeam } from "./tabs/Team";

const ICONS = {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  Archive,
  MessageSquare,
  CalendarClock,
  Users,
};

export function WorkspaceView({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { session } = useSession();

  const application = getApplication(applicationId);
  const project = application ? getProject(application.projectId) : undefined;

  const initialTab = (params.get("tab") as WorkspaceTabId) ?? "overview";
  const [tab, setTab] = useState<WorkspaceTabId>(
    WORKSPACE_TABS.some((t) => t.id === initialTab) ? initialTab : "overview",
  );

  const viewerRole = session?.role === "COMPANY" ? "COMPANY" : "FREELANCER";
  const now = useNow();

  const counts = useMemo(() => {
    if (!project) return { tasks: 0, deliverables: 0, messages: 0, meetings: 0, team: 0 };
    return {
      tasks: TASKS.filter((t) => t.projectId === project.id && t.status !== "DONE").length,
      deliverables: SHARED_FILES.filter(
        (f) => f.projectId === project.id && f.meta.isDeliverable && f.meta.status === "PENDING",
      ).length,
      messages: MESSAGES.filter((m) => m.projectId === project.id && !m.seen).length,
      meetings: MEETINGS.filter(
        (m) =>
          m.projectId === project.id &&
          m.status === "SCHEDULED" &&
          new Date(m.startsAt).getTime() > now,
      ).length,
      team: hiredApplications(project.id).length,
    };
  }, [project, now]);

  if (!application || !project) {
    return (
      <EmptyState
        icon={<Archive />}
        title="Not found, or you do not have access to it."
        description="Workspaces are only visible to the owning company and the freelancers hired on the project."
        action={{ label: "Back to dashboard", href: "/" }}
      />
    );
  }

  const summary = getProjectFinancialSummary(project.id);
  const team = hiredApplications(project.id);

  const setTabAndUrl = (next: string) => {
    setTab(next as WorkspaceTabId);
    router.replace(`?tab=${next}`, { scroll: false });
  };

  const tabItems = WORKSPACE_TABS.map((t) => {
    const Icon = ICONS[t.icon as keyof typeof ICONS];
    const count =
      t.id === "tasks"
        ? counts.tasks
        : t.id === "deliverables"
          ? counts.deliverables
          : t.id === "messages"
            ? counts.messages
            : t.id === "meetings"
              ? counts.meetings
              : t.id === "team"
                ? counts.team
                : undefined;
    return {
      id: t.id,
      label: t.label,
      icon: <Icon className="h-4 w-4" />,
      count: count && count > 0 ? count : undefined,
    };
  });

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="mb-5">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() =>
            router.push(viewerRole === "COMPANY" ? "/company/workspace" : "/freelancer/workspace")
          }
          className="mb-3"
        >
          All workspaces
        </Button>

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="relative h-24 md:h-28">
            <Image src={project.bannerUrl} alt="" fill sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(12,20,17,0.82)] via-[rgba(12,20,17,0.55)] to-[rgba(12,20,17,0.25)]" />
            <div className="absolute inset-0 flex items-center px-5">
              <div className="flex min-w-0 items-center gap-3.5">
                <Avatar
                  name={project.company.companyName}
                  src={project.company.logoUrl}
                  size="lg"
                  rounded="md"
                  ring
                />
                <div className="min-w-0">
                  <h1 className="truncate text-[18px] font-semibold leading-tight tracking-[-0.015em] text-white md:text-[21px]">
                    {project.title}
                  </h1>
                  <p className="mt-0.5 truncate text-[12.5px] text-white/75">
                    {project.company.companyName}
                    {application.roleName ? ` · ${application.roleName}` : ""}
                    {application.isApprentice ? " (Apprentice)" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <StatusIndicator status={project.status} kind="project" size="sm" />
              <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                {project.compensation.type === "UNPAID" ? (
                  "Non-monetary engagement"
                ) : (
                  <>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {formatMoney(summary.released, summary.currency, true)}
                    </span>{" "}
                    released of {formatMoney(summary.budget, summary.currency, true)}
                  </>
                )}
              </span>
              {project.dueDate && (
                <span className="text-[12.5px] text-[var(--color-text-muted)]">
                  {formatDueDate(project.dueDate)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <AvatarStack
                people={team.map((t) => ({
                  name: t.freelancer.name,
                  avatarUrl: t.freelancer.avatarUrl,
                }))}
                max={4}
              />
              <Link
                href={
                  viewerRole === "COMPANY"
                    ? `/company/projects/${project.id}`
                    : `/freelancer/projects/${project.id}`
                }
                className="text-[12.5px] font-medium text-[var(--color-link)] hover:underline"
              >
                View listing
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <Tabs items={tabItems} value={tab} onChange={setTabAndUrl} className="mb-5" />

      {/* ---- Panels ---- */}
      {tab === "overview" && (
        <WorkspaceOverview
          project={project}
          application={application}
          viewerRole={viewerRole}
          onNavigate={setTabAndUrl}
        />
      )}
      {tab === "milestones" && (
        <WorkspaceFunding project={project} application={application} viewerRole={viewerRole} />
      )}
      {tab === "tasks" && (
        <WorkspaceTasks project={project} viewerRole={viewerRole} />
      )}
      {tab === "deliverables" && (
        <WorkspaceDeliverables project={project} viewerRole={viewerRole} />
      )}
      {tab === "messages" && (
        <WorkspaceChat project={project} application={application} viewerRole={viewerRole} />
      )}
      {tab === "meetings" && (
        <WorkspaceMeetings project={project} viewerRole={viewerRole} />
      )}
      {tab === "team" && (
        <WorkspaceTeam project={project} application={application} viewerRole={viewerRole} />
      )}
    </div>
  );
}
