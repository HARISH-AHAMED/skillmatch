"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createProject, saveProjectDraft, getMyProjectDrafts, getProjectDraft } from "@/actions/projectActions";
import { ProjectBannerUpload } from "@/components/ProjectBannerUpload";
import { saveProjectRoles, type RoleInput } from "@/actions/roleActions";
import { RoleSlotsEditor } from "@/components/RoleSlotsEditor";
import { ProjectPriority } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { serializeProjectMetadata, getProjectMetadataDirect, getProjectDescriptionText, ProjectWizardData, RecruitmentRound, PAYMENT_CATEGORIES, PaymentCategory, CURRENCIES, DEFAULT_CURRENCY, getCurrencySymbol, NON_MONETARY_BENEFITS, NonMonetaryBenefit, isNonMonetary, supportsBenefits, COMPENSATION_TYPES, CompensationType, STIPEND_FREQUENCIES, StipendFrequency, estimatedHourlyTotal } from "@/lib/workflowHelpers";
import { ROUND_TYPE_CATALOG, isRoundTypeSupported, roundTypeLabel } from "@/lib/workflowHelpers";
import { RoundConfigPanel } from "@/components/RoundConfigPanel";
import { FileText, DollarSign, Calendar, HelpCircle, Eye, ChevronLeft, ChevronRight, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Move } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Basic Details
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Software Development");
  const [subcategory, setSubcategory] = useState("Full Stack Development");
  const [domain, setDomain] = useState("Software Engineering");
  const [experienceRequired, setExperienceRequired] = useState(2);
  const [duration, setDuration] = useState("3 Months");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE" | "INVITE_ONLY">("PUBLIC");
  const [preferredGender, setPreferredGender] = useState("ANY");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  /**
   * Requirement #3 — draft autosave. Debounced, never per keystroke, and it
   * reuses one draft row for the whole session so navigating back and forth
   * cannot mint duplicates. A draft is written with DRAFT status and
   * isVisible:false server-side, so it can never reach public browse, and
   * publishing still runs the full validation in publishProjectDraft.
   */
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<"idle" | "unsaved" | "saving" | "saved">("idle");
  const [resumableDraft, setResumableDraft] = useState<{ id: string; title: string } | null>(null);

  // Optional team roles. Empty means a classic single-hire listing.
  const [roles, setRoles] = useState<RoleInput[]>([]);

  // Step 2: Description & Responsibilities
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState<string[]>(["Build a scalable web app"]);
  const [deliverables, setDeliverables] = useState<string[]>(["React frontend codebase", "API backend codebase"]);
  const [responsibilities, setResponsibilities] = useState<string[]>(["Write clean code", "Coordinate with team"]);
  const [dailyTasks, setDailyTasks] = useState<string[]>(["Morning standup", "Code review"]);
  // Required and preferred skills lists
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [newReqSkill, setNewReqSkill] = useState("");
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [newPrefSkill, setNewPrefSkill] = useState("");

  // Input states for dynamically adding to arrays
  const [newObjective, setNewObjective] = useState("");
  const [newDeliverable, setNewDeliverable] = useState("");
  const [newResponsibility, setNewResponsibility] = useState("");
  const [newDailyTask, setNewDailyTask] = useState("");

  // Step 3: Budget & Timeline
  const [stipendType, setStipendType] = useState<"Unpaid" | "Paid" | "Stipend">("Paid");
  const [budget, setBudget] = useState(1000);
  const [stipendDetails, setStipendDetails] = useState("1000 - 1500 Total");
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>("FIXED");
  const [paymentRate, setPaymentRate] = useState(1000);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [compensationType, setCompensationType] = useState<CompensationType>("FIXED");
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [stipendFrequency, setStipendFrequency] = useState<StipendFrequency>("MONTHLY");
  const [budgetNegotiable, setBudgetNegotiable] = useState<boolean>(false);
  const [certificateIncluded, setCertificateIncluded] = useState<boolean>(false);
  const [nonMonetaryBenefits, setNonMonetaryBenefits] = useState<NonMonetaryBenefit[]>([]);
  const [nonMonetaryDetails, setNonMonetaryDetails] = useState("");

  const toggleBenefit = (b: NonMonetaryBenefit) =>
    setNonMonetaryBenefits((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  const [workingDays, setWorkingDays] = useState("5 Days/Week");
  const [timingType, setTimingType] = useState("Full Time");
  const [priority, setPriority] = useState<ProjectPriority>(ProjectPriority.MEDIUM);
  const [appDeadline, setAppDeadline] = useState("2026-07-15");
  const [projectStart, setProjectStart] = useState("2026-07-20");
  const [expectedCompletion, setExpectedCompletion] = useState("2026-10-20");

  // Step 4: Recruitment Rounds Builder
  const [rounds, setRounds] = useState<RecruitmentRound[]>([
    {
      id: "r-cv",
      name: "CV Pitch & Profile Review",
      type: "CV_PITCH",
      description: "Initial application screening round where candidates submit cover letters, profiles, and resumes."
    },
    {
      id: "r-questions",
      name: "Screening Questionnaire",
      type: "SCREENING_QUESTIONS",
      description: "Required pre-screening questions round to evaluate basic domain knowledge.",
      questions: [
        { id: "q1", type: "YES_NO", question: "Do you have experience with Next.js?", required: true },
        { id: "q2", type: "PARAGRAPH", question: "Describe your experience with Postgres and Prisma.", required: true }
      ]
    },
    {
      id: "r-interview",
      name: "Recruiter Interview Round",
      type: "INTERVIEW",
      description: "1-on-1 online face-to-face evaluation round with recruiter panel."
    }
  ]);

  // Round Builder Form States
  const [newRoundName, setNewRoundName] = useState("");
  const [newRoundType, setNewRoundType] = useState<RecruitmentRound["type"]>("SCREENING_QUESTIONS");
  const [newRoundDescription, setNewRoundDescription] = useState("");
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);

  // Active round selection to add/edit questions
  const [selectedRoundId, setSelectedRoundId] = useState<string>("r-questions");

  // Questions builder inside the selected screening round
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<any>("YES_NO");
  const [mcOption1, setMcOption1] = useState("");
  const [mcOption2, setMcOption2] = useState("");
  const [mcOption3, setMcOption3] = useState("");
  const [mcOption4, setMcOption4] = useState("");

  /**
   * Requirement #3 — debounced autosave.
   *
   * The timer restarts on each change and only fires after two idle seconds,
   * so typing a title is one save, not one per character. A ref holds the
   * in-flight draft id so two saves racing at startup cannot each create a
   * row. Nothing here weakens publish validation: the draft is written with
   * whatever exists so far, and the real checks run on submit.
   */
  const draftIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const firstRenderRef = useRef(true);
  /**
   * Bumped on every change. A save stamps the seq it wrote; if newer state
   * arrived while the request was in flight, the run re-fires instead of
   * dropping it, so a slow save can neither lose a change nor land on top of
   * a newer one.
   */
  const seqRef = useRef(0);
  const savedSeqRef = useRef(0);

  useEffect(() => {
    if (firstRenderRef.current) { firstRenderRef.current = false; return; }
    seqRef.current += 1;
    setDraftState("unsaved");

    const timer = setTimeout(async function run() {
      if (savingRef.current) return;
      const writing = seqRef.current;
      if (writing === savedSeqRef.current) return;
      savingRef.current = true;
      setDraftState("saving");
      try {
        const res = await saveProjectDraft({
          draftId: draftIdRef.current,
          title,
          // The complete wizard payload, through the same metadata block the
          // saved project uses, so a resumed draft restores every field.
          description: serializeProjectMetadata(description, buildWizardMeta()),
          budget: Number(budget) || 0,
          priority,
          requiredSkills,
          experienceRequired: Number(experienceRequired) || 0,
          freelancersLimit: roles.length > 0 ? roles.reduce((n, r) => n + (Number(r.slots) || 0), 0) : 1,
          domain,
          bannerUrl,
          preferredGender,
        });
        if (res.success && res.draftId) {
          draftIdRef.current = res.draftId;
          setDraftId(res.draftId);
          savedSeqRef.current = writing;
          savingRef.current = false;
          // A change landed mid-flight: save again rather than lose it.
          if (seqRef.current !== writing) { run(); return; }
          setDraftState("saved");
        } else {
          savingRef.current = false;
          setDraftState("unsaved");
        }
      } catch {
        savingRef.current = false;
        setDraftState("unsaved");
      }
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, budget, priority, requiredSkills, experienceRequired, domain, bannerUrl, preferredGender, objectives, deliverables, responsibilities, dailyTasks, preferredSkills, category, subcategory, duration, currency, compensationType, paymentCategory, paymentRate, estimatedHours, stipendFrequency, stipendDetails, budgetNegotiable, certificateIncluded, nonMonetaryBenefits, nonMonetaryDetails, workingDays, timingType, appDeadline, projectStart, expectedCompletion, rounds, roles, visibility]);

  /** Offers the most recent draft on arrival. Server-scoped to this company. */
  useEffect(() => {
    let cancelled = false;
    getMyProjectDrafts().then((drafts) => {
      if (cancelled || drafts.length === 0) return;
      setResumableDraft({ id: drafts[0].id, title: drafts[0].title });
    });
    return () => { cancelled = true; };
  }, []);

  /** Loads a saved draft back into the form. */
  /**
   * Restores a saved draft into every wizard field. The metadata block written
   * by autosave is parsed back with the same helper the saved project uses, so
   * what comes out is what went in. Each value falls back to current state when
   * a legacy draft predates that field.
   */
  const resumeDraft = async (id: string) => {
    const d = await getProjectDraft(id);
    if (!d) return;
    const meta = getProjectMetadataDirect(d.description);

    draftIdRef.current = id;
    setDraftId(id);

    // Project columns
    setTitle(d.title === "Untitled draft" ? "" : d.title);
    setDescription(getProjectDescriptionText(d.description));
    setBudget(d.budget ?? 0);
    setPriority(d.priority);
    setRequiredSkills(d.requiredSkills ?? []);
    setExperienceRequired(d.experienceRequired ?? 0);
    setDomain(d.domain ?? "Other");
    setBannerUrl(d.bannerUrl ?? null);
    setPreferredGender(d.preferredGender ?? "ANY");

    // Wizard metadata
    if (meta.objectives) setObjectives(meta.objectives);
    if (meta.deliverables) setDeliverables(meta.deliverables);
    if (meta.responsibilities) setResponsibilities(meta.responsibilities);
    if (meta.dailyTasks) setDailyTasks(meta.dailyTasks);
    if (meta.preferredSkills) setPreferredSkills(meta.preferredSkills);
    if (meta.category) setCategory(meta.category);
    if (meta.subcategory) setSubcategory(meta.subcategory);
    if (meta.duration) setDuration(meta.duration);
    if (meta.visibility) setVisibility(meta.visibility);
    if (meta.currency) setCurrency(meta.currency);
    if (meta.compensationType) setCompensationType(meta.compensationType);
    if (meta.paymentCategory) setPaymentCategory(meta.paymentCategory);
    if (meta.paymentRate !== undefined) setPaymentRate(meta.paymentRate);
    if (meta.estimatedHours !== undefined) setEstimatedHours(meta.estimatedHours);
    if (meta.stipendFrequency) setStipendFrequency(meta.stipendFrequency);
    if (meta.stipendType) setStipendType(meta.stipendType);
    if (meta.stipendDetails) setStipendDetails(meta.stipendDetails);
    if (meta.budgetNegotiable !== undefined) setBudgetNegotiable(meta.budgetNegotiable);
    if (meta.certificateIncluded !== undefined) setCertificateIncluded(meta.certificateIncluded);
    if (meta.nonMonetaryBenefits) setNonMonetaryBenefits(meta.nonMonetaryBenefits);
    if (meta.nonMonetaryDetails) setNonMonetaryDetails(meta.nonMonetaryDetails);
    if (meta.workingDays) setWorkingDays(meta.workingDays);
    if (meta.timingType) setTimingType(meta.timingType);

    // Rounds carry their own configuration and their questions, in order.
    if (meta.rounds && meta.rounds.length > 0) {
      setRounds(meta.rounds);
      const firstScreening = meta.rounds.find((r) => r.type === "SCREENING_QUESTIONS");
      if (firstScreening) setSelectedRoundId(firstScreening.id);
    }
    if (meta.timeline) {
      if (meta.timeline.applicationDeadline) setAppDeadline(meta.timeline.applicationDeadline);
      if (meta.timeline.projectStart) setProjectStart(meta.timeline.projectStart);
      if (meta.timeline.expectedCompletion) setExpectedCompletion(meta.timeline.expectedCompletion);
    }

    setResumableDraft(null);
    setDraftState("saved");
  };

  const handleAddRound = () => {
    if (!newRoundName.trim()) return;
    const round: RecruitmentRound = {
      id: `r-${Date.now()}`,
      name: newRoundName.trim(),
      type: newRoundType,
      description: newRoundDescription.trim(),
      ...(newRoundType === "SCREENING_QUESTIONS" && { questions: [] })
    };
    setRounds([...rounds, round]);
    setNewRoundName("");
    setNewRoundDescription("");
    setSelectedRoundId(round.id);
  };

  const handleRemoveRound = (id: string) => {
    setRounds(rounds.filter(r => r.id !== id));
    if (selectedRoundId === id) {
      const remaining = rounds.filter(r => r.id !== id);
      const firstQuestRound = remaining.find(r => r.type === "SCREENING_QUESTIONS");
      setSelectedRoundId(firstQuestRound ? firstQuestRound.id : "");
    }
  };

  const handleAddQuestionToRound = () => {
    if (!newQuestionText.trim() || !selectedRoundId) return;
    const opts = [mcOption1, mcOption2, mcOption3, mcOption4].map(o => o.trim()).filter(Boolean);
    if (newQuestionType === "MULTIPLE_CHOICE" && opts.length < 2) {
      alert("Please provide at least 2 options for Multiple Choice questions.");
      return;
    }

    const questionItem = {
      id: `q-${Date.now()}`,
      type: newQuestionType,
      question: newQuestionText.trim(),
      required: true,
      ...(newQuestionType === "MULTIPLE_CHOICE" && { options: opts })
    };

    setRounds(rounds.map(r => {
      if (r.id === selectedRoundId) {
        return {
          ...r,
          questions: [...(r.questions || []), questionItem]
        };
      }
      return r;
    }));

    setNewQuestionText("");
    setMcOption1("");
    setMcOption2("");
    setMcOption3("");
    setMcOption4("");
  };

  /**
   * Requirement #8 — reorder by stable id. The array order is what gets
   * persisted, but identity never comes from the index, so a submitted answer
   * keyed on the question id stays correctly attributed after a move.
   */
  const handleMoveQuestion = (roundId: string, qId: string, direction: "up" | "down") => {
    setRounds(rounds.map((r) => {
      if (r.id !== roundId) return r;
      const qs = [...(r.questions || [])];
      const i = qs.findIndex((q) => q.id === qId);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= qs.length) return r;
      [qs[i], qs[j]] = [qs[j], qs[i]];
      return { ...r, questions: qs };
    }));
  };

  /** Edits the text in place; the id, type and options are preserved. */
  const handleEditQuestion = (roundId: string, qId: string, current: string) => {
    const next = prompt("Edit question", current);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    setRounds(rounds.map((r) => (
      r.id !== roundId
        ? r
        : { ...r, questions: (r.questions || []).map((q) => (q.id === qId ? { ...q, question: trimmed } : q)) }
    )));
  };

  const handleRemoveQuestionFromRound = (roundId: string, qId: string) => {
    setRounds(rounds.map(r => {
      if (r.id === roundId) {
        return {
          ...r,
          questions: (r.questions || []).filter(q => q.id !== qId)
        };
      }
      return r;
    }));
  };

  // Drag & Drop
  const [draggedRoundIndex, setDraggedRoundIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedRoundIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    if (draggedRoundIndex === null || draggedRoundIndex === index) return;
    const newRounds = [...rounds];
    const [draggedItem] = newRounds.splice(draggedRoundIndex, 1);
    newRounds.splice(index, 0, draggedItem);
    setRounds(newRounds);
    setDraggedRoundIndex(null);
  };

  /**
   * Requirement #3/#14 — ONE authoritative wizard payload.
   *
   * Autosave, the final preview and submit all call this, so the preview shows
   * exactly the object that will be serialised and saved, and a resumed draft
   * restores exactly what was entered. Previously the payload was built inline
   * in the submit handler only, which is why the draft could not round-trip it.
   */
  const buildWizardMeta = (): ProjectWizardData => {
    const allQuestions = rounds
      .filter((r) => r.type === "SCREENING_QUESTIONS")
      .flatMap((r) => r.questions || []);
  
    // Build serialized metadata structure
    const wizardMeta: ProjectWizardData = {
      objectives,
      deliverables,
      responsibilities,
      dailyTasks,
      preferredSkills,
      faq: [
        { question: "What is the work setup?", answer: `${timingType} (${workingDays}) remote engagement.` }
      ],
      timeline: {
        applicationDeadline: appDeadline,
        projectStart: projectStart,
        expectedCompletion: expectedCompletion,
      },
      stipendType: (compensationType === "UNPAID"
        ? "Unpaid"
        : compensationType === "STIPEND"
        ? "Stipend"
        : "Paid") as "Unpaid" | "Paid" | "Stipend",
      stipendDetails,
      paymentCategory: (compensationType === "HOURLY"
        ? "HOURLY"
        : compensationType === "MILESTONE"
        ? "MILESTONE"
        : compensationType === "STIPEND"
        ? "MONTHLY"
        : compensationType === "UNPAID"
        ? "NON_MONETARY"
        : "FIXED") as PaymentCategory,
      paymentRate,
      compensationType,
      estimatedHours,
      stipendFrequency,
      budgetNegotiable,
      certificateIncluded,
      currency,
      nonMonetaryBenefits,
      nonMonetaryDetails,
      workingDays,
      timingType,
      screeningQuestions: allQuestions,
      visibility,
      category,
      subcategory,
      duration,
      rounds,
    };
    return wizardMeta;
  };

  const handlePublish = async () => {
    if (!title || !description) {
      setError("Please complete title and description.");
      return;
    }

    setLoading(true);
    setError("");

    const wizardMeta = buildWizardMeta();

    // Serialize metadata directly inside project description field
    const fullSerializedDescription = serializeProjectMetadata(description, wizardMeta);

    try {
      const res = await createProject({
        title,
        description: fullSerializedDescription,
        budget: Number(budget),
        priority,
        requiredSkills,
        experienceRequired: Number(experienceRequired),
        // With roles, capacity is the sum of their slots; without, the original single hire.
        freelancersLimit:
          roles.length > 0 ? roles.reduce((n, r) => n + (Number(r.slots) || 0), 0) : 1,
        isVisible: visibility !== "PRIVATE",
        preferredGender: preferredGender,
        domain: domain,
        bannerUrl,
      });

      if (res.success) {
        // Roles are saved after creation because they need the new project id.
        if (roles.length > 0 && res.project?.id) {
          const roleRes = await saveProjectRoles(res.project.id, roles);
          if (!roleRes.success) {
            setError(roleRes.error || "Project created, but roles could not be saved.");
            setLoading(false);
            return;
          }
        }
        router.push("/company/projects");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to publish project.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Wizard Header Status bar */}
      <div className="bg-white border border-[#C7CBD6] p-6 rounded-lg space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1D29]">Opportunity Creation Wizard</h1>
            <p className="text-xs text-[#5B6272] mt-0.5">Define your project requirements, screening stages, and milestones</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Requirement #3 — quiet autosave state; never blocks the form. */}
            {draftState !== "idle" && (
              <span className="text-[11px] font-semibold text-[#5B6272]">
                {draftState === "saving"
                  ? "Saving draft..."
                  : draftState === "saved"
                  ? "Draft saved"
                  : "Unsaved changes"}
              </span>
            )}
            <Badge variant="primary" className="px-3.5 py-1.5 rounded-full bg-[#E8F1FE] text-[#1A1D29] border border-[#C7CBD6]">
              Step {step} of 5
            </Badge>
          </div>
        </div>

        {/* A draft from a previous visit — this company's own, resolved server-side. */}
        {resumableDraft && !draftId && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E3E5EA] bg-[#F8F9FB] px-3 py-2">
            <p className="text-xs text-[#1A1D29]">
              You have an unfinished draft: <strong>{resumableDraft.title}</strong>
            </p>
            <div className="flex gap-1.5">
              <Button
                size="xs"
                variant="outline"
                onClick={() => resumeDraft(resumableDraft.id)}
                className="h-7 cursor-pointer px-2.5 text-[11px] font-bold"
              >
                Resume draft
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setResumableDraft(null)}
                className="h-7 cursor-pointer px-2.5 text-[11px] font-bold"
              >
                Start fresh
              </Button>
            </div>
          </div>
        )}

        {/* Wizard indicator progress */}
        <div className="grid grid-cols-5 gap-2 pt-2">
          {[
            { id: 1, label: "Basic Details", icon: FileText },
            { id: 2, label: "Job Description", icon: FileText },
            { id: 3, label: "Budget & Timeline", icon: DollarSign },
            { id: 4, label: "Screening Rounds", icon: HelpCircle },
            { id: 5, label: "Preview & Publish", icon: Eye },
          ].map((s) => {
            const isCurrent = step === s.id;
            const isPassed = step > s.id;
            return (
              <div key={s.id} className="space-y-1">
                <div className={`h-1.5 rounded-lg ${
                  isPassed ? "bg-[#EAF1FE]" : isCurrent ? "bg-[#152C55]" : "bg-[#F0F3F9]"
                }`} />
                <span className="hidden md:inline-block text-[11px] font-bold text-[#5B6272] mt-1">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-[#FDEAEA] border border-[#F5C2C2] text-[#BC2A2A] text-xs font-semibold rounded-lg">
          {error}
        </Card>
      )}

      <Card className="p-8 bg-white border border-[#E3E5EA]/80 rounded-lg">
        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#1A1D29] border-b border-[#E3E5EA]/60 pb-2">
              Step 1: Core Opportunity Details
            </h2>

            <ProjectBannerUpload value={bannerUrl} onChange={setBannerUrl} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Project Title *"
                  placeholder="e.g. Generative AI Internship / UI Design Specialist"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <Select
                label="Opportunity Domain"
                options={[
                  { value: "Software Engineering", label: "Software Engineering" },
                  { value: "Data & AI", label: "Data & AI" },
                  { value: "Design & UX", label: "Design & UX" },
                  { value: "Marketing & Sales", label: "Marketing & Sales" },
                  { value: "Product & Project Management", label: "Product & Project Management" },
                  { value: "Writing & Translation", label: "Writing & Translation" },
                  { value: "Admin & Support", label: "Admin & Support" },
                  { value: "Finance & Accounting", label: "Finance & Accounting" },
                  { value: "Legal", label: "Legal" },
                  { value: "Other", label: "Other" },
                ]}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
              <Input
                label="Opportunity Category"
                placeholder="Software Development, Marketing, etc."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <Input
                label="Opportunity Subcategory"
                placeholder="e.g. Next.js Developer / Full Stack"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
              />
              <Input
                label="Required Minimum Experience (Years) *"
                type="number"
                value={experienceRequired}
                onChange={(e) => setExperienceRequired(Number(e.target.value))}
              />
              <Input
                label="Expected Project Engagement Duration"
                placeholder="e.g. 3 Months, 6 Months"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <Select
                label="Listing Visibility"
                options={[
                  { value: "PUBLIC", label: "Public (Listed in Directory)" },
                  { value: "PRIVATE", label: "Private (Hidden, Invited only)" },
                  { value: "INVITE_ONLY", label: "Invite-Only (Searchable but apply blocked)" },
                ]}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
              />
              <Select
                label="Preferred Candidate Gender"
                options={[
                  { value: "ANY", label: "Any (No preference)" },
                  { value: "MALE", label: "Male Only" },
                  { value: "FEMALE", label: "Female Only" },
                ]}
                value={preferredGender}
                onChange={(e) => setPreferredGender(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => {
                if (!title) {
                  setError("Project Title is required.");
                  return;
                }
                setStep(2);
              }} className="cursor-pointer">
                Next: Description & Skills <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Description & Skills */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#1A1D29] border-b border-[#E3E5EA] pb-2">
              Step 2: Opportunity Scope & Skill Sets
            </h2>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#5B6272] font-bold">Scope Summary / Overview *</label>
              <textarea
                className="w-full min-h-[120px] px-4 py-2.5 rounded-md text-sm bg-white border border-[#E3E5EA] focus:outline-none focus:ring-2 focus:ring-[#152C55]/20"
                placeholder="Outline the overall goals, client details, and software systems..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Required Skills */}
              <div className="space-y-2.5 text-left">
                <label className="block text-xs font-bold text-[#5B6272]">Required Primary Skills *</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type skill and press Add (e.g. react, typescript)"
                    value={newReqSkill}
                    onChange={(e) => setNewReqSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value;
                        const skillsToAdd = val.split(",").map(s => s.trim().toLowerCase()).filter(s => s && !requiredSkills.includes(s));
                        if (skillsToAdd.length > 0) setRequiredSkills([...requiredSkills, ...skillsToAdd]);
                        setNewReqSkill("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const skillsToAdd = newReqSkill.split(",").map(s => s.trim().toLowerCase()).filter(s => s && !requiredSkills.includes(s));
                      if (skillsToAdd.length > 0) setRequiredSkills([...requiredSkills, ...skillsToAdd]);
                      setNewReqSkill("");
                    }}
                    className="cursor-pointer h-[42px] mt-1 shrink-0 bg-[#F8F9FB]"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {requiredSkills.length === 0 ? (
                    <span className="text-[11px] text-[#5B6272] italic">No required skills added yet.</span>
                  ) : (
                    requiredSkills.map((s) => (
                      <Badge
                        key={s}
                        variant="primary"
                        className="bg-[#EAF1FE]/10 text-[#1A1D29] border border-[#C7CBD6]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setRequiredSkills(requiredSkills.filter((x) => x !== s))}
                          className="hover:text-[#BC2A2A] font-bold cursor-pointer border-none bg-transparent p-0"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Preferred Skills */}
              <div className="space-y-2.5 text-left">
                <label className="block text-xs font-bold text-[#5B6272]">Preferred Secondary Skills</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type skill and press Add (e.g. docker, postgresql)"
                    value={newPrefSkill}
                    onChange={(e) => setNewPrefSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value;
                        const skillsToAdd = val.split(",").map(s => s.trim().toLowerCase()).filter(s => s && !preferredSkills.includes(s));
                        if (skillsToAdd.length > 0) setPreferredSkills([...preferredSkills, ...skillsToAdd]);
                        setNewPrefSkill("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const skillsToAdd = newPrefSkill.split(",").map(s => s.trim().toLowerCase()).filter(s => s && !preferredSkills.includes(s));
                      if (skillsToAdd.length > 0) setPreferredSkills([...preferredSkills, ...skillsToAdd]);
                      setNewPrefSkill("");
                    }}
                    className="cursor-pointer h-[42px] mt-1 shrink-0 bg-[#F8F9FB]"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {preferredSkills.length === 0 ? (
                    <span className="text-[11px] text-[#5B6272] italic">No preferred skills added yet.</span>
                  ) : (
                    preferredSkills.map((s) => (
                      <Badge
                        key={s}
                        variant="neutral"
                        className="bg-[#E8F1FE] text-[#5B6272] border border-[#E3E5EA] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setPreferredSkills(preferredSkills.filter((x) => x !== s))}
                          className="hover:text-[#BC2A2A] font-bold cursor-pointer border-none bg-transparent p-0"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* List Builders for Objectives, Deliverables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2.5">
                <span className="block text-xs font-bold text-[#5B6272]">Project Objectives</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Integrate Neon Cloud database"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!newObjective) return;
                      setObjectives([...objectives, newObjective]);
                      setNewObjective("");
                    }}
                    className="cursor-pointer h-[42px] mt-1 shrink-0"
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {objectives.map((o, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg">
                      <span className="truncate">{o}</span>
                      <button type="button" onClick={() => setObjectives(objectives.filter((_, i) => i !== idx))} className="text-[#BC2A2A] hover:text-[#BC2A2A]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="block text-xs font-bold text-[#5B6272]">Key Deliverables</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Deployed vercel testing environment"
                    value={newDeliverable}
                    onChange={(e) => setNewDeliverable(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!newDeliverable) return;
                      setDeliverables([...deliverables, newDeliverable]);
                      setNewDeliverable("");
                    }}
                    className="cursor-pointer h-[42px] mt-1 shrink-0"
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {deliverables.map((d, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg">
                      <span className="truncate">{d}</span>
                      <button type="button" onClick={() => setDeliverables(deliverables.filter((_, i) => i !== idx))} className="text-[#BC2A2A] hover:text-[#BC2A2A]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <RoleSlotsEditor roles={roles} onChange={setRoles} disabled={loading} />

            <div className="flex gap-4 justify-between pt-4 border-t border-[#E3E5EA]">
              <Button variant="outline" onClick={() => setStep(1)} className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button onClick={() => {
                if (!description || requiredSkills.length === 0) {
                  setError("Please fill in description and add at least one required primary skill.");
                  return;
                }
                if (roles.length > 0 && roles.some((r) => !r.name.trim())) {
                  setError("Every team role needs a name, or remove the empty ones.");
                  return;
                }
                setStep(3);
              }} className="cursor-pointer">
                Next: Budget & Timelines <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Budget & Timelines */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#1A1D29] border-b border-[#E3E5EA] pb-2">
              Step 3: Compensation, Working Days & Timelines
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compensationType !== "UNPAID" && (
                <Select
                  label="Currency"
                  options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name} (${c.symbol})` }))}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              )}
              <Select
                label="Compensation Type"
                options={COMPENSATION_TYPES.map((c) => ({ value: c.value, label: c.label }))}
                value={compensationType}
                onChange={(e) => setCompensationType(e.target.value as CompensationType)}
              />
              {compensationType === "HOURLY" && (
                <>
                  <Input
                    label={`Hourly Rate (${getCurrencySymbol(currency)} per hour)`}
                    type="number"
                    min={0}
                    value={paymentRate}
                    onChange={(e) => setPaymentRate(Number(e.target.value))}
                  />
                  <Input
                    label="Estimated Hours"
                    type="number"
                    min={0}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  />
                  <div className="rounded-lg border border-[#E3E5EA] bg-[#F8F9FB] px-3 py-2 text-xs text-[#5B6272]">
                    Estimated Total:{" "}
                    <strong className="text-[#1A1D29]">
                      {getCurrencySymbol(currency)}
                      {estimatedHourlyTotal(paymentRate, estimatedHours).toLocaleString()}
                    </strong>
                  </div>
                </>
              )}
              {compensationType === "STIPEND" && (
                <>
                  <Input
                    label={`Stipend Amount (${getCurrencySymbol(currency)})`}
                    type="number"
                    min={0}
                    value={paymentRate}
                    onChange={(e) => setPaymentRate(Number(e.target.value))}
                  />
                  <Select
                    label="Stipend Frequency"
                    options={STIPEND_FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))}
                    value={stipendFrequency}
                    onChange={(e) => setStipendFrequency(e.target.value as StipendFrequency)}
                  />
                </>
              )}
              {compensationType === "FIXED" && (
                <label className="flex items-center gap-2 text-xs font-medium text-[#5B6272]">
                  <input
                    type="checkbox"
                    checked={budgetNegotiable}
                    onChange={(e) => setBudgetNegotiable(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded-md border-[#C7CBD6]"
                  />
                  Budget is negotiable
                </label>
              )}
              {compensationType === "MILESTONE" && (
                <div className="rounded-lg border border-[#E3E5EA] bg-[#F8F9FB] px-3 py-2 text-xs text-[#5B6272]">
                  Total is derived from the milestone values defined for this project.
                </div>
              )}
              <label className="flex items-center gap-2 text-xs font-medium text-[#5B6272]">
                <input
                  type="checkbox"
                  checked={certificateIncluded}
                  onChange={(e) => setCertificateIncluded(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded-md border-[#C7CBD6]"
                />
                Certificate Included
              </label>
              {certificateIncluded && (
                <div className="sm:col-span-2 rounded-lg border border-[#E3E5EA] bg-[#F8F9FB] px-4 py-3 text-[11px] text-[#5B6272]">
                  Your certificate can be customized after creating the project.
                </div>
              )}
              {compensationType !== "UNPAID" && (
                <>
                  <Input
                    label={`Estimated Opportunity Budget (${getCurrencySymbol(currency)})`}
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                  <Input
                    label="Stipend / Payment Details Description"
                    placeholder={`e.g. ${getCurrencySymbol(currency)}1000 - ${getCurrencySymbol(currency)}1500 per month`}
                    value={stipendDetails}
                    onChange={(e) => setStipendDetails(e.target.value)}
                  />
                </>
              )}
              {supportsBenefits(paymentCategory) && (
                <div className="sm:col-span-2 space-y-3 p-4 rounded-lg border border-hairline bg-surface-soft">
                  <div>
                    <span className="text-xs font-semibold text-ink block">
                      Non-Monetary Compensation
                    </span>
                    <span className="text-[11px] text-muted">
                      Select everything this opportunity actually provides. Freelancers filter on these,
                      so only tick what you will genuinely deliver.
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {NON_MONETARY_BENEFITS.map((b) => (
                      <label
                        key={b.value}
                        className="flex items-start gap-2 text-xs text-body cursor-pointer"
                        title={b.hint}
                      >
                        <input
                          type="checkbox"
                          checked={nonMonetaryBenefits.includes(b.value)}
                          onChange={() => toggleBenefit(b.value)}
                          className="mt-0.5 accent-ink cursor-pointer"
                        />
                        <span>
                          {b.label}
                          <span className="block text-[11px] text-border-strong">{b.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <Input
                    label="Additional details (equity %, prize pool, certificate issuer, etc.)"
                    placeholder="e.g. 0.5% equity vesting over 2 years; certificate issued by Quantum Labs AI"
                    value={nonMonetaryDetails}
                    onChange={(e) => setNonMonetaryDetails(e.target.value)}
                  />
                  {nonMonetaryBenefits.length === 0 && (
                    <p className="text-[11px] text-warning">
                      Select at least one benefit — otherwise this opportunity offers no compensation at all.
                    </p>
                  )}
                </div>
              )}

              <Select
                label="Required Working Structure"
                options={[
                  { value: "5 Days/Week", label: "5 Working Days/Week" },
                  { value: "6 Days/Week", label: "6 Working Days/Week" },
                  { value: "Flexible days", label: "Flexible engagement" },
                ]}
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
              />
              <Select
                label="Engagement Timing"
                options={[
                  { value: "Full Time", label: "Full Time (8 hours/day)" },
                  { value: "Part Time", label: "Part Time (4 hours/day)" },
                  { value: "Hourly contract", label: "Hourly tasks basis" },
                ]}
                value={timingType}
                onChange={(e) => setTimingType(e.target.value)}
              />
              <Select
                label="Opportunity Priority"
                options={[
                  { value: "LOW", label: "Low Urgency" },
                  { value: "MEDIUM", label: "Medium Urgency" },
                  { value: "HIGH", label: "High Urgency" },
                ]}
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#E3E5EA] pt-4">
              <Input
                label="Application Deadline Date *"
                type="date"
                value={appDeadline}
                onChange={(e) => setAppDeadline(e.target.value)}
              />
              <Input
                label="Expected Project Kickoff *"
                type="date"
                value={projectStart}
                onChange={(e) => setProjectStart(e.target.value)}
              />
              <Input
                label="Expected Final Completion *"
                type="date"
                value={expectedCompletion}
                onChange={(e) => setExpectedCompletion(e.target.value)}
              />
            </div>

            <div className="flex gap-4 justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button onClick={() => setStep(4)} className="cursor-pointer">
                Next: Screening Questions <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Recruitment Rounds Builder */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#1A1D29] border-b border-[#E3E5EA] pb-2 text-left">
              Step 4: Recruitment Rounds & Screening Assessments
            </h2>

            <p className="text-xs text-[#5B6272] font-semibold leading-relaxed text-left">
              Organize the hiring process for this project. Define evaluation steps such as CV screening, questionnaire tests, and coding challenges. Drag rounds to reorder them.
            </p>

            {/* Rounds List (HTML5 drag-and-drop) */}
            <div className="space-y-3.5 text-left">
              <h3 className="text-xs font-bold text-[#5B6272] uppercase tracking-wider">Recruitment Pipeline Timeline</h3>
              <div className="space-y-2">
                {rounds.map((round, index) => {
                  const isScreening = round.type === "SCREENING_QUESTIONS";
                  const questionCount = round.questions?.length || 0;
                  const isSelected = selectedRoundId === round.id;

                  return (
                    <div
                      key={round.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`p-4 bg-white border rounded-lg flex items-center justify-between gap-4 transition-all duration-200 ${
                        isSelected
                          ? "border-[#E3E5EA] shadow-md ring-1 ring-[#2E6BEA]/20 bg-[#F8F9FB]/10"
                          : "border-[#E3E5EA] hover:border-[#C7CBD6]"
                      } cursor-grab active:cursor-grabbing`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="text-[#5B6272] shrink-0">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="h-8 w-8 rounded-full bg-[#152C55]/5 text-[#1A1D29] flex items-center justify-center font-bold text-xs shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-[#1A1D29] truncate">{round.name}</span>
                            {/* EVAL-001..006 — an already-configured round of an
                                unsupported type is kept, not deleted, but labelled. */}
                            {!isRoundTypeSupported(round.type) && (
                              <span className="shrink-0 rounded-full border border-[#F5DEB0] bg-[#FFF3DC] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8F5E08]">
                                Coming soon
                              </span>
                            )}
                            <Badge variant={isScreening ? "primary" : "neutral"} className="text-[11px] font-bold py-0.5">
                              {round.type.replace("_", " ")}
                            </Badge>
                            {isScreening && (
                              <span className="text-[11px] text-[#5B6272] font-semibold">({questionCount} Questions)</span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#5B6272] truncate mt-0.5">{round.description}</p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isScreening && (
                          <Button
                            type="button"
                            size="xs"
                            variant={isSelected ? "primary" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRoundId(round.id);
                            }}
                            className="cursor-pointer text-[11px] py-1 px-2.5 font-bold"
                          >
                            Configure Questions
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveRound(round.id);
                          }}
                          className="p-1.5 text-[#BC2A2A] hover:bg-[#FDEAEA] rounded-full cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form to add a new round */}
            <div className="space-y-4 p-4.5 bg-[#F8F9FB] border border-[#C7CBD6]/60 rounded-lg text-left">
              <h4 className="text-xs font-bold text-[#1A1D29] flex items-center gap-1.5 font-bold">
                <Plus className="h-4 w-4 text-[#2159C9]" /> Add Custom Recruitment Round Step
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Round Name *"
                  placeholder="e.g. Technical Interview Round"
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                />
                <Select
                  label="Round Evaluation Type"
                  /* EVAL-001..006 — only types the platform can actually run are selectable;
                     the rest stay visible but disabled and marked "Coming soon", so the
                     capability gap is stated rather than discovered after launch. */
                  options={ROUND_TYPE_CATALOG.map((t) => ({
                    value: t.value,
                    label: isRoundTypeSupported(t.value)
                      ? t.label + " — " + t.description
                      : t.label + " (Coming soon) — not yet run by the platform",
                    disabled: !isRoundTypeSupported(t.value),
                  }))}
                  value={newRoundType}
                  onChange={(e) => setNewRoundType(e.target.value as any)}
                />
              </div>
              <Input
                label="Step Description"
                placeholder="Describe what candidates must do in this step of the hiring pipeline..."
                value={newRoundDescription}
                onChange={(e) => setNewRoundDescription(e.target.value)}
              />
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  onClick={handleAddRound}
                  disabled={!newRoundName.trim()}
                  className="cursor-pointer text-xs font-bold bg-[#152C55] hover:bg-[#E8F1FE] text-white"
                >
                  Create Round Step
                </Button>
              </div>
            </div>

            {selectedRoundId && (() => {
              const r = rounds.find((x) => x.id === selectedRoundId);
              if (!r) return null;
              return (
                <RoundConfigPanel
                  round={r}
                  onChange={(config) =>
                    setRounds(rounds.map((x) => (x.id === r.id ? { ...x, config } : x)))
                  }
                />
              );
            })()}

            {/* Screening questionnaire builder (Active ONLY for selected SCREENING_QUESTIONS round) */}
            {selectedRoundId && (
              (() => {
                const activeRound = rounds.find(r => r.id === selectedRoundId);
                if (!activeRound || activeRound.type !== "SCREENING_QUESTIONS") return null;

                return (
                  <div className="space-y-5 border-t border-[#E3E5EA] pt-5 text-left">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-[#1A1D29] uppercase tracking-wider">
                        Configure Questions for round: &quot;{activeRound.name}&quot;
                      </h3>
                      <p className="text-[11px] text-[#5B6272] font-semibold leading-relaxed">
                        Add evaluation questions specifically for this round. Candidates must answer these during application.
                      </p>
                    </div>

                    {/* Questions inside active round */}
                    <div className="divide-y divide-[#E3E5EA] border border-[#E3E5EA] rounded-lg overflow-hidden bg-[#F8F9FB]/50">
                      {(!activeRound.questions || activeRound.questions.length === 0) ? (
                        <p className="text-xs text-[#5B6272] italic p-4 text-center">No questions added yet. Add screening questions below.</p>
                      ) : (
                        activeRound.questions.map((q, idx) => (
                          <div key={q.id} className="flex justify-between items-center p-3.5 text-xs bg-white">
                            <div>
                              <p className="font-bold text-[#1A1D29]">Q{idx + 1}: {q.question}</p>
                              <p className="text-[11px] text-[#5B6272] mt-0.5 font-medium">Type: {q.type.replace("_", " ")}</p>
                              {q.options && q.options.length > 0 && (
                                <p className="text-[11px] text-[#2159C9] mt-0.5 font-bold">Options: {q.options.join(" | ")}</p>
                              )}
                            </div>
                            {/*
                              Requirement #8 — edit and reorder act on the
                              question's stable id, never its array position, so
                              an answer already submitted against `q.id` stays
                              attached to this question after either operation.
                            */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                title="Move up"
                                disabled={idx === 0}
                                onClick={() => handleMoveQuestion(activeRound.id, q.id, "up")}
                                className="cursor-pointer text-[#5B6272] disabled:opacity-30"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Move down"
                                disabled={idx === (activeRound.questions?.length ?? 0) - 1}
                                onClick={() => handleMoveQuestion(activeRound.id, q.id, "down")}
                                className="cursor-pointer text-[#5B6272] disabled:opacity-30"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Edit question"
                                onClick={() => handleEditQuestion(activeRound.id, q.id, q.question)}
                                className="cursor-pointer text-[#2159C9]"
                              >
                                <Move className="h-4 w-4 rotate-90" />
                              </button>
                              <button
                                type="button"
                                title="Delete question"
                                onClick={() => handleRemoveQuestionFromRound(activeRound.id, q.id)}
                                className="text-[#BC2A2A] hover:text-[#BC2A2A] cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Question Builder */}
                    <div className="space-y-4 p-4.5 bg-[#F8F9FB] border border-[#E3E5EA]/60 rounded-lg">
                      <h4 className="text-xs font-bold text-[#1A1D29]">Add Question to &quot;{activeRound.name}&quot;</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Question Prompt text *"
                          placeholder="e.g. Do you have experience building Next.js apps?"
                          value={newQuestionText}
                          onChange={(e) => setNewQuestionText(e.target.value)}
                        />
                        <Select
                          label="Response Input Type"
                          options={[
                            { value: "YES_NO", label: "Yes / No Select" },
                            { value: "PARAGRAPH", label: "Paragraph Response text" },
                            { value: "MULTIPLE_CHOICE", label: "Multiple Choice Questions" },
                            { value: "PORTFOLIO", label: "Portfolio URL verification" },
                            { value: "VIDEO_INTRO", label: "Video Introduction file" },
                            { value: "CODING_ASSESSMENT", label: "Coding Assessment / Exercise" },
                            { value: "ASSIGNMENT", label: "Custom Assignment Upload Round" },
                          ]}
                          value={newQuestionType}
                          onChange={(e) => setNewQuestionType(e.target.value as any)}
                        />
                      </div>

                      {newQuestionType === "MULTIPLE_CHOICE" && (
                        <div className="space-y-3">
                          <span className="block text-xs font-bold text-[#5B6272] uppercase tracking-wider font-bold">MCQ Options (Provide at least 2)</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label="Option 1 *"
                              placeholder="e.g. Yes"
                              value={mcOption1}
                              onChange={(e) => setMcOption1(e.target.value)}
                            />
                            <Input
                              label="Option 2 *"
                              placeholder="e.g. No"
                              value={mcOption2}
                              onChange={(e) => setMcOption2(e.target.value)}
                            />
                            <Input
                              label="Option 3 (Optional)"
                              placeholder="e.g. Other"
                              value={mcOption3}
                              onChange={(e) => setMcOption3(e.target.value)}
                            />
                            <Input
                              label="Option 4 (Optional)"
                              placeholder="e.g. N/A"
                              value={mcOption4}
                              onChange={(e) => setMcOption4(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={handleAddQuestionToRound}
                          disabled={!newQuestionText.trim()}
                          className="cursor-pointer text-xs font-bold bg-white text-[#1A1D29] border border-[#1A1D29]/25 hover:bg-[#F8F9FB]"
                        >
                          Add Question
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            <div className="flex gap-4 justify-between pt-4 border-t border-[#E3E5EA]">
              <Button variant="outline" onClick={() => setStep(3)} className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button onClick={() => setStep(5)} className="cursor-pointer">
                Next: Preview Opportunity <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Preview */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#1A1D29] border-b border-[#E3E5EA] pb-2">
              Step 5: Live Freelancer Page Preview
            </h2>

            <p className="text-xs text-[#5B6272] font-semibold leading-relaxed">
              Verify the layout before publishing the opportunity to the gig marketplace directories.
            </p>

            {/* MOCK PREVIEW CARD */}
            <div className="border border-[#E3E5EA] rounded-lg p-6 bg-[#F8F9FB]/30 space-y-6 text-left shadow-inner">
              <div className="space-y-2 border-b border-[#E3E5EA] pb-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="space-y-1">
                    <Badge variant="accent">AI Match Ready</Badge>
                    <h3 className="text-xl font-bold text-[#1A1D29] leading-tight">{title || "Opportunity Title"}</h3>
                    <p className="text-xs text-[#5B6272] font-medium">Category: {category} • {subcategory}</p>
                  </div>
                  {/*
                    Requirement #6 — this read `${budget} Total` with a literal
                    dollar sign, so a project priced in any other currency
                    previewed as USD and then saved as something else. Symbol,
                    amount and compensation type all come from the live form
                    state that is about to be serialised.
                  */}
                  <div className="text-right">
                    <span className="text-[11px] text-[#5B6272] font-bold uppercase block">
                      {COMPENSATION_TYPES.find((c) => c.value === compensationType)?.label ?? "Compensation"}
                    </span>
                    <span className="text-base font-bold text-[#1A1D29]">
                      {getCurrencySymbol(currency)}
                      {Number(budget || 0).toLocaleString()} {currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white border border-[#E3E5EA]/50 rounded-lg text-xs">
                <div>
                  <span className="text-[11px] text-[#5B6272] font-bold uppercase block">Duration</span>
                  <span className="font-bold text-[#1A1D29]">{duration}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#5B6272] font-bold uppercase block">Working Structure</span>
                  <span className="font-bold text-[#1A1D29]">{workingDays}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#5B6272] font-bold uppercase block">Timing type</span>
                  <span className="font-bold text-[#1A1D29]">{timingType}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#5B6272] font-bold uppercase block">Deadline</span>
                  <span className="font-bold text-[#BC2A2A]">{appDeadline}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#5B6272] uppercase tracking-wider">Opportunity Overview</h4>
                <p className="text-xs text-[#5B6272] leading-relaxed whitespace-pre-wrap">{description}</p>
              </div>

              {/* Recruitment rounds list */}
              {rounds.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#5B6272] uppercase tracking-wider">Recruitment Process / Assessment Rounds</h4>
                  <div className="space-y-2">
                    {rounds.map((r, idx) => (
                      <div key={r.id} className="p-3 bg-white border border-[#E3E5EA]/60 rounded-lg text-xs">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-[#1A1D29]">Round {idx + 1}: {r.name}</span>
                            <p className="text-[11px] text-[#5B6272] mt-0.5">{r.description}</p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <Badge variant="neutral" className="text-[11px] capitalize py-0.5">{roundTypeLabel(r.type)}</Badge>
                            {!isRoundTypeSupported(r.type) && (
                              <Badge variant="warning" className="text-[11px] py-0.5">Coming soon</Badge>
                            )}
                          </div>
                        </div>

                        {/* Requirement #14 — the configuration actually stored on this round. */}
                        {r.config && Object.keys(r.config).length > 0 && (
                          <p className="mt-1.5 text-[11px] text-[#5B6272]">
                            {Object.entries(r.config)
                              .filter(([, v]) => v !== undefined && v !== null && v !== "")
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(" • ")}
                          </p>
                        )}

                        {/* Screening questions, in the persisted order, by id. */}
                        {r.questions && r.questions.length > 0 && (
                          <ol className="mt-2 space-y-1 border-t border-[#E3E5EA]/60 pt-2">
                            {r.questions.map((q, qi) => (
                              <li key={q.id} className="text-[11px] text-[#5B6272]">
                                <span className="font-semibold text-[#1A1D29]">Q{qi + 1}.</span> {q.question}
                                <span className="ml-1 text-[#8A90A0]">
                                  ({q.type.replace(/_/g, " ").toLowerCase()}{q.required ? ", required" : ""})
                                </span>
                                {q.options && q.options.length > 0 && (
                                  <span className="ml-1 text-[#2159C9]">— {q.options.join(" | ")}</span>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/*
                Requirement #14 — the remaining configured values, read from the
                same live state that buildWizardMeta() serialises on submit, so
                what is previewed is what is saved.
              */}
              <div className="grid grid-cols-1 gap-4 border-t border-[#E3E5EA] pt-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6272]">Objectives</h4>
                  {objectives.length === 0 ? (
                    <p className="text-[11px] text-[#5B6272]">None added</p>
                  ) : (
                    <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-[#5B6272]">
                      {objectives.map((o, i) => (
                        <li key={`${o}-${i}`}>{o}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6272]">Required skills</h4>
                  {requiredSkills.length === 0 ? (
                    <p className="text-[11px] text-[#5B6272]">None added</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {requiredSkills.map((s) => (
                        <Badge key={s} variant="neutral" className="text-[11px]">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6272]">Compensation</h4>
                  <p className="text-[11px] text-[#5B6272]">
                    {COMPENSATION_TYPES.find((c) => c.value === compensationType)?.label ?? compensationType}
                    {" · "}
                    {getCurrencySymbol(currency)}
                    {Number(budget || 0).toLocaleString()} {currency}
                    {compensationType === "HOURLY" && paymentRate
                      ? ` · ${getCurrencySymbol(currency)}${paymentRate}/hr`
                      : ""}
                    {compensationType === "STIPEND" ? ` · ${stipendFrequency}` : ""}
                    {budgetNegotiable ? " · Negotiable" : ""}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6272]">Visibility & domain</h4>
                  <p className="text-[11px] text-[#5B6272]">
                    {visibility} · {domain} · Priority {priority}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6272]">Dates</h4>
                  <p className="text-[11px] text-[#5B6272]">
                    Applications close {appDeadline} · Starts {projectStart} · Expected {expectedCompletion}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6272]">Requirements</h4>
                  <p className="text-[11px] text-[#5B6272]">
                    {experienceRequired} yr experience · {timingType} · {workingDays} · {duration}
                    {certificateIncluded ? " · Certificate included" : ""}
                  </p>
                </div>

                {deliverables.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6272]">Deliverables</h4>
                    <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-[#5B6272]">
                      {deliverables.map((d, i) => (
                        <li key={`${d}-${i}`}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {bannerUrl && (
                  <div className="space-y-1 sm:col-span-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6272]">Banner</h4>
                    <img src={bannerUrl} alt="Project banner" className="aspect-[16/9] w-full max-w-xs rounded-lg object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 justify-between pt-4 border-t border-[#E3E5EA]">
              <Button variant="outline" onClick={() => setStep(4)} disabled={loading} className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button
                onClick={handlePublish}
                disabled={loading}
                className="cursor-pointer bg-[#152C55] text-white hover:bg-[#EAF1FE] font-bold px-8"
              >
                {loading ? "Publishing Opportunity..." : "Publish Opportunity"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
