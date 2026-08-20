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
import { WORKSPACE_TABS, type WorkspaceTabId } from "@/lib/constants";
import { getProjectFinancialSummary } from "@/lib/domain";
import type { WorkspaceData } from "@/data/server/workspace";
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

export function WorkspaceView({ data }: { data: WorkspaceData }) {
  const router = useRouter();
  const params = useSearchParams();

  const { application, project, team, messages, tasks, files, meetings } = data;

  const initialTab = (params.get("tab") as WorkspaceTabId) ?? "overview";
  const [tab, setTab] = useState<WorkspaceTabId>(
    WORKSPACE_TABS.some((t) => t.id === initialTab) ? initialTab : "overview",
  );

  const viewerRole = data.viewerRole;
  const now = useNow();

  const counts = useMemo(
    () => ({
      tasks: tasks.filter((t) => t.status !== "DONE").length,
      deliverables: files.filter((f) => f.meta.isDeliverable && f.meta.status === "PENDING")
        .length,
      // A message the viewer sent themselves is not unread for them.
      messages: messages.filter((m) => !m.seen && m.senderId !== data.viewerUserId).length,
      meetings: meetings.filter(
        (m) => m.status === "SCHEDULED" && new Date(m.startsAt).getTime() > now,
      ).length,
      team: team.length,
    }),
    [tasks, files, messages, meetings, team, data.viewerUserId, now],
  );

  const summary = getProjectFinancialSummary(project.compensation, data.paymentItems, data.ledger);

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
          data={data}
          project={project}
          application={application}
          viewerRole={viewerRole}
          onNavigate={setTabAndUrl}
        />
      )}
      {tab === "milestones" && (
        <WorkspaceFunding data={data} project={project} application={application} viewerRole={viewerRole} />
      )}
      {tab === "tasks" && (
        <WorkspaceTasks data={data} project={project} viewerRole={viewerRole} />
      )}
      {tab === "deliverables" && (
        <WorkspaceDeliverables data={data} project={project} viewerRole={viewerRole} />
      )}
      {tab === "messages" && (
        <WorkspaceChat data={data} project={project} application={application} viewerRole={viewerRole} />
      )}
      {tab === "meetings" && (
        <WorkspaceMeetings data={data} project={project} viewerRole={viewerRole} />
      )}
      {tab === "team" && (
        <WorkspaceTeam data={data} project={project} application={application} viewerRole={viewerRole} />
      )}
    </div>
  );
}
