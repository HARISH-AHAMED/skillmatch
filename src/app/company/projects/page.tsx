"use client";

import Image from "next/image";
import Link from "next/link";
import { Award, Briefcase, Edit3, Eye, EyeOff, LayoutGrid, MoreVertical, Plus, Search, Trash2, Users, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, Progress } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/session";
import {
  applicationsForProject,
  getCompanyByUserId,
  getProjectFinancialSummary,
  isProjectMutable,
  projectsForCompany,
} from "@/data/queries";
import type { Project } from "@/lib/types";
import { formatDate, formatMoney, relativeTime } from "@/lib/utils";

const TABS = [
  { id: "ALL", label: "All" },
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "DRAFT", label: "Drafts" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CLOSED", label: "Closed" },
];

export default function CompanyProjectsPage() {
  const { session } = useSession();
  const toast = useToast();
  const company = session ? getCompanyByUserId(session.userId) : undefined;

  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("RECENT");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [closeTarget, setCloseTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const all = useMemo(
    () => (company ? projectsForCompany(company.id) : []),
    [company],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: all.length };
    for (const t of TABS.slice(1)) map[t.id] = all.filter((p) => p.status === t.id).length;
    return map;
  }, [all]);

  const filtered = useMemo(() => {
    let list = tab === "ALL" ? all : all.filter((p) => p.status === tab);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (sort === "APPLICANTS")
      return [...list].sort((a, b) => b.applicantCount - a.applicantCount);
    if (sort === "BUDGET")
      return [...list].sort((a, b) => b.compensation.totalBudget - a.compensation.totalBudget);
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [all, tab, query, sort]);

  if (!company) return null;

  const rowActions = (p: Project) => {
    const mutable = isProjectMutable(p.status);
    return [
      { label: "View project", href: `/company/projects/${p.id}`, icon: <Eye /> },
      ...(mutable
        ? [{ label: "Edit project", href: `/company/projects/edit/${p.id}`, icon: <Edit3 /> }]
        : []),
      { label: "Review applicants", href: `/company/applicants?project=${p.id}`, icon: <Users /> },
      ...(p.hiredCount > 0
        ? [{ label: "Open workspace", href: "/company/workspace", icon: <LayoutGrid /> }]
        : []),
      {
        label: "Certificate template",
        href: `/company/projects/${p.id}/certificate`,
        icon: <Award />,
      },
      ...(mutable
        ? [
            {
              label: hiddenIds.includes(p.id) || !p.isVisible ? "Make visible" : "Hide listing",
              icon: hiddenIds.includes(p.id) || !p.isVisible ? <Eye /> : <EyeOff />,
              separatorBefore: true,
              onClick: () => {
                setHiddenIds((prev) =>
                  prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                );
                toast.success(
                  hiddenIds.includes(p.id) ? "Listing is visible again" : "Listing hidden",
                );
              },
            },
            {
              label: "Close listing",
              icon: <XCircle />,
              onClick: () => setCloseTarget(p),
            },
            {
              label: "Delete project",
              icon: <Trash2 />,
              destructive: true,
              onClick: () => setDeleteTarget(p),
            },
          ]
        : []),
    ];
  };

  const columns: Column<Project>[] = [
    {
      key: "title",
      header: "Project",
      essential: true,
      render: (p) => (
        <Link href={`/company/projects/${p.id}`} className="flex items-center gap-3">
          <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)]">
            <Image src={p.bannerUrl} alt="" fill sizes="48px" className="object-cover" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-[var(--color-text-primary)]">
              {p.title || "Untitled draft"}
            </span>
            <span className="block text-[11.5px] text-[var(--color-text-muted)]">
              {p.category}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      essential: true,
      render: (p) => <StatusIndicator status={p.status} kind="project" size="sm" />,
    },
    {
      key: "applicants",
      header: "Applicants",
      align: "right",
      essential: true,
      render: (p) => {
        const apps = applicationsForProject(p.id);
        const pending = apps.filter((a) => a.status === "PENDING").length;
        return (
          <span>
            {apps.length}
            {pending > 0 && (
              <span className="ml-1.5 text-[11.5px] font-medium text-[var(--color-warning-fg)]">
                {pending} new
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "hired",
      header: "Hired",
      align: "right",
      render: (p) => `${p.hiredCount} / ${p.freelancersLimit}`,
    },
    {
      key: "budget",
      header: "Budget",
      align: "right",
      render: (p) =>
        p.compensation.type === "UNPAID"
          ? "—"
          : formatMoney(p.compensation.totalBudget, p.compensation.currency, true),
    },
    {
      key: "due",
      header: "Due",
      render: (p) => (p.dueDate ? formatDate(p.dueDate, "short") : "—"),
    },
    {
      key: "actions",
      header: "",
      essential: true,
      width: "56px",
      render: (p) => (
        <Dropdown
          align="end"
          trigger={
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]">
              <MoreVertical className="h-4 w-4" />
            </span>
          }
          items={rowActions(p)}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My projects"
        description={`${all.length} projects — ${counts.OPEN ?? 0} open, ${counts.IN_PROGRESS ?? 0} in progress, ${counts.DRAFT ?? 0} drafts.`}
        action={
          <Button href="/company/projects/new" leftIcon={<Plus className="h-4 w-4" />}>
            Post new project
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <Tabs
          variant="pill"
          value={tab}
          onChange={setTab}
          items={TABS.map((t) => ({ ...t, count: counts[t.id] ?? 0 }))}
        />

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search your projects"
              leftIcon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search projects"
            />
          </div>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort"
            className="sm:w-[190px]"
          >
            <option value="RECENT">Recently updated</option>
            <option value="APPLICANTS">Most applicants</option>
            <option value="BUDGET">Highest budget</option>
          </Select>
          <div className="hidden items-center rounded-full border border-[var(--color-border)] p-0.5 sm:flex">
            {(
              [
                { id: "cards", label: "Cards" },
                { id: "table", label: "Table" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`h-8 rounded-full px-3 text-[12.5px] font-medium transition-colors ${
                  view === v.id
                    ? "bg-[var(--color-brand-ink)] text-white"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Briefcase />}
            title={
              query
                ? "No projects match that search"
                : "No projects yet — post your first project to start receiving applications."
            }
            description={
              query
                ? "Try a different title."
                : "The wizard has five steps and autosaves as you go."
            }
            action={
              query
                ? { label: "Clear search", onClick: () => setQuery("") }
                : { label: "Post New Project", href: "/company/projects/new" }
            }
          />
        ) : view === "table" ? (
          <DataTable columns={columns} rows={filtered} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const apps = applicationsForProject(p.id);
              const pending = apps.filter((a) => a.status === "PENDING").length;
              const summary = getProjectFinancialSummary(p.id);
              const hidden = hiddenIds.includes(p.id) || !p.isVisible;

              return (
                <Card key={p.id} padding="none" className="flex flex-col overflow-hidden">
                  <Link href={`/company/projects/${p.id}`} className="relative block aspect-[16/7]">
                    <Image
                      src={p.bannerUrl}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 380px"
                      className="object-cover"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.55)] to-transparent" />
                    <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <StatusIndicator status={p.status} kind="project" size="sm" />
                      {hidden && p.status !== "DRAFT" && (
                        <Badge tone="neutral" size="sm" icon={<EyeOff />}>
                          Hidden
                        </Badge>
                      )}
                    </span>
                  </Link>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/company/projects/${p.id}`}
                        className="min-w-0 text-[14.5px] font-semibold leading-[1.4] text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                      >
                        {p.title || "Untitled draft"}
                      </Link>
                      <Dropdown
                        align="end"
                        trigger={
                          <span className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]">
                            <MoreVertical className="h-4 w-4" />
                          </span>
                        }
                        items={rowActions(p)}
                      />
                    </div>

                    <p className="mt-1 text-[12.5px] text-[var(--color-text-secondary)]">
                      {p.compensation.type === "UNPAID"
                        ? "Non-monetary"
                        : formatMoney(p.compensation.totalBudget, p.compensation.currency)}{" "}
                      · {p.category}
                    </p>

                    <dl className="mt-3.5 grid grid-cols-3 gap-2 border-y border-[var(--color-border-subtle)] py-3">
                      <div>
                        <dt className="text-[11px] text-[var(--color-text-muted)]">Applicants</dt>
                        <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                          {apps.length}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-[var(--color-text-muted)]">Hired</dt>
                        <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                          {p.hiredCount}/{p.freelancersLimit}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-[var(--color-text-muted)]">Released</dt>
                        <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                          {formatMoney(summary.released, summary.currency, true)}
                        </dd>
                      </div>
                    </dl>

                    {p.compensation.type !== "UNPAID" && p.status !== "DRAFT" && (
                      <Progress className="mt-3" value={summary.progress} size="sm" />
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-4">
                      {p.status === "DRAFT" ? (
                        <Button
                          href={`/company/projects/edit/${p.id}`}
                          size="sm"
                          className="flex-1"
                          leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                        >
                          Continue draft
                        </Button>
                      ) : (
                        <>
                          <Button
                            href={`/company/applicants?project=${p.id}`}
                            size="sm"
                            className="flex-1"
                          >
                            Applicants
                            {pending > 0 && (
                              <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[11px]">
                                {pending}
                              </span>
                            )}
                          </Button>
                          <Button
                            href={`/company/projects/${p.id}`}
                            size="sm"
                            variant="secondary"
                          >
                            Details
                          </Button>
                        </>
                      )}
                    </div>

                    <p className="mt-2.5 text-[11.5px] text-[var(--color-text-muted)]">
                      Updated {relativeTime(p.updatedAt)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(closeTarget)}
        onClose={() => setCloseTarget(null)}
        onConfirm={() =>
          toast.toast({
            title: "Listing closed",
            description: "A closed project cannot be reopened — post a new listing instead.",
            tone: "info",
          })
        }
        title={`Close "${closeTarget?.title}"?`}
        message="This withdraws the listing and stops new applications. A closed project can never be reopened, so only do this when you are certain."
        confirmLabel="Close listing"
        destructive
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          toast.toast({
            title:
              deleteTarget?.status === "DRAFT" ? "Draft archived" : "Project cancelled",
            description:
              "Nothing is ever hard-deleted — applications, reviews, certificates and the ledger all reference this project.",
            tone: "info",
          })
        }
        title={`Delete "${deleteTarget?.title}"?`}
        message={
          deleteTarget?.status === "DRAFT"
            ? "This draft will be archived. Nothing on FRIVVO is hard-deleted."
            : "This project will be cancelled rather than deleted, because applications, workspaces, reviews, certificates and the entire payment ledger reference it."
        }
        confirmLabel={deleteTarget?.status === "DRAFT" ? "Archive draft" : "Cancel project"}
        destructive
      />
    </div>
  );
}
