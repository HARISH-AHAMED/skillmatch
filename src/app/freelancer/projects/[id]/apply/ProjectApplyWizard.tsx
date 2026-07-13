"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { applyToProject } from "@/actions/applicationActions";
import {
  getProjectDescriptionText,
  getProjectMetadataDirect,
  RecruitmentRound,
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
      const res = await applyToProject(project.id, coverLetter.trim(), answers);
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
                        ? "bg-[#002d59] text-white ring-4 ring-[#002d59]/20"
                        : isCompleted
                        ? "bg-[#3ac0ff] text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {s.num}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isActive ? "text-[#002d59]" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex-1 h-[2px] bg-slate-200 mx-4" />
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
        <Card className="p-6 md:p-8 space-y-6 bg-white border border-slate-200 shadow-lg rounded-3xl text-left">
          <div className="border-b border-slate-100 pb-4 space-y-1">
            <h2 className="text-xl font-black text-[#002d59]">Step 1: Review Project Specifications & Requirements</h2>
            <p className="text-xs text-slate-450 font-medium">Verify the scope and parameters of the gig assignment.</p>
          </div>

          {/* Company details */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Recruiting Company</span>
              <div className="flex items-center gap-2 mt-1">
                <Building className="h-4 w-4 text-[#002d59]" />
                <span className="font-extrabold text-sm text-[#002d59]">{project.company.companyName}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Engagement Location</span>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-[#3ac0ff]" />
                <span className="font-semibold text-xs text-slate-600">{project.company.location || "Remote Workspace"}</span>
              </div>
            </div>
          </div>

          {/* Project description brief */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-[#002d59] uppercase tracking-wider">Opportunity Brief</h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{cleanDescription}</p>
          </div>

          {/* deliverables and specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {meta.deliverables && meta.deliverables.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#002d59] uppercase tracking-wider">Key Deliverables</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-550 font-medium">
                  {meta.deliverables.map((d: string, idx: number) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[#002d59] uppercase tracking-wider">Parameters & Schedule</h4>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-450">Compensation Budget:</span>
                  <span className="font-black text-[#002d59]">${project.budget} Total</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-450">Working Timings:</span>
                  <span className="font-extrabold text-slate-700">{meta.timingType || "Full Time"} ({meta.workingDays || "5 Days/Week"})</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-450">Project Duration:</span>
                  <span className="font-extrabold text-slate-700">{meta.duration || "3 Months"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-450">Required Experience:</span>
                  <span className="font-extrabold text-slate-700">{project.experienceRequired} Years</span>
                </div>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="pt-4 border-t border-slate-100 text-left">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 accent-[#002d59] h-4 w-4"
              />
              <div className="text-xs font-semibold text-slate-600 select-none">
                I verify that I have reviewed the qualifications, skill set requirements, deadlines, and responsibilities for this opportunity, and I possess the capability to fulfill them.
              </div>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleNextStep}
              disabled={!agreedToTerms}
              className="cursor-pointer gap-1.5 font-bold"
            >
              {allQuestions.length === 0 ? "Skip to Final Submission" : "Proceed to Screening rounds"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Screening Questionnaire */}
      {step === 2 && allQuestions.length > 0 && (
        <Card className="p-6 md:p-8 space-y-6 bg-white border border-slate-200 shadow-lg rounded-3xl text-left">
          <div className="border-b border-slate-100 pb-4 space-y-1">
            <h2 className="text-xl font-black text-[#002d59]">Step 2: Screening Questionnaire Assessments</h2>
            <p className="text-xs text-slate-455 font-medium">Please answer the questions below required for the screening phase.</p>
          </div>

          <div className="space-y-6">
            {allQuestions.map((q: any, index: number) => {
              const ansVal = answers[q.id] || "";
              const setAnswer = (val: string) =>
                setAnswers((prev) => ({ ...prev, [q.id]: val }));

              return (
                <div key={q.id} className="p-4 bg-slate-50/50 border border-slate-200/50 rounded-2xl space-y-2.5">
                  <label className="block text-xs font-bold text-[#002d59] leading-relaxed">
                    Q{index + 1}: {q.question} {q.required && <span className="text-rose-500 font-bold">*</span>}
                  </label>

                  {q.type === "YES_NO" && (
                    <div className="flex gap-6 pl-1 pt-0.5">
                      {["Yes", "No"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-bold">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={ansVal === opt}
                            onChange={() => setAnswer(opt)}
                            className="accent-[#002d59] h-4 w-4"
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
                                ? "bg-[#002d59]/5 border-[#002d59] text-[#002d59] ring-2 ring-[#002d59]/5"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-350 hover:bg-slate-50"
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
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-[#002d59] focus:border-[#002d59]"
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

          <div className="flex justify-between pt-4 border-t border-slate-100">
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
          <Card className="p-6 md:p-8 space-y-6 bg-white border border-slate-200 shadow-lg rounded-3xl text-left">
            <div className="border-b border-slate-100 pb-4 space-y-1">
              <h2 className="text-xl font-black text-[#002d59]">Step 3: Cover Letter & Final Submission</h2>
              <p className="text-xs text-slate-450 font-medium">Tell the recruiters why you are the perfect fit for this engagement assignment.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-black text-[#002d59] uppercase tracking-wider">
                  Cover Letter Pitch Letter *
                </label>
                <p className="text-[10px] text-slate-450 font-semibold mb-1">
                  Introduce yourself, state your background experience aligning with the role, and briefly state how you plan to tackle key deliverables.
                </p>
                <textarea
                  className="w-full min-h-[160px] px-4 py-3 rounded-2xl text-xs transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
                  placeholder="Explain why you are the perfect fit for this project. Highlight relevant skills and past projects..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Summary overview of questionnaire */}
              {allQuestions.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-black text-[#002d59] uppercase tracking-wider block">
                    Completed Questionnaire Review
                  </span>
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3.5 border border-slate-150 text-xs">
                    {allQuestions.map((q: any) => (
                      <div key={q.id} className="space-y-1">
                        <p className="font-bold text-slate-700">{q.question}</p>
                        <p className="text-slate-500 bg-white border border-slate-100 rounded-lg p-2.5 font-semibold text-[11px] leading-relaxed">
                          {answers[q.id] || "No answer provided"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
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
                className="cursor-pointer gap-1.5 font-bold bg-[#002d59] text-white hover:bg-[#001f3f]"
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
