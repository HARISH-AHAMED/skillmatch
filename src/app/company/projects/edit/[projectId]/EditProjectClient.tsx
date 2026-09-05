"use client";

import { useRouter } from "next/navigation";
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
import { editProject, publishProjectDraft, updateProjectDueDate } from "@/actions/projectActions";
import { saveProjectRoles } from "@/actions/roleActions";
import { fromProject, toProjectColumns } from "@/adapters/projectForm";
import {
  BannerPicker,
  FaqEditor,
  QuestionEditor,
  RoundPicker,
  StringListEditor,
  questionsMissingOptions,
  type RoundConfigMap,
} from "@/components/company/ProjectEditors";
import { isProjectMutable } from "@/lib/domain";
import type { Application, Project, ScreeningQuestion } from "@/lib/types";
import type { CompensationType } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

/**
 * A role added in this session has no row yet, so it is given a local key to
 * track it in the list. That key is not an id the server knows, and must be
 * dropped before saving — see `persist`.
 */
const NEW_ROLE_KEY_PREFIX = "role-new-";

export function EditProjectClient({
  project,
  hired,
  storedBannerUrl,
}: {
  project: Project;
  hired: Application[];
  /** The column value, not the adapter's display fallback. */
  storedBannerUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [form, setForm] = useState(() => ({
    title: project.title ?? "",
    category: project.category ?? PROJECT_CATEGORIES[0],
    description: project.description ?? "",
    budget: String(project.compensation.totalBudget ?? ""),
    currency: project.compensation.currency ?? "USD",
    compensationType: (project.compensation.type ?? "FIXED") as CompensationType,
    hourlyRate: String(project.compensation.hourlyRate ?? ""),
    maxHours: String(project.compensation.maxHours ?? ""),
    stipendAmount: String(project.compensation.stipendAmount ?? ""),
    stipendPeriods: String(project.compensation.stipendPeriods ?? 1),
    freelancersLimit: String(project.freelancersLimit ?? 1),
    experienceRequired: String(project.experienceRequired ?? 0),
    duration: project.duration ?? "",
    workingDays: project.workingDays ?? WORKING_DAYS_OPTIONS[0],
    timingType: project.timingType ?? TIMING_TYPE_OPTIONS[0],
    priority: project.priority ?? "MEDIUM",
    dueDate: project.dueDate?.slice(0, 10) ?? "",
    isVisible: project.isVisible ?? true,
  }));

  /*
   * The scope, screening and banner fields were authored in the posting wizard
   * and then frozen: this screen never rendered them, so a published listing
   * could not fix a typo in an objective, add a screening question, or set a
   * banner. They are seeded from the listing's own metadata.
   */
  const initial = fromProject(project);
  const [bannerUrl, setBannerUrl] = useState<string | null>(storedBannerUrl);
  const [objectives, setObjectives] = useState<string[]>(initial.objectives ?? []);
  const [deliverables, setDeliverables] = useState<string[]>(initial.deliverables ?? []);
  const [responsibilities, setResponsibilities] = useState<string[]>(
    initial.responsibilities ?? [],
  );
  const [dailyTasks, setDailyTasks] = useState<string[]>(initial.dailyTasks ?? []);
  const [preferredSkills, setPreferredSkills] = useState<string[]>(initial.preferredSkills ?? []);
  const [faq, setFaq] = useState(initial.faq ?? []);
  const [rounds, setRounds] = useState<string[]>(initial.rounds ?? []);
  const [roundConfig, setRoundConfig] = useState<RoundConfigMap>(initial.roundConfig ?? {});
  const [questions, setQuestions] = useState<ScreeningQuestion[]>(initial.questions ?? []);
  const [certificateEnabled, setCertificateEnabled] = useState(initial.certificateEnabled);
  const [signatoryName, setSignatoryName] = useState(initial.signatoryName ?? "");
  const [signatoryTitle, setSignatoryTitle] = useState(initial.signatoryTitle ?? "");

  const [skills, setSkills] = useState<string[]>(project.requiredSkills ?? []);
  const [skillQuery, setSkillQuery] = useState("");
  const [roles, setRoles] = useState(
    () =>
      project.roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        slots: r.slots,
        allowApprentice: r.allowApprentice,
        hiredCount: r.hiredCount,
      })) ?? [],
  );

  const isDraft = project.status === "DRAFT";
  const mutable = isProjectMutable(project.status);

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

    // An MCQ with fewer than two filled options reaches the candidate as an
    // empty dropdown they cannot answer.
    for (const q of questionsMissingOptions(questions)) {
      found.push(
        `two answer options on "${q.question.trim() || "Untitled question"}", which is multiple choice`,
      );
    }

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

  /** The edited fields merged over the listing's existing metadata. */
  const columns = () =>
    toProjectColumns({
      ...fromProject(project),
      title: form.title,
      category: form.category,
      description: form.description,
      budget: form.budget,
      currency: form.currency,
      compensationType: form.compensationType,
      hourlyRate: form.hourlyRate,
      maxHours: form.maxHours,
      stipendAmount: form.stipendAmount,
      stipendPeriods: form.stipendPeriods,
      freelancersLimit: form.freelancersLimit,
      experienceRequired: form.experienceRequired,
      duration: form.duration,
      workingDays: form.workingDays,
      timingType: form.timingType,
      priority: form.priority,
      requiredSkills: skills,
      bannerUrl,
      objectives,
      deliverables,
      responsibilities,
      dailyTasks,
      preferredSkills,
      faq,
      rounds,
      roundConfig,
      questions,
      certificateEnabled,
      signatoryName,
      signatoryTitle,
    });

  /** Column edits, roles and the due date, in that order. */
  const persist = async () => {
    await editProject(project.id, { ...columns(), isVisible: form.isVisible });

    const savedRoles = await saveProjectRoles(
      project.id,
      roles.map((r) => ({
        // Only a real row id may go back: a local key looks to the server like
        // an id belonging to another project, and the whole save is refused.
        id: r.id.startsWith(NEW_ROLE_KEY_PREFIX) ? undefined : r.id,
        name: r.name,
        description: r.description,
        slots: r.slots,
        allowApprentice: r.allowApprentice,
      })),
    );
    // This action reports failure in its result rather than throwing, so
    // without this the roles are dropped behind a "Project updated" toast.
    if (!savedRoles.success) {
      throw new Error(savedRoles.error ?? "Could not save the roles on this project.");
    }
    // Swap the local keys for the real ids, so saving twice edits the same
    // rows instead of deleting and re-creating them.
    if (savedRoles.roles) {
      const hiredById = new Map(roles.map((r) => [r.id, r.hiredCount]));
      setRoles(
        savedRoles.roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? "",
          slots: r.slots,
          allowApprentice: r.allowApprentice,
          hiredCount: hiredById.get(r.id) ?? 0,
        })),
      );
    }

    // dueDate has its own action because changing it notifies the team.
    await updateProjectDueDate(project.id, form.dueDate || null);
  };

  const save = async () => {
    const missing = validate();
    if (missing.length) {
      setErrors(missing);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    try {
      await persist();
      setErrors([]);
      router.refresh();
      toast.success(
        "Project updated",
        "Match scores and recommendations have been recalculated.",
      );
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Could not save this project."]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  const publish = () => {
    const missing = validate();
    if (missing.length) {
      setErrors(missing);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPublishing(true);
    void (async () => {
      try {
        // Save first, so the draft is published with what is on screen.
        await persist();
        const result = await publishProjectDraft(project.id, form.isVisible);
        if (!result.success) {
          setErrors([result.error ?? "Could not publish this draft."]);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        toast.success("Draft published", "Freelancers with matching skills have been notified.");
        router.push(`/company/projects/${project.id}`);
      } catch (error) {
        setErrors([error instanceof Error ? error.message : "Could not publish this draft."]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } finally {
        setPublishing(false);
      }
    })();
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
            <Button variant="secondary" onClick={() => void save()} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
              Save changes
            </Button>
            {isDraft && (
              <Button onClick={() => void publish()} loading={publishing} leftIcon={<Send className="h-4 w-4" />}>
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
                      id: `${NEW_ROLE_KEY_PREFIX}${Date.now()}`,
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

        {/* ---- Banner ---- */}
        <Card padding="lg">
          <CardHeader
            title="Banner"
            description="Shown across the listing, the directory and every applicant view."
          />
          <BannerPicker value={bannerUrl} onChange={setBannerUrl} />
        </Card>

        {/* ---- Scope ---- */}
        <Card padding="lg">
          <CardHeader
            title="Scope"
            description="What the engagement is for and what it produces. Empty lines are dropped on save."
          />
          <div className="flex flex-col gap-5">
            <StringListEditor
              label="Objectives"
              help="What this engagement is meant to achieve."
              items={objectives}
              onChange={setObjectives}
              placeholder="Cut p95 dashboard interaction latency below 200ms"
            />
            <StringListEditor
              label="Deliverables"
              help="What is handed over at the end."
              items={deliverables}
              onChange={setDeliverables}
              placeholder="Component library with Storybook coverage"
            />
            <StringListEditor
              label="Responsibilities"
              items={responsibilities}
              onChange={setResponsibilities}
              placeholder="Own front-end architecture decisions"
            />
            <StringListEditor
              label="Day to day"
              items={dailyTasks}
              onChange={setDailyTasks}
              placeholder="Async standup in the workspace before 10:00 UTC"
            />
            <StringListEditor
              label="Preferred skills"
              help="Nice to have. Required skills are set above."
              items={preferredSkills}
              onChange={setPreferredSkills}
              placeholder="GraphQL"
            />
            <FaqEditor items={faq} onChange={setFaq} />
          </div>
        </Card>

        {/* ---- Screening ---- */}
        <Card padding="lg">
          <CardHeader
            title="Screening"
            description="Rounds already opened for a candidate keep the instructions they were sent; edits here apply to rounds not yet opened."
          />
          <div className="flex flex-col gap-7">
            <RoundPicker
              rounds={rounds}
              onRoundsChange={setRounds}
              config={roundConfig}
              onConfigChange={setRoundConfig}
            />
            {rounds.includes("SCREENING_QUESTIONS") && (
              <QuestionEditor questions={questions} onChange={setQuestions} />
            )}
          </div>
        </Card>

        {/* ---- Certificate ---- */}
        <Card padding="lg">
          <CardHeader
            title="Certificate"
            description="Issued to every freelancer who completes the engagement."
          />
          <Toggle
            checked={certificateEnabled}
            onChange={setCertificateEnabled}
            label="Issue a certificate on completion"
            description="Verifiable by anyone holding the certificate id."
          />
          {certificateEnabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Signatory name">
                <Input
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="Priya Raman"
                />
              </Field>
              <Field label="Signatory title">
                <Input
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  placeholder="VP Engineering"
                />
              </Field>
            </div>
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
            <Button variant="secondary" onClick={() => void save()} loading={saving}>
              Save changes
            </Button>
            {isDraft && (
              <Button onClick={() => void publish()} loading={publishing}>
                Publish project
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
