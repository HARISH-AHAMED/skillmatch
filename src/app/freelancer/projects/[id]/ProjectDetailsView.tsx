"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  DollarSign,
  Users,
  Award,
  ShieldAlert,
  ArrowRight,
  BrainCircuit,
  MessageSquare,
  Send,
  X,
  Building,
  MapPin,
  Globe,
  Clock,
  Briefcase,
  List,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { applyToProject } from "@/actions/applicationActions";
import { submitDiscussionQuestion } from "@/actions/workflowActions";
import {
  getProjectDescriptionText,
  getProjectMetadataDirect,
  serializeApplicationMetadata,
  ApplicationWorkflowData,
} from "@/lib/workflowHelpers";

interface ProjectDetailsViewProps {
  project: any;
  hasApplied: boolean;
  aiScore?: number;
}

export function ProjectDetailsView({ project, hasApplied, aiScore }: ProjectDetailsViewProps) {
  const router = useRouter();
  const meta = getProjectMetadataDirect(project.description);
  const descriptionText = getProjectDescriptionText(project.description);

  // States for pre-application discussion queries
  const [discQuestion, setDiscQuestion] = useState("");
  const [submittingDisc, setSubmittingDisc] = useState(false);

  const handlePostDiscussion = async () => {
    if (!discQuestion.trim()) return;
    setSubmittingDisc(true);
    try {
      const res = await submitDiscussionQuestion(project.id, discQuestion);
      if (res.success) {
        setDiscQuestion("");
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || "Failed to post question.");
    } finally {
      setSubmittingDisc(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-xs font-bold text-slate-500 hover:text-[#002d59] transition-colors cursor-pointer flex items-center gap-1.5"
        >
          ← Back to projects list
        </button>
        {aiScore !== undefined && (
          <Badge variant="accent" className="font-extrabold flex items-center gap-1">
            <BrainCircuit className="h-3.5 w-3.5" />
            AI Match Score: {aiScore}%
          </Badge>
        )}
      </div>

      {/* Hero Header Banner */}
      <Card className="p-8 border-slate-200/60 bg-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Left Glow Accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#002d59] to-[#3ac0ff]" />

        <div className="space-y-3.5 flex-1 pl-2">
          <div className="flex flex-wrap items-center gap-2">
            {project.priority === "HIGH" && <Badge variant="danger">High Priority</Badge>}
            {project.priority === "MEDIUM" && <Badge variant="secondary">Medium Priority</Badge>}
            {project.priority === "LOW" && <Badge variant="neutral">Low Priority</Badge>}
            <Badge variant="primary" className="bg-[#d0efff] text-[#002d59] border-sky-200/40">Free Platform Opportunity</Badge>
          </div>
          <h2 className="text-2xl font-black text-[#002d59] leading-tight tracking-tight">{project.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
            <Link
              href={`/companies/${project.company.id}`}
              className="text-[#002d59] font-extrabold hover:text-[#3ac0ff] hover:underline transition-all flex items-center gap-1"
            >
              <Building className="h-3.5 w-3.5 text-slate-400" />
              {project.company.companyName}
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {project.company.location || "Remote"}
            </span>
          </div>
        </div>

        {/* Action / Badges */}
        <div className="flex items-center gap-3 shrink-0">
          {hasApplied ? (
            <Badge variant="success" className="px-6 py-2.5 rounded-xl text-xs font-semibold shadow-xs">
              Applied
            </Badge>
          ) : (
            <Link href={`/freelancer/projects/${project.id}/apply`}>
              <Button
                size="lg"
                className="cursor-pointer gap-2 font-bold px-7.5 shadow-md shadow-[#002d59]/10 animate-pulse hover:animate-none"
              >
                Apply Now <ArrowRight className="h-4.5 w-4.5" />
              </Button>
            </Link>
          )}
        </div>
      </Card>

      {/* Main Grid: Unstop Internship Details details structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left columns (70%): detailed texts and rounds */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Important Deadlines Bar */}
          <Card className="p-5 border-slate-200/60 bg-white shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Application Deadline</span>
                <span className="text-xs font-black text-slate-800">
                  {meta.timeline?.applicationDeadline || "Not specified"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Kickoff / Start Date</span>
                <span className="text-xs font-black text-slate-800">
                  {meta.timeline?.projectStart || "Not specified"}
                </span>
              </div>
            </div>
          </Card>

          {/* About the Project Overview */}
          <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-3.5">
            <h3 className="text-sm font-black text-[#002d59] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Briefcase className="h-4.5 w-4.5 text-[#3ac0ff]" /> Opportunity Description
            </h3>
            <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-wrap text-left">
              {descriptionText || "No project overview available."}
            </p>
          </Card>

          {/* Role objectives & deliverables */}
          <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {meta.objectives?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <List className="h-4 w-4 text-sky-500" /> Key Objectives
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-slate-500 space-y-1.5 font-medium text-left">
                    {meta.objectives.map((o: string, idx: number) => <li key={idx}>{o}</li>)}
                  </ul>
                </div>
              )}

              {meta.deliverables?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <List className="h-4 w-4 text-sky-500" /> Expected Deliverables
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-slate-500 space-y-1.5 font-medium text-left">
                    {meta.deliverables.map((d: string, idx: number) => <li key={idx}>{d}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {/* Selection Process and Rounds timeline */}
          <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-black text-[#002d59] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-[#3ac0ff]" /> Selection Process & Rounds
            </h3>
            
            <div className="border border-slate-200/80 rounded-2xl p-5 bg-[#f8faff] space-y-4">
              {/* Dynamic recruitment rounds list */}
              {meta.rounds && meta.rounds.length > 0 ? (
                meta.rounds.map((r: any, idx: number) => {
                  const isScreeningRound = r.type === "SCREENING_QUESTIONS";
                  const qCount = r.questions?.length || 0;

                  return (
                    <div key={r.id || idx} className={`flex items-start gap-3.5 text-left ${idx > 0 ? "border-t border-slate-100 pt-4" : ""}`}>
                      <div className="h-7 w-7 rounded-full bg-sky-200 text-[#002d59] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-1 min-w-0 flex-grow">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-extrabold text-[#002d59]">Round {idx + 1}: {r.name}</p>
                          <Badge variant="neutral" className="text-[9px] py-0 font-extrabold capitalize bg-slate-100 text-slate-700">
                            {r.type.toLowerCase().replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{r.description}</p>
                        
                        {isScreeningRound && qCount > 0 && (
                          <div className="mt-2 space-y-1.5 border-l-2 border-[#3ac0ff]/40 pl-3">
                            <span className="text-[9px] font-extrabold text-slate-500 uppercase block tracking-wider mb-1">Round Questions:</span>
                            {r.questions.map((q: any, qIdx: number) => (
                              <p key={q.id || qIdx} className="text-[9.5px] text-slate-600 font-semibold leading-relaxed">
                                Q{qIdx + 1}: &quot;{q.question}&quot; <span className="text-slate-400 italic">({q.type.toLowerCase().replace("_", " ")})</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-450 italic text-center p-3">No recruitment rounds specified.</p>
              )}
            </div>
          </Card>

          {/* Pre-Application Q&A FAQ forum board */}
          <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-black text-[#002d59] uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-4.5 w-4.5 text-sky-500" /> FAQ & Pre-Application Discussion Forum
            </h3>

            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
              {meta.faq?.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-left">No pre-application questions posted yet. Be the first to ask the recruiters!</p>
              ) : (
                meta.faq?.map((f: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-left">
                    <p className="text-xs font-bold text-[#002d59]">{f.question}</p>
                    {f.answer ? (
                      <p className="text-xs text-slate-600 font-semibold pl-3.5 border-l-2 border-[#3ac0ff]">
                        Response: {f.answer}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic pl-3.5 border-l-2 border-slate-200">
                        Awaiting response from recruiter...
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add discussion query input */}
            <div className="flex gap-2 pt-2 text-left">
              <input
                type="text"
                value={discQuestion}
                onChange={(e) => setDiscQuestion(e.target.value)}
                placeholder="Ask recruiters a question about requirements, deliverables, etc..."
                disabled={submittingDisc}
                className="flex-grow h-10 px-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#002d59] focus:border-[#002d59]"
              />
              <Button
                type="button"
                onClick={handlePostDiscussion}
                disabled={submittingDisc || !discQuestion.trim()}
                className="cursor-pointer h-10 shrink-0 text-xs gap-1"
              >
                Send Query <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>

        </div>

        {/* Right Sticky Sidebar Column (30%): stats and company card */}
        <div className="space-y-6 lg:sticky lg:top-24">
          
          {/* Key Opportunity Stats */}
          <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block text-left">Key Info</h3>
            
            <div className="space-y-3.5 text-xs text-left">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-slate-400" /> Total Budget
                </span>
                <strong className="text-slate-800 font-black text-sm">${project.budget}</strong>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-slate-400" /> Required Experience
                </span>
                <strong className="text-slate-800 font-black text-sm">{project.experienceRequired} Years</strong>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" /> Timings type
                </span>
                <strong className="text-slate-800 font-bold">{meta.timingType || "Full Time"}</strong>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" /> Working Schedule
                </span>
                <strong className="text-slate-800 font-bold">{meta.workingDays || "5 Days/Week"}</strong>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-400" /> Gender Preference
                </span>
                <strong className="text-slate-800 font-bold capitalize">{project.preferredGender ? project.preferredGender.toLowerCase() : "any"}</strong>
              </div>
            </div>
          </Card>

          {/* Recruiter / Company Profile Box */}
          <Card className="p-6 border-slate-200/60 bg-white shadow-sm text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-[#f8faff] border border-slate-200/50 flex items-center justify-center font-bold text-lg text-[#002d59] mx-auto shadow-inner">
              {project.company.companyName[0].toUpperCase()}
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#002d59]">{project.company.companyName}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{project.company.industry || "Enterprise Partner"}</p>
            </div>

            {project.company.website && (
              <a
                href={project.company.website.startsWith("http") ? project.company.website : `https://${project.company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[#3ac0ff] hover:underline flex items-center justify-center gap-1 cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5" /> Visit Website
              </a>
            )}

            <div className="pt-2 border-t border-slate-100">
              <Link href={`/companies/${project.company.id}`}>
                <Button size="sm" variant="outline" className="w-full cursor-pointer font-bold gap-1 text-[#002d59] border-[#002d59]/20 hover:bg-slate-50">
                  View Recruiter Profile <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

        </div>
      </div>

    </div>
  );
}
