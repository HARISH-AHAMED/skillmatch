"use client";

import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Rating } from "@/components/ui/Feedback";
import { KpiTile, DataTable, type Column } from "@/components/ui/Table";
import { DOMAINS } from "@/lib/constants";

import type { Freelancer } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

const AVAILABILITY_TONE = {
  AVAILABLE: "success",
  BUSY: "warning",
  UNAVAILABLE: "neutral",
} as const;

export function FreelancersClient({
  freelancers: FREELANCERS,
  counts,
}: {
  freelancers: Freelancer[];
  counts: Record<string, { applications: number; certificates: number }>;
}) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("ALL");
  const [availability, setAvailability] = useState("ALL");

  const filtered = useMemo(() => {
    let list = [...FREELANCERS];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.email.toLowerCase().includes(q) ||
          f.skills.some((s) => s.includes(q)),
      );
    }
    if (domain !== "ALL") list = list.filter((f) => f.domain === domain);
    if (availability !== "ALL")
      list = list.filter((f) => f.availabilityStatus === availability);
    return list.sort((a, b) => b.rating - a.rating);
  }, [FREELANCERS, query, domain, availability]);

  const totals = useMemo(
    () => ({
      verified: FREELANCERS.filter((f) => f.verificationBadges.includes("Identity Verified")).length,
      available: FREELANCERS.filter((f) => f.availabilityStatus === "AVAILABLE").length,
      avgRating:
        FREELANCERS.reduce((s, f) => s + f.rating, 0) / (FREELANCERS.length || 1),
      earnings: FREELANCERS.reduce((s, f) => s + f.totalEarnings, 0),
    }),
    [FREELANCERS],
  );

  const columns: Column<Freelancer>[] = [
    {
      key: "name",
      header: "Freelancer",
      essential: true,
      render: (f) => (
        <Link href={`/freelancers/${f.id}`} className="flex items-center gap-3">
          <Avatar src={f.avatarUrl} name={f.name} size="sm" status={f.availabilityStatus} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium text-[var(--color-text-primary)]">
                {f.name}
              </span>
              {f.verificationBadges.includes("Identity Verified") && (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
              )}
            </span>
            <span className="block truncate text-[11.5px] text-[var(--color-text-muted)]">
              {f.location}
            </span>
          </span>
        </Link>
      ),
    },
    { key: "domain", header: "Discipline", render: (f) => f.domain },
    {
      key: "rating",
      header: "Rating",
      essential: true,
      align: "right",
      render: (f) => <Rating value={f.rating} count={f.reviewCount} size="sm" />,
    },
    {
      key: "projects",
      header: "Completed",
      align: "right",
      render: (f) => f.completedProjects,
    },
    {
      key: "applications",
      header: "Applications",
      align: "right",
      render: (f) => counts[f.id]?.applications ?? 0,
    },
    {
      key: "certificates",
      header: "Certificates",
      align: "right",
      render: (f) => counts[f.id]?.certificates ?? 0,
    },
    {
      key: "earnings",
      header: "Earned",
      align: "right",
      essential: true,
      render: (f) => formatMoney(f.totalEarnings, f.currency, true),
    },
    {
      key: "availability",
      header: "Status",
      render: (f) => (
        <Badge tone={AVAILABILITY_TONE[f.availabilityStatus]} size="sm">
          {f.availabilityStatus.toLowerCase()}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Freelancer profiles"
        description="Read-only monitoring across every talent account. Ratings and completed-project counts are derived, never entered."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total freelancers" value={FREELANCERS.length} tone="brand" />
        <KpiTile label="Identity verified" value={totals.verified} tone="info" />
        <KpiTile label="Available now" value={totals.available} tone="brand" />
        <KpiTile
          label="Average rating"
          value={totals.avgRating.toFixed(2)}
          tone="warning"
          deltaLabel={`${formatMoney(totals.earnings, "USD", true)} earned collectively`}
        />
      </div>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
        <Input
          placeholder="Search by name, email or skill"
          leftIcon={<Search />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search freelancers"
        />
        <Select value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Discipline">
          <option value="ALL">All disciplines</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          aria-label="Availability"
        >
          <option value="ALL">Any availability</option>
          <option value="AVAILABLE">Available</option>
          <option value="BUSY">Partly booked</option>
          <option value="UNAVAILABLE">Not taking work</option>
        </Select>
      </div>

      <p className="mt-4 text-[13px] text-[var(--color-text-secondary)]">
        Showing <strong className="text-[var(--color-text-primary)]">{filtered.length}</strong> of{" "}
        {FREELANCERS.length}
      </p>

      <div className="mt-3">
        <DataTable columns={columns} rows={filtered} />
      </div>
    </div>
  );
}
