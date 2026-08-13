"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { applyToProject } from "@/actions/applicationActions";
import {
  getProjectDescriptionText,
  getProjectMetadataDirect,
  RecruitmentRound,
  formatProjectBudget,
} from "@/lib/workflowHelpers";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Building,
  MapPin,
  Clock,
  Calendar,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  HelpCircle,
  FileText,
  Award,
} from "lucide-react";

interface ProjectApplyWizardProps {
  project: any;
  freelancer: any;
}

export function ProjectApplyWizard({ project, freelancer }: ProjectApplyWizardProps) {
  const router = useRouter();
  const meta = getProjectMetadataDirect(project.description);
  const cleanDescription = getProjectDescriptionText(project.description);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Specs review agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Role selection. Only relevant when the listing defines role slots; otherwise
  // the application is submitted with no role, exactly as before.
  const projectRoles: any[] = project.roles || [];
  const openRoles = projectRoles.filter(
    (r: any) => (r.applications?.length ?? 0) < r.slots || r.allowApprentice
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [applyAsApprentice, setApplyAsApprentice] = useState(false);
  const selectedRole = projectRoles.find((r: any) => r.id === selectedRoleId);
  const selectedRoleIsFull =
    selectedRole && (selectedRole.applications?.length ?? 0) >= selectedRole.slots;

  // Step 2: Questionnaire answers
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Step 3: Cover Pitch details
  const [coverLetter, setCoverLetter] = useState("");

  // Extract all screening questions across all rounds
  const screeningRounds = (meta.rounds || []).filter(
    (r: RecruitmentRound) => r.type === "SCREENING_QUESTIONS"
  );
  
  const allQuestions = screeningRounds.flatMap((r: RecruitmentRound) => r.questions || []);

  const handleNextStep = () => {
    if (step === 1) {
      if (!agreedToTerms) {
        setError("Please review and agree to the gig specifications and deadlines.");
        return;
      }
      if (projectRoles.length > 0 && !selectedRoleId) {
        setError("Please select which role you are applying for.");
        return;
      }
      setError("");
      if (allQuestions.length === 0) {
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      // Validate that all required answers are populated
      for (const q of allQuestions) {
        if (q.required && !answers[q.id]?.trim()) {
          setError(`Please answer the required question: "${q.question}"`);
          return;
        }
      }
      setError("");
      setStep(3);
    }
  };

  const handleBackStep = () => {
    if (step === 3) {
      if (allQuestions.length === 0) {
        setStep(1);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverLetter.trim()) {
      setError("Please write a cover pitch introduction.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await applyToProject(
        project.id,
        coverLetter.trim(),
        answers,
        selectedRoleId || undefined,
        applyAsApprentice
      );
      if (res.success) {
        router.push(`/freelancer/projects/${project.id}`);
        router.refresh();
      } else {
        setError(res.error || "Failed to submit application.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between px-4">
        {[
          { num: 1, label: "Specs & Specs Review" },
          { num: 2, label: "Screening Assessment", hide: allQuestions.length === 0 },
          { num: 3, label: "Submit Pitch Proposal" },
        ]
          .filter((s) => !s.hide)
          .map((s, idx, arr) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;

            return (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isActive
                        ? "bg-[#181d26] text-white ring-4 ring-[#181d26]/20"
                        : isCompleted
                        ? "bg-[#1968E5] text-white"
                        : "bg-[#E2E5EA] text-[#5A6472]"
                    }`}
                  >
                    {s.num}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isActive ? "text-[#181d26]" : "text-[#8A94A3]"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex-1 h-[2px] bg-[#E2E5EA] mx-4" />
                )}
              </React.Fragment>
            );
          })}
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-2 text-left animate-bounce">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Specs and Guidelines */}
      {step === 1 && (
        <Card className="p-6 md:p-8 space-y-6 bg-white border border-[#E2E5EA] shadow-lg rounded-3xl text-left">
          <div className="border-b border-[#EDEFF2] pb-4 space-y-1">
            <h2 className="text-xl font-black text-[#181d26]">Step 1: Review Project Specifications & Requirements</h2>
            <p className="text-xs text-[#8A94A3] font-medium">Verify the scope and parameters of the gig assignment.</p>
          </div>

          {/* Company details */}
          <div className="p-4 bg-[#F7F8FA] rounded-2xl border border-[#EDEFF2] grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-[#8A94A3] font-extrabold uppercase tracking-wider block">Recruiting Company</span>
              <div className="flex items-center gap-2 mt-1">
                <Building className="h-4 w-4 text-[#181d26]" />
                <span className="font-extrabold text-sm text-[#181d26]">{project.company.companyName}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#8A94A3] font-extrabold uppercase tracking-wider block">Engagement Location</span>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-[#1968E5]" />
                <span className="font-semibold text-xs text-[#5A6472]">{project.company.location || "Remote Workspace"}</span>
              </div>
            </div>
          </div>

          {/* Project description brief */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-[#181d26] uppercase tracking-wider">Opportunity Brief</h3>
            <p className="text-xs text-[#5A6472] leading-relaxed whitespace-pre-wrap">{cleanDescription}</p>
          </div>

          {/* deliverables and specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {meta.deliverables && meta.deliverables.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#181d26] uppercase tracking-wider">Key Deliverables</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#5A6472] font-medium">
                  {meta.deliverables.map((d: string, idx: number) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[#181d26] uppercase tracking-wider">Parameters & Schedule</h4>
              <div className="space-y-2.5 text-xs text-[#5A6472]">
                <div className="flex justify-between items-center border-b border-[#EDEFF2] pb-1.5">
                  <span className="font-bold text-[#8A94A3]">Compensation Budget:</span>
                  <span className="font-black text-[#181d26]">{formatProjectBudget(project)} Total</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#EDEFF2] pb-1.5">
                  <span className="font-bold text-[#8A94A3]">Working Timings:</span>
                  <span className="font-extrabold text-[#333840]">{meta.timingType || "Full Time"} ({meta.workingDays || "5 Days/Week"})</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#EDEFF2] pb-1.5">
                  <span className="font-bold text-[#8A94A3]">Project Duration:</span>
                  <span className="font-extrabold text-[#333840]">{meta.duration || "3 Months"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#8A94A3]">Required Experience:</span>
                  <span className="font-extrabold text-[#333840]">{project.experienceRequired} Years</span>
                </div>
              </div>
            </div>
          </div>

          {/* Role selection — only when this listing actually defines role slots */}
          {projectRoles.length > 0 && (
            <div className="pt-4 border-t border-[#EDEFF2] text-left space-y-2.5">
              <div>
                <span className="text-xs font-bold text-[#5A6472] block">Which role are you applying for?</span>
                <span className="text-[11px] text-[#5A6472]">
                  This is a team project — pick the position you want to fill.
                </span>
              </div>
              <div className="space-y-2">
                {projectRoles.map((role: any) => {
                  const filled = role.applications?.length ?? 0;
                  const isFull = filled >= role.slots;
                  const selectable = !isFull || role.allowApprentice;
                  return (
                    <label
                      key={role.id}
                      className={`flex items-start gap-2.5 p-3 border rounded-[12px] transition-colors ${
                        selectedRoleId === role.id
                          ? "border-[#181d26] bg-[#F7F8FA]"
                          : "border-[#E2E5EA] bg-white"
                      } ${selectable ? "cursor-pointer hover:border-[#C7CCD4]" : "opacity-60 cursor-not-allowed"}`}
                    >
                      <input
                        type="radio"
                        name="roleSlot"
                        value={role.id}
                        checked={selectedRoleId === role.id}
                        disabled={!selectable}
                        onChange={() => {
                          setSelectedRoleId(role.id);
                          // A full role can only be joined as an apprentice.
                          setApplyAsApprentice(filled >= role.slots);
                        }}
                        className="mt-0.5 accent-[#181d26]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#181d26]">{role.name}</span>
                          <span
                            className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isFull
                                ? "bg-[#F7F8FA] text-[#5A6472] border-[#E2E5EA]"
                                : "bg-emerald-50 text-[#0F9D58] border-emerald-200"
                            }`}
                          >
                            {filled} / {role.slots} filled
                          </span>
                          {role.allowApprentice && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                              Apprentice welcome
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-[11px] text-[#5A6472] mt-1 leading-relaxed">{role.description}</p>
                        )}
                        {isFull && role.allowApprentice && (
                          <p className="text-[11px] text-amber-700 mt-1">
                            All primary slots are taken — you can still apply to shadow this role as an
                            apprentice.
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Apprentice opt-in, when the role still has room but allows shadowing */}
              {selectedRole?.allowApprentice && !selectedRoleIsFull && (
                <label className="flex items-center gap-2 text-[11px] text-[#5A6472] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyAsApprentice}
                    onChange={(e) => setApplyAsApprentice(e.target.checked)}
                    className="accent-[#181d26]"
                  />
                  Apply as an apprentice (shadow this role) rather than as the primary hire
                  <span className="block text-[10px] text-[#5A6472] font-normal mt-0.5">
                    Apprentices assist the primary freelancer, are scored separately from primary work,
                    and can be promoted to primary if the primary cannot continue.
                  </span>
                </label>
              )}

              {openRoles.length === 0 && (
                <p className="text-[11px] text-rose-600">
                  Every role on this project is currently filled.
                </p>
              )}
            </div>
          )}

          {/* Agreement Checkbox */}
          <div className="pt-4 border-t border-[#EDEFF2] text-left">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 accent-[#181d26] h-4 w-4"
              />
              <div className="text-xs font-semibold text-[#5A6472] select-none">
                I verify that I have reviewed the qualifications, skill set requirements, deadlines, and responsibilities for this opportunity, and I possess the capability to fulfill them.
              </div>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleNextStep}
              disabled={!agreedToTerms || (projectRoles.length > 0 && !selectedRoleId)}
              className="cursor-pointer gap-1.5 font-bold"
            >
              {allQuestions.length === 0 ? "Skip to Final Submission" : "Proceed to Screening rounds"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Screening Questionnaire */}
      {step === 2 && allQuestions.length > 0 && (
        <Card className="p-6 md:p-8 space-y-6 bg-white border border-[#E2E5EA] shadow-lg rounded-3xl text-left">
          <div className="border-b border-[#EDEFF2] pb-4 space-y-1">
            <h2 className="text-xl font-black text-[#181d26]">Step 2: Screening Questionnaire Assessments</h2>
            <p className="text-xs text-[#C7CCD4] font-medium">Please answer the questions below required for the screening phase.</p>
          </div>

          <div className="space-y-6">
            {allQuestions.map((q: any, index: number) => {
              const ansVal = answers[q.id] || "";
              const setAnswer = (val: string) =>
                setAnswers((prev) => ({ ...prev, [q.id]: val }));

              return (
                <div key={q.id} className="p-4 bg-[#F7F8FA]/50 border border-[#E2E5EA]/50 rounded-2xl space-y-2.5">
                  <label className="block text-xs font-bold text-[#181d26] leading-relaxed">
                    Q{index + 1}: {q.question} {q.required && <span className="text-rose-500 font-bold">*</span>}
                  </label>

                  {q.type === "YES_NO" && (
                    <div className="flex gap-6 pl-1 pt-0.5">
                      {["Yes", "No"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-xs text-[#333840] cursor-pointer font-bold">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={ansVal === opt}
                            onChange={() => setAnswer(opt)}
                            className="accent-[#181d26] h-4 w-4"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "MULTIPLE_CHOICE" && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt: string) => {
                        const isSelected = ansVal === opt;
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => setAnswer(opt)}
                            className={`p-3 text-xs text-left rounded-xl border font-semibold transition-all ${
                              isSelected
                                ? "bg-[#181d26]/5 border-[#181d26] text-[#181d26] ring-2 ring-[#181d26]/5"
                                : "bg-white border-[#E2E5EA] text-[#333840] hover:border-[#C7CCD4] hover:bg-[#F7F8FA]"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "PARAGRAPH" && (
                    <textarea
                      rows={4}
                      value={ansVal}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your comprehensive response details here..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E2E5EA] bg-white text-xs text-[#181D26] focus:ring-1 focus:ring-[#181d26] focus:border-[#181d26]"
                    />
                  )}

                  {(q.type === "PORTFOLIO" ||
                    q.type === "VIDEO_INTRO" ||
                    q.type === "CODING_ASSESSMENT" ||
                    q.type === "ASSIGNMENT") && (
                    <Input
                      placeholder={
                        q.type === "PORTFOLIO"
                          ? "e.g. Figma workspace URL or portfolio project link"
                          : q.type === "VIDEO_INTRO"
                          ? "e.g. Loom video link or shared Google Drive introduction link"
                          : q.type === "CODING_ASSESSMENT"
                          ? "e.g. GitHub repository link or code project sandbox URL"
                          : "e.g. Shared file attachment URL link"
                      }
                      value={ansVal}
                      onChange={(e) => setAnswer(e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-[#EDEFF2]">
            <Button variant="outline" onClick={handleBackStep} className="cursor-pointer gap-1 text-xs">
              <ChevronLeft className="h-4 w-4" /> Back to specifications
            </Button>
            <Button onClick={handleNextStep} className="cursor-pointer gap-1 text-xs">
              Proceed to Cover Pitch <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: Cover Pitch and Submit */}
      {step === 3 && (
        <form onSubmit={handleFormSubmit}>
          <Card className="p-6 md:p-8 space-y-6 bg-white border border-[#E2E5EA] shadow-lg rounded-3xl text-left">
            <div className="border-b border-[#EDEFF2] pb-4 space-y-1">
              <h2 className="text-xl font-black text-[#181d26]">Step 3: Cover Letter & Final Submission</h2>
              <p className="text-xs text-[#8A94A3] font-medium">Tell the recruiters why you are the perfect fit for this engagement assignment.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-black text-[#181d26] uppercase tracking-wider">
                  Cover Letter Pitch Letter *
                </label>
                <p className="text-[10px] text-[#8A94A3] font-semibold mb-1">
                  Introduce yourself, state your background experience aligning with the role, and briefly state how you plan to tackle key deliverables.
                </p>
                <textarea
                  className="w-full min-h-[160px] px-4 py-3 rounded-2xl text-xs transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-[#E2E5EA] text-[#181D26] focus:border-[#181d26] focus:ring-[#181d26]/20"
                  placeholder="Explain why you are the perfect fit for this project. Highlight relevant skills and past projects..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Summary overview of questionnaire */}
              {allQuestions.length > 0 && (
                <div className="space-y-2 border-t border-[#EDEFF2] pt-4">
                  <span className="text-[10px] font-black text-[#181d26] uppercase tracking-wider block">
                    Completed Questionnaire Review
                  </span>
                  <div className="bg-[#F7F8FA] rounded-2xl p-4 space-y-3.5 border border-[#EDEFF2] text-xs">
                    {allQuestions.map((q: any) => (
                      <div key={q.id} className="space-y-1">
                        <p className="font-bold text-[#333840]">{q.question}</p>
                        <p className="text-[#5A6472] bg-white border border-[#EDEFF2] rounded-lg p-2.5 font-semibold text-[11px] leading-relaxed">
                          {answers[q.id] || "No answer provided"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-[#EDEFF2]">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackStep}
                disabled={loading}
                className="cursor-pointer gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                type="submit"
                disabled={loading || !coverLetter.trim()}
                className="cursor-pointer gap-1.5 font-bold bg-[#181d26] text-white hover:bg-[#134FB0]"
              >
                {loading ? (
                  "Submitting Proposal..."
                ) : (
                  <>
                    Submit Proposal <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}
