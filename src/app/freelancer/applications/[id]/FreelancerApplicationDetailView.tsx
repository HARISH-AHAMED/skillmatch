"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Calendar,
  DollarSign,
  BrainCircuit,
  Video,
  ExternalLink,
  CheckCircle,
  MessageSquare,
  Send,
  Gift,
  X,
  Building,
  MapPin,
  Clock,
  History,
  ArrowLeft,
  Briefcase,
  ShieldCheck,
  Check,
  Trash2,
  Edit2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  parseApplicationMetadata,
  getApplicationCoverLetterText,
  getProjectMetadataDirect,
} from "@/lib/workflowHelpers";
import {
  respondToOfferLetterAction,
  sendDMMessageAction,
  getDMMessagesAction,
  editDMMessageAction,
  deleteDMMessageAction,
  markDMMessagesAsSeenAction,
} from "@/actions/workflowActions";

interface FreelancerApplicationDetailViewProps {
  application: any;
  currentUserId: string;
}

export function FreelancerApplicationDetailView({
  application,
  currentUserId,
}: FreelancerApplicationDetailViewProps) {
  const router = useRouter();

  const appMeta = parseApplicationMetadata(application.coverLetter);
  const coverLetterText = getApplicationCoverLetterText(application.coverLetter);
  const projectMeta = getProjectMetadataDirect(application.project?.description);

  // Active Tab: overview | interviews | offer | chat
  const [activeTab, setActiveTab] = useState<"overview" | "interviews" | "offer" | "chat">("overview");

  // Offer Letter action states
  const [offerLoading, setOfferLoading] = useState<"ACCEPT" | "DECLINE" | null>(null);
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // DM Chat states
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [dmLoading, setDmLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Derived state
  const offerLetter = appMeta.offerLetter;
  const hasOffer = !!offerLetter;
  const offerPending = offerLetter?.status === "PENDING";
  const offerAccepted = offerLetter?.status === "ACCEPTED";
  const offerDeclined = offerLetter?.status === "DECLINED";

  const companyUserId = application.project?.company?.userId;
  const isHired = application.status === "HIRED";
  const isShortlisted = application.status === "SHORTLISTED" || isHired;
  const isRejected = application.status === "REJECTED";

  // Interview rounds
  const interviewRounds = (() => {
    const rounds: any[] = [];
    const history = appMeta.pipelineHistory || [];

    history.forEach((h: any) => {
      if (h.stage === "Interview Scheduled" || h.meetingLink) {
        rounds.push({
          roundNumber: rounds.length + 1,
          scheduledAt: h.timestamp,
          interviewDate: h.interviewDate,
          meetingLink: h.meetingLink,
          status: "SCHEDULED",
          rescheduledAt: h.stage === "Interview Rescheduled" ? h.timestamp : undefined,
        });
      } else if (h.stage === "Interview Conducted" && rounds.length > 0) {
        rounds[rounds.length - 1].status = "CONDUCTED";
        rounds[rounds.length - 1].conductedAt = h.timestamp;
      } else if (h.stage === "Interview Cancelled" && rounds.length > 0) {
        rounds[rounds.length - 1].status = "CANCELLED";
        rounds[rounds.length - 1].cancelledAt = h.timestamp;
      }
    });

    return rounds;
  })();

  const latestInterview = interviewRounds.length > 0 ? interviewRounds[interviewRounds.length - 1] : null;

  // Pipeline Stepper Progress Index
  const pipelineSteps = [
    { id: "applied", label: "Applied" },
    { id: "reviewed", label: "Reviewed" },
    { id: "shortlisted", label: "Shortlisted" },
    { id: "interview", label: "Interview" },
    { id: "offer", label: "Offer Sent" },
    { id: "hired", label: "Hired / Active" },
  ];

  const currentPipelineIdx = (() => {
    if (isHired || offerAccepted) return 5;
    if (hasOffer || activeTab === "offer") return 4;
    if (latestInterview && latestInterview.status !== "CANCELLED") return 3;
    if (isShortlisted) return 2;
    if (appMeta.pipelineHistory?.some((h: any) => h.stage === "Profile Reviewed")) return 1;
    return 0;
  })();

  // Load DM Chat messages
  const loadDmMessages = async () => {
    if (!companyUserId) return;
    try {
      const msgs = await getDMMessagesAction(application.projectId, companyUserId);
      setDmMessages(msgs);
      const unread = msgs.some((m: any) => m.senderId === companyUserId && !m.seen);
      if (unread) {
        await markDMMessagesAsSeenAction(application.projectId, companyUserId);
        const updatedMsgs = await getDMMessagesAction(application.projectId, companyUserId);
        setDmMessages(updatedMsgs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === "chat") {
      loadDmMessages();
      const interval = setInterval(loadDmMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, application.projectId, companyUserId]);

  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [dmMessages, activeTab]);

  const handleSendDM = async () => {
    if (!dmInput.trim() || !companyUserId) return;
    setDmLoading(true);
    try {
      await sendDMMessageAction(application.projectId, companyUserId, dmInput.trim());
      setDmInput("");
      await loadDmMessages();
    } catch (e: any) {
      alert(e.message || "Failed to send message.");
    } finally {
      setDmLoading(false);
    }
  };

  const handleEditDM = async () => {
    if (!editingMessageId || !dmInput.trim()) return;
    setDmLoading(true);
    try {
      await editDMMessageAction(editingMessageId, dmInput.trim());
      setDmInput("");
      setEditingMessageId(null);
      await loadDmMessages();
    } catch (e: any) {
      alert(e.message || "Failed to edit message.");
    } finally {
      setDmLoading(false);
    }
  };

  const handleDeleteDM = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await deleteDMMessageAction(messageId);
      await loadDmMessages();
    } catch (e: any) {
      alert(e.message || "Failed to delete message.");
    }
  };

  const handleRespondOffer = async (decision: "ACCEPT" | "DECLINE") => {
    if (decision === "DECLINE" && !isDeclining) {
      setIsDeclining(true);
      return;
    }
    setOfferLoading(decision);
    try {
      const res = await respondToOfferLetterAction(
        application.id,
        decision,
        decision === "DECLINE" ? declineReason : undefined
      );
      if (res.success) {
        alert(decision === "ACCEPT" ? "Offer accepted! Project is now active." : "Offer declined.");
        setIsDeclining(false);
        router.refresh();
      } else {
        alert(res.error || "Action failed.");
      }
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setOfferLoading(null);
    }
  };

  // Screening questionnaire answer mapping
  const screeningQuestions = projectMeta?.rounds?.find(
    (r: any) => r.type === "SCREENING_QUESTIONS"
  )?.questions || [];

  const hasAnswers = appMeta.screeningAnswers && Object.keys(appMeta.screeningAnswers).length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left animate-in fade-in duration-200">
      
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/freelancer/applications")}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#181d26] hover:underline cursor-pointer transition-colors bg-white border border-[#dddddd] px-3.5 py-2 rounded-[12px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Applications List
        </button>

        {isHired && (
          <Link href={`/workspace/${application.id}`}>
            <Button className="text-xs font-medium bg-[#181d26] text-white hover:bg-[#333840] rounded-[12px] px-4 py-2 cursor-pointer flex items-center gap-1.5">
              Open Workspace <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>

      {/* Main Header Card */}
      <Card className="p-6 md:p-8 bg-white border border-[#dddddd] rounded-[12px] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#dddddd] pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isHired ? "forest" : isRejected ? "neutral" : isShortlisted ? "primary" : "mint"}>
                {isHired ? "Hired — Active Project" : isRejected ? "Application Rejected" : isShortlisted ? "Shortlisted Candidate" : "Under Review"}
              </Badge>
              <span className="text-xs text-[#41454d]">Applied on {new Date(application.createdAt).toLocaleDateString()}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#181d26] tracking-tight">
              {application.project.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-[#41454d] font-normal flex-wrap">
              <span className="flex items-center gap-1 text-[#181d26] font-medium">
                <Building className="h-3.5 w-3.5 text-[#41454d]" />
                {application.project.company.companyName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#41454d]" />
                {application.project.company.location || "Remote"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-[#41454d]" />
                Budget: ${application.project.budget}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasOffer && offerPending && (
              <Badge variant="coral" className="px-3 py-1.5 text-xs font-medium">
                Hiring Offer Received
              </Badge>
            )}
          </div>
        </div>

        {/* Visual Pipeline Stepper */}
        <div className="pt-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#41454d] mb-3">Application Pipeline Stage</p>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {pipelineSteps.map((step, idx) => {
              const isPassed = idx <= currentPipelineIdx && !isRejected;
              const isCurrent = idx === currentPipelineIdx && !isRejected;

              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-[8px] border text-center transition-all ${
                    isCurrent
                      ? "bg-[#181d26] text-white border-[#181d26]"
                      : isPassed
                      ? "bg-[#f8fafc] text-[#181d26] border-[#dddddd] font-medium"
                      : "bg-white text-[#41454d] border-[#dddddd] opacity-50"
                  }`}
                >
                  <p className="text-[9px] uppercase tracking-wider font-semibold opacity-75">Step 0{idx + 1}</p>
                  <p className="text-xs font-semibold mt-0.5 truncate">{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Tabs Navigation Bar */}
      <div className="flex gap-2 bg-[#f8fafc] border border-[#dddddd] p-1.5 rounded-[12px] w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
            activeTab === "overview" ? "bg-[#181d26] text-white" : "text-[#41454d] hover:text-[#181d26]"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Proposal Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("interviews")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
            activeTab === "interviews" ? "bg-[#181d26] text-white" : "text-[#41454d] hover:text-[#181d26]"
          }`}
        >
          <Video className="h-3.5 w-3.5" /> Interview Rounds ({interviewRounds.length})
        </button>

        {hasOffer && (
          <button
            type="button"
            onClick={() => setActiveTab("offer")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
              activeTab === "offer" ? "bg-[#181d26] text-white" : "text-[#41454d] hover:text-[#181d26]"
            }`}
          >
            <Gift className="h-3.5 w-3.5 text-[#fcab79]" /> Job Offer & Contract
          </button>
        )}

        {isShortlisted && (
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
              activeTab === "chat" ? "bg-[#181d26] text-white" : "text-[#41454d] hover:text-[#181d26]"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> DM Recruiter Chat
          </button>
        )}
      </div>

      {/* ═══ TAB 1: OVERVIEW ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Submitted Proposal / Cover Letter */}
          <Card className="p-6 bg-white border border-[#dddddd] rounded-[12px] shadow-xs space-y-3.5">
            <h3 className="text-sm font-semibold text-[#181d26] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#dddddd] pb-3">
              <FileText className="h-4 w-4 text-[#181d26]" /> My Submitted Proposal & Cover Letter
            </h3>
            <p className="text-xs text-[#333840] bg-[#f8fafc] p-4 border border-[#dddddd] rounded-[10px] italic leading-relaxed whitespace-pre-wrap font-normal">
              &quot;{coverLetterText || "No custom cover letter written."}&quot;
            </p>
          </Card>

          {/* Questionnaire Answers */}
          {hasAnswers && (
            <Card className="p-6 bg-white border border-[#dddddd] rounded-[12px] shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-[#181d26] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#dddddd] pb-3">
                Questionnaire Responses
              </h3>
              <div className="space-y-3 divide-y divide-[#dddddd]">
                {Object.entries(appMeta.screeningAnswers).map(([qid, ans]: any) => {
                  const qObj = screeningQuestions.find((q: any) => q.id === qid);
                  const questionText = qObj?.question || `Question (${qid})`;
                  return (
                    <div key={qid} className="pt-3 first:pt-0 space-y-1">
                      <p className="text-xs font-semibold text-[#181d26]">{questionText}</p>
                      <div className="text-xs text-[#333840] font-normal bg-[#f8fafc] p-3 rounded-[8px] border border-[#dddddd]">
                        Ans: {ans || <span className="text-[#41454d] italic">(No answer provided)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Pipeline History Timeline */}
          <Card className="p-6 bg-white border border-[#dddddd] rounded-[12px] shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-[#181d26] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#dddddd] pb-3">
              <History className="h-4 w-4 text-[#181d26]" /> Application History Timeline
            </h3>
            <div className="space-y-3 bg-[#f8fafc] p-4 rounded-[10px] border border-[#dddddd]">
              <div className="text-xs text-[#333840] border-l-2 border-[#181d26] pl-3">
                <span className="font-semibold text-[#181d26] block">Application Submitted</span>
                <span className="text-[#41454d] text-[9px] block mt-0.5">{new Date(application.createdAt).toLocaleString()}</span>
              </div>
              {appMeta.pipelineHistory?.map((h: any, idx: number) => (
                <div key={idx} className="text-xs text-[#333840] border-l-2 border-[#181d26] pl-3">
                  <span className="font-semibold text-[#181d26] block">{h.stage}</span>
                  <span className="text-[#41454d] text-[9px] block mt-0.5">
                    {new Date(h.timestamp).toLocaleString()} by {h.recruiterName || "Recruiter"}
                  </span>
                  {h.notes && (
                    <p className="text-[10px] text-[#41454d] italic mt-1 font-normal bg-white p-2 rounded border border-[#dddddd]">
                      &quot;{h.notes}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ═══ TAB 2: INTERVIEWS ═══ */}
      {activeTab === "interviews" && (
        <Card className="p-6 bg-white border border-[#dddddd] rounded-[12px] shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-[#181d26] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#dddddd] pb-3">
            <Video className="h-4 w-4 text-[#181d26]" /> Scheduled Interview Meetings
          </h3>

          {interviewRounds.length === 0 ? (
            <p className="text-xs text-[#41454d] italic py-8 text-center">
              No interview rounds scheduled yet. When the recruiter schedules a meeting, details and join links will appear here.
            </p>
          ) : (
            <div className="space-y-4">
              {interviewRounds.map((round) => {
                const isConducted = round.status === "CONDUCTED";
                const isCancelled = round.status === "CANCELLED";

                return (
                  <div
                    key={round.roundNumber}
                    className="p-5 rounded-[10px] border border-[#dddddd] bg-[#f8fafc] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-[#181d26] text-white text-xs font-semibold flex items-center justify-center">
                          {round.roundNumber}
                        </span>
                        <h4 className="text-xs font-semibold text-[#181d26]">Interview Round {round.roundNumber}</h4>
                      </div>
                      <Badge variant={isConducted ? "forest" : isCancelled ? "neutral" : "primary"}>
                        {isConducted ? "Completed" : isCancelled ? "Cancelled" : "Scheduled"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-[#41454d] block font-medium uppercase">Date & Time</span>
                        <span className="text-xs font-semibold text-[#181d26] mt-0.5 block">
                          {round.interviewDate
                            ? new Date(round.interviewDate).toLocaleString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "TBD"}
                        </span>
                      </div>

                      {round.meetingLink && (
                        <div>
                          <span className="text-[10px] text-[#41454d] block font-medium uppercase">Join Link</span>
                          <a
                            href={round.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#1b61c9] hover:underline flex items-center gap-1 mt-0.5 truncate"
                          >
                            {round.meetingLink} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ═══ TAB 3: OFFER LETTER & CONTRACT ═══ */}
      {activeTab === "offer" && hasOffer && (
        <Card className="p-6 bg-white border border-[#dddddd] rounded-[12px] shadow-xs space-y-6">
          <div className="border-b border-[#dddddd] pb-4 space-y-1">
            <h3 className="text-base font-semibold text-[#181d26] flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#fcab79]" /> Official Hiring Offer Letter
            </h3>
            <p className="text-xs text-[#41454d]">Review terms and accept or decline the project contract.</p>
          </div>

          {/* Offer Letter Text Block */}
          <div className="bg-[#f8fafc] border border-[#dddddd] p-5 rounded-[10px] space-y-3 text-xs text-[#333840]">
            <p className="font-semibold text-[#181d26] uppercase text-[10px] tracking-wider">Offer Statement</p>
            <p className="leading-relaxed font-normal whitespace-pre-wrap">&quot;{offerLetter!.offerText}&quot;</p>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#dddddd]">
              <div>
                <span className="text-[10px] text-[#41454d] uppercase font-medium block">Agreed Stipend</span>
                <span className="text-base font-semibold text-[#181d26] mt-0.5 block">₹{offerLetter!.stipendAmount}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#41454d] uppercase font-medium block">Offer Status</span>
                <span className="text-xs font-semibold text-[#181d26] capitalize mt-0.5 block">{offerLetter!.status.toLowerCase()}</span>
              </div>
            </div>
          </div>

          {/* Milestones Breakdown */}
          {offerLetter!.milestones?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[#181d26] uppercase tracking-wider">Payment Milestone Schedule</h4>
              <div className="border border-[#dddddd] rounded-[10px] divide-y divide-[#dddddd]">
                {offerLetter!.milestones.map((m: any, idx: number) => (
                  <div key={idx} className="p-3.5 flex justify-between items-center text-xs">
                    <span className="font-medium text-[#181d26]">{m.title}</span>
                    <span className="font-semibold text-[#181d26]">₹{m.budget}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons for Pending Offer */}
          {offerPending && (
            <div className="pt-2 border-t border-[#dddddd] space-y-3">
              {!isDeclining ? (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleRespondOffer("ACCEPT")}
                    disabled={offerLoading !== null}
                    className="bg-[#181d26] text-white hover:bg-[#333840] font-medium text-xs px-6 py-2.5 cursor-pointer rounded-[12px]"
                  >
                    {offerLoading === "ACCEPT" ? "Accepting..." : "Accept Job Offer & Start Project"}
                  </Button>

                  <Button
                    onClick={() => setIsDeclining(true)}
                    variant="outline"
                    disabled={offerLoading !== null}
                    className="border-[#dddddd] text-rose-600 hover:bg-rose-50 font-medium text-xs px-5 py-2.5 cursor-pointer rounded-[12px]"
                  >
                    Decline Offer
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-[10px] space-y-3">
                  <label className="block text-xs font-medium text-rose-900">Reason for declining (Optional)</label>
                  <input
                    type="text"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Briefly state why you're declining..."
                    className="w-full h-9 px-3 text-xs bg-white border border-rose-200 rounded-[6px] focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRespondOffer("DECLINE")}
                      disabled={offerLoading !== null}
                      className="bg-rose-600 text-white hover:bg-rose-700 font-medium text-xs px-4 py-2 cursor-pointer rounded-[6px]"
                    >
                      Confirm Decline
                    </Button>
                    <Button
                      onClick={() => setIsDeclining(false)}
                      variant="outline"
                      className="text-xs font-medium px-4 py-2 cursor-pointer rounded-[6px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Digital Contract status if accepted */}
          {offerAccepted && appMeta.digitalContract && (
            <div className="p-5 bg-[#f8fafc] border border-[#dddddd] rounded-[10px] space-y-2">
              <h4 className="text-xs font-semibold text-[#181d26] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#181d26]" /> Active Digital Work Contract
              </h4>
              <p className="text-xs text-[#333840] font-normal leading-relaxed">{appMeta.digitalContract.contractText}</p>
              <p className="text-[10px] text-[#41454d] font-medium pt-1">
                Contract status: <strong className="text-[#181d26]">Active</strong> · Signed on {appMeta.digitalContract.freelancerSignedAt ? new Date(appMeta.digitalContract.freelancerSignedAt).toLocaleDateString() : "Agreed"}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ═══ TAB 4: DM CHAT WITH RECRUITER ═══ */}
      {activeTab === "chat" && isShortlisted && (
        <Card className="p-0 border border-[#dddddd] bg-white rounded-[12px] shadow-xs overflow-hidden flex flex-col h-[520px]">
          {/* Header */}
          <div className="p-4 border-b border-[#dddddd] bg-[#f8fafc] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#181d26]" />
              <h3 className="text-xs font-semibold text-[#181d26]">Recruiter Direct Message Chat</h3>
            </div>
            <span className="text-[10px] text-[#41454d] font-medium">Private 1-on-1 Channel</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-white">
            {dmMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#41454d] italic">
                No messages yet. Send a message to start communicating directly with the client manager.
              </div>
            ) : (
              dmMessages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const isEditing = editingMessageId === msg.id;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5 text-[9px] text-[#41454d]">
                      <span className="font-semibold text-[#181d26]">{msg.sender?.name || "User"}</span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    <div
                      className={`max-w-[75%] p-3 rounded-[10px] text-xs leading-relaxed ${
                        isMe ? "bg-[#181d26] text-white" : "bg-[#f8fafc] text-[#181d26] border border-[#dddddd]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap font-normal">{msg.content}</p>
                    </div>

                    {isMe && (
                      <div className="flex gap-2 text-[9px] text-[#41454d] mt-1">
                        <button
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setDmInput(msg.content);
                          }}
                          className="hover:underline hover:text-[#181d26] cursor-pointer"
                        >
                          Edit
                        </button>
                        <span>•</span>
                        <button onClick={() => handleDeleteDM(msg.id)} className="hover:underline hover:text-rose-600 cursor-pointer">
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* DM Input Bar */}
          <div className="p-3 border-t border-[#dddddd] bg-[#f8fafc] flex gap-2 items-center">
            {editingMessageId && (
              <span className="text-[10px] text-[#181d26] font-medium">Editing:</span>
            )}
            <input
              type="text"
              value={dmInput}
              onChange={(e) => setDmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  editingMessageId ? handleEditDM() : handleSendDM();
                }
              }}
              placeholder={editingMessageId ? "Edit your message..." : "Type a message to recruiter..."}
              className="flex-1 h-9 px-3.5 rounded-[6px] border border-[#dddddd] bg-white text-xs text-[#181d26] focus:border-[#458fff] focus:outline-none"
            />
            <Button
              size="sm"
              disabled={!dmInput.trim() || dmLoading}
              onClick={editingMessageId ? handleEditDM : handleSendDM}
              className="bg-[#181d26] text-white hover:bg-[#333840] h-9 px-4 cursor-pointer rounded-[6px] text-xs font-medium"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
            {editingMessageId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingMessageId(null);
                  setDmInput("");
                }}
                className="h-9 px-3 rounded-[6px] text-xs font-medium cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </Card>
      )}

    </div>
  );
}
