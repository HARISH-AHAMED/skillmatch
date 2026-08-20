"use client";

import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { ApplicationCard } from "@/components/shared/Cards";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { useSession } from "@/lib/session";
import { applicationsForFreelancer, getFreelancerByUserId } from "@/data/queries";
import type { ApplicationStatus } from "@/lib/types";

const TABS: { id: string; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "SHORTLISTED", label: "Shortlisted" },
  { id: "HIRED", label: "Hired" },
  { id: "REJECTED", label: "Closed" },
];

export default function FreelancerApplicationsPage() {
  const { session } = useSession();
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("RECENT");

  const freelancer = session ? getFreelancerByUserId(session.userId) : undefined;
  const all = useMemo(
    () => (freelancer ? applicationsForFreelancer(freelancer.id) : []),
    [freelancer],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: all.length };
    for (const s of ["PENDING", "SHORTLISTED", "HIRED", "REJECTED"] as ApplicationStatus[]) {
      map[s] = all.filter((a) => a.status === s).length;
    }
    return map;
  }, [all]);

  const filtered = useMemo(() => {
    let list = tab === "ALL" ? all : all.filter((a) => a.status === tab);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.project.title.toLowerCase().includes(q) ||
          a.project.company.companyName.toLowerCase().includes(q),
      );
    }
    if (sort === "SCORE") return [...list].sort((a, b) => b.aiScore - a.aiScore);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [all, tab, query, sort]);

  const needsAction = all.filter(
    (a) =>
      (a.status === "HIRED" && !a.teamConfirmedAt) ||
      a.offer?.status === "PENDING" ||
      a.interview?.status === "SCHEDULED",
  );

  return (
    <div>
      <PageHeader
        title="Track applications"
        description={`${all.length} applications across ${new Set(all.map((a) => a.project.company.companyName)).size} companies. Every pipeline move is recorded with who made it and when.`}
        action={<Button href="/freelancer/projects">Find more work</Button>}
      />

      {needsAction.length > 0 && (
        <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--color-brand-softer)] p-4">
          <p className="text-[13.5px] font-semibold text-[var(--color-brand-active)]">
            {needsAction.length} {needsAction.length === 1 ? "application needs" : "applications need"}{" "}
            your response
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
            Offers expire and team placements block a slot until you confirm. Open each one to
            respond.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {needsAction.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                href={`/freelancer/applications/${a.id}`}
                className="rounded-full border border-[var(--color-brand)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-brand-active)] transition-colors hover:bg-[var(--color-brand-soft)]"
              >
                {a.project.title}
              </Link>
            ))}
          </div>
        </div>
      )}

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
              placeholder="Search by project or company"
              leftIcon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search applications"
            />
          </div>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort applications"
            className="sm:w-[190px]"
          >
            <option value="RECENT">Most recent</option>
            <option value="SCORE">Highest match score</option>
          </Select>
        </div>
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title={query ? "No applications match that search" : "No applications here yet"}
            description={
              query
                ? "Try a different project or company name."
                : "Apply to an engagement and it will appear here with its full pipeline history."
            }
            action={
              query
                ? { label: "Clear search", onClick: () => setQuery("") }
                : { label: "Browse projects", href: "/freelancer/projects" }
            }
          />
        ) : (
          <Stagger className="flex flex-col gap-3">
            {filtered.map((a) => (
              <StaggerItem key={a.id}>
                <ApplicationCard application={a} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </div>
  );
}
