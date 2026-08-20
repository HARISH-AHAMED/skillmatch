"use client";

import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Progress, Rating } from "@/components/ui/Feedback";
import { DataTable, KpiTile, type Column } from "@/components/ui/Table";
import {
  COMPANIES,
  applicationsForCompany,
  getProjectFinancialSummary,
  projectsForCompany,
} from "@/data/queries";
import type { Company } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export default function AdminCompaniesPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("TRUST");

  const filtered = useMemo(() => {
    let list = [...COMPANIES];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q),
      );
    }
    if (sort === "SPEND")
      return list.sort(
        (a, b) =>
          projectsForCompany(b.id).reduce(
            (s, p) => s + getProjectFinancialSummary(p.id).released,
            0,
          ) -
          projectsForCompany(a.id).reduce(
            (s, p) => s + getProjectFinancialSummary(p.id).released,
            0,
          ),
      );
    if (sort === "PROJECTS")
      return list.sort(
        (a, b) => projectsForCompany(b.id).length - projectsForCompany(a.id).length,
      );
    return list.sort((a, b) => b.trustScore - a.trustScore);
  }, [query, sort]);

  const totals = useMemo(
    () => ({
      verified: COMPANIES.filter((c) => c.verificationBadges.includes("Payment Verified")).length,
      projects: COMPANIES.reduce((s, c) => s + projectsForCompany(c.id).length, 0),
      hires: COMPANIES.reduce(
        (s, c) => s + applicationsForCompany(c.id).filter((a) => a.status === "HIRED").length,
        0,
      ),
      released: COMPANIES.reduce(
        (s, c) =>
          s +
          projectsForCompany(c.id).reduce(
            (t, p) => t + getProjectFinancialSummary(p.id).released,
            0,
          ),
        0,
      ),
    }),
    [],
  );

  const columns: Column<Company>[] = [
    {
      key: "name",
      header: "Company",
      essential: true,
      render: (c) => (
        <Link href={`/companies/${c.id}`} className="flex items-center gap-3">
          <Avatar src={c.logoUrl} name={c.companyName} size="sm" rounded="md" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium text-[var(--color-text-primary)]">
                {c.companyName}
              </span>
              {c.verificationBadges.includes("Identity Verified") && (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
              )}
            </span>
            <span className="block truncate text-[11.5px] text-[var(--color-text-muted)]">
              {c.industry} · {c.location}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: "trust",
      header: "Trust",
      essential: true,
      align: "right",
      render: (c) => (
        <div className="inline-flex w-20 flex-col items-end">
          <span className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
            {c.trustScore}
          </span>
          <Progress value={c.trustScore} size="sm" className="mt-1 w-full" />
        </div>
      ),
    },
    {
      key: "payment",
      header: "Payment reliability",
      align: "right",
      render: (c) => `${Math.round(c.paymentReliability)}%`,
    },
    {
      key: "projects",
      header: "Projects",
      align: "right",
      render: (c) => projectsForCompany(c.id).length,
    },
    {
      key: "hires",
      header: "Hires",
      align: "right",
      render: (c) => applicationsForCompany(c.id).filter((a) => a.status === "HIRED").length,
    },
    {
      key: "released",
      header: "Released",
      essential: true,
      align: "right",
      render: (c) =>
        formatMoney(
          projectsForCompany(c.id).reduce(
            (s, p) => s + getProjectFinancialSummary(p.id).released,
            0,
          ),
          "USD",
          true,
        ),
    },
    {
      key: "rating",
      header: "Rating",
      align: "right",
      render: (c) => <Rating value={c.rating} count={c.reviewCount} size="sm" />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Trust score, payment reliability and completion rate are recomputed from freelancer reviews on every new review."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total companies" value={COMPANIES.length} tone="info" />
        <KpiTile label="Payment verified" value={totals.verified} tone="brand" />
        <KpiTile label="Projects published" value={totals.projects} tone="neutral" />
        <KpiTile
          label="Released to freelancers"
          value={formatMoney(totals.released, "USD", true)}
          tone="brand"
          deltaLabel={`${totals.hires} hires across the platform`}
        />
      </div>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        <Input
          placeholder="Search by name, industry or location"
          leftIcon={<Search />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search companies"
        />
        <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="TRUST">Highest trust score</option>
          <option value="SPEND">Most released</option>
          <option value="PROJECTS">Most projects</option>
        </Select>
      </div>

      <div className="mt-5">
        <DataTable columns={columns} rows={filtered} />
      </div>
    </div>
  );
}
