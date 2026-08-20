"use client";

import { Search, SlidersHorizontal, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Badge";
import { Input, Select, Toggle } from "@/components/ui/Field";
import { MultiSelect } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/Feedback";
import { Drawer } from "@/components/ui/Modal";
import { FreelancerCard } from "./Cards";
import { DOMAINS, SKILL_LIBRARY } from "@/lib/constants";
import { filterFreelancers, type TalentFilters } from "@/lib/domain";
import type { Freelancer } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";

const AVAILABILITY = [
  { value: "AVAILABLE", label: "Available now" },
  { value: "BUSY", label: "Partly booked" },
  { value: "UNAVAILABLE", label: "Not taking work" },
];

const BADGES = ["Identity Verified", "Top Rated", "Skills Verified", "Payment Verified"];

const SORTS = [
  { value: "RATING", label: "Highest rated" },
  { value: "EXPERIENCE", label: "Most experienced" },
  { value: "PROJECTS", label: "Most projects" },
  { value: "MATCH", label: "Best match" },
];

export function TalentBrowser({
  freelancers,
  againstProjectId,
  projectOptions,
  onProjectChange,
  cardAction,
  hrefBase = "/freelancers",
}: {
  freelancers: Freelancer[];
  againstProjectId?: string;
  projectOptions?: { id: string; title: string }[];
  onProjectChange?: (id: string) => void;
  cardAction?: (freelancerId: string) => React.ReactNode;
  hrefBase?: string;
}) {
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [minExperience, setMinExperience] = useState(0);
  const [openToApprentice, setOpenToApprentice] = useState(false);
  const [sort, setSort] = useState(againstProjectId ? "MATCH" : "RATING");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters: TalentFilters = useMemo(
    () => ({
      query,
      skills,
      domains,
      availability,
      badges,
      minRating: minRating || undefined,
      minExperience: minExperience || undefined,
      againstProjectId,
      sort: sort as TalentFilters["sort"],
    }),
    [query, skills, domains, availability, badges, minRating, minExperience, againstProjectId, sort],
  );

  const results = useMemo(() => {
    const list = filterFreelancers(freelancers, filters);
    return openToApprentice ? list.filter((f) => f.experienceYears <= 2) : list;
  }, [freelancers, filters, openToApprentice]);

  const activeCount =
    skills.length +
    domains.length +
    availability.length +
    badges.length +
    (minRating ? 1 : 0) +
    (minExperience ? 1 : 0) +
    (openToApprentice ? 1 : 0);

  const clearAll = () => {
    setSkills([]);
    setDomains([]);
    setAvailability([]);
    setBadges([]);
    setMinRating(0);
    setMinExperience(0);
    setOpenToApprentice(false);
  };

  const filterControls = (
    <div className="flex flex-col gap-5">
      {projectOptions && projectOptions.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
            Score against
          </p>
          <Select
            value={againstProjectId ?? ""}
            onChange={(e) => onProjectChange?.(e.target.value)}
            aria-label="Score candidates against a project"
          >
            <option value="">No project selected</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-[12px] leading-[1.45] text-[var(--color-text-muted)]">
            Picking a project shows each candidate&apos;s AI match score against its required
            skills, experience and priority.
          </p>
        </div>
      )}

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
                setDomains((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]))
              }
            >
              {d}
            </Chip>
          ))}
        </div>
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
                onRemove={() => setSkills((p) => p.filter((x) => x !== s))}
              >
                {s}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Availability
        </p>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY.map((a) => (
            <Chip
              key={a.value}
              size="sm"
              active={availability.includes(a.value)}
              onClick={() =>
                setAvailability((p) =>
                  p.includes(a.value) ? p.filter((x) => x !== a.value) : [...p, a.value],
                )
              }
            >
              {a.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Minimum rating
        </p>
        <div className="flex flex-wrap gap-2">
          {[0, 4, 4.5, 4.8].map((r) => (
            <Chip key={r} size="sm" active={minRating === r} onClick={() => setMinRating(r)}>
              {r === 0 ? (
                "Any"
              ) : (
                <>
                  <Star className="h-3 w-3 fill-[var(--color-star)] text-[var(--color-star)]" />
                  {r}+
                </>
              )}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Minimum experience
        </p>
        <Select
          value={String(minExperience)}
          onChange={(e) => setMinExperience(Number(e.target.value))}
        >
          <option value="0">Any experience</option>
          <option value="2">2+ years</option>
          <option value="5">5+ years</option>
          <option value="8">8+ years</option>
        </Select>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Verification
        </p>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => (
            <Chip
              key={b}
              size="sm"
              active={badges.includes(b)}
              onClick={() =>
                setBadges((p) => (p.includes(b) ? p.filter((x) => x !== b) : [...p, b]))
              }
            >
              {b}
            </Chip>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--color-border-subtle)] pt-4">
        <Toggle
          checked={openToApprentice}
          onChange={setOpenToApprentice}
          label="Early-career only"
          description="Candidates with two years or less — suitable for apprentice slots."
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="flex-1">
          <Input
            inputSize="lg"
            placeholder="Search by name, headline, skill or location"
            leftIcon={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search talent"
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
        <Select
          inputSize="lg"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort"
          className="sm:w-[190px]"
        >
          {SORTS.filter((s) => s.value !== "MATCH" || againstProjectId).map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-[76px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">Filters</h2>
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

        <div className="min-w-0">
          <p className="mb-4 text-[13.5px] text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">{results.length}</span>{" "}
            {pluralize(results.length, "specialist")} found
          </p>

          {results.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title="No specialists match those filters"
              description="Try removing a skill or lowering the minimum rating."
              action={{ label: "Clear all filters", onClick: clearAll }}
            />
          ) : (
            <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")}>
              {results.map((f) => (
                <FreelancerCard
                  key={f.id}
                  freelancer={f}
                  href={`${hrefBase}/${f.id}`}
                  showMatch={Boolean(againstProjectId)}
                  action={cardAction?.(f.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

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
