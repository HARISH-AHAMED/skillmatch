"use client";

import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Badge";
import { Input, Select, Toggle } from "@/components/ui/Field";
import { MultiSelect } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/Feedback";
import { Drawer } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { ProjectCard } from "./Cards";
import { COMPENSATION_META, DOMAINS, SKILL_LIBRARY } from "@/lib/constants";
import { filterProjects, type BrowseFilters } from "@/lib/domain";
import type { CompensationType, Project } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";

const REWARD_TABS = [
  { id: "ALL", label: "All work" },
  { id: "PAID", label: "Paid" },
  { id: "NON_MONETARY", label: "Non-monetary" },
];

const SORTS = [
  { value: "NEWEST", label: "Newest first" },
  { value: "MATCH", label: "Best match" },
  { value: "BUDGET_HIGH", label: "Highest budget" },
  { value: "DEADLINE", label: "Closing soonest" },
];

const EXPERIENCE = [
  { value: "ALL", label: "Any experience" },
  { value: "ENTRY", label: "Entry (0–2 years)" },
  { value: "MID", label: "Mid (3–5 years)" },
  { value: "SENIOR", label: "Senior (6+ years)" },
];

export function ProjectBrowser({
  projects,
  viewerId,
  hrefBase = "/discover/projects",
  initialQuery = "",
  initialDomain,
  initialSkill,
  savedIds = [],
  onToggleSave,
  showSaveToggle = false,
}: {
  projects: Project[];
  viewerId?: string;
  hrefBase?: string;
  initialQuery?: string;
  initialDomain?: string;
  initialSkill?: string;
  savedIds?: string[];
  onToggleSave?: (id: string) => void;
  showSaveToggle?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [domains, setDomains] = useState<string[]>(initialDomain ? [initialDomain] : []);
  const [skills, setSkills] = useState<string[]>(initialSkill ? [initialSkill] : []);
  const [compensation, setCompensation] = useState<string[]>([]);
  const [reward, setReward] = useState<"ALL" | "PAID" | "NON_MONETARY">("ALL");
  const [experience, setExperience] = useState("ALL");
  const [sort, setSort] = useState(viewerId ? "MATCH" : "NEWEST");
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters: BrowseFilters = useMemo(
    () => ({
      query,
      domains,
      skills,
      compensation,
      reward,
      experience: experience as BrowseFilters["experience"],
      priority: onlyUrgent ? ["HIGH"] : undefined,
      sort: sort as BrowseFilters["sort"],
    }),
    [query, domains, skills, compensation, reward, experience, onlyUrgent, sort],
  );

  const results = useMemo(() => filterProjects(projects, filters), [projects, filters]);

  const activeCount =
    domains.length +
    skills.length +
    compensation.length +
    (reward !== "ALL" ? 1 : 0) +
    (experience !== "ALL" ? 1 : 0) +
    (onlyUrgent ? 1 : 0);

  const clearAll = () => {
    setDomains([]);
    setSkills([]);
    setCompensation([]);
    setReward("ALL");
    setExperience("ALL");
    setOnlyUrgent(false);
  };

  const filterControls = (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Discipline
        </p>
        <div className="flex flex-wrap gap-2">
          {DOMAINS.map((d) => (
            <Chip
              key={d}
              size="sm"
              active={domains.includes(d)}
              onClick={() =>
                setDomains((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
              }
            >
              {d}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Compensation model
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(COMPENSATION_META) as CompensationType[]).map((t) => (
            <Chip
              key={t}
              size="sm"
              active={compensation.includes(t)}
              onClick={() =>
                setCompensation((prev) =>
                  prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                )
              }
            >
              {COMPENSATION_META[t].label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Experience required
        </p>
        <Select value={experience} onChange={(e) => setExperience(e.target.value)}>
          {EXPERIENCE.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Skills
        </p>
        <MultiSelect
          label="Select skills"
          options={SKILL_LIBRARY}
          selected={skills}
          onChange={setSkills}
          searchable
        />
        {skills.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <Chip
                key={s}
                size="sm"
                active
                className="capitalize"
                onRemove={() => setSkills((prev) => prev.filter((x) => x !== s))}
              >
                {s}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border-subtle)] pt-4">
        <Toggle
          checked={onlyUrgent}
          onChange={setOnlyUrgent}
          label="Urgent only"
          description="Projects flagged as high priority by the company."
        />
      </div>
    </div>
  );

  return (
    <div>
      {/* ---- Search + sort bar ---- */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="flex-1">
            <Input
              inputSize="lg"
              placeholder="Search by title, skill or company"
              leftIcon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search projects"
              rightSlot={
                query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[var(--color-hover)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="lg:hidden"
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => setFiltersOpen(true)}
          >
            Filters
            {activeCount > 0 && (
              <span className="ml-1 rounded-full bg-[var(--color-brand)] px-1.5 text-[11px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            variant="segmented"
            size="sm"
            value={reward}
            onChange={(v) => setReward(v as typeof reward)}
            items={REWARD_TABS}
          />

          <div className="flex items-center gap-2">
            <div className="hidden items-center rounded-full border border-[var(--color-border)] p-0.5 sm:flex">
              {(
                [
                  { id: "grid", Icon: LayoutGrid },
                  { id: "list", Icon: List },
                ] as const
              ).map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-label={`${id} view`}
                  aria-pressed={view === id}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    view === id
                      ? "bg-[var(--color-brand-ink)] text-white"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-hover)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <Select
              inputSize="sm"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort results"
              className="w-[168px]"
            >
              {SORTS.filter((s) => s.value !== "MATCH" || viewerId).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* ---- Layout ---- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-8">
        {/* Desktop filter rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-[76px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                Filters
              </h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[12.5px] font-medium text-[var(--color-link)] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            {filterControls}
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-[13.5px] text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">
                {results.length}
              </span>{" "}
              {pluralize(results.length, "engagement")} found
            </p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[12.5px] font-medium text-[var(--color-link)] hover:underline lg:hidden"
              >
                Clear filters
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title="No engagements match those filters"
              description="Try widening the discipline, clearing a skill, or switching the compensation model."
              action={{ label: "Clear all filters", onClick: clearAll }}
            />
          ) : (
            <div
              className={cn(
                view === "grid"
                  ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  : "flex flex-col gap-3",
              )}
            >
              {results.map((p) =>
                view === "grid" ? (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    href={`${hrefBase}/${p.id}`}
                    showMatch={Boolean(viewerId)}
                    saved={savedIds.includes(p.id)}
                    onToggleSave={showSaveToggle ? onToggleSave : undefined}
                  />
                ) : (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    href={`${hrefBase}/${p.id}`}
                    variant="compact"
                    showMatch={Boolean(viewerId)}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        description={`${results.length} ${pluralize(results.length, "result")}`}
        side="left"
        footer={
          <>
            <Button variant="secondary" onClick={clearAll}>
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Show results</Button>
          </>
        }
      >
        {filterControls}
      </Drawer>
    </div>
  );
}
