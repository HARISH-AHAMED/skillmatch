"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/actions/projectActions";
import { ProjectBannerUpload } from "@/components/ProjectBannerUpload";
import { saveProjectRoles, type RoleInput } from "@/actions/roleActions";
import { RoleSlotsEditor } from "@/components/RoleSlotsEditor";
import { ProjectPriority } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { serializeProjectMetadata, ProjectWizardData, RecruitmentRound, PAYMENT_CATEGORIES, PaymentCategory, CURRENCIES, DEFAULT_CURRENCY, getCurrencySymbol, NON_MONETARY_BENEFITS, NonMonetaryBenefit, isNonMonetary, supportsBenefits, COMPENSATION_TYPES, CompensationType, STIPEND_FREQUENCIES, StipendFrequency, estimatedHourlyTotal } from "@/lib/workflowHelpers";
import { ROUND_TYPE_CATALOG } from "@/lib/workflowHelpers";
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

  const handlePublish = async () => {
    if (!title || !description) {
      setError("Please complete title and description.");
      return;
    }

    setLoading(true);
    setError("");

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
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-[#181d26]">Opportunity Creation Wizard</h1>
            <p className="text-xs text-slate-500 mt-0.5">Define your project requirements, screening stages, and milestones</p>
          </div>
          <Badge variant="primary" className="px-3.5 py-1.5 rounded-xl bg-sky-50 text-[#181d26] border border-sky-100">
            Step {step} of 5
          </Badge>
        </div>

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
                <div className={`h-1.5 rounded-full ${
                  isPassed ? "bg-[#1b61c9]" : isCurrent ? "bg-[#181d26]" : "bg-slate-100"
                }`} />
                <span className="hidden md:inline-block text-[10px] font-bold text-slate-500 mt-1">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
          {error}
        </Card>
      )}

      <Card className="p-8 bg-white border border-slate-200/80 shadow-sm rounded-2xl">
        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-black text-[#181d26] border-b border-[#dddddd]/60 pb-2">
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
            <h2 className="text-lg font-black text-[#181d26] border-b border-slate-100 pb-2">
              Step 2: Opportunity Scope & Skill Sets
            </h2>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 font-bold">Scope Summary / Overview *</label>
              <textarea
                className="w-full min-h-[120px] px-4 py-2.5 rounded-xl text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#181d26]/20"
                placeholder="Outline the overall goals, client details, and software systems..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Required Skills */}
              <div className="space-y-2.5 text-left">
                <label className="block text-xs font-bold text-slate-600">Required Primary Skills *</label>
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
                    className="cursor-pointer h-[42px] mt-1 shrink-0 bg-slate-50"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {requiredSkills.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">No required skills added yet.</span>
                  ) : (
                    requiredSkills.map((s) => (
                      <Badge
                        key={s}
                        variant="primary"
                        className="bg-[#1b61c9]/10 text-[#181d26] border border-[#1b61c9]/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setRequiredSkills(requiredSkills.filter((x) => x !== s))}
                          className="hover:text-rose-600 font-extrabold cursor-pointer border-none bg-transparent p-0"
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
                <label className="block text-xs font-bold text-slate-600">Preferred Secondary Skills</label>
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
                    className="cursor-pointer h-[42px] mt-1 shrink-0 bg-slate-50"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {preferredSkills.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">No preferred skills added yet.</span>
                  ) : (
                    preferredSkills.map((s) => (
                      <Badge
                        key={s}
                        variant="neutral"
                        className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => setPreferredSkills(preferredSkills.filter((x) => x !== s))}
                          className="hover:text-rose-600 font-extrabold cursor-pointer border-none bg-transparent p-0"
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
                <span className="block text-xs font-bold text-slate-600">Project Objectives</span>
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
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="truncate">{o}</span>
                      <button type="button" onClick={() => setObjectives(objectives.filter((_, i) => i !== idx))} className="text-rose-600 hover:text-rose-800">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="block text-xs font-bold text-slate-600">Key Deliverables</span>
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
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="truncate">{d}</span>
                      <button type="button" onClick={() => setDeliverables(deliverables.filter((_, i) => i !== idx))} className="text-rose-600 hover:text-rose-800">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <RoleSlotsEditor roles={roles} onChange={setRoles} disabled={loading} />

            <div className="flex gap-4 justify-between pt-4 border-t border-slate-100">
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
            <h2 className="text-lg font-black text-[#181d26] border-b border-slate-100 pb-2">
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
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Estimated Total:{" "}
                    <strong className="text-[#181d26]">
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
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={budgetNegotiable}
                    onChange={(e) => setBudgetNegotiable(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300"
                  />
                  Budget is negotiable
                </label>
              )}
              {compensationType === "MILESTONE" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Total is derived from the milestone values defined for this project.
                </div>
              )}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={certificateIncluded}
                  onChange={(e) => setCertificateIncluded(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300"
                />
                Certificate Included
              </label>
              {certificateIncluded && (
                <div className="sm:col-span-2 rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-600">
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
                <div className="sm:col-span-2 space-y-3 p-4 rounded-[12px] border border-hairline bg-surface-soft">
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
                          <span className="block text-[10px] text-border-strong">{b.hint}</span>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
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
            <h2 className="text-lg font-black text-[#181d26] border-b border-slate-100 pb-2 text-left">
              Step 4: Recruitment Rounds & Screening Assessments
            </h2>

            <p className="text-xs text-slate-500 font-semibold leading-relaxed text-left">
              Organize the hiring process for this project. Define evaluation steps such as CV screening, questionnaire tests, and coding challenges. Drag rounds to reorder them.
            </p>

            {/* Rounds List (HTML5 drag-and-drop) */}
            <div className="space-y-3.5 text-left">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recruitment Pipeline Timeline</h3>
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
                      className={`p-4 bg-white border rounded-2xl flex items-center justify-between gap-4 transition-all duration-200 ${
                        isSelected
                          ? "border-[#1b61c9] shadow-md ring-1 ring-[#1b61c9]/20 bg-slate-50/10"
                          : "border-slate-200 hover:border-slate-300 shadow-sm"
                      } cursor-grab active:cursor-grabbing`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="text-slate-400 shrink-0">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="h-8 w-8 rounded-full bg-[#181d26]/5 text-[#181d26] flex items-center justify-center font-bold text-xs shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-[#181d26] truncate">{round.name}</span>
                            <Badge variant={isScreening ? "primary" : "neutral"} className="text-[9px] font-bold py-0.5">
                              {round.type.replace("_", " ")}
                            </Badge>
                            {isScreening && (
                              <span className="text-[10px] text-slate-500 font-semibold">({questionCount} Questions)</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{round.description}</p>
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
                            className="cursor-pointer text-[10px] py-1 px-2.5 font-bold"
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
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
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
            <div className="space-y-4 p-4.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-left">
              <h4 className="text-xs font-black text-[#181d26] flex items-center gap-1.5 font-bold">
                <Plus className="h-4 w-4 text-[#1b61c9]" /> Add Custom Recruitment Round Step
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
                  options={ROUND_TYPE_CATALOG.map((t) => ({ value: t.value, label: t.label + " — " + t.description }))}
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
                  className="cursor-pointer text-xs font-bold bg-[#181d26] hover:bg-[#001f3f] text-white"
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
                  <div className="space-y-5 border-t border-slate-100 pt-5 text-left">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black text-[#181d26] uppercase tracking-wider">
                        Configure Questions for round: &quot;{activeRound.name}&quot;
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                        Add evaluation questions specifically for this round. Candidates must answer these during application.
                      </p>
                    </div>

                    {/* Questions inside active round */}
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                      {(!activeRound.questions || activeRound.questions.length === 0) ? (
                        <p className="text-xs text-slate-400 italic p-4 text-center">No questions added yet. Add screening questions below.</p>
                      ) : (
                        activeRound.questions.map((q, idx) => (
                          <div key={q.id} className="flex justify-between items-center p-3.5 text-xs bg-white">
                            <div>
                              <p className="font-bold text-[#181d26]">Q{idx + 1}: {q.question}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Type: {q.type.replace("_", " ")}</p>
                              {q.options && q.options.length > 0 && (
                                <p className="text-[9px] text-[#1b61c9] mt-0.5 font-bold">Options: {q.options.join(" | ")}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionFromRound(activeRound.id, q.id)}
                              className="text-rose-600 hover:text-rose-800 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Question Builder */}
                    <div className="space-y-4 p-4.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
                      <h4 className="text-xs font-bold text-[#181d26]">Add Question to &quot;{activeRound.name}&quot;</h4>
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
                          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-bold">MCQ Options (Provide at least 2)</span>
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
                          className="cursor-pointer text-xs font-bold bg-white text-[#181d26] border border-[#181d26]/25 hover:bg-slate-50"
                        >
                          Add Question
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            <div className="flex gap-4 justify-between pt-4 border-t border-slate-100">
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
            <h2 className="text-lg font-black text-[#181d26] border-b border-slate-100 pb-2">
              Step 5: Live Freelancer Page Preview
            </h2>

            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Verify the layout before publishing the opportunity to the gig marketplace directories.
            </p>

            {/* MOCK PREVIEW CARD */}
            <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50/30 space-y-6 text-left shadow-inner">
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="space-y-1">
                    <Badge variant="accent">AI Match Ready</Badge>
                    <h3 className="text-xl font-black text-[#181d26] leading-tight">{title || "Opportunity Title"}</h3>
                    <p className="text-xs text-slate-500 font-medium">Category: {category} • {subcategory}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Budget / Stipend</span>
                    <span className="text-base font-black text-[#181d26]">${budget} Total</span>
                  </div>
                </div>
              </div>

              {/* Quick Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white border border-slate-200/50 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Duration</span>
                  <span className="font-bold text-[#181d26]">{duration}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Working Structure</span>
                  <span className="font-bold text-[#181d26]">{workingDays}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Timing type</span>
                  <span className="font-bold text-[#181d26]">{timingType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Deadline</span>
                  <span className="font-bold text-rose-600">{appDeadline}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opportunity Overview</h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{description}</p>
              </div>

              {/* Recruitment rounds list */}
              {rounds.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recruitment Process / Assessment Rounds</h4>
                  <div className="space-y-2">
                    {rounds.map((r, idx) => (
                      <div key={r.id} className="p-3 bg-white border border-slate-200/60 rounded-xl text-xs flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-[#181d26]">Round {idx + 1}: {r.name}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">{r.description}</p>
                        </div>
                        <Badge variant="neutral" className="text-[9px] capitalize py-0.5 shrink-0">{r.type.toLowerCase().replace("_", " ")}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-between pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setStep(4)} disabled={loading} className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button
                onClick={handlePublish}
                disabled={loading}
                className="cursor-pointer bg-[#181d26] text-white hover:bg-[#083a6b] font-bold px-8"
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
