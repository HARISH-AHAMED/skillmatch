"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Flag,
  Globe,
  GraduationCap,
  ListChecks,
  MapPin,
  MessageCircleQuestion,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip, MatchScore, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Alert, Progress, Rating } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { COMPENSATION_META } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { cn, daysUntil, formatDate, formatMoney, relativeTime } from "@/lib/utils";
import { compensationLine } from "./Cards";

/* ------------------------------------------------------------ small parts -- */

function ListBlock({
  icon,
  title,
  items,
  numbered,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  numbered?: boolean;
}) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
        <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand-active)] [&>svg]:h-3.5 [&>svg]:w-3.5">
          {icon}
        </span>
        {title}
      </h3>
      <ul className="mt-3 flex flex-col gap-2.5 pl-1">
        {items.map((item, i) => (
          <li key={item} className="flex items-start gap-3">
            {numbered ? (
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[11px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                {i + 1}
              </span>
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
            )}
            <span className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
        <span className="text-[var(--color-text-muted)] [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        {label}
      </span>
      <span className="text-right text-[13px] font-medium text-[var(--color-text-primary)]">
        {value}
      </span>
    </div>
  );
}

/* ============================================================================
   PROJECT DETAIL VIEW
   ========================================================================= */

export function ProjectDetailView({
  project,
  matchScore,
  applyHref,
  hasApplied,
  canApply = true,
  isOwner,
  ownerActions,
  saved: savedInitial = false,
  onToggleSave,
  onAskQuestion,
}: {
  project: Project;
  matchScore?: number;
  applyHref?: string;
  hasApplied?: boolean;
  canApply?: boolean;
  isOwner?: boolean;
  ownerActions?: React.ReactNode;
  saved?: boolean;
  onToggleSave?: () => void;
  onAskQuestion?: (question: string) => void;
}) {
  const toast = useToast();
  const [saved, setSaved] = useState(savedInitial);
  const [question, setQuestion] = useState("");

  const comp = project.compensation;
  const meta = COMPENSATION_META[comp.type];
  const days = project.dueDate ? daysUntil(project.dueDate) : null;
  const deadlineDays = project.applicationDeadline ? daysUntil(project.applicationDeadline) : null;

  const totalSlots = project.roles.reduce((s, r) => s + r.slots, 0);
  const filledSlots = project.roles.reduce((s, r) => s + r.hiredCount, 0);

  const applyBlockedReason = !canApply
    ? project.visibility === "PRIVATE"
      ? "This project is not open to applications."
      : project.visibility === "INVITE_ONLY"
        ? "This project is invite-only. Follow the company to be considered for an invitation."
        : project.status !== "OPEN" && project.status !== "IN_PROGRESS"
          ? "This project is no longer accepting applications."
          : "This project has already reached its hiring limit."
    : null;

  return (
    <div>
      {/* ---------------------------------------------------------- banner -- */}
      <div className="relative h-48 w-full overflow-hidden bg-[var(--color-surface-sunken)] md:h-64 lg:h-72">
        <Image
          src={project.bannerUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.85)] via-[rgba(12,20,17,0.35)] to-[rgba(12,20,17,0.15)]" />

        <div className="container-wide relative flex h-full flex-col justify-end pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIndicator status={project.status} kind="project" size="sm" />
            <Badge tone={comp.type === "UNPAID" ? "warning" : "brand"} size="sm">
              {meta.label}
            </Badge>
            {project.priority === "HIGH" && (
              <Badge tone="error" size="sm">
                Urgent
              </Badge>
            )}
            {project.visibility === "INVITE_ONLY" && (
              <Badge tone="neutral" size="sm">
                Invite only
              </Badge>
            )}
          </div>
          <h1 className="mt-3 max-w-3xl text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-white md:text-[32px]">
            {project.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/80">
            <Link
              href={`/companies/${project.company.id}`}
              className="inline-flex items-center gap-2 font-medium text-white hover:underline"
            >
              <Avatar
                name={project.company.companyName}
                src={project.company.logoUrl}
                size="xs"
                rounded="md"
              />
              {project.company.companyName}
            </Link>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {project.company.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {project.viewCount.toLocaleString()} views
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {project.applicantCount} applied
            </span>
            <span>Posted {relativeTime(project.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ body -- */}
      <div className="container-wide py-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
          {/* ---- Main column ---- */}
          <div className="flex min-w-0 flex-col gap-5">
            {applyBlockedReason && !isOwner && (
              <Alert tone="warning" title="Applications are closed">
                {applyBlockedReason}
              </Alert>
            )}

            {hasApplied && (
              <Alert tone="success" title="You have applied to this project">
                Track its progress from your applications page. You will be notified when the
                company moves you through the pipeline.
              </Alert>
            )}

            {/* About */}
            <Card padding="lg">
              <CardHeader title="About this engagement" icon={<ClipboardList />} />
              <div className="flex flex-col gap-4">
                {project.description.split("\n\n").map((para, i) => (
                  <p
                    key={i}
                    className="text-[14.5px] leading-[1.72] text-[var(--color-text-secondary)]"
                  >
                    {para}
                  </p>
                ))}
                {!project.description && (
                  <p className="text-[14px] italic text-[var(--color-text-muted)]">
                    No description has been written yet.
                  </p>
                )}
              </div>
            </Card>

            {/* Objectives / deliverables / responsibilities */}
            {(project.objectives.length > 0 ||
              project.deliverables.length > 0 ||
              project.responsibilities.length > 0 ||
              project.dailyTasks.length > 0) && (
              <Card padding="lg">
                <div className="flex flex-col gap-7">
                  <ListBlock icon={<Target />} title="Objectives" items={project.objectives} />
                  <ListBlock
                    icon={<ListChecks />}
                    title="Deliverables"
                    items={project.deliverables}
                    numbered
                  />
                  <ListBlock
                    icon={<Users />}
                    title="Responsibilities"
                    items={project.responsibilities}
                  />
                  <ListBlock
                    icon={<Clock />}
                    title="Day to day"
                    items={project.dailyTasks}
                  />
                </div>
              </Card>
            )}

            {/* Skills */}
            <Card padding="lg">
              <CardHeader
                title="Skills"
                description="Required skills are matched against your profile to produce the AI score."
                icon={<Sparkles />}
              />
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
                  Required
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {project.requiredSkills.length ? (
                    project.requiredSkills.map((s) => (
                      <Chip key={s} active className="capitalize">
                        {s}
                      </Chip>
                    ))
                  ) : (
                    <p className="text-[13px] text-[var(--color-text-muted)]">
                      No required skills listed.
                    </p>
                  )}
                </div>
              </div>
              {project.preferredSkills.length > 0 && (
                <div className="mt-5">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
                    Nice to have
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {project.preferredSkills.map((s) => (
                      <Chip key={s} className="capitalize">
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Roles */}
            {project.roles.length > 0 && (
              <Card padding="lg">
                <CardHeader
                  title="Open roles"
                  description={`${filledSlots} of ${totalSlots} slots filled. Apprentices shadow a role without using a slot.`}
                  icon={<Users />}
                  action={
                    <Badge tone={filledSlots >= totalSlots ? "neutral" : "success"}>
                      {totalSlots - filledSlots} open
                    </Badge>
                  }
                />
                <div className="flex flex-col gap-3">
                  {project.roles.map((role) => {
                    const open = role.slots - role.hiredCount;
                    return (
                      <div
                        key={role.id}
                        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                              {role.name}
                            </h4>
                            {role.description && (
                              <p className="mt-1 text-[13px] leading-[1.55] text-[var(--color-text-secondary)]">
                                {role.description}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {role.allowApprentice && (
                              <Badge tone="info" size="sm" icon={<GraduationCap />}>
                                Apprentice slot
                              </Badge>
                            )}
                            <Badge tone={open > 0 ? "success" : "neutral"} size="sm">
                              {open > 0 ? `${open} of ${role.slots} open` : "Filled"}
                            </Badge>
                          </div>
                        </div>
                        <Progress
                          className="mt-3"
                          value={role.hiredCount}
                          max={role.slots}
                          size="sm"
                          tone={open > 0 ? "brand" : "neutral"}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Screening */}
            {project.rounds.length > 0 && (
              <Card padding="lg">
                <CardHeader
                  title="Selection process"
                  description="What happens after you apply, in order."
                  icon={<ShieldCheck />}
                />
                <ol className="flex flex-col gap-3">
                  {project.rounds.map((round, i) => (
                    <li
                      key={round.id}
                      className="flex items-start gap-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[12px] font-bold text-[var(--color-brand-active)]">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[14px] font-medium text-[var(--color-text-primary)]">
                            {round.name}
                          </h4>
                          {round.comingSoon && (
                            <Badge tone="neutral" size="sm">
                              Coming soon
                            </Badge>
                          )}
                        </div>
                        {round.questions.length > 0 && (
                          <p className="mt-1 text-[12.5px] text-[var(--color-text-secondary)]">
                            {round.questions.length} questions ·{" "}
                            {round.questions.filter((q) => q.required).length} required
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {/* Discussion / FAQ */}
            <Card padding="lg">
              <CardHeader
                title="Questions about this project"
                description="Asked by applicants, answered by the company. Everyone can see both."
                icon={<MessageCircleQuestion />}
              />

              {project.faq.length === 0 ? (
                <p className="text-[13.5px] text-[var(--color-text-muted)]">
                  No questions yet. If something in the brief is unclear, ask — the answer helps
                  everyone applying.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {project.faq.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar name={entry.askedBy ?? "Applicant"} size="xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-medium leading-[1.55] text-[var(--color-text-primary)]">
                            {entry.question}
                          </p>
                          <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                            {entry.askedBy ?? "An applicant"} ·{" "}
                            {entry.askedAt ? relativeTime(entry.askedAt) : "recently"}
                          </p>
                        </div>
                      </div>

                      {entry.answer ? (
                        <div className="mt-3 flex items-start gap-3 rounded-[var(--radius-sm)] bg-[var(--color-brand-softer)] p-3">
                          <Avatar
                            name={project.company.companyName}
                            src={project.company.logoUrl}
                            size="xs"
                            rounded="md"
                          />
                          <div className="min-w-0">
                            <p className="text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                              {entry.answer}
                            </p>
                            <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                              {project.company.companyName} ·{" "}
                              {entry.answeredAt ? relativeTime(entry.answeredAt) : "recently"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-[12.5px] italic text-[var(--color-text-muted)]">
                          Awaiting a reply from {project.company.companyName}.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {onAskQuestion && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!question.trim()) return;
                    onAskQuestion(question.trim());
                    setQuestion("");
                    toast.success(
                      "Question posted",
                      "The company will be notified. Answers appear here for everyone.",
                    );
                  }}
                  className="mt-5 border-t border-[var(--color-border-subtle)] pt-5"
                >
                  <Textarea
                    rows={3}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about scope, timelines, tooling or the selection process…"
                    aria-label="Ask a question"
                  />
                  <div className="mt-2.5 flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!question.trim()}
                      leftIcon={<Send className="h-3.5 w-3.5" />}
                    >
                      Post question
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>

          {/* ---- Sidebar ---- */}
          <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[76px] lg:self-start">
            {/* Apply card */}
            <Card padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                    {meta.label}
                  </p>
                  <p className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)]">
                    {comp.type === "UNPAID"
                      ? "Non-monetary"
                      : comp.type === "HOURLY"
                        ? `${formatMoney(comp.hourlyRate ?? 0, comp.currency)}/hr`
                        : comp.type === "STIPEND"
                          ? formatMoney(comp.stipendAmount ?? 0, comp.currency)
                          : formatMoney(comp.totalBudget, comp.currency)}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--color-text-secondary)]">
                    {compensationLine(project)}
                  </p>
                </div>
                {matchScore !== undefined && <MatchScore score={matchScore} size={52} />}
              </div>

              {comp.type === "UNPAID" && comp.nonMonetaryBenefits?.length ? (
                <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3">
                  <p className="text-[12px] font-semibold text-[var(--color-warning-fg)]">
                    What you get instead
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {comp.nonMonetaryBenefits.map((b) => (
                      <li key={b}>
                        <Badge tone="warning" size="sm">
                          {b}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  {comp.nonMonetaryDetail && (
                    <p className="mt-2 text-[12px] leading-[1.5] text-[var(--color-warning-fg)]">
                      {comp.nonMonetaryDetail}
                    </p>
                  )}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2">
                {isOwner ? (
                  ownerActions
                ) : hasApplied ? (
                  <Button href="/freelancer/applications" variant="secondary" block size="lg">
                    View your application
                  </Button>
                ) : (
                  <Button
                    href={canApply ? applyHref : undefined}
                    disabled={!canApply || !applyHref}
                    block
                    size="lg"
                  >
                    {canApply ? "Apply to this project" : "Applications closed"}
                  </Button>
                )}

                {!isOwner && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      block
                      leftIcon={
                        <Bookmark
                          className={cn(
                            "h-4 w-4",
                            saved && "fill-[var(--color-brand)] text-[var(--color-brand)]",
                          )}
                        />
                      }
                      onClick={() => {
                        setSaved((v) => !v);
                        onToggleSave?.();
                        toast.toast({
                          title: saved ? "Removed from saved" : "Saved",
                          tone: "success",
                        });
                      }}
                    >
                      {saved ? "Saved" : "Save"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      aria-label="Share"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Link copied");
                        }
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {deadlineDays !== null && deadlineDays > 0 && !isOwner && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[var(--color-text-muted)]">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Applications close in {deadlineDays} days
                </p>
              )}
            </Card>

            {/* Key details */}
            <Card padding="md">
              <h3 className="mb-1 text-[14px] font-semibold text-[var(--color-text-primary)]">
                At a glance
              </h3>
              <div className="divide-y divide-[var(--color-border-subtle)]">
                <MetaRow icon={<Building2 />} label="Category" value={project.category} />
                {project.subcategory && (
                  <MetaRow icon={<Flag />} label="Speciality" value={project.subcategory} />
                )}
                <MetaRow
                  icon={<Users />}
                  label="Hiring"
                  value={`${project.freelancersLimit} ${project.freelancersLimit === 1 ? "person" : "people"}`}
                />
                <MetaRow
                  icon={<GraduationCap />}
                  label="Experience"
                  value={
                    project.experienceRequired === 0
                      ? "Open to all levels"
                      : `${project.experienceRequired}+ years`
                  }
                />
                {project.duration && (
                  <MetaRow icon={<Clock />} label="Duration" value={project.duration} />
                )}
                <MetaRow icon={<CalendarClock />} label="Commitment" value={project.timingType} />
                <MetaRow icon={<CalendarClock />} label="Working days" value={project.workingDays} />
                {project.projectStart && (
                  <MetaRow
                    icon={<CalendarClock />}
                    label="Starts"
                    value={formatDate(project.projectStart)}
                  />
                )}
                {project.dueDate && (
                  <MetaRow
                    icon={<CalendarClock />}
                    label="Target completion"
                    value={
                      <span className={cn(days !== null && days < 14 && "text-[var(--color-warning-fg)]")}>
                        {formatDate(project.dueDate)}
                      </span>
                    }
                  />
                )}
                <MetaRow
                  icon={<Globe />}
                  label="Visibility"
                  value={
                    project.visibility === "PUBLIC"
                      ? "Listed publicly"
                      : project.visibility === "INVITE_ONLY"
                        ? "Searchable, invite only"
                        : "Private"
                  }
                />
              </div>
            </Card>

            {/* Company card */}
            <Card padding="md">
              <div className="flex items-start gap-3">
                <Avatar
                  name={project.company.companyName}
                  src={project.company.logoUrl}
                  size="lg"
                  rounded="md"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/companies/${project.company.id}`}
                    className="block truncate text-[15px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                  >
                    {project.company.companyName}
                  </Link>
                  <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-text-secondary)]">
                    {project.company.industry}
                  </p>
                  <Rating value={project.company.rating} size="sm" className="mt-1.5" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2.5 text-center">
                  <p className="text-[16px] font-semibold tabular-nums text-[var(--color-brand-active)]">
                    {project.company.trustScore}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Trust score</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2.5 text-center">
                  <p className="text-[16px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {project.company.location.split(",").pop()?.trim()}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Based in</p>
                </div>
              </div>

              <Button
                href={`/companies/${project.company.id}`}
                variant="secondary"
                block
                size="sm"
                className="mt-3"
              >
                View company profile
              </Button>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
