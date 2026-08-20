"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Search,
  Star,
  UserCheck,
  UserX,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip, MatchScore, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Checkbox, Input, Select } from "@/components/ui/Field";
import { Alert, EmptyState, Rating } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { useSession } from "@/lib/session";
import {
  applicationsForCompany,
  getCapacity,
  getCompanyByUserId,
  getProject,
  projectsForCompany,
} from "@/data/queries";
import type { Application, ApplicationStatus } from "@/lib/types";
import { relativeTime, truncate } from "@/lib/utils";

const TABS = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "New" },
  { id: "SHORTLISTED", label: "Shortlisted" },
  { id: "HIRED", label: "Hired" },
  { id: "REJECTED", label: "Closed" },
];

export default function CompanyApplicantsPage() {
  return (
    <Suspense fallback={null}>
      <ApplicantsClient />
    </Suspense>
  );
}

function ApplicantsClient() {
  const { session } = useSession();
  const toast = useToast();
  const params = useSearchParams();
  const company = session ? getCompanyByUserId(session.userId) : undefined;

  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState(params.get("project") ?? "ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sort, setSort] = useState("SCORE");
  const [selected, setSelected] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ApplicationStatus>>({});
  const [bulkAction, setBulkAction] = useState<"shortlist" | "reject" | null>(null);
  const [hireTarget, setHireTarget] = useState<Application | null>(null);

  const projects = useMemo(
    () => (company ? projectsForCompany(company.id).filter((p) => p.status !== "DRAFT") : []),
    [company],
  );

  const all = useMemo(() => {
    if (!company) return [];
    return applicationsForCompany(company.id).map((a) => ({
      ...a,
      status: overrides[a.id] ?? a.status,
    }));
  }, [company, overrides]);

  const roleOptions = useMemo(() => {
    if (projectFilter === "ALL") return [];
    return getProject(projectFilter)?.roles ?? [];
  }, [projectFilter]);

  const counts = useMemo(() => {
    const scoped = projectFilter === "ALL" ? all : all.filter((a) => a.projectId === projectFilter);
    const map: Record<string, number> = { ALL: scoped.length };
    for (const s of ["PENDING", "SHORTLISTED", "HIRED", "REJECTED"]) {
      map[s] = scoped.filter((a) => a.status === s).length;
    }
    return map;
  }, [all, projectFilter]);

  const filtered = useMemo(() => {
    let list = all;
    if (projectFilter !== "ALL") list = list.filter((a) => a.projectId === projectFilter);
    if (roleFilter !== "ALL") list = list.filter((a) => a.roleId === roleFilter);
    if (tab !== "ALL") list = list.filter((a) => a.status === tab);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.freelancer.name.toLowerCase().includes(q) ||
          a.freelancer.professionalHeadline.toLowerCase().includes(q) ||
          a.project.title.toLowerCase().includes(q),
      );
    }
    if (sort === "RECENT")
      return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "RATING")
      return [...list].sort((a, b) => b.freelancer.rating - a.freelancer.rating);
    return [...list].sort((a, b) => b.aiScore - a.aiScore);
  }, [all, projectFilter, roleFilter, tab, query, sort]);

  if (!company) return null;

  const transition = (ids: string[], status: ApplicationStatus, message: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = status;
      return next;
    });
    setSelected([]);
    toast.success(message, `${ids.length} ${ids.length === 1 ? "applicant" : "applicants"} updated.`);
  };

  const hire = (a: Application) => {
    const capacity = getCapacity(a.projectId, a.roleId);
    if (!a.isApprentice && capacity.roleFull) {
      toast.error(
        "Cannot hire",
        `All ${capacity.roleSlots} slot(s) for this role are already filled. Release a slot before hiring another.`,
      );
      return;
    }
    if (!a.isApprentice && capacity.projectFull) {
      toast.error(
        "Cannot hire",
        `This project already has its full complement of ${capacity.projectLimit} freelancer(s).`,
      );
      return;
    }
    transition([a.id], "HIRED", "Applicant hired");
  };

  return (
    <div>
      <PageHeader
        title="Review applicants"
        description={`${counts.PENDING ?? 0} new applications across ${projects.length} live projects. Sorted by AI match score by default.`}
        action={
          selected.length > 0 && (
            <>
              <Button
                variant="secondary"
                leftIcon={<Star className="h-4 w-4" />}
                onClick={() => setBulkAction("shortlist")}
              >
                Shortlist {selected.length}
              </Button>
              <Button
                variant="dangerSoft"
                leftIcon={<UserX className="h-4 w-4" />}
                onClick={() => setBulkAction("reject")}
              >
                Close {selected.length}
              </Button>
            </>
          )
        }
      />

      {/* ---- Filters ---- */}
      <div className="flex flex-col gap-3">
        <Tabs
          variant="pill"
          value={tab}
          onChange={setTab}
          items={TABS.map((t) => ({ ...t, count: counts[t.id] ?? 0 }))}
        />

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search by name or headline"
            leftIcon={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search applicants"
          />
          <Select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setRoleFilter("ALL");
            }}
            aria-label="Filter by project"
          >
            <option value="ALL">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {truncate(p.title, 40)}
              </option>
            ))}
          </Select>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            disabled={roleOptions.length === 0}
            aria-label="Filter by role"
          >
            <option value="ALL">
              {roleOptions.length === 0 ? "No roles on this project" : "All roles"}
            </option>
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="SCORE">Highest match score</option>
            <option value="RECENT">Most recent</option>
            <option value="RATING">Highest rated</option>
          </Select>
        </div>
      </div>

      {/* ---- Capacity notice ---- */}
      {projectFilter !== "ALL" &&
        (() => {
          const cap = getCapacity(projectFilter);
          if (!cap.projectFull) return null;
          return (
            <Alert tone="warning" className="mt-4" title="This project is at capacity">
              All {cap.projectLimit} primary slots are filled. Remaining open applicants on a filled
              role are closed out automatically — apprentices are spared while a role still accepts
              one.
            </Alert>
          );
        })()}

      {/* ---- Results ---- */}
      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title={query ? "No applicants match that search" : "No applicants here yet"}
            description={
              query
                ? "Try a different name or clear the project filter."
                : "Applications appear here the moment someone applies to one of your listings."
            }
            action={
              query
                ? { label: "Clear search", onClick: () => setQuery("") }
                : { label: "Post a project", href: "/company/projects/new" }
            }
          />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-4">
              <Checkbox
                checked={selected.length === filtered.length && filtered.length > 0}
                onChange={(e) =>
                  setSelected(e.target.checked ? filtered.map((a) => a.id) : [])
                }
                label={
                  selected.length > 0
                    ? `${selected.length} selected`
                    : `Select all ${filtered.length}`
                }
              />
            </div>

            <Stagger className="flex flex-col gap-3">
              {filtered.map((a) => {
                const isSelected = selected.includes(a.id);
                return (
                  <StaggerItem key={a.id}>
                    <Card
                      padding="md"
                      className={
                        isSelected ? "border-[var(--color-brand)] bg-[var(--color-brand-softer)]" : ""
                      }
                    >
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) =>
                              setSelected((prev) =>
                                e.target.checked
                                  ? [...prev, a.id]
                                  : prev.filter((x) => x !== a.id),
                              )
                            }
                            aria-label={`Select ${a.freelancer.name}`}
                          />
                          <Link href={`/company/applicants/${a.id}`}>
                            <Avatar
                              src={a.freelancer.avatarUrl}
                              name={a.freelancer.name}
                              size="lg"
                            />
                          </Link>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/company/applicants/${a.id}`}
                                  className="text-[15px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                                >
                                  {a.freelancer.name}
                                </Link>
                                <StatusIndicator status={a.status} kind="application" size="sm" />
                                {a.isApprentice && (
                                  <Badge tone="info" size="sm" icon={<GraduationCap />}>
                                    Apprentice
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 line-clamp-1 text-[13px] text-[var(--color-text-secondary)]">
                                {a.freelancer.professionalHeadline}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-muted)]">
                                <Rating value={a.freelancer.rating} size="sm" />
                                <span>{a.freelancer.experienceYears}y experience</span>
                                <span>{a.freelancer.completedProjects} completed</span>
                                <span>{a.freelancer.location}</span>
                              </div>
                            </div>
                            <MatchScore score={a.aiScore} size={52} />
                          </div>

                          <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3">
                            <p className="line-clamp-2 text-[12.5px] leading-[1.6] text-[var(--color-text-secondary)]">
                              {a.coverLetter}
                            </p>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span className="text-[12px] text-[var(--color-text-muted)]">
                              {a.project.title}
                              {a.roleName ? ` · ${a.roleName}` : ""}
                            </span>
                            <span className="text-[12px] text-[var(--color-text-muted)]">
                              Applied {relativeTime(a.createdAt)}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {a.freelancer.skills.slice(0, 3).map((s) => (
                                <Chip key={s} size="sm" className="capitalize">
                                  {s}
                                </Chip>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
                            <Button
                              href={`/company/applicants/${a.id}`}
                              size="sm"
                              variant="secondary"
                              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                            >
                              Full application
                            </Button>

                            {a.status === "PENDING" && (
                              <Button
                                size="sm"
                                leftIcon={<Star className="h-3.5 w-3.5" />}
                                onClick={() =>
                                  transition([a.id], "SHORTLISTED", "Applicant shortlisted")
                                }
                              >
                                Shortlist
                              </Button>
                            )}

                            {(a.status === "PENDING" || a.status === "SHORTLISTED") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="soft"
                                  leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                                  onClick={() => setHireTarget(a)}
                                >
                                  Hire
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  leftIcon={<UserX className="h-3.5 w-3.5" />}
                                  onClick={() =>
                                    transition([a.id], "REJECTED", "Application closed")
                                  }
                                >
                                  Close
                                </Button>
                              </>
                            )}

                            {a.status === "REJECTED" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  transition([a.id], "PENDING", "Application reopened")
                                }
                              >
                                Reconsider
                              </Button>
                            )}

                            {a.status === "HIRED" && (
                              <Badge tone="success" icon={<CheckCircle2 />}>
                                {a.teamConfirmedAt ? "Confirmed on the team" : "Awaiting their confirmation"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </>
        )}
      </div>

      {/* ---- Bulk confirm ---- */}
      <ConfirmDialog
        open={bulkAction === "shortlist"}
        onClose={() => setBulkAction(null)}
        onConfirm={() => transition(selected, "SHORTLISTED", "Applicants shortlisted")}
        title={`Shortlist ${selected.length} applicants?`}
        message="Each one is notified that they have been shortlisted. You can still close them later."
        confirmLabel="Shortlist all"
      />

      <ConfirmDialog
        open={bulkAction === "reject"}
        onClose={() => setBulkAction(null)}
        onConfirm={() => transition(selected, "REJECTED", "Applications closed")}
        title={`Close ${selected.length} applications?`}
        message="Each applicant is notified. Closed applications can be reconsidered later, but they cannot be moved straight to hired."
        confirmLabel="Close all"
        destructive
      />

      {/* ---- Hire confirm ---- */}
      <ConfirmDialog
        open={Boolean(hireTarget)}
        onClose={() => setHireTarget(null)}
        onConfirm={() => hireTarget && hire(hireTarget)}
        title={`Hire ${hireTarget?.freelancer.name}?`}
        message={
          hireTarget
            ? `This fills ${hireTarget.isApprentice ? "an apprentice place on" : "a slot on"} ${hireTarget.roleName ?? "the project"} and opens a workspace. When the last primary slot fills, remaining open applicants on that role are closed out automatically and the project moves to in-progress.`
            : ""
        }
        confirmLabel="Hire and open workspace"
      />
    </div>
  );
}
