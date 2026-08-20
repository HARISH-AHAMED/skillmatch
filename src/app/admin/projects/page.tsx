"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusIndicator } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { DataTable, KpiTile, type Column } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { COMPENSATION_META, DOMAINS } from "@/lib/constants";
import {
  PROJECTS,
  applicationsForProject,
  getProjectFinancialSummary,
  platformStats,
} from "@/data/queries";
import type { Project } from "@/lib/types";
import { formatDate, formatMoney, truncate } from "@/lib/utils";

const TABS = [
  { id: "ALL", label: "All" },
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "COMPLETED", label: "Completed" },
  { id: "DRAFT", label: "Drafts" },
  { id: "CLOSED", label: "Closed" },
];

export default function AdminProjectsPage() {
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("ALL");
  const [model, setModel] = useState("ALL");

  const stats = platformStats();

  const counts: Record<string, number> = { ALL: PROJECTS.length };
  for (const t of TABS.slice(1)) counts[t.id] = PROJECTS.filter((p) => p.status === t.id).length;

  const filtered = (() => {
    let list = tab === "ALL" ? [...PROJECTS] : PROJECTS.filter((p) => p.status === tab);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.company.companyName.toLowerCase().includes(q),
      );
    }
    if (domain !== "ALL") list = list.filter((p) => p.domain === domain);
    if (model !== "ALL") list = list.filter((p) => p.compensation.type === model);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  })();

  const totalCommitted = PROJECTS.reduce(
    (s, p) => s + getProjectFinancialSummary(p.id).committed,
    0,
  );

  const columns: Column<Project>[] = [
    {
      key: "title",
      header: "Project",
      essential: true,
      render: (p) => (
        <Link href={`/discover/projects/${p.id}`} className="flex items-center gap-3">
          <Avatar
            src={p.company.logoUrl}
            name={p.company.companyName}
            size="sm"
            rounded="md"
          />
          <span className="min-w-0">
            <span className="block truncate font-medium text-[var(--color-text-primary)]">
              {truncate(p.title || "Untitled draft", 46)}
            </span>
            <span className="block truncate text-[11.5px] text-[var(--color-text-muted)]">
              {p.company.companyName} · {p.domain}
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
      key: "model",
      header: "Model",
      render: (p) => (
        <Badge tone={p.compensation.type === "UNPAID" ? "warning" : "neutral"} size="sm">
          {COMPENSATION_META[p.compensation.type].short}
        </Badge>
      ),
    },
    {
      key: "budget",
      header: "Budget",
      align: "right",
      essential: true,
      render: (p) =>
        p.compensation.type === "UNPAID"
          ? "—"
          : formatMoney(p.compensation.totalBudget, p.compensation.currency, true),
    },
    {
      key: "released",
      header: "Released",
      align: "right",
      render: (p) => {
        const s = getProjectFinancialSummary(p.id);
        return formatMoney(s.released, s.currency, true);
      },
    },
    {
      key: "applicants",
      header: "Applicants",
      align: "right",
      render: (p) => applicationsForProject(p.id).length,
    },
    {
      key: "hired",
      header: "Hired",
      align: "right",
      render: (p) => `${p.hiredCount}/${p.freelancersLimit}`,
    },
    {
      key: "created",
      header: "Posted",
      render: (p) => formatDate(p.createdAt, "short"),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Projects monitor"
        description="Every listing on the platform, including drafts and terminal projects. Read-only."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total projects" value={stats.projects} tone="neutral" />
        <KpiTile label="Currently open" value={stats.openProjects} tone="brand" />
        <KpiTile
          label="Released"
          value={formatMoney(stats.totalReleased, "USD", true)}
          tone="brand"
        />
        <KpiTile
          label="Committed but unreleased"
          value={formatMoney(totalCommitted, "USD", true)}
          tone="warning"
          deltaLabel="funded, awaiting delivery"
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Tabs
          variant="pill"
          value={tab}
          onChange={setTab}
          items={TABS.map((t) => ({ ...t, count: counts[t.id] ?? 0 }))}
        />
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Input
            placeholder="Search by title or company"
            leftIcon={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search projects"
          />
          <Select value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Discipline">
            <option value="ALL">All disciplines</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <Select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model">
            <option value="ALL">All compensation models</option>
            {Object.entries(COMPENSATION_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-5">
        <DataTable columns={columns} rows={filtered} />
      </div>
    </div>
  );
}
