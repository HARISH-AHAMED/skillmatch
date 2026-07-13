"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { applyToProject } from "@/actions/applicationActions";
import { toggleSaveProject } from "@/actions/companyActions";
import { submitDiscussionQuestion } from "@/actions/workflowActions";
import { getProjectDescriptionText, getProjectMetadataDirect, serializeProjectMetadata } from "@/lib/workflowHelpers";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Search, SlidersHorizontal, ArrowRight, X, Compass, DollarSign, BrainCircuit, Bookmark, Calendar, List, MessageSquare, HelpCircle, User, MessageCircle, Send } from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  budget: number;
  priority: string;
  requiredSkills: string[];
  experienceRequired: number;
  preferredGender?: string | null;
  company: {
    id: string;
    companyName: string;
    location: string | null;
  };
  recommendations: {
    score: number;
  }[];
}

interface ProjectsBrowserProps {
  projects: ProjectItem[];
  appliedProjectIds: string[];
  savedProjectIds: string[];
  freelancer?: any;
}

export function ProjectsBrowser({ projects, appliedProjectIds, savedProjectIds, freelancer }: ProjectsBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local filter states matching URL search params
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [budget, setBudget] = useState(searchParams.get("budget") || "");
  const [priority, setPriority] = useState(searchParams.get("priority") || "ALL");
  const [domain, setDomain] = useState(searchParams.get("domain") || "ALL");
  const [experience, setExperience] = useState(searchParams.get("experience") || "");

  // Apply dialog state
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");

  // Details dialog state
  const [viewingProject, setViewingProject] = useState<ProjectItem | null>(null);
  const [discQuestion, setDiscQuestion] = useState("");
  const [submittingDisc, setSubmittingDisc] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (budget) params.set("budget", budget);
    if (priority !== "ALL") params.set("priority", priority);
    if (domain !== "ALL") params.set("domain", domain);
    if (experience) params.set("experience", experience);
    
    router.push(`/freelancer/projects?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    setBudget("");
    setPriority("ALL");
    setDomain("ALL");
    setExperience("");
    router.push("/freelancer/projects");
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !coverLetter) return;

    setApplying(true);
    setMessage("");

    try {
      const res = await applyToProject(selectedProject.id, coverLetter, answers);
      if (res.success) {
        setMessage("Application submitted successfully!");
        setCoverLetter("");
        setAnswers({});
        setTimeout(() => {
          setSelectedProject(null);
          setMessage("");
          router.refresh();
        }, 1200);
      } else {
        setMessage(res.error || "Failed to submit application.");
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to submit application.");
    } finally {
      setApplying(false);
    }
  };

  const handlePostDiscussion = async () => {
    if (!discQuestion || !viewingProject) return;
    setSubmittingDisc(true);
    try {
      const res = await submitDiscussionQuestion(viewingProject.id, discQuestion);
      if (res.success) {
        setDiscQuestion("");
        alert("Your question was posted successfully to the discussions board!");
        
        // Update local detail view with the new question in FAQ
        const currentMeta = getProjectMetadataDirect(viewingProject.description);
        const updatedFaq = [
          ...(currentMeta.faq || []),
          { question: `[Discussion Question]: ${discQuestion}`, answer: "" }
        ];
        
        const updatedMeta = {
          ...currentMeta,
          faq: updatedFaq
        };
        
        setViewingProject({
          ...viewingProject,
          description: serializeProjectMetadata(getProjectDescriptionText(viewingProject.description), updatedMeta)
        });
      }
    } catch (err: any) {
      alert(err.message || "Failed to post question.");
    } finally {
      setSubmittingDisc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters form */}
      <Card className="p-6 bg-white border border-slate-100 shadow-md sticky top-0 z-20">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search skills, titles, or descriptions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10.5 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="cursor-pointer">
                Search
              </Button>
              <Button type="button" variant="outline" onClick={handleClear} className="cursor-pointer">
                Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-slate-200 pt-4">
            <Select
              label="Domain"
              options={[
                { value: "ALL", label: "All Domains" },
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
              label="Min Budget ($)"
              type="number"
              placeholder="e.g. 1000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />

            <Select
              label="Urgency Priority"
              options={[
                { value: "ALL", label: "All Priorities" },
                { value: "LOW", label: "Low Priority" },
                { value: "MEDIUM", label: "Medium Priority" },
                { value: "HIGH", label: "High Priority" },
              ]}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />

            <Input
              label="Max Required Experience (Years)"
              type="number"
              placeholder="e.g. 5"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
          </div>
        </form>
      </Card>

      {/* Projects list */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card className="p-10 text-center text-xs text-slate-500">
            No projects matched your criteria. Try adjusting your filters.
          </Card>
        ) : (
          projects.map((project) => {
            const hasApplied = appliedProjectIds.includes(project.id);
            const score = project.recommendations[0]?.score;

            return (
              <Card
                key={project.id}
                className="p-6 border-slate-100 bg-white hover:shadow-md transition-all space-y-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {score !== undefined && (
                        <Badge variant="accent">
                          <BrainCircuit className="h-3 w-3 mr-1" />
                          AI Match: {score}%
                        </Badge>
                      )}
                      {project.priority === "HIGH" && <Badge variant="danger">High Priority</Badge>}
                      {project.priority === "MEDIUM" && <Badge variant="secondary">Medium Priority</Badge>}
                    </div>
                    <h3 className="text-base font-bold text-[#002d59] mt-1">{project.title}</h3>
                    <p className="text-xs text-slate-500">
                      <Link href={`/companies/${project.company.id}`} className="font-semibold text-[#002d59] hover:text-[#3ac0ff] hover:underline transition-all">
                        {project.company.companyName}
                      </Link>
                      <span> • {project.company.location || "Remote"}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Project Budget</span>
                    <span className="text-base font-black text-[#002d59]">${project.budget}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {getProjectDescriptionText(project.description)}
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap gap-1.5">
                    {project.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="neutral" className="text-[9px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-xs text-slate-500 mr-1.5">
                      Req Exp: <strong className="text-slate-800">{project.experienceRequired} years</strong>
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await toggleSaveProject(project.id);
                          router.refresh();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className={`p-2 rounded-xl transition-all border cursor-pointer ${
                        savedProjectIds.includes(project.id)
                          ? "bg-amber-50 text-amber-600 border-amber-300"
                          : "bg-white text-slate-400 hover:text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                      title={savedProjectIds.includes(project.id) ? "Unsave Project" : "Save Project"}
                    >
                      <Bookmark className={`h-4 w-4 ${savedProjectIds.includes(project.id) ? "fill-amber-600" : ""}`} />
                    </button>
                    <Link href={`/freelancer/projects/${project.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                      >
                        View Details
                      </Button>
                    </Link>
                    {hasApplied ? (
                      <Badge variant="success" className="px-4.5 py-1.5 rounded-xl">
                        Applied
                      </Badge>
                    ) : (!project.preferredGender || project.preferredGender === "ANY" || project.preferredGender === freelancer?.gender) ? (
                      <Button
                        size="sm"
                        onClick={() => setSelectedProject(project)}
                        className="cursor-pointer gap-1"
                      >
                        Apply <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled
                        className="opacity-60 cursor-not-allowed bg-slate-100 border border-slate-250 text-slate-400 font-semibold"
                      >
                        Specification not met
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Apply Cover Letter Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedProject(null)}
          />

          <Card className="relative w-full max-w-lg p-8 z-10 border-slate-100 bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-[#002d59] mb-2">Apply for Project</h3>
            <p className="text-xs text-slate-500 mb-6 font-semibold">
              Project: <span className="text-[#002d59]">{selectedProject.title}</span>
            </p>

            {message && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold border ${
                  message.includes("submitted")
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-5">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-slate-600">
                  Cover Letter / Proposal
                </label>
                <textarea
                  className="w-full min-h-[120px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
                  placeholder="Explain why you are the perfect fit for this project. Highlight relevant skills and past projects..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  required
                  disabled={applying}
                />
              </div>

              {/* Screening Questions Questionnaire */}
              {(() => {
                const meta = getProjectMetadataDirect(selectedProject.description);
                if (!meta.screeningQuestions || meta.screeningQuestions.length === 0) return null;
                
                return (
                  <div className="space-y-4 border-t border-slate-100 pt-4 text-left">
                    <span className="text-[10px] font-bold text-[#002d59] uppercase tracking-wider block">
                      Screening Questionnaire
                    </span>
                    <p className="text-[9px] text-slate-400">The client requires candidates to answer the following questions to complete this round.</p>
                    
                    {meta.screeningQuestions.map((q) => {
                      const ansVal = answers[q.id] || "";
                      const setAnswer = (val: string) => setAnswers(prev => ({ ...prev, [q.id]: val }));
                      
                      return (
                        <div key={q.id} className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-700">
                            {q.question} {q.required && <span className="text-rose-500 font-bold">*</span>}
                          </label>
                          
                          {q.type === "YES_NO" && (
                            <div className="flex gap-4">
                              {["Yes", "No"].map(opt => (
                                <label key={opt} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer font-medium">
                                  <input
                                    type="radio"
                                    name={q.id}
                                    value={opt}
                                    checked={ansVal === opt}
                                    onChange={() => setAnswer(opt)}
                                    required={q.required}
                                    disabled={applying}
                                    className="accent-[#002d59]"
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {q.type === "MULTIPLE_CHOICE" && q.options && (
                            <select
                              value={ansVal}
                              onChange={(e) => setAnswer(e.target.value)}
                              required={q.required}
                              disabled={applying}
                              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-[#002d59]/20 focus:border-[#002d59]"
                            >
                              <option value="">Select an option...</option>
                              {q.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                          
                          {q.type === "PARAGRAPH" && (
                            <textarea
                              rows={3}
                              value={ansVal}
                              onChange={(e) => setAnswer(e.target.value)}
                              placeholder="Write your answer details here..."
                              required={q.required}
                              disabled={applying}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-[#002d59]/20 focus:border-[#002d59]"
                            />
                          )}
                          
                          {(q.type === "PORTFOLIO" || q.type === "VIDEO_INTRO" || q.type === "CODING_ASSESSMENT" || q.type === "ASSIGNMENT") && (
                            <input
                              type="text"
                              value={ansVal}
                              onChange={(e) => setAnswer(e.target.value)}
                              placeholder={
                                q.type === "PORTFOLIO" ? "Link to project / design file (e.g. Figma, Behance)" :
                                q.type === "VIDEO_INTRO" ? "Link to video introduction / Loom URL" :
                                q.type === "CODING_ASSESSMENT" ? "Link to code file (e.g. GitHub, CodePen)" :
                                "Link to assignment file / Google Drive URL"
                              }
                              required={q.required}
                              disabled={applying}
                              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-[#002d59]/20 focus:border-[#002d59]"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProject(null)}
                  disabled={applying}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={applying} className="cursor-pointer">
                  {applying ? "Submitting Application..." : "Submit Proposal"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
