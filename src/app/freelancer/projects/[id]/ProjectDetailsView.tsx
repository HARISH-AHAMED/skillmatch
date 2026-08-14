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
  getPaymentCategoryLabel,
  getPaymentUnitLabel,
  formatMoney,
  DEFAULT_CURRENCY,
  serializeApplicationMetadata,
  ApplicationWorkflowData,
  formatProjectBudget,
  getBenefitLabel,
  supportsBenefits,
  isNonMonetary,
  NON_MONETARY_BENEFITS,
} from "@/lib/workflowHelpers";

interface ProjectDetailsViewProps {
  project: any;
  hasApplied: boolean;
  aiScore?: number;
  freelancer?: any;
}

export function ProjectDetailsView({ project, hasApplied, aiScore, freelancer }: ProjectDetailsViewProps) {
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
      alert(err.message || "Failed to submit discussion query.");
    } finally {
      setSubmittingDisc(false);
    }
  };

  // Gender preference no longer gates applications (see apply/page.tsx).
  const isGenderMatched = true;

  return (
    <div className="space-y-6">
      {/* Hero Banner header card */}
      <Card className="overflow-hidden border border-[#C7CBD6] bg-white rounded-lg p-0">
        {/* Project banner */}
        {project.bannerUrl ? (
          <img src={project.bannerUrl} alt={project.title} className="h-44 w-full object-cover sm:h-56" />
        ) : (
          <div className="h-24 w-full bg-[#152C55]" />
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8">
        <div className="space-y-2.5 text-left">
          <div className="flex flex-wrap items-center gap-2">
            {aiScore !== undefined && (
              <Badge variant="cream" className="text-[#1A1D29] font-semibold">
                <BrainCircuit className="h-3.5 w-3.5 mr-1 text-[#1A1D29]" />
                AI Match Score: {aiScore}%
              </Badge>
            )}
            <Badge variant={project.priority === "HIGH" ? "danger" : "secondary"}>
              {project.priority === "HIGH" ? "High Priority Urgency" : project.priority === "MEDIUM" ? "Medium Priority" : "Low Priority"}
            </Badge>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#1A1D29] tracking-tight">{project.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#5B6272] font-normal">
            <Link
              href={`/companies/${project.company.id}`}
              className="text-[#1A1D29] font-semibold hover:text-[#2159C9] hover:underline transition-all flex items-center gap-1"
            >
              <Building className="h-3.5 w-3.5 text-[#5B6272]" />
              {project.company.companyName}
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#5B6272]" />
              {project.company.location || "Remote"}
            </span>
          </div>
        </div>

        {/* Action / Badges */}
        <div className="flex items-center gap-3 shrink-0">
          {hasApplied ? (
            <Badge variant="success" className="px-6 py-2.5 rounded-full text-xs font-semibold">
              Applied
            </Badge>
          ) : !isGenderMatched ? (
            <Button
              size="lg"
              disabled
              className="gap-2 font-bold px-7.5 opacity-60 cursor-not-allowed bg-[#E8F1FE] border border-[#E3E5EA] text-[#5B6272]"
            >
              Specification not met (Gender Preference)
            </Button>
          ) : (
            <Link href={`/freelancer/projects/${project.id}/apply`}>
              <Button
                size="lg"
                className="cursor-pointer gap-2 font-bold px-7.5 shadow-md shadow-[#152C55]/10 animate-pulse hover:animate-none"
              >
                Apply Now <ArrowRight className="h-4.5 w-4.5" />
              </Button>
            </Link>
          )}
        </div>
        </div>
      </Card>

      {/* Main Grid: Unstop Internship Details details structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left columns (70%): detailed texts and rounds */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Important Deadlines Bar */}
          <Card className="p-5 border border-[#E3E5EA] bg-white rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#F8F9FB] border border-[#E3E5EA] flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-[#1A1D29]" />
              </div>
              <div>
                <span className="text-[11px] text-[#5B6272] font-medium uppercase block">Application Deadline</span>
                <span className="text-xs font-semibold text-[#1A1D29]">
                  {meta.timeline?.applicationDeadline || "Not specified"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#F8F9FB] border border-[#E3E5EA] flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-[#1A1D29]" />
              </div>
              <div>
                <span className="text-[11px] text-[#5B6272] font-medium uppercase block">Kickoff / Start Date</span>
                <span className="text-xs font-semibold text-[#1A1D29]">
                  {meta.timeline?.projectStart || "Not specified"}
                </span>
              </div>
            </div>
          </Card>

          {/* About the Project Overview */}
          <Card className="p-6 border border-[#E3E5EA] bg-white rounded-lg space-y-3.5">
            <h3 className="text-sm font-semibold text-[#1A1D29] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E3E5EA] pb-3">
              <Briefcase className="h-4.5 w-4.5 text-[#1A1D29]" /> Opportunity Description
            </h3>
            <p className="text-xs text-[#5B6272] leading-relaxed whitespace-pre-wrap text-left font-normal">
              {descriptionText || "No project overview available."}
            </p>
          </Card>

          {/* Role objectives & deliverables */}
          <Card className="p-6 border-[#E3E5EA]/60 bg-white space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {meta.objectives?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#5B6272] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E3E5EA] pb-2">
                    <List className="h-4 w-4 text-[#2159C9]" /> Key Objectives
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-[#5B6272] space-y-1.5 font-medium text-left">
                    {meta.objectives.map((o: string, idx: number) => <li key={idx}>{o}</li>)}
                  </ul>
                </div>
              )}

              {meta.deliverables?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#5B6272] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E3E5EA] pb-2">
                    <List className="h-4 w-4 text-[#2159C9]" /> Expected Deliverables
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-[#5B6272] space-y-1.5 font-medium text-left">
                    {meta.deliverables.map((d: string, idx: number) => <li key={idx}>{d}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {/* Selection Process and Rounds timeline */}
          <Card className="p-6 border-[#E3E5EA]/60 bg-white space-y-4">
            <h3 className="text-sm font-bold text-[#1A1D29] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-[#2159C9]" /> Selection Process & Rounds
            </h3>
            
            <div className="border border-[#C7CBD6]/80 rounded-lg p-5 bg-[#F8F9FB] space-y-4">
              {/* Dynamic recruitment rounds list */}
              {meta.rounds && meta.rounds.length > 0 ? (
                meta.rounds.map((r: any, idx: number) => {
                  const isScreeningRound = r.type === "SCREENING_QUESTIONS";
                  const qCount = r.questions?.length || 0;

                  return (
                    <div key={r.id || idx} className={`flex items-start gap-3.5 text-left ${idx > 0 ? "border-t border-[#E3E5EA] pt-4" : ""}`}>
                      <div className="h-7 w-7 rounded-full bg-[#E8F1FE] text-[#1A1D29] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-1 min-w-0 flex-grow">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-[#1A1D29]">Round {idx + 1}: {r.name}</p>
                          <Badge variant="neutral" className="text-[11px] py-0 font-bold capitalize bg-[#F0F3F9] text-[#5B6272]">
                            {r.type.toLowerCase().replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#5B6272] leading-relaxed font-semibold">{r.description}</p>
                        
                        {isScreeningRound && qCount > 0 && (
                          <div className="mt-2 text-[11px] text-[#5B6272] font-medium italic border-l border-[#E3E5EA] pl-2">
                            Questions will be revealed during the application.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#5B6272] italic text-center p-3">No recruitment rounds specified.</p>
              )}
            </div>
          </Card>

          {/* Pre-Application Q&A FAQ forum board */}
          <Card className="p-6 border-[#E3E5EA]/60 bg-white space-y-4">
            <h3 className="text-sm font-bold text-[#1A1D29] uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-4.5 w-4.5 text-[#2159C9]" /> FAQ & Pre-Application Discussion Forum
            </h3>

            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
              {meta.faq?.length === 0 ? (
                <p className="text-xs text-[#5B6272] italic py-2 text-left">No pre-application questions posted yet. Be the first to ask the recruiters!</p>
              ) : (
                meta.faq?.map((f: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg space-y-2 text-left">
                    <p className="text-xs font-bold text-[#1A1D29]">{f.question}</p>
                    {f.answer ? (
                      <p className="text-xs text-[#5B6272] font-semibold pl-3.5 border-l border-[#C7CBD6]">
                        Response: {f.answer}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#5B6272] italic pl-3.5 border-l border-[#E3E5EA]">
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
                className="flex-grow h-10 px-4 py-2 border border-[#E3E5EA] rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#152C55] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)]"
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
          <Card className="p-6 border-[#E3E5EA]/60 bg-white space-y-4">
            <h3 className="text-xs font-bold text-[#5B6272] uppercase tracking-widest block text-left">Key Info</h3>
            
            <div className="space-y-3.5 text-xs text-left">
              <div className="flex justify-between items-center py-2.5 border-b border-[#E3E5EA]">
                <span className="text-[#5B6272] font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-[#5B6272]" /> Total Budget
                </span>
                <strong className="text-[#1A1D29] font-bold text-sm">{formatProjectBudget(project)}</strong>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-[#E3E5EA]">
                <span className="text-[#5B6272] font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-[#5B6272]" /> Payment Type
                </span>
                <strong className="text-[#1A1D29] font-bold text-sm">
                  {getPaymentCategoryLabel(meta.paymentCategory)}
                  {meta.paymentRate ? ` · ${formatMoney(meta.paymentRate, meta.currency, meta.paymentCategory)}` : ` · ${meta.currency || DEFAULT_CURRENCY}`}
                </strong>
              </div>
              {supportsBenefits(meta.paymentCategory) && (meta.nonMonetaryBenefits?.length ?? 0) > 0 && (
                <div className="py-2.5 border-b border-[#E3E5EA] space-y-2">
                  <span className="text-[#5B6272] font-semibold flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-[#5B6272]" />
                    {isNonMonetary(meta.paymentCategory) ? "What You Receive" : "Additional Benefits"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {meta.nonMonetaryBenefits!.map((b) => (
                      <Badge
                        key={b}
                        variant="secondary"
                        className="text-[11px]"
                        title={NON_MONETARY_BENEFITS.find((x) => x.value === b)?.hint}
                      >
                        {getBenefitLabel(b)}
                      </Badge>
                    ))}
                  </div>
                  {meta.nonMonetaryDetails && (
                    <p className="text-[11px] text-[#5B6272] italic leading-relaxed">
                      {meta.nonMonetaryDetails}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-between items-center py-2.5 border-b border-[#E3E5EA]">
                <span className="text-[#5B6272] font-semibold flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-[#5B6272]" /> Required Experience
                </span>
                <strong className="text-[#1A1D29] font-bold text-sm">{project.experienceRequired} Years</strong>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-[#E3E5EA]">
                <span className="text-[#5B6272] font-semibold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#5B6272]" /> Timings type
                </span>
                <strong className="text-[#1A1D29] font-bold">{meta.timingType || "Full Time"}</strong>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-[#E3E5EA]">
                <span className="text-[#5B6272] font-semibold flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#5B6272]" /> Working Schedule
                </span>
                <strong className="text-[#1A1D29] font-bold">{meta.workingDays || "5 Days/Week"}</strong>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-[#E3E5EA]">
                <span className="text-[#5B6272] font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#5B6272]" /> Gender Preference
                </span>
                <strong className="text-[#1A1D29] font-bold capitalize">{project.preferredGender ? project.preferredGender.toLowerCase() : "any"}</strong>
              </div>
            </div>
          </Card>

          {/* Recruiter / Company Profile Box */}
          <Card className="p-6 border-[#E3E5EA]/60 bg-white text-center space-y-4">
            <div className="h-14 w-14 rounded-lg bg-[#F8F9FB] border border-[#E3E5EA]/50 flex items-center justify-center font-bold text-lg text-[#1A1D29] mx-auto shadow-inner">
              {project.company.companyName[0].toUpperCase()}
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#1A1D29]">{project.company.companyName}</h4>
              <p className="text-[11px] text-[#5B6272] font-bold uppercase tracking-wider">{project.company.industry || "Enterprise Partner"}</p>
            </div>

            {project.company.website && (
              <a
                href={project.company.website.startsWith("http") ? project.company.website : `https://${project.company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[#2159C9] hover:underline flex items-center justify-center gap-1 cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5" /> Visit Website
              </a>
            )}

            <div className="pt-2 border-t border-[#E3E5EA]">
              <Link href={`/companies/${project.company.id}`}>
                <Button size="sm" variant="outline" className="w-full cursor-pointer font-bold gap-1 text-[#1A1D29] border-[#1A1D29]/20 hover:bg-[#F8F9FB]">
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
