"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, CheckCircle2, Edit3, Eye, EyeOff, LayoutGrid, MessageCircleQuestion, Send, Sparkles, Users, Wallet } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, MatchScore, StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { Alert, EmptyState, Progress, Rating } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ProjectDetailView } from "@/components/shared/ProjectDetailView";
import { closeProject, toggleProjectVisibility } from "@/actions/projectActions";
import { completeProject } from "@/actions/reviewActions";
import { replyToDiscussionQuestion } from "@/actions/workflowActions";
import { getProjectTeam, isProjectMutable, type FinancialSummary } from "@/lib/domain";
import type { Application, Freelancer, Project } from "@/lib/types";
import { formatMoney, relativeTime } from "@/lib/utils";

const TABS = [
  { id: "listing", label: "Listing" },
  { id: "applicants", label: "Applicants" },
  { id: "team", label: "Team & roles" },
  { id: "money", label: "Funding" },
  { id: "questions", label: "Questions" },
];

export function ProjectDetailClient({
  project,
  applicants,
  hired,
  summary,
  readiness,
  recommended,
}: {
  project: Project;
  applicants: Application[];
  hired: Application[];
  summary: FinancialSummary;
  readiness: { ready: boolean; reason?: string; completed?: boolean };
  recommended: Freelancer[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState("listing");
  const [visible, setVisible] = useState(project.isVisible);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [answered, setAnswered] = useState<string[]>([]);

  const data = useMemo(
    () => ({
      applicants,
      team: getProjectTeam(project, hired),
      summary,
      readiness,
      recommended,
    }),
    [project, applicants, hired, summary, readiness, recommended],
  );

  const mutable = isProjectMutable(project.status);
  const pending = data.applicants.filter((a) => a.status === "PENDING").length;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.push("/company/projects")}
        className="mb-4"
      >
        All projects
      </Button>

      {/* ---- Header ---- */}
      <Card padding="md" className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusIndicator status={project.status} kind="project" />
              {!visible && project.status !== "DRAFT" && (
                <Badge tone="neutral" icon={<EyeOff />}>
                  Hidden
                </Badge>
              )}
              {project.visibility !== "PUBLIC" && (
                <Badge tone="neutral">
                  {project.visibility === "INVITE_ONLY" ? "Invite only" : "Private"}
                </Badge>
              )}
            </div>
            <h1 className="mt-2.5 text-[22px] font-semibold leading-tight tracking-[-0.018em] text-[var(--color-text-primary)]">
              {project.title}
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--color-text-secondary)]">
              {project.category}
              {project.subcategory ? ` · ${project.subcategory}` : ""} · Posted{" "}
              {relativeTime(project.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {mutable && (
              <>
                <Button
                  href={`/company/projects/edit/${project.id}`}
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const was = visible;
                    setVisible(!was);
                    startTransition(async () => {
                      const result = await toggleProjectVisibility(project.id);
                      if (!result.success) {
                        setVisible(was);
                        toast.toast({ title: "Could not change visibility", tone: "error" });
                        return;
                      }
                      router.refresh();
                      toast.success(
                        result.isVisible ? "Listing is visible again" : "Listing hidden",
                      );
                    });
                  }}
                >
                  {visible ? "Hide" : "Show"}
                </Button>
              </>
            )}
            <Button
              href={`/company/projects/${project.id}/certificate`}
              variant="secondary"
              size="sm"
              leftIcon={<Award className="h-3.5 w-3.5" />}
            >
              Certificate
            </Button>
            {project.hiredCount > 0 && (
              <Button
                href="/company/workspace"
                size="sm"
                leftIcon={<LayoutGrid className="h-3.5 w-3.5" />}
              >
                Workspace
              </Button>
            )}
          </div>
        </div>

        {/* Stat strip */}
        <dl className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Applicants", value: data.applicants.length, sub: `${pending} awaiting review` },
            {
              label: "Hired",
              value: `${project.hiredCount}/${project.freelancersLimit}`,
              sub: data.team.isTeamComplete ? "team complete" : "still hiring",
            },
            {
              label: "Budget",
              value:
                project.compensation.type === "UNPAID"
                  ? "—"
                  : formatMoney(data.summary.budget, data.summary.currency, true),
              sub: project.compensation.type.toLowerCase(),
            },
            {
              label: "Released",
              value: formatMoney(data.summary.released, data.summary.currency, true),
              sub: `${formatMoney(data.summary.committed, data.summary.currency, true)} committed`,
            },
            { label: "Views", value: project.viewCount.toLocaleString(), sub: `${project.savedCount} saved` },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--color-surface)] px-4 py-3">
              <dd className="text-[18px] font-semibold tabular-nums tracking-[-0.015em] text-[var(--color-text-primary)]">
                {s.value}
              </dd>
              <dt className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">{s.label}</dt>
              <p className="text-[11px] text-[var(--color-text-muted)]">{s.sub}</p>
            </div>
          ))}
        </dl>

        {/* Lifecycle */}
        {mutable && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border-subtle)] pt-4">
            {data.readiness.ready ? (
              <Alert tone="success" title="Ready to complete" className="w-full">
                Every payment obligation is settled. Completing issues certificates to each hired
                freelancer and opens reviews for both sides.
                <div className="mt-2.5">
                  <Button size="sm" onClick={() => setCompleteOpen(true)}>
                    Mark project complete
                  </Button>
                </div>
              </Alert>
            ) : (
              project.hiredCount > 0 && (
                <Alert tone="warning" title="Not ready to complete" className="w-full">
                  {data.readiness.reason}
                </Alert>
              )
            )}
          </div>
        )}
      </Card>

      <Tabs
        items={TABS.map((t) => ({
          ...t,
          count:
            t.id === "applicants"
              ? data.applicants.length
              : t.id === "team"
                ? project.hiredCount
                : t.id === "questions"
                  ? project.faq.length
                  : undefined,
        }))}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {/* ================= LISTING ================= */}
      {tab === "listing" && (
        <div className="-mx-4 md:-mx-6 xl:-mx-8">
          <ProjectDetailView
            project={project}
            isOwner
            ownerActions={
              <>
                <Button href={`/company/projects/edit/${project.id}`} block>
                  Edit listing
                </Button>
                <Button
                  href={`/company/applicants?project=${project.id}`}
                  variant="secondary"
                  block
                >
                  Review {data.applicants.length} applicants
                </Button>
              </>
            }
          />
        </div>
      )}

      {/* ================= APPLICANTS ================= */}
      {tab === "applicants" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card padding="md">
            <CardHeader
              title="Applicants"
              description="Ranked by AI match score."
              icon={<Users />}
              action={
                <Button href={`/company/applicants?project=${project.id}`} variant="link" size="sm">
                  Full review view
                </Button>
              }
            />
            {data.applicants.length === 0 ? (
              <EmptyState
                compact
                icon={<Users />}
                title="No applications yet"
                description="Invite specific freelancers or wait for applications to arrive."
                action={{ label: "Search talent", href: "/company/freelancers" }}
              />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {data.applicants.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/company/applicants/${a.id}`}
                      className="flex items-center gap-3.5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5 transition-colors hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-hover)]"
                    >
                      <Avatar src={a.freelancer.avatarUrl} name={a.freelancer.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                            {a.freelancer.name}
                          </p>
                          <StatusIndicator status={a.status} kind="application" size="sm" />
                          {a.isApprentice && (
                            <Badge tone="info" size="sm">
                              Apprentice
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-secondary)]">
                          {a.roleName ?? "No role"} · {relativeTime(a.createdAt)}
                        </p>
                      </div>
                      <MatchScore score={a.aiScore} size={42} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <aside>
            <Card padding="md">
              <CardHeader
                title="Recommended talent"
                description="Top matches who have not applied yet."
                icon={<Sparkles />}
                divided={false}
                className="mb-3"
              />
              <ul className="flex flex-col gap-2.5">
                {data.recommended.map((f) => (
                  <li key={f.id} className="flex items-center gap-2.5">
                    <Avatar src={f.avatarUrl} name={f.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/company/freelancers/${f.id}`}
                        className="block truncate text-[12.5px] font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                      >
                        {f.name}
                      </Link>
                      <Rating value={f.rating} size="sm" />
                    </div>
                    {f.matchScore !== undefined && <MatchScore score={f.matchScore} size={34} />}
                  </li>
                ))}
              </ul>
              <Button href="/company/freelancers" variant="secondary" block size="sm" className="mt-3">
                Search all talent
              </Button>
            </Card>
          </aside>
        </div>
      )}

      {/* ================= TEAM ================= */}
      {tab === "team" && (
        <Card padding="md">
          <CardHeader
            title="Roles & roster"
            description={`${data.team.totalFilled} of ${data.team.totalSlots || project.freelancersLimit} primary slots filled. Apprentices occupy no slot.`}
            icon={<Users />}
          />
          {data.team.roles.length === 0 && data.team.unassigned.length === 0 ? (
            <EmptyState
              compact
              icon={<Users />}
              title="Nobody hired yet"
              description="Hire an applicant and they appear here with their role and confirmation state."
              action={{ label: "Review applicants", href: `/company/applicants?project=${project.id}` }}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {data.team.roles.map(({ role, members }) => {
                const primaries = members.filter((m) => !m.isApprentice);
                return (
                  <div
                    key={role.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {role.name}
                        </h3>
                        {role.description && (
                          <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                            {role.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {role.allowApprentice && (
                          <Badge tone="info" size="sm">
                            Apprentice allowed
                          </Badge>
                        )}
                        <Badge
                          tone={primaries.length >= role.slots ? "neutral" : "success"}
                          size="sm"
                        >
                          {primaries.length} of {role.slots}
                        </Badge>
                      </div>
                    </div>
                    <Progress className="mt-3" value={primaries.length} max={role.slots} size="sm" />
                    {members.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-2">
                        {members.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2.5"
                          >
                            <Avatar src={m.freelancer.avatarUrl} name={m.freelancer.name} size="sm" />
                            <Link
                              href={`/company/applicants/${m.id}`}
                              className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                            >
                              {m.freelancer.name}
                            </Link>
                            {m.isApprentice && (
                              <Badge tone="info" size="sm">
                                Apprentice
                              </Badge>
                            )}
                            {m.teamConfirmedAt ? (
                              <Badge tone="success" size="sm" icon={<CheckCircle2 />}>
                                Confirmed
                              </Badge>
                            ) : (
                              <Badge tone="warning" size="sm">
                                Unconfirmed
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ================= FUNDING ================= */}
      {tab === "money" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Project budget", value: data.summary.budget },
            { label: "Funded", value: data.summary.funded },
            { label: "Released", value: data.summary.released },
            { label: "Committed", value: data.summary.committed },
          ].map((t) => (
            <Card key={t.label} padding="md">
              <p className="text-[12px] text-[var(--color-text-secondary)]">{t.label}</p>
              <p className="mt-1.5 text-[20px] font-semibold tabular-nums tracking-[-0.018em] text-[var(--color-text-primary)]">
                {formatMoney(t.value, data.summary.currency)}
              </p>
            </Card>
          ))}
          <div className="sm:col-span-2 xl:col-span-4">
            <Card padding="md">
              <CardHeader
                title="Money moves in the workspace"
                description="Funding, reviewing and releasing all happen on the project workspace, where each stage is scoped to one hired freelancer."
                icon={<Wallet />}
              />
              <Progress
                value={data.summary.progress}
                label={`${formatMoney(data.summary.released, data.summary.currency)} released of ${formatMoney(data.summary.budget, data.summary.currency)}`}
              />
              {project.hiredCount > 0 ? (
                <Button href="/company/workspace" className="mt-4">
                  Open the workspace
                </Button>
              ) : (
                <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
                  A workspace opens as soon as you hire your first freelancer on this project.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ================= QUESTIONS ================= */}
      {tab === "questions" && (
        <Card padding="md">
          <CardHeader
            title="Discussion board"
            description="Questions asked by applicants on the public listing. Your answers are visible to everyone."
            icon={<MessageCircleQuestion />}
          />
          {project.faq.length === 0 ? (
            <EmptyState
              compact
              icon={<MessageCircleQuestion />}
              title="No questions yet"
              description="Applicants can ask about scope, timelines or the selection process from the listing page."
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {project.faq.map((entry) => {
                const isAnswered = Boolean(entry.answer) || answered.includes(entry.id);
                return (
                  <li
                    key={entry.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={entry.askedBy ?? "Applicant"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium leading-[1.55] text-[var(--color-text-primary)]">
                          {entry.question}
                        </p>
                        <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                          {entry.askedBy ?? "An applicant"} ·{" "}
                          {entry.askedAt ? relativeTime(entry.askedAt) : "recently"}
                        </p>
                      </div>
                      {!isAnswered && (
                        <Badge tone="warning" size="sm">
                          Needs a reply
                        </Badge>
                      )}
                    </div>

                    {entry.answer ? (
                      <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-brand-softer)] p-3">
                        <p className="text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                          {entry.answer}
                        </p>
                      </div>
                    ) : answered.includes(entry.id) ? (
                      <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-brand-softer)] p-3">
                        <p className="text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                          {replies[entry.id]}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <Textarea
                          rows={3}
                          value={replies[entry.id] ?? ""}
                          onChange={(e) =>
                            setReplies((p) => ({ ...p, [entry.id]: e.target.value }))
                          }
                          placeholder="Answer publicly — everyone considering this listing sees it."
                        />
                        <Button
                          size="sm"
                          className="mt-2"
                          disabled={!replies[entry.id]?.trim()}
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                          onClick={() => {
                            const answer = replies[entry.id] ?? "";
                            setAnswered((p) => [...p, entry.id]);
                            startTransition(async () => {
                              // FAQ entries are stored positionally, and the
                              // adapter keeps that index in the entry id.
                              const faqIndex = Number(entry.id.replace("faq-", ""));
                              const result = await replyToDiscussionQuestion(
                                project.id,
                                faqIndex,
                                answer,
                              );
                              if (!result.success) {
                                setAnswered((p) => p.filter((x) => x !== entry.id));
                                toast.toast({
                                  title: result.error ?? "Could not post your reply",
                                  tone: "error",
                                });
                                return;
                              }
                              router.refresh();
                              toast.success("Reply posted", "It is now visible on the listing.");
                            });
                          }}
                        >
                          Post reply
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {/* ---- Dialogs ---- */}
      <ConfirmDialog
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            let issued = project.hiredCount;
            try {
              const result = await completeProject(project.id);
              issued = result.certificatesIssued ?? project.hiredCount;
            } catch (error) {
              toast.toast({
                title:
                  error instanceof Error ? error.message : "Could not complete the project",
                tone: "error",
              });
              return;
            }
            router.refresh();
            toast.success(
              "Project completed",
              `Certificates issued to ${issued} freelancer(s). Reviews are now open for both sides.`,
            );
          })
        }
        title="Mark this project complete?"
        message="Certificates are issued automatically to every hired freelancer, and both sides can review each other. Completed projects are read-only."
        confirmLabel="Complete project"
      />

      <ConfirmDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            try {
              await closeProject(project.id);
            } catch (error) {
              toast.toast({
                title: error instanceof Error ? error.message : "Could not close the listing",
                tone: "error",
              });
              return;
            }
            router.refresh();
            toast.toast({ title: "Listing closed", tone: "info" });
          })
        }
        title="Close this listing?"
        message="This stops new applications. A closed project cannot be reopened."
        confirmLabel="Close listing"
        destructive
      />
    </div>
  );
}
