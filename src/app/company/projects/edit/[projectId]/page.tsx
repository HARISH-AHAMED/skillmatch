"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Send, Users } from "lucide-react";
import { useState } from "react";
import { Badge, Chip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Checkbox, Field, Input, Select, Textarea, Toggle } from "@/components/ui/Field";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import {
  COMPENSATION_META,
  CURRENCIES,
  MAX_ROLE_SLOTS,
  PROJECT_CATEGORIES,
  SKILL_LIBRARY,
  TIMING_TYPE_OPTIONS,
  WORKING_DAYS_OPTIONS,
} from "@/lib/constants";
import { getProject, hiredApplications, isProjectMutable } from "@/data/queries";
import type { CompensationType } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export default function EditProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const toast = useToast();

  const project = getProject(projectId);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [form, setForm] = useState(() => ({
    title: project?.title ?? "",
    category: project?.category ?? PROJECT_CATEGORIES[0],
    description: project?.description ?? "",
    budget: String(project?.compensation.totalBudget ?? ""),
    currency: project?.compensation.currency ?? "USD",
    compensationType: (project?.compensation.type ?? "FIXED") as CompensationType,
    hourlyRate: String(project?.compensation.hourlyRate ?? ""),
    maxHours: String(project?.compensation.maxHours ?? ""),
    stipendAmount: String(project?.compensation.stipendAmount ?? ""),
    stipendPeriods: String(project?.compensation.stipendPeriods ?? 1),
    freelancersLimit: String(project?.freelancersLimit ?? 1),
    experienceRequired: String(project?.experienceRequired ?? 0),
    duration: project?.duration ?? "",
    workingDays: project?.workingDays ?? WORKING_DAYS_OPTIONS[0],
    timingType: project?.timingType ?? TIMING_TYPE_OPTIONS[0],
    priority: project?.priority ?? "MEDIUM",
    dueDate: project?.dueDate?.slice(0, 10) ?? "",
    isVisible: project?.isVisible ?? true,
  }));

  const [skills, setSkills] = useState<string[]>(project?.requiredSkills ?? []);
  const [skillQuery, setSkillQuery] = useState("");
  const [roles, setRoles] = useState(
    () =>
      project?.roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        slots: r.slots,
        allowApprentice: r.allowApprentice,
        hiredCount: r.hiredCount,
      })) ?? [],
  );

  if (!project) notFound();

  const isDraft = project.status === "DRAFT";
  const mutable = isProjectMutable(project.status);
  const hired = hiredApplications(project.id);

  if (!mutable) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <Card padding="lg" className="text-center">
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
            This project can no longer be edited
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">
            {project.status === "COMPLETED"
              ? "Completed projects are read-only so the record of what was agreed cannot drift after the fact."
              : project.status === "CLOSED"
                ? "This project is closed and cannot be reopened."
                : "This project is in a terminal state and is read-only."}
          </p>
          <Button href={`/company/projects/${project.id}`} className="mt-5">
            View the project
          </Button>
        </Card>
      </div>
    );
  }

  const validate = () => {
    const found: string[] = [];
    if (!form.title.trim() || form.title.trim() === "Untitled draft")
      found.push("a project title");
    if (!form.description.trim()) found.push("a description");
    if (form.compensationType !== "UNPAID" && Number(form.budget) <= 0)
      found.push("a budget greater than zero");
    if (skills.length === 0) found.push("at least one required skill");

    for (const r of roles) {
      const minimum = r.hiredCount;
      if (r.slots < minimum) {
        found.push(
          `${r.slots} slots on "${r.name}" — it already has ${minimum} hired, so it cannot go below ${minimum}`,
        );
      }
      if (r.slots > MAX_ROLE_SLOTS) found.push(`no more than ${MAX_ROLE_SLOTS} slots per role`);
    }
    return found;
  };

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setErrors([]);
      toast.success(
        "Project updated",
        "Match scores and recommendations have been recalculated.",
      );
    }, 600);
  };

  const publish = () => {
    const missing = validate();
    if (missing.length) {
      setErrors(missing);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      toast.success("Draft published", "Freelancers with matching skills have been notified.");
      router.push(`/company/projects/${project.id}`);
    }, 700);
  };

  const filteredSkills = SKILL_LIBRARY.filter(
    (s) => s.includes(skillQuery.toLowerCase()) && !skills.includes(s),
  ).slice(0, 8);

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

      <PageHeader
        title={isDraft ? "Continue your draft" : "Edit project"}
        description={
          isDraft
            ? "Drafts are invisible on both signals — status and visibility — until you publish."
            : "Changes go live immediately and recommendations are recalculated."
        }
        action={
          <>
            <Button variant="secondary" onClick={save} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
              Save changes
            </Button>
            {isDraft && (
              <Button onClick={publish} loading={publishing} leftIcon={<Send className="h-4 w-4" />}>
                Publish
              </Button>
            )}
          </>
        }
      />

      {errors.length > 0 && (
        <Alert tone="error" className="mb-5" title="Add the following before publishing">
          <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}

      {hired.length > 0 && (
        <Alert tone="info" className="mb-5" title="This project has active hires">
          {hired.length} freelancer(s) are working on this. Role slots cannot be reduced below the
          number already hired into them, and the compensation model is fixed while money is
          committed.
        </Alert>
      )}

      <div className="flex flex-col gap-5">
        {/* ---- Basics ---- */}
        <Card padding="lg">
          <CardHeader title="Basics" />
          <div className="flex flex-col gap-4">
            <Field label="Project title" required>
              <Input
                inputSize="lg"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" required>
                <Select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {PROJECT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Urgency">
                <Select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value as typeof f.priority }))
                  }
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High — flagged as urgent</option>
                </Select>
              </Field>
            </div>

            <Field label="Description" required>
              <Textarea
                rows={8}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>

            <Toggle
              checked={form.isVisible}
              onChange={(v) => setForm((f) => ({ ...f, isVisible: v }))}
              label="Listed publicly"
              description="Hiding a listing stops it appearing in browse, without closing it."
            />
          </div>
        </Card>

        {/* ---- Skills ---- */}
        <Card padding="lg">
          <CardHeader
            title="Required skills"
            description="These drive half of every applicant's match score."
          />
          {skills.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {skills.map((s) => (
                <Chip
                  key={s}
                  active
                  className="capitalize"
                  onRemove={() => setSkills((p) => p.filter((x) => x !== s))}
                >
                  {s}
                </Chip>
              ))}
            </div>
          )}
          <Input
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            placeholder="Type a skill and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter" && skillQuery.trim()) {
                e.preventDefault();
                const v = skillQuery.trim().toLowerCase();
                if (!skills.includes(v)) setSkills((p) => [...p, v]);
                setSkillQuery("");
              }
            }}
          />
          {skillQuery && filteredSkills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filteredSkills.map((s) => (
                <Chip
                  key={s}
                  size="sm"
                  className="capitalize"
                  onClick={() => {
                    setSkills((p) => [...p, s]);
                    setSkillQuery("");
                  }}
                >
                  <Plus className="h-3 w-3" />
                  {s}
                </Chip>
              ))}
            </div>
          )}
        </Card>

        {/* ---- Compensation ---- */}
        <Card padding="lg">
          <CardHeader
            title="Compensation"
            description={`Currently ${COMPENSATION_META[form.compensationType].label}. The model is the single source of truth for money on this project.`}
          />
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Model" required>
                <Select
                  value={form.compensationType}
                  disabled={hired.length > 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      compensationType: e.target.value as CompensationType,
                    }))
                  }
                >
                  {(Object.keys(COMPENSATION_META) as CompensationType[]).map((t) => (
                    <option key={t} value={t}>
                      {COMPENSATION_META[t].label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Currency" required>
                <Select
                  value={form.currency}
                  disabled={hired.length > 0}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name} ({c.symbol})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {form.compensationType !== "UNPAID" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Total budget" required>
                  <Input
                    type="number"
                    min={0}
                    value={form.budget}
                    onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  />
                </Field>
                {form.compensationType === "HOURLY" && (
                  <>
                    <Field
                      label="Hourly rate"
                      help="Approved work keeps the rate that was in force when it was logged."
                    >
                      <Input
                        type="number"
                        min={0}
                        value={form.hourlyRate}
                        onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                      />
                    </Field>
                    <Field label="Maximum hours">
                      <Input
                        type="number"
                        min={0}
                        value={form.maxHours}
                        onChange={(e) => setForm((f) => ({ ...f, maxHours: e.target.value }))}
                      />
                    </Field>
                  </>
                )}
                {form.compensationType === "STIPEND" && (
                  <>
                    <Field label="Stipend amount">
                      <Input
                        type="number"
                        min={0}
                        value={form.stipendAmount}
                        onChange={(e) => setForm((f) => ({ ...f, stipendAmount: e.target.value }))}
                      />
                    </Field>
                    <Field label="Periods">
                      <Input
                        type="number"
                        min={1}
                        value={form.stipendPeriods}
                        onChange={(e) => setForm((f) => ({ ...f, stipendPeriods: e.target.value }))}
                      />
                    </Field>
                  </>
                )}
              </div>
            )}

            {hired.length > 0 && (
              <p className="text-[12.5px] leading-[1.55] text-[var(--color-text-muted)]">
                The model and currency are locked because money is already committed on this
                project. Changing them would leave existing ledger entries denominated in a currency
                the project no longer uses.
              </p>
            )}
          </div>
        </Card>

        {/* ---- Roles ---- */}
        <Card padding="lg">
          <CardHeader
            title="Roles & slots"
            description="Slots can never drop below the number already hired into a role."
            icon={<Users />}
            action={
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() =>
                  setRoles((p) => [
                    ...p,
                    {
                      id: `role-new-${Date.now()}`,
                      name: "",
                      description: "",
                      slots: 1,
                      allowApprentice: false,
                      hiredCount: 0,
                    },
                  ])
                }
              >
                Add role
              </Button>
            }
          />
          {roles.length === 0 ? (
            <EmptyState
              compact
              icon={<Users />}
              title="No named roles"
              description={`Hiring is capped at ${form.freelancersLimit} with no role structure.`}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {roles.map((role) => (
                <li
                  key={role.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                    <Field label="Role name" required>
                      <Input
                        value={role.name}
                        onChange={(e) =>
                          setRoles((p) =>
                            p.map((r) => (r.id === role.id ? { ...r, name: e.target.value } : r)),
                          )
                        }
                      />
                    </Field>
                    <Field
                      label="Slots"
                      required
                      help={role.hiredCount > 0 ? `Min ${role.hiredCount}` : undefined}
                    >
                      <Input
                        type="number"
                        min={Math.max(1, role.hiredCount)}
                        max={MAX_ROLE_SLOTS}
                        value={role.slots}
                        invalid={role.slots < role.hiredCount}
                        onChange={(e) =>
                          setRoles((p) =>
                            p.map((r) =>
                              r.id === role.id ? { ...r, slots: Number(e.target.value) } : r,
                            ),
                          )
                        }
                      />
                    </Field>
                  </div>

                  <Field label="What this role owns" className="mt-3">
                    <Textarea
                      rows={2}
                      value={role.description}
                      onChange={(e) =>
                        setRoles((p) =>
                          p.map((r) =>
                            r.id === role.id ? { ...r, description: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </Field>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3">
                    <Checkbox
                      checked={role.allowApprentice}
                      onChange={(e) =>
                        setRoles((p) =>
                          p.map((r) =>
                            r.id === role.id ? { ...r, allowApprentice: e.target.checked } : r,
                          ),
                        )
                      }
                      label="Allow an apprentice on this role"
                    />
                    <div className="flex items-center gap-3">
                      {role.hiredCount > 0 && (
                        <Badge tone="info" size="sm">
                          {role.hiredCount} hired
                        </Badge>
                      )}
                      <button
                        type="button"
                        disabled={role.hiredCount > 0}
                        onClick={() => setRoles((p) => p.filter((r) => r.id !== role.id))}
                        title={
                          role.hiredCount > 0
                            ? "A role with applications cannot be deleted. Reduce its slot count instead."
                            : "Remove role"
                        }
                        className="text-[12.5px] font-medium text-[var(--color-error-fg)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--color-text-disabled)] disabled:no-underline"
                      >
                        Remove role
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---- Logistics ---- */}
        <Card padding="lg">
          <CardHeader title="Timeline & commitment" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="People to hire"
              required
              help={hired.length > 0 ? `At least ${hired.length} already hired` : undefined}
            >
              <Input
                type="number"
                min={Math.max(1, hired.length)}
                value={form.freelancersLimit}
                onChange={(e) => setForm((f) => ({ ...f, freelancersLimit: e.target.value }))}
              />
            </Field>
            <Field label="Minimum experience">
              <Select
                value={form.experienceRequired}
                onChange={(e) => setForm((f) => ({ ...f, experienceRequired: e.target.value }))}
              >
                {[0, 1, 2, 3, 4, 5, 6, 8, 10].map((y) => (
                  <option key={y} value={String(y)}>
                    {y === 0 ? "Open to all levels" : `${y}+ years`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Duration">
              <Input
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                placeholder="4 months"
              />
            </Field>
            <Field label="Target completion">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </Field>
            <Field label="Working days">
              <Select
                value={form.workingDays}
                onChange={(e) => setForm((f) => ({ ...f, workingDays: e.target.value }))}
              >
                {WORKING_DAYS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Commitment">
              <Select
                value={form.timingType}
                onChange={(e) => setForm((f) => ({ ...f, timingType: e.target.value }))}
              >
                {TIMING_TYPE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        {/* ---- Footer actions ---- */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)]">
          <p className="text-[12.5px] text-[var(--color-text-muted)]">
            {form.compensationType === "UNPAID"
              ? "Non-monetary engagement"
              : `Project value ${formatMoney(Number(form.budget) || 0, form.currency)}`}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={save} loading={saving}>
              Save changes
            </Button>
            {isDraft && (
              <Button onClick={publish} loading={publishing}>
                Publish project
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
