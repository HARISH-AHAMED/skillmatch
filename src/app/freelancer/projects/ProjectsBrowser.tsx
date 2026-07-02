"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { applyToProject } from "@/actions/applicationActions";
import { toggleSaveProject } from "@/actions/companyActions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Search, SlidersHorizontal, ArrowRight, X, Compass, DollarSign, BrainCircuit, Bookmark } from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  budget: number;
  priority: string;
  requiredSkills: string[];
  experienceRequired: number;
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
}

export function ProjectsBrowser({ projects, appliedProjectIds, savedProjectIds }: ProjectsBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local filter states matching URL search params
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [budget, setBudget] = useState(searchParams.get("budget") || "");
  const [priority, setPriority] = useState(searchParams.get("priority") || "ALL");
  const [experience, setExperience] = useState(searchParams.get("experience") || "");

  // Apply dialog state
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");

  // Details dialog state
  const [viewingProject, setViewingProject] = useState<ProjectItem | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (budget) params.set("budget", budget);
    if (priority !== "ALL") params.set("priority", priority);
    if (experience) params.set("experience", experience);
    
    router.push(`/freelancer/projects?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    setBudget("");
    setPriority("ALL");
    setExperience("");
    router.push("/freelancer/projects");
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !coverLetter) return;

    setApplying(true);
    setMessage("");

    try {
      const res = await applyToProject(selectedProject.id, coverLetter);
      if (res.success) {
        setMessage("Application submitted successfully!");
        setCoverLetter("");
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4">
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
                  {project.description}
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingProject(project)}
                      className="cursor-pointer"
                    >
                      View Details
                    </Button>
                    {hasApplied ? (
                      <Badge variant="success" className="px-4.5 py-1.5 rounded-xl">
                        Applied
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setSelectedProject(project)}
                        className="cursor-pointer gap-1"
                      >
                        Apply <ArrowRight className="h-3.5 w-3.5" />
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

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  Cover Letter / Proposal
                </label>
                <textarea
                  className="w-full min-h-[140px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
                  placeholder="Explain why you are the perfect fit for this project. Highlight relevant skills and past projects..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  required
                  disabled={applying}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
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

      {/* View Project Details Modal */}
      {viewingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setViewingProject(null)}
          />

          <Card className="relative w-full max-w-2xl p-8 z-10 border-slate-100 bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setViewingProject(null)}
              className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {viewingProject.recommendations[0]?.score !== undefined && (
                    <Badge variant="accent">
                      <BrainCircuit className="h-3 w-3 mr-1" />
                      AI Match: {viewingProject.recommendations[0].score}%
                    </Badge>
                  )}
                  {viewingProject.priority === "HIGH" && <Badge variant="danger">High Priority</Badge>}
                  {viewingProject.priority === "MEDIUM" && <Badge variant="secondary">Medium Priority</Badge>}
                  {viewingProject.priority === "LOW" && <Badge variant="neutral">Low Priority</Badge>}
                </div>
                <h3 className="text-2xl font-black text-[#002d59] leading-tight">{viewingProject.title}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                  <Link href={`/companies/${viewingProject.company.id}`} className="text-[#002d59] font-bold hover:text-[#3ac0ff] hover:underline transition-all">
                    {viewingProject.company.companyName}
                  </Link>
                  <span>•</span>
                  <span>{viewingProject.company.location || "Remote"}</span>
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Budget</span>
                  <span className="text-lg font-black text-[#002d59]">${viewingProject.budget}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Required Experience</span>
                  <span className="text-base font-bold text-slate-800">{viewingProject.experienceRequired} years</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Urgency Priority</span>
                  <span className="text-base font-bold text-slate-800 capitalize">{viewingProject.priority.toLowerCase()}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Description</h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {viewingProject.description}
                </p>
              </div>

              {/* Required Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingProject.requiredSkills.map((skill) => (
                    <Badge key={skill} variant="neutral" className="text-xs py-1 px-3">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setViewingProject(null)}
                  className="cursor-pointer"
                >
                  Close
                </Button>
                {appliedProjectIds.includes(viewingProject.id) ? (
                  <Badge variant="success" className="px-6 py-2.5 rounded-xl text-xs font-semibold">
                    Applied
                  </Badge>
                ) : (
                  <Button
                    onClick={() => {
                      setSelectedProject(viewingProject);
                      setViewingProject(null);
                    }}
                    className="cursor-pointer gap-1.5"
                  >
                    Apply Now <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
