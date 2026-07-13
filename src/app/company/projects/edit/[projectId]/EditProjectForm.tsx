"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { editProject } from "@/actions/projectActions";
import { ProjectPriority } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  getProjectDescriptionText, 
  getProjectMetadataDirect, 
  serializeProjectMetadata, 
  ProjectWizardData,
  RecruitmentRound
} from "@/lib/workflowHelpers";
import { 
  Plus, 
  Trash2, 
  Clock, 
  DollarSign, 
  HelpCircle, 
  ClipboardList, 
  Calendar, 
  Users, 
  BookOpen,
  Award,
  ListTodo,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Move
} from "lucide-react";

interface EditProjectFormProps {
  project: {
    id: string;
    title: string;
    description: string;
    budget: number;
    priority: ProjectPriority;
    requiredSkills: string[];
    experienceRequired: number;
    freelancersLimit: number;
    isVisible: boolean;
    preferredGender: string | null;
  };
}

export function EditProjectForm({ project }: EditProjectFormProps) {
  const router = useRouter();
  const meta = getProjectMetadataDirect(project.description);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<"core" | "scope" | "schedules" | "questions">("core");

  // Tab 1: Core Details States
  const [title, setTitle] = useState(project.title);
  const [category, setCategory] = useState(meta.category || "Software Development");
  const [subcategory, setSubcategory] = useState(meta.subcategory || "Full Stack Development");
  const [duration, setDuration] = useState(meta.duration || "3 Months");
  const [experienceRequired, setExperienceRequired] = useState(project.experienceRequired);
  const [freelancersLimit, setFreelancersLimit] = useState(project.freelancersLimit);
  const [priority, setPriority] = useState<ProjectPriority>(project.priority);
  const [preferredGender, setPreferredGender] = useState(project.preferredGender || "ANY");
  const [isVisible, setIsVisible] = useState(project.isVisible);

  // Tab 2: Scope & Tag lists States
  const [description, setDescription] = useState(getProjectDescriptionText(project.description));
  const [objectives, setObjectives] = useState<string[]>(meta.objectives || []);
  const [deliverables, setDeliverables] = useState<string[]>(meta.deliverables || []);
  const [responsibilities, setResponsibilities] = useState<string[]>(meta.responsibilities || []);
  const [dailyTasks, setDailyTasks] = useState<string[]>(meta.dailyTasks || []);
  
  // Tag based Skills lists
  const [requiredSkills, setRequiredSkills] = useState<string[]>(project.requiredSkills || []);
  const [newReqSkill, setNewReqSkill] = useState("");
  const [preferredSkills, setPreferredSkills] = useState<string[]>(meta.preferredSkills || []);
  const [newPrefSkill, setNewPrefSkill] = useState("");

  const [newObjective, setNewObjective] = useState("");
  const [newDeliverable, setNewDeliverable] = useState("");
  const [newResponsibility, setNewResponsibility] = useState("");
  const [newDailyTask, setNewDailyTask] = useState("");

  // Tab 3: Compensation & Timelines States
  const [stipendType, setStipendType] = useState<"Unpaid" | "Paid" | "Stipend">(meta.stipendType || "Paid");
  const [budget, setBudget] = useState(project.budget);
  const [stipendDetails, setStipendDetails] = useState(meta.stipendDetails || "");
  const [workingDays, setWorkingDays] = useState(meta.workingDays || "5 Days/Week");
  const [timingType, setTimingType] = useState(meta.timingType || "Full Time");
  
  // Timelines dates
  const [appDeadline, setAppDeadline] = useState(meta.timeline?.applicationDeadline || "");
  const [projectStart, setProjectStart] = useState(meta.timeline?.projectStart || "");
  const [expectedCompletion, setExpectedCompletion] = useState(meta.timeline?.expectedCompletion || "");

  // Tab 4: Recruitment Rounds Builder
  const [rounds, setRounds] = useState<RecruitmentRound[]>(meta.rounds || []);

  // Round Builder Form States
  const [newRoundName, setNewRoundName] = useState("");
  const [newRoundType, setNewRoundType] = useState<RecruitmentRound["type"]>("SCREENING_QUESTIONS");
  const [newRoundDescription, setNewRoundDescription] = useState("");
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);

  // Active round selection to add/edit questions
  const [selectedRoundId, setSelectedRoundId] = useState<string>(() => {
    const firstQuestRound = (meta.rounds || []).find(r => r.type === "SCREENING_QUESTIONS");
    return firstQuestRound ? firstQuestRound.id : "r-questions";
  });

  // Questions builder inside the selected screening round
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<any>("YES_NO");
  const [mcOption1, setMcOption1] = useState("");
  const [mcOption2, setMcOption2] = useState("");
  const [mcOption3, setMcOption3] = useState("");
  const [mcOption4, setMcOption4] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Tag helper logic
  const handleAddRequiredSkill = (value: string) => {
    const skillsToAdd = value
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && !requiredSkills.includes(s));
    if (skillsToAdd.length > 0) {
      setRequiredSkills([...requiredSkills, ...skillsToAdd]);
    }
    setNewReqSkill("");
  };

  const handleAddPreferredSkill = (value: string) => {
    const skillsToAdd = value
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && !preferredSkills.includes(s));
    if (skillsToAdd.length > 0) {
      setPreferredSkills([...preferredSkills, ...skillsToAdd]);
    }
    setNewPrefSkill("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError("Project Title and Description Scope are required.");
      return;
    }
    if (requiredSkills.length === 0) {
      setError("Please add at least one required primary skill.");
      return;
    }

    setError("");
    setLoading(true);

    const allQuestions = rounds
      .filter((r) => r.type === "SCREENING_QUESTIONS")
      .flatMap((r) => r.questions || []);

    // Build serialized metadata structure
    const updatedMeta: ProjectWizardData = {
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
      stipendType,
      stipendDetails,
      workingDays,
      timingType,
      screeningQuestions: allQuestions,
      visibility: isVisible ? "PUBLIC" : "PRIVATE",
      category,
      subcategory,
      duration,
      rounds,
    };

    // Serialize details back into description
    const fullSerializedDescription = serializeProjectMetadata(description, updatedMeta);

    try {
      const res = await editProject(project.id, {
        title,
        description: fullSerializedDescription,
        budget: Number(budget),
        priority,
        requiredSkills,
        experienceRequired: Number(experienceRequired),
        freelancersLimit: Number(freelancersLimit),
        isVisible,
        preferredGender,
      });

      if (res.success) {
        router.push(`/company/projects/${project.id}`);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update project listing.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 bg-white border border-slate-100 shadow-md rounded-3xl">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 mb-6">
          {error}
        </div>
      )}

      {/* Tabs Toolbar */}
      <div className="flex border-b border-slate-100 pb-3 mb-6 gap-2 overflow-x-auto">
        {[
          { key: "core", label: "1. Core Details", icon: Award },
          { key: "scope", label: "2. Scope & Skills", icon: ClipboardList },
          { key: "schedules", label: "3. Stipends & Dates", icon: Calendar },
          { key: "questions", label: "4. Screening Rounds", icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-[#002d59] text-white shadow-sm"
                  : "bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        
        {/* Tab 1: Core Details */}
        {activeTab === "core" && (
          <div className="space-y-5 text-left">
            <Input
              label="Project Opportunity Title *"
              placeholder="e.g. Senior React Developer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Opportunity Category"
                options={[
                  { value: "Software Development", label: "Software Development" },
                  { value: "Design & UX", label: "Design & Creative UX" },
                  { value: "Product Management", label: "Product Management" },
                  { value: "Marketing & Growth", label: "Marketing & Growth" },
                ]}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              />
              <Select
                label="Subcategory Specialized"
                options={[
                  { value: "Full Stack Development", label: "Full Stack Development" },
                  { value: "Frontend Engineering", label: "Frontend Engineering" },
                  { value: "Backend Systems", label: "Backend Systems & APIs" },
                  { value: "Mobile Development", label: "Mobile Apps (iOS/Android)" },
                  { value: "DevOps & Cloud", label: "DevOps & Cloud Systems" },
                ]}
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                disabled={loading}
              />
              <Select
                label="Engagement Duration"
                options={[
                  { value: "1 Month", label: "1 Month Contract" },
                  { value: "3 Months", label: "3 Months (Standard)" },
                  { value: "6 Months", label: "6 Months Extended" },
                  { value: "Flexible term", label: "Flexible timeline" },
                ]}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Experience Level Required (Years) *"
                type="number"
                min="0"
                value={experienceRequired}
                onChange={(e) => setExperienceRequired(Number(e.target.value))}
                disabled={loading}
              />
              <Input
                label="Freelancers Recruitment Limit *"
                type="number"
                min="1"
                value={freelancersLimit}
                onChange={(e) => setFreelancersLimit(Number(e.target.value))}
                disabled={loading}
              />
              <Select
                label="Opportunity Priority Level"
                options={[
                  { value: "LOW", label: "Low Urgency" },
                  { value: "MEDIUM", label: "Medium Urgency" },
                  { value: "HIGH", label: "High Urgency" },
                ]}
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                disabled={loading}
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
                disabled={loading}
              />
              <Select
                label="Listing Marketplace Visibility"
                options={[
                  { value: "true", label: "Public (Show in Listings)" },
                  { value: "false", label: "Private (Invite Only / Draft)" },
                ]}
                value={isVisible ? "true" : "false"}
                onChange={(e) => setIsVisible(e.target.value === "true")}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Scope & Skills */}
        {activeTab === "scope" && (
          <div className="space-y-6 text-left">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-655 font-bold">Scope Overview / Objectives Text *</label>
              <textarea
                className="w-full min-h-[120px] px-4 py-2.5 rounded-xl text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002d59]/20"
                placeholder="Detailed objectives, business targets, and engineering stacks..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Tag Skill sets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Required Skills */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-600">Required Primary Skills *</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type and press Add (e.g. react, typescript)"
                    value={newReqSkill}
                    onChange={(e) => setNewReqSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRequiredSkill(newReqSkill);
                      }
                    }}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddRequiredSkill(newReqSkill)}
                    disabled={loading}
                    className="cursor-pointer h-[42px] mt-1 shrink-0 bg-slate-50"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {requiredSkills.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">No required skills added.</span>
                  ) : (
                    requiredSkills.map((s) => (
                      <Badge
                        key={s}
                        variant="primary"
                        className="bg-[#3ac0ff]/10 text-[#002d59] border border-[#3ac0ff]/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold"
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
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-600">Preferred Secondary Skills</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type and press Add (e.g. docker, aws)"
                    value={newPrefSkill}
                    onChange={(e) => setNewPrefSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPreferredSkill(newPrefSkill);
                      }
                    }}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddPreferredSkill(newPrefSkill)}
                    disabled={loading}
                    className="cursor-pointer h-[42px] mt-1 shrink-0 bg-slate-50"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {preferredSkills.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">No preferred skills added.</span>
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

            {/* Sub builders for Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2.5">
                <span className="block text-xs font-bold text-slate-650">Objectives List</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Integrate Neon Cloud database"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!newObjective) return;
                      setObjectives([...objectives, newObjective]);
                      setNewObjective("");
                    }}
                    disabled={loading}
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
                <span className="block text-xs font-bold text-slate-650">Key Deliverables List</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. React code cleanups"
                    value={newDeliverable}
                    onChange={(e) => setNewDeliverable(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!newDeliverable) return;
                      setDeliverables([...deliverables, newDeliverable]);
                      setNewDeliverable("");
                    }}
                    disabled={loading}
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

              <div className="space-y-2.5">
                <span className="block text-xs font-bold text-slate-650">Daily Responsibilities List</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Write clean code"
                    value={newResponsibility}
                    onChange={(e) => setNewResponsibility(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!newResponsibility) return;
                      setResponsibilities([...responsibilities, newResponsibility]);
                      setNewResponsibility("");
                    }}
                    disabled={loading}
                    className="cursor-pointer h-[42px] mt-1 shrink-0"
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {responsibilities.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="truncate">{r}</span>
                      <button type="button" onClick={() => setResponsibilities(responsibilities.filter((_, i) => i !== idx))} className="text-rose-600 hover:text-rose-800">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="block text-xs font-bold text-slate-650">Daily Routine Tasks</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Standup updates"
                    value={newDailyTask}
                    onChange={(e) => setNewDailyTask(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!newDailyTask) return;
                      setDailyTasks([...dailyTasks, newDailyTask]);
                      setNewDailyTask("");
                    }}
                    disabled={loading}
                    className="cursor-pointer h-[42px] mt-1 shrink-0"
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {dailyTasks.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="truncate">{t}</span>
                      <button type="button" onClick={() => setDailyTasks(dailyTasks.filter((_, i) => i !== idx))} className="text-rose-600 hover:text-rose-800">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Compensation & Timelines */}
        {activeTab === "schedules" && (
          <div className="space-y-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Compensation Structure"
                options={[
                  { value: "Paid", label: "Paid (Fixed Project Budget)" },
                  { value: "Stipend", label: "Monthly Stipend" },
                  { value: "Unpaid", label: "Unpaid / Volunteer engagement" },
                ]}
                value={stipendType}
                onChange={(e) => setStipendType(e.target.value as any)}
                disabled={loading}
              />
              <Input
                label="Estimated Total Opportunity Budget ($) *"
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                disabled={loading}
              />
              <Input
                label="Stipend details / Payment schedule text"
                placeholder="e.g. $1000 - $1200 per month"
                value={stipendDetails}
                onChange={(e) => setStipendDetails(e.target.value)}
                disabled={loading}
              />
              <Select
                label="Required Working Days Schedule"
                options={[
                  { value: "5 Days/Week", label: "5 Working Days/Week" },
                  { value: "6 Days/Week", label: "6 Working Days/Week" },
                  { value: "Flexible days", label: "Flexible Days" },
                ]}
                value={workingDays}
                onChange={(e) => setWorkingDays(e.target.value)}
                disabled={loading}
              />
              <Select
                label="Engagement contract timings"
                options={[
                  { value: "Full Time", label: "Full Time (8 hours/day)" },
                  { value: "Part Time", label: "Part Time (4 hours/day)" },
                  { value: "Hourly contract", label: "Hourly tasks basis" },
                ]}
                value={timingType}
                onChange={(e) => setTimingType(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* TIMELINES AS SELECTABLE HTML DATES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <Input
                label="Application Deadline Date *"
                type="date"
                value={appDeadline}
                onChange={(e) => setAppDeadline(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Expected Project Kickoff *"
                type="date"
                value={projectStart}
                onChange={(e) => setProjectStart(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Expected Final Completion *"
                type="date"
                value={expectedCompletion}
                onChange={(e) => setExpectedCompletion(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        )}        {/* Tab 4: Recruitment Rounds Builder */}
        {activeTab === "questions" && (
          <div className="space-y-6 text-left">
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
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
                          ? "border-[#3ac0ff] shadow-md ring-1 ring-[#3ac0ff]/20 bg-slate-50/10"
                          : "border-slate-200 hover:border-slate-350 shadow-sm"
                      } cursor-grab active:cursor-grabbing`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="text-slate-400 shrink-0">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="h-8 w-8 rounded-full bg-[#002d59]/5 text-[#002d59] flex items-center justify-center font-bold text-xs shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-[#002d59] truncate">{round.name}</span>
                            <Badge variant={isScreening ? "primary" : "neutral"} className="text-[9px] font-bold py-0.5">
                              {round.type.replace("_", " ")}
                            </Badge>
                            {isScreening && (
                              <span className="text-[10px] text-slate-500 font-semibold">({questionCount} Questions)</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-455 truncate mt-0.5">{round.description}</p>
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
                          disabled={loading}
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
              <h4 className="text-xs font-black text-[#002d59] flex items-center gap-1.5 font-bold">
                <Plus className="h-4 w-4 text-[#3ac0ff]" /> Add Custom Recruitment Round Step
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Round Name *"
                  placeholder="e.g. Technical Interview Round"
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                  disabled={loading}
                />
                <Select
                  label="Round Evaluation Type"
                  options={[
                    { value: "SCREENING_QUESTIONS", label: "Screening Questionnaire (Custom Questions)" },
                    { value: "CV_PITCH", label: "CV Screening / Profile Review" },
                    { value: "INTERVIEW", label: "Recruiter Panel Interview" },
                    { value: "COGNITIVE_TEST", label: "Cognitive Skill Assessment" },
                    { value: "TECHNICAL_ASSESSMENT", label: "Technical Coding Assessment" },
                  ]}
                  value={newRoundType}
                  onChange={(e) => setNewRoundType(e.target.value as any)}
                  disabled={loading}
                />
              </div>
              <Input
                label="Step Description"
                placeholder="Describe what candidates must do in this step of the hiring pipeline..."
                value={newRoundDescription}
                onChange={(e) => setNewRoundDescription(e.target.value)}
                disabled={loading}
              />
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  onClick={handleAddRound}
                  disabled={loading || !newRoundName.trim()}
                  className="cursor-pointer text-xs font-bold bg-[#002d59] hover:bg-[#001f3f] text-white"
                >
                  Create Round Step
                </Button>
              </div>
            </div>

            {/* Screening questionnaire builder (Active ONLY for selected SCREENING_QUESTIONS round) */}
            {selectedRoundId && (
              (() => {
                const activeRound = rounds.find(r => r.id === selectedRoundId);
                if (!activeRound || activeRound.type !== "SCREENING_QUESTIONS") return null;

                return (
                  <div className="space-y-5 border-t border-slate-100 pt-5 text-left">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black text-[#002d59] uppercase tracking-wider">
                        Configure Questions for round: &quot;{activeRound.name}&quot;
                      </h3>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                        Add evaluation questions specifically for this round. Candidates must answer these during application.
                      </p>
                    </div>

                    {/* Questions inside active round */}
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                      {(!activeRound.questions || activeRound.questions.length === 0) ? (
                        <p className="text-xs text-slate-450 italic p-4 text-center">No questions added yet. Add screening questions below.</p>
                      ) : (
                        activeRound.questions.map((q, idx) => (
                          <div key={q.id} className="flex justify-between items-center p-3.5 text-xs bg-white">
                            <div>
                              <p className="font-bold text-[#002d59]">Q{idx + 1}: {q.question}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Type: {q.type.replace("_", " ")}</p>
                              {q.options && q.options.length > 0 && (
                                <p className="text-[9px] text-[#3ac0ff] mt-0.5 font-bold">Options: {q.options.join(" | ")}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionFromRound(activeRound.id, q.id)}
                              disabled={loading}
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
                      <h4 className="text-xs font-bold text-[#002d59]">Add Question to &quot;{activeRound.name}&quot;</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Question Prompt text *"
                          placeholder="e.g. Do you have experience building Next.js apps?"
                          value={newQuestionText}
                          onChange={(e) => setNewQuestionText(e.target.value)}
                          disabled={loading}
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
                          disabled={loading}
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
                              disabled={loading}
                            />
                            <Input
                              label="Option 2 *"
                              placeholder="e.g. No"
                              value={mcOption2}
                              onChange={(e) => setMcOption2(e.target.value)}
                              disabled={loading}
                            />
                            <Input
                              label="Option 3 (Optional)"
                              placeholder="e.g. Other"
                              value={mcOption3}
                              onChange={(e) => setMcOption3(e.target.value)}
                              disabled={loading}
                            />
                            <Input
                              label="Option 4 (Optional)"
                              placeholder="e.g. N/A"
                              value={mcOption4}
                              onChange={(e) => setMcOption4(e.target.value)}
                              disabled={loading}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={handleAddQuestionToRound}
                          disabled={loading || !newQuestionText.trim()}
                          className="cursor-pointer text-xs font-bold bg-white text-[#002d59] border border-[#002d59]/25 hover:bg-slate-50"
                        >
                          Add Question
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Global Action controls */}
        <div className="flex gap-4 pt-4 border-t border-slate-150 justify-end">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push(`/company/projects/${project.id}`)}
            disabled={loading}
            className="w-1/3 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-1/2 cursor-pointer bg-[#002d59] text-white hover:bg-[#001c37] h-[42px] font-bold text-sm rounded-xl flex items-center justify-center"
          >
            {loading ? "Saving changes..." : "Save Opportunity Specification"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
