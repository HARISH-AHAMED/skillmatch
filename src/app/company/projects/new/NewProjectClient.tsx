"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, CheckCircle2, Clock, Eye, GraduationCap, ListChecks, Plus, Save, Send, Sparkles, Target, Trash2, Users, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Chip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import {
  Checkbox,
  Field,
  Input,
  RadioCard,
  Select,
  Textarea,
  Toggle,
} from "@/components/ui/Field";
import { Alert, EmptyState, Progress } from "@/components/ui/Feedback";
import { Stepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import {
  BannerPicker,
  QuestionEditor,
  RoundPicker,
  questionsMissingOptions,
  type RoundConfigMap,
} from "@/components/company/ProjectEditors";
import {
  COMPENSATION_META,
  CURRENCIES,
  MAX_ROLE_SLOTS,
  NON_MONETARY_BENEFITS,
  PROJECT_CATEGORIES,
  SKILL_LIBRARY,
  SUBCATEGORIES,
  TIMING_TYPE_OPTIONS,
  WORKING_DAYS_OPTIONS,
} from "@/lib/constants";
import type { CompensationType, ScreeningQuestion, Visibility } from "@/lib/types";
import { createProject, saveProjectDraft } from "@/actions/projectActions";
import { saveProjectRoles } from "@/actions/roleActions";
import { toProjectColumns, type ProjectFormValues } from "@/adapters/projectForm";
import type { Company } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

const STEPS = [
  { id: "basics", label: "Basic details", description: "Title, category, visibility" },
  { id: "description", label: "Job description", description: "Scope and skills" },
  { id: "budget", label: "Budget & timeline", description: "How it pays, and when" },
  { id: "screening", label: "Screening & roles", description: "Rounds, slots, certificate" },
  { id: "preview", label: "Preview & publish", description: "Exactly as applicants see it" },
];

const VISIBILITY_OPTIONS: { value: Visibility; title: string; description: string }[] = [
  {
    value: "PUBLIC",
    title: "Listed in directory",
    description: "Anyone can find it and apply. The default, and the fastest way to fill a role.",
  },
  {
    value: "INVITE_ONLY",
    title: "Searchable, apply blocked",
    description: "People can see the listing exists but only invited candidates can apply.",
  },
  {
    value: "PRIVATE",
    title: "Hidden, invited only",
    description: "Not listed anywhere. Only people you invite ever see it.",
  },
];

interface RoleDraft {
  id: string;
  name: string;
  description: string;
  slots: number;
  allowApprentice: boolean;
}

export function NewProjectClient({ company }: { company: Company }) {
  const router = useRouter();
  const toast = useToast();
  const [draftId, setDraftId] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [publishing, setPublishing] = useState(false);

  /* ---- Step 1 ---- */
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(PROJECT_CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [freelancersLimit, setFreelancersLimit] = useState("1");
  const [preferredGender, setPreferredGender] = useState("ANY");

  /* ---- Step 2 ---- */
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [responsibilities, setResponsibilities] = useState<string[]>([""]);
  const [dailyTasks, setDailyTasks] = useState<string[]>([""]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [experienceRequired, setExperienceRequired] = useState("0");
  const [faq, setFaq] = useState<{ question: string; answer: string }[]>([]);

  /* ---- Step 3 ---- */
  const [compensationType, setCompensationType] = useState<CompensationType>("FIXED");
  const [currency, setCurrency] = useState("USD");
  const [budget, setBudget] = useState("");
  const [budgetNegotiable, setBudgetNegotiable] = useState(false);
  const [hourlyRate, setHourlyRate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const [stipendAmount, setStipendAmount] = useState("");
  const [stipendFrequency, setStipendFrequency] = useState("MONTHLY");
  const [stipendPeriods, setStipendPeriods] = useState("3");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [benefitDetail, setBenefitDetail] = useState("");
  const [workingDays, setWorkingDays] = useState(WORKING_DAYS_OPTIONS[0]);
  const [timingType, setTimingType] = useState(TIMING_TYPE_OPTIONS[0]);
  const [priority, setPriority] = useState("MEDIUM");
  const [duration, setDuration] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [projectStart, setProjectStart] = useState("");
  const [expectedCompletion, setExpectedCompletion] = useState("");

  /* ---- Step 4 ---- */
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>(["SCREENING_QUESTIONS"]);
  const [roundConfig, setRoundConfig] = useState<RoundConfigMap>({});
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([
    {
      id: "q1",
      question: "Walk us through the closest work you have done to this. What was the hardest decision?",
      type: "PARAGRAPH",
      required: true,
    },
  ]);
  const [roles, setRoles] = useState<RoleDraft[]>([]);
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("");

  const budgetValue = useMemo(() => {
    if (compensationType === "UNPAID") return 0;
    if (compensationType === "HOURLY")
      return (Number(hourlyRate) || 0) * (Number(estimatedHours) || 0);
    if (compensationType === "STIPEND")
      return (Number(stipendAmount) || 0) * (Number(stipendPeriods) || 1);
    return Number(budget) || 0;
  }, [compensationType, hourlyRate, estimatedHours, stipendAmount, stipendPeriods, budget]);

  /* -------------------------------------------------------- validation ---- */

  function validate(target: number): string[] {
    const found: string[] = [];
    if (target >= 1) {
      if (!title.trim() || title.trim() === "Untitled draft")
        found.push("Give the project a real title before continuing.");
      if (Number(freelancersLimit) < 1) found.push("You must be hiring at least one person.");
    }
    if (target >= 2) {
      if (!description.trim()) found.push("Write a project description.");
      if (requiredSkills.length === 0) found.push("Add at least one required skill.");
    }
    if (target >= 3) {
      if (compensationType !== "UNPAID" && budgetValue <= 0)
        found.push("Enter a budget greater than zero.");
      if (compensationType === "HOURLY" && !hourlyRate)
        found.push("Enter an hourly rate.");
      if (compensationType === "STIPEND" && !stipendAmount)
        found.push("Enter a stipend amount.");
      if (compensationType === "UNPAID" && benefits.length === 0)
        found.push("Non-monetary projects must list at least one benefit applicants receive.");
    }
    if (target >= 4) {
      // An MCQ with fewer than two filled options reaches the candidate as an
      // empty dropdown they cannot answer, so it is refused here.
      for (const q of questionsMissingOptions(questions)) {
        found.push(
          `"${q.question.trim() || "Untitled question"}" is multiple choice, so it needs at least two answer options.`,
        );
      }

      const hiredMin = roles.reduce((s, r) => s + r.slots, 0);
      if (roles.length > 0 && hiredMin > Number(freelancersLimit))
        found.push(
          `Role slots total ${hiredMin}, which is more than the ${freelancersLimit} people you said you are hiring.`,
        );
      for (const r of roles) {
        if (!r.name.trim()) found.push("Every role needs a name.");
        if (r.slots < 1 || r.slots > MAX_ROLE_SLOTS)
          found.push(`Role slots must be between 1 and ${MAX_ROLE_SLOTS}.`);
      }
    }
    return found;
  }

  const goNext = () => {
    const found = validate(step + 1);
    if (found.length) {
      setErrors(found);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** The wizard state as the shape the project adapter expects. */
  const formValues = (): ProjectFormValues => ({
    title,
    category,
    subcategory,
    visibility,
    freelancersLimit,
    preferredGender,
    description,
    objectives,
    deliverables,
    responsibilities,
    dailyTasks,
    requiredSkills,
    preferredSkills,
    experienceRequired,
    faq,
    compensationType,
    currency,
    budget,
    budgetNegotiable,
    hourlyRate,
    estimatedHours,
    maxHours,
    stipendAmount,
    stipendFrequency,
    stipendPeriods,
    benefits,
    benefitDetail,
    workingDays,
    timingType,
    priority,
    duration,
    applicationDeadline,
    projectStart,
    expectedCompletion,
    rounds,
    roundConfig,
    bannerUrl,
    questions,
    certificateEnabled,
    signatoryName,
    signatoryTitle,
  });

  const saveDraft = async ({ silent = false }: { silent?: boolean } = {}) => {
    const columns = toProjectColumns(formValues());
    const result = await saveProjectDraft({ draftId, ...columns });

    if (!result.success) {
      // An autosave failure is reported quietly; the visitor did not ask for it.
      if (!silent) {
        toast.toast({ title: result.error ?? "Could not save the draft", tone: "error" });
      }
      return;
    }
    // Keep the id so later saves update the same draft rather than piling up.
    if (result.draftId) setDraftId(result.draftId);
    setSavedAt(new Date());
    if (!silent) {
      toast.success("Draft saved", "Drafts are invisible to applicants until you publish.");
    }
  };

  /* ---------------------------------------------------------- autosave ----
     Writes a real draft through saveProjectDraft, debounced so a burst of
     typing produces one write. The "Draft saved" stamp is only set once the
     action has actually persisted. */
  useEffect(() => {
    if (!title && !description) return;
    const t = setTimeout(() => void saveDraft({ silent: true }), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    description,
    category,
    budget,
    compensationType,
    requiredSkills,
    roles,
    objectives,
    deliverables,
  ]);

  const publish = () => {
    const found = [1, 2, 3, 4].flatMap((n) => validate(n));
    const unique = [...new Set(found)];
    if (unique.length) {
      setErrors([
        `Add a ${unique.length === 1 ? "missing field" : "few missing fields"} before publishing.`,
        ...unique,
      ]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPublishing(true);
    void (async () => {
      try {
        const created = await createProject({
          ...toProjectColumns(formValues()),
          isVisible: visibility === "PUBLIC",
        });

        // Roles are a separate table, so they are saved once the project id
        // exists. A listing with no roles keeps the single-hire behaviour.
        if (created.project && roles.length > 0) {
          const saved = await saveProjectRoles(
            created.project.id,
            roles.map((r) => ({
              name: r.name,
              description: r.description,
              slots: r.slots,
              allowApprentice: r.allowApprentice,
            })),
          );
          if (!saved.success) {
            toast.toast({
              title: saved.error ?? "The project was published, but its roles were not saved.",
              tone: "error",
            });
          }
        }

        toast.success(
          "Project published",
          "Freelancers with matching skills have been notified and recommendations recalculated.",
        );
        router.push("/company/projects");
      } catch (error) {
        setErrors([
          error instanceof Error ? error.message : "Could not publish this project.",
        ]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } finally {
        setPublishing(false);
      }
    })();
  };

  const filteredSkills = SKILL_LIBRARY.filter(
    (s) =>
      s.includes(skillQuery.toLowerCase()) &&
      !requiredSkills.includes(s) &&
      !preferredSkills.includes(s),
  ).slice(0, 8);

  if (!company) return null;

  return (
    <div>
      <PageHeader
        title="Post a new project"
        description="Five steps. Everything autosaves as a draft, so you can leave and come back."
        action={
          <>
            {savedAt && (
              <span className="hidden items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)] sm:inline-flex">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                Draft saved {savedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            <Button variant="secondary" onClick={() => void saveDraft()} leftIcon={<Save className="h-4 w-4" />}>
              Save draft
            </Button>
          </>
        }
      />

      <Card padding="lg">
        <Stepper steps={STEPS} current={step} onStepClick={(i) => i < step && setStep(i)} className="mb-7" />

        {errors.length > 0 && (
          <Alert tone="error" title="Fix these before continuing" className="mb-6">
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* ================= STEP 1: BASICS ================= */}
        {step === 0 && (
          <div className="flex flex-col gap-6">
            <Field
              label="Project title"
              required
              help="Be concrete. 'Observability Console — Frontend Rebuild' beats 'Frontend developer needed'."
              hint={`${title.length}/120`}
            >
              <Input
                inputSize="lg"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Observability Console — Frontend Rebuild"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" required>
                <Select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory("");
                  }}
                >
                  {PROJECT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Speciality">
                <Select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                  <option value="">Select a speciality…</option>
                  {(SUBCATEGORIES[category] ?? []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <BannerPicker value={bannerUrl} onChange={setBannerUrl} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="How many people are you hiring?"
                required
                help="Hiring is capped at this number across every role."
              >
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={freelancersLimit}
                  onChange={(e) => setFreelancersLimit(e.target.value)}
                />
              </Field>
              <Field
                label="Preferred gender"
                help="Only set this where it is a genuine occupational requirement."
              >
                <Select
                  value={preferredGender}
                  onChange={(e) => setPreferredGender(e.target.value)}
                >
                  <option value="ANY">Any</option>
                  <option value="FEMALE">Female only</option>
                  <option value="MALE">Male only</option>
                </Select>
              </Field>
            </div>

            <div>
              <p className="mb-2.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
                Visibility
              </p>
              <div className="flex flex-col gap-2.5">
                {VISIBILITY_OPTIONS.map((o) => (
                  <RadioCard
                    key={o.value}
                    checked={visibility === o.value}
                    onSelect={() => setVisibility(o.value)}
                    title={o.title}
                    description={o.description}
                    icon={<Eye />}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: DESCRIPTION ================= */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <Field
              label="Project description"
              required
              help="Say what the work actually is, including the unglamorous parts. Listings that are honest about constraints get better applicants."
              hint={`${description.length} characters`}
            >
              <Textarea
                rows={10}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Our observability console is the surface our customers spend the most time in and the one we have invested the least in…"
              />
            </Field>

            <ListEditor
              icon={<Target className="h-4 w-4" />}
              label="Objectives"
              help="What success looks like, measurably where possible."
              items={objectives}
              onChange={setObjectives}
              placeholder="Cut p95 dashboard interaction latency below 200ms"
            />

            <ListEditor
              icon={<ListChecks className="h-4 w-4" />}
              label="Deliverables"
              help="The concrete artefacts you expect at the end."
              items={deliverables}
              onChange={setDeliverables}
              placeholder="Component library with Storybook coverage"
            />

            <ListEditor
              icon={<Users className="h-4 w-4" />}
              label="Responsibilities"
              items={responsibilities}
              onChange={setResponsibilities}
              placeholder="Own front-end architecture decisions and document the reasoning"
            />

            <ListEditor
              icon={<Clock className="h-4 w-4" />}
              label="Day to day"
              help="What a typical working day involves."
              items={dailyTasks}
              onChange={setDailyTasks}
              placeholder="Async standup in the workspace before 10:00 UTC"
            />

            {/* Skills */}
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
                Required skills <span className="text-[var(--color-error-fg)]">*</span>
              </p>
              <p className="mb-2.5 text-[12px] text-[var(--color-text-muted)]">
                These drive the match score — 50% of it. Use the terms freelancers actually list.
              </p>
              {requiredSkills.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-2">
                  {requiredSkills.map((s) => (
                    <Chip
                      key={s}
                      active
                      className="capitalize"
                      onRemove={() => setRequiredSkills((p) => p.filter((x) => x !== s))}
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
                    if (!requiredSkills.includes(v)) setRequiredSkills((p) => [...p, v]);
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
                        setRequiredSkills((p) => [...p, s]);
                        setSkillQuery("");
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      {s}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
                Nice to have
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILL_LIBRARY.filter((s) => !requiredSkills.includes(s))
                  .slice(0, 16)
                  .map((s) => (
                    <Chip
                      key={s}
                      size="sm"
                      className="capitalize"
                      active={preferredSkills.includes(s)}
                      onClick={() =>
                        setPreferredSkills((p) =>
                          p.includes(s) ? p.filter((x) => x !== s) : [...p, s],
                        )
                      }
                    >
                      {s}
                    </Chip>
                  ))}
              </div>
            </div>

            <Field
              label="Minimum years of experience"
              help="0 means open to all levels. This is 20% of the match score."
            >
              <Select
                value={experienceRequired}
                onChange={(e) => setExperienceRequired(e.target.value)}
                className="sm:w-64"
              >
                {[0, 1, 2, 3, 4, 5, 6, 8, 10].map((y) => (
                  <option key={y} value={String(y)}>
                    {y === 0 ? "Open to all levels" : `${y}+ years`}
                  </option>
                ))}
              </Select>
            </Field>

            {/* FAQ */}
            <div>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">
                    Frequently asked questions
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                    Pre-empt the questions you always get. Applicants can add their own later.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setFaq((p) => [...p, { question: "", answer: "" }])}
                >
                  Add
                </Button>
              </div>
              {faq.length === 0 ? (
                <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-emphasis)] p-4 text-center text-[12.5px] text-[var(--color-text-muted)]">
                  No FAQ entries yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {faq.map((f, i) => (
                    <li
                      key={i}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5"
                    >
                      <Input
                        value={f.question}
                        onChange={(e) =>
                          setFaq((p) =>
                            p.map((x, idx) => (idx === i ? { ...x, question: e.target.value } : x)),
                          )
                        }
                        placeholder="Question"
                      />
                      <Textarea
                        className="mt-2"
                        rows={2}
                        value={f.answer}
                        onChange={(e) =>
                          setFaq((p) =>
                            p.map((x, idx) => (idx === i ? { ...x, answer: e.target.value } : x)),
                          )
                        }
                        placeholder="Answer"
                      />
                      <button
                        type="button"
                        onClick={() => setFaq((p) => p.filter((_, idx) => idx !== i))}
                        className="mt-2 text-[12.5px] font-medium text-[var(--color-error-fg)] hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 3: BUDGET ================= */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
                How does this project pay? <span className="text-[var(--color-error-fg)]">*</span>
              </p>
              <p className="mb-3 text-[12px] text-[var(--color-text-muted)]">
                This is the single source of truth for money on the project and cannot be changed
                loosely later.
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {(Object.keys(COMPENSATION_META) as CompensationType[]).map((t) => (
                  <RadioCard
                    key={t}
                    checked={compensationType === t}
                    onSelect={() => setCompensationType(t)}
                    title={COMPENSATION_META[t].label}
                    description={COMPENSATION_META[t].description}
                    icon={<Wallet />}
                  />
                ))}
              </div>
            </div>

            {compensationType !== "UNPAID" && (
              <Field label="Currency" required help="Every amount on this project is denominated in it.">
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="sm:w-80"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name} ({c.symbol})
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {(compensationType === "FIXED" || compensationType === "MILESTONE") && (
              <>
                <Field
                  label={compensationType === "MILESTONE" ? "Total across all milestones" : "Total budget"}
                  required
                >
                  <Input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="48000"
                    className="sm:w-64"
                  />
                </Field>
                {compensationType === "FIXED" && (
                  <Toggle
                    checked={budgetNegotiable}
                    onChange={setBudgetNegotiable}
                    label="Budget is negotiable"
                    description="Applicants can counter-offer with a different amount and a reason."
                  />
                )}
              </>
            )}

            {compensationType === "HOURLY" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Hourly rate" required>
                  <Input
                    type="number"
                    min={0}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="90"
                  />
                </Field>
                <Field label="Estimated hours">
                  <Input
                    type="number"
                    min={0}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="320"
                  />
                </Field>
                <Field label="Maximum hours" help="Hard cap on cumulative logged hours.">
                  <Input
                    type="number"
                    min={0}
                    value={maxHours}
                    onChange={(e) => setMaxHours(e.target.value)}
                    placeholder="400"
                  />
                </Field>
              </div>
            )}

            {compensationType === "STIPEND" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Stipend amount" required>
                  <Input
                    type="number"
                    min={0}
                    value={stipendAmount}
                    onChange={(e) => setStipendAmount(e.target.value)}
                    placeholder="1200"
                  />
                </Field>
                <Field label="Frequency">
                  <Select
                    value={stipendFrequency}
                    onChange={(e) => setStipendFrequency(e.target.value)}
                  >
                    <option value="ONE_TIME">One time</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </Select>
                </Field>
                <Field
                  label="Number of periods"
                  help="A one-time stipend always has exactly one period."
                >
                  <Input
                    type="number"
                    min={1}
                    disabled={stipendFrequency === "ONE_TIME"}
                    value={stipendFrequency === "ONE_TIME" ? "1" : stipendPeriods}
                    onChange={(e) => setStipendPeriods(e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* Non-monetary benefits */}
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
                Non-monetary benefits
                {compensationType === "UNPAID" && (
                  <span className="ml-1 text-[var(--color-error-fg)]">*</span>
                )}
              </p>
              <p className="mb-2.5 text-[12px] text-[var(--color-text-muted)]">
                {compensationType === "UNPAID"
                  ? "This project pays nothing, so be specific and generous about what it does provide."
                  : "Optional extras on top of the money."}
              </p>
              <div className="flex flex-wrap gap-2">
                {NON_MONETARY_BENEFITS.map((b) => (
                  <Chip
                    key={b}
                    active={benefits.includes(b)}
                    onClick={() =>
                      setBenefits((p) => (p.includes(b) ? p.filter((x) => x !== b) : [...p, b]))
                    }
                  >
                    {b}
                  </Chip>
                ))}
              </div>
              {benefits.length > 0 && (
                <Textarea
                  className="mt-3"
                  rows={3}
                  value={benefitDetail}
                  onChange={(e) => setBenefitDetail(e.target.value)}
                  placeholder="Named credit in the published work, a verifiable certificate, and fortnightly mentorship sessions…"
                />
              )}
            </div>

            {/* Working pattern */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Working days">
                <Select value={workingDays} onChange={(e) => setWorkingDays(e.target.value)}>
                  {WORKING_DAYS_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Commitment">
                <Select value={timingType} onChange={(e) => setTimingType(e.target.value)}>
                  {TIMING_TYPE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Urgency">
                <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High — flagged as urgent</option>
                </Select>
              </Field>
            </div>

            {/* Timeline */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Expected duration">
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="4 months"
                />
              </Field>
              <Field label="Application deadline">
                <Input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                />
              </Field>
              <Field label="Project start">
                <Input
                  type="date"
                  value={projectStart}
                  onChange={(e) => setProjectStart(e.target.value)}
                />
              </Field>
              <Field label="Target completion">
                <Input
                  type="date"
                  value={expectedCompletion}
                  onChange={(e) => setExpectedCompletion(e.target.value)}
                />
              </Field>
            </div>

            {budgetValue > 0 && (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-brand-softer)] p-4">
                <p className="text-[12.5px] text-[var(--color-brand-active)]">
                  Total project value
                </p>
                <p className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--color-text-primary)]">
                  {formatMoney(budgetValue, currency)}
                </p>
                <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                  {compensationType === "HOURLY"
                    ? `${hourlyRate || 0}/hr × ${estimatedHours || 0} estimated hours`
                    : compensationType === "STIPEND"
                      ? `${stipendAmount || 0} × ${stipendFrequency === "ONE_TIME" ? 1 : stipendPeriods} periods`
                      : "Payment stages will be funded against this total."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 4: SCREENING & ROLES ================= */}
        {step === 3 && (
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

            {/* Roles */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                    Roles & slots
                  </h3>
                  <p className="mt-0.5 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                    Optional. With no roles this behaves as a single listing capped at{" "}
                    {freelancersLimit}. With roles, hiring is checked against both the role slots
                    and the project limit.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() =>
                    setRoles((p) => [
                      ...p,
                      {
                        id: `role-${Date.now()}`,
                        name: "",
                        description: "",
                        slots: 1,
                        allowApprentice: false,
                      },
                    ])
                  }
                >
                  Add role
                </Button>
              </div>

              {roles.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Users />}
                  title="No named roles"
                  description={`Hiring is capped at ${freelancersLimit} ${Number(freelancersLimit) === 1 ? "person" : "people"} with no role structure.`}
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
                            placeholder="Lead Frontend Engineer"
                          />
                        </Field>
                        <Field label="Slots" required>
                          <Input
                            type="number"
                            min={1}
                            max={MAX_ROLE_SLOTS}
                            value={role.slots}
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
                          placeholder="Owns architecture, the component library and the migration sequence."
                        />
                      </Field>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3">
                        <Checkbox
                          checked={role.allowApprentice}
                          onChange={(e) =>
                            setRoles((p) =>
                              p.map((r) =>
                                r.id === role.id
                                  ? { ...r, allowApprentice: e.target.checked }
                                  : r,
                              ),
                            )
                          }
                          label={
                            <span className="inline-flex items-center gap-1.5">
                              <GraduationCap className="h-3.5 w-3.5 text-[var(--color-info-fg)]" />
                              Allow an apprentice on this role
                            </span>
                          }
                          description="Apprentices are mentored by the primary and occupy no slot, so they can join even when the role is full."
                        />
                        <button
                          type="button"
                          onClick={() => setRoles((p) => p.filter((r) => r.id !== role.id))}
                          className="text-[12.5px] font-medium text-[var(--color-error-fg)] hover:underline"
                        >
                          Remove role
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {roles.length > 0 && (
                <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                      Total slots across roles
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {roles.reduce((s, r) => s + r.slots, 0)} / {freelancersLimit}
                    </span>
                  </div>
                  <Progress
                    className="mt-2"
                    value={roles.reduce((s, r) => s + r.slots, 0)}
                    max={Number(freelancersLimit) || 1}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Certificate */}
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                Completion certificate
              </h3>
              <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
                <Toggle
                  checked={certificateEnabled}
                  onChange={setCertificateEnabled}
                  label="Issue a verifiable certificate at completion"
                  description="Issued automatically to every hired freelancer, including apprentices. You can design the template after publishing."
                />
                {certificateEnabled && (
                  <div className="mt-4 grid gap-4 border-t border-[var(--color-border-subtle)] pt-4 sm:grid-cols-2">
                    <Field label="Signatory name">
                      <Input
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        placeholder="Marta Kovač"
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
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 5: PREVIEW ================= */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <Alert tone="info" title="This is exactly what applicants will see">
              Read it once as if you were applying. If anything is ambiguous here, it will produce
              ambiguous applications.
            </Alert>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={compensationType === "UNPAID" ? "warning" : "brand"}>
                  {COMPENSATION_META[compensationType].label}
                </Badge>
                {priority === "HIGH" && <Badge tone="error">Urgent</Badge>}
                {visibility !== "PUBLIC" && (
                  <Badge tone="neutral">
                    {visibility === "INVITE_ONLY" ? "Invite only" : "Private"}
                  </Badge>
                )}
              </div>

              <h2 className="mt-3 text-[22px] font-semibold leading-tight tracking-[-0.018em] text-[var(--color-text-primary)]">
                {title || "Untitled draft"}
              </h2>
              <p className="mt-1.5 text-[13px] text-[var(--color-text-secondary)]">
                {company.companyName} · {category}
                {subcategory ? ` · ${subcategory}` : ""}
              </p>

              <dl className="mt-4 grid gap-3 border-y border-[var(--color-border-subtle)] py-4 sm:grid-cols-4">
                {[
                  [
                    "Compensation",
                    compensationType === "UNPAID"
                      ? "Non-monetary"
                      : formatMoney(budgetValue, currency),
                  ],
                  ["Hiring", `${freelancersLimit} ${Number(freelancersLimit) === 1 ? "person" : "people"}`],
                  ["Duration", duration || "—"],
                  ["Commitment", timingType],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] text-[var(--color-text-muted)]">{label}</dt>
                    <dd className="mt-0.5 text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4">
                <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                  About this engagement
                </h3>
                <p className="mt-2 whitespace-pre-line text-[13.5px] leading-[1.7] text-[var(--color-text-secondary)]">
                  {description || "No description written yet."}
                </p>
              </div>

              {[
                ["Objectives", objectives],
                ["Deliverables", deliverables],
                ["Responsibilities", responsibilities],
                ["Day to day", dailyTasks],
              ].map(([label, items]) => {
                const list = (items as string[]).filter((x) => x.trim());
                if (!list.length) return null;
                return (
                  <div key={label as string} className="mt-4">
                    <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                      {label as string}
                    </h3>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {list.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
                          <span className="text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {requiredSkills.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    Required skills
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {requiredSkills.map((s) => (
                      <Chip key={s} active size="sm" className="capitalize">
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {roles.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                    Open roles
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {roles.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                            {r.name || "Untitled role"}
                          </p>
                          {r.description && (
                            <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
                              {r.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          {r.allowApprentice && (
                            <Badge tone="info" size="sm">
                              Apprentice slot
                            </Badge>
                          )}
                          <Badge tone="success" size="sm">
                            {r.slots} {r.slots === 1 ? "slot" : "slots"}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {certificateEnabled && (
                <div className="mt-4 flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-brand-softer)] p-3.5">
                  <Award className="h-4 w-4 shrink-0 text-[var(--color-brand-active)]" />
                  <p className="text-[12.5px] text-[var(--color-brand-active)]">
                    A verifiable certificate is issued to every hired freelancer at completion.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
              <h3 className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                What happens when you publish
              </h3>
              <ul className="mt-2.5 flex flex-col gap-2">
                {[
                  "The listing goes live and becomes visible according to the visibility you chose.",
                  "Every freelancer with at least one matching skill is notified.",
                  "Match scores are computed and the top ten candidates are cached as recommendations.",
                  "A payment record is created for the project so stages can be funded straight away.",
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
                    <span className="text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                      {s}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ---- Sticky footer ---- */}
        <div className="sticky bottom-0 -mx-5 mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4 md:-mx-6 md:px-6">
          <Button
            variant="ghost"
            onClick={() => {
              setErrors([]);
              setStep((s) => Math.max(0, s - 1));
            }}
            disabled={step === 0}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <span className="hidden text-[12.5px] text-[var(--color-text-muted)] sm:block">
              Step {step + 1} of {STEPS.length}
            </span>
            <Button variant="secondary" onClick={() => void saveDraft()} leftIcon={<Save className="h-4 w-4" />}>
              Save draft
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continue
              </Button>
            ) : (
              <Button onClick={publish} loading={publishing} leftIcon={<Send className="h-4 w-4" />}>
                Publish project
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------ list editor -- */

function ListEditor({
  icon,
  label,
  help,
  items,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  help?: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-muted)]">{icon}</span>
            {label}
          </p>
          {help && <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{help}</p>}
        </div>
        <Button
          size="xs"
          variant="secondary"
          leftIcon={<Plus className="h-3 w-3" />}
          onClick={() => onChange([...items, ""])}
        >
          Add
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[11px] font-semibold text-[var(--color-text-secondary)]">
              {i + 1}
            </span>
            <Input
              value={item}
              onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))}
              placeholder={placeholder}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                aria-label="Remove"
                className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error-fg)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
