"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toggleSaveProject } from "@/actions/companyActions";
import { submitDiscussionQuestion } from "@/actions/workflowActions";
import { getProjectDescriptionText, getProjectMetadataDirect, serializeProjectMetadata, formatProjectBudget, formatCompensation, getProjectMetadataDirect as getMetaDirect } from "@/lib/workflowHelpers";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Search, SlidersHorizontal, ArrowRight, X, Compass, DollarSign, BrainCircuit, Bookmark, Calendar, List, MessageSquare, HelpCircle, User, MessageCircle, Send, BadgeCheck } from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  budget: number;
  priority: string;
  requiredSkills: string[];
  experienceRequired: number;
  preferredGender?: string | null;
  domain?: string | null;
  bannerUrl?: string | null;
  company: {
    id: string;
    companyName: string;
    location: string | null;
    logoUrl?: string | null;
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
  const [reward, setReward] = useState(searchParams.get("reward") || "ALL");

  // Details dialog state
  const [viewingProject, setViewingProject] = useState<ProjectItem | null>(null);
  const [discQuestion, setDiscQuestion] = useState("");
  const [submittingDisc, setSubmittingDisc] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (budget) params.set("budget", budget);
    if (priority !== "ALL") params.set("priority", priority);
    if (domain !== "ALL") params.set("domain", domain);
    if (experience) params.set("experience", experience);
    if (reward !== "ALL") params.set("reward", reward);
    
    router.push(`/freelancer/projects?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    setBudget("");
    setPriority("ALL");
    setDomain("ALL");
    setExperience("");
    setReward("ALL");
    router.push("/freelancer/projects");
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
      <Card className="p-4 sm:p-6 bg-white border border-slate-100 shadow-md sticky top-0 z-20">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search skills, titles, or descriptions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10.5 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white border border-slate-200 text-slate-800 focus:border-[#181d26] focus:ring-[#181d26]/20"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="cursor-pointer">
                Search
              </Button>
              <Button type="button" variant="outline" onClick={handleClear} className="cursor-pointer">
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters((v) => !v)}
                className="cursor-pointer gap-1 sm:hidden"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </Button>
            </div>
          </div>

          <div className={`${showFilters ? "grid" : "hidden"} sm:grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 border-t border-slate-200 pt-4`}>
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
              label="Min Budget (amount)"
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

            <Select
              label="Reward Type"
              options={[
                { value: "ALL", label: "All Reward Types" },
                { value: "PAID", label: "Paid (cash)" },
                { value: "NON_MONETARY", label: "Certificate / Non-Monetary" },
                { value: "HYBRID", label: "Cash + Benefits" },
              ]}
              value={reward}
              onChange={(e) => setReward(e.target.value)}
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {projects.length === 0 ? (
          <Card className="p-10 text-center text-xs text-slate-500 lg:col-span-2">
            No projects matched your criteria. Try adjusting your filters.
          </Card>
        ) : (
          projects.map((project) => {
            const hasApplied = appliedProjectIds.includes(project.id);
            const score = project.recommendations[0]?.score;

            return (
              <Card
                key={project.id}
                className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden lg:max-w-none border-slate-100 bg-white p-0 transition-all hover:shadow-md"
              >
                {/* Post header */}
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Link href={`/companies/${project.company.id}`} className="shrink-0">
                    {project.company.logoUrl ? (
                      <img
                        src={project.company.logoUrl}
                        alt={project.company.companyName}
                        className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#181d26] text-sm font-black text-white">
                        {project.company.companyName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/companies/${project.company.id}`}
                        className="truncate text-sm font-bold text-[#181d26] hover:underline"
                      >
                        {project.company.companyName}
                      </Link>
                      <BadgeCheck className="h-4 w-4 shrink-0 text-[#1b61c9]" aria-label="Company account" />
                    </div>
                    <p className="truncate text-[11px] text-slate-500">
                      {project.company.location || "Remote"}
                      {project.domain ? ` • ${project.domain}` : ""}
                    </p>
                  </div>

                  {score !== undefined && (
                    <Badge variant="accent" className="shrink-0">
                      <BrainCircuit className="mr-1 h-3 w-3" />
                      {score}%
                    </Badge>
                  )}
                </div>

                {/* Banner */}
                {project.bannerUrl ? (
                  <img
                    src={project.bannerUrl}
                    alt={project.title}
                    className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
                  />
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 sm:aspect-[21/9]">
                    <div className="px-6 text-center">
                      <Compass className="mx-auto h-7 w-7 text-slate-400" />
                      <p className="mt-2 line-clamp-2 text-sm font-black text-slate-600">{project.title}</p>
                    </div>
                  </div>
                )}

                {/* Body */}
                <div className="flex-1 space-y-3 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {project.priority === "HIGH" && <Badge variant="danger">High Priority</Badge>}
                    {project.priority === "MEDIUM" && <Badge variant="secondary">Medium Priority</Badge>}
                    <Badge variant="neutral" className="text-[9px]">
                      <DollarSign className="mr-0.5 h-3 w-3" />
                      {formatCompensation(project)}
                    </Badge>
                    {getMetaDirect(project.description).certificateIncluded && (
                      <Badge variant="success" className="text-[9px]">
                        Certificate Included
                      </Badge>
                    )}
                    <Badge variant="neutral" className="text-[9px]">
                      {project.experienceRequired} yrs exp
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold leading-snug text-[#181d26]">{project.title}</h3>

                  <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">
                    {getProjectDescriptionText(project.description)}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {project.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="neutral" className="text-[9px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 sm:px-5">
                  <button
                    onClick={async () => {
                      try {
                        await toggleSaveProject(project.id);
                        router.refresh();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className={`shrink-0 cursor-pointer rounded-xl border p-2 transition-all ${
                      savedProjectIds.includes(project.id)
                        ? "border-amber-300 bg-amber-50 text-amber-600"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-400 hover:text-slate-600"
                    }`}
                    title={savedProjectIds.includes(project.id) ? "Unsave Project" : "Save Project"}
                  >
                    <Bookmark className={`h-4 w-4 ${savedProjectIds.includes(project.id) ? "fill-amber-600" : ""}`} />
                  </button>

                  <Link href={`/freelancer/projects/${project.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full cursor-pointer">
                      View Project
                    </Button>
                  </Link>

                  {hasApplied ? (
                    <Badge variant="success" className="flex-1 justify-center rounded-xl px-4 py-1.5">
                      Applied
                    </Badge>
                  ) : (
                    <Link href={`/freelancer/projects/${project.id}/apply`} className="flex-1">
                      <Button size="sm" className="w-full cursor-pointer gap-1">
                        Apply <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

    </div>
  );
}
