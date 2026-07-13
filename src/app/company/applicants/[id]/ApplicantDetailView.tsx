"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Award,
  BrainCircuit,
  X,
  ExternalLink,
  CheckCircle,
  FileText,
  Calendar,
  Clock,
  Send,
  History,
  MessageSquare,
  Video,
  Gift,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { shortlistApplicant, rejectApplicant, hireApplicant, removeFreelancer } from "@/actions/applicationActions";
import {
  transitionApplicationStage,
  releaseMilestonePayment,
  sendOfferLetterAction,
  sendDMMessageAction,
  getDMMessagesAction,
  updateInterviewAction,
  cancelInterviewAction,
  editDMMessageAction,
  deleteDMMessageAction,
  markDMMessagesAsSeenAction,
} from "@/actions/workflowActions";
import {
  parseApplicationMetadata,
  getApplicationCoverLetterText,
  getProjectMetadataDirect,
} from "@/lib/workflowHelpers";

interface ApplicantDetailViewProps {
  application: any;
  currentUserId: string;
}

export function ApplicantDetailView({ application, currentUserId }: ApplicantDetailViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "chat" | "offer">("overview");

  // Interview schedule modal states (new & edit)
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("14:00");
  const [meetLink, setMeetLink] = useState("https://meet.google.com/");
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);

  // DM chat states
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [dmLoading, setDmLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Offer letter states
  const [offerText, setOfferText] = useState("");
  const [offerStipend, setOfferStipend] = useState(application.project?.budget || 0);
  const [offerMilestones, setOfferMilestones] = useState([
    { title: "Milestone 1: Project Kickoff", budget: 0 },
    { title: "Milestone 2: Mid Delivery", budget: 0 },
    { title: "Milestone 3: Final Delivery", budget: 0 },
  ]);
  const [isResendingOffer, setIsResendingOffer] = useState(false);

  const appMeta = parseApplicationMetadata(application.coverLetter);
  const cleanCoverLetter = getApplicationCoverLetterText(application.coverLetter);
  const currentStage =
    appMeta.pipelineHistory && appMeta.pipelineHistory.length > 0
      ? appMeta.pipelineHistory[appMeta.pipelineHistory.length - 1].stage
      : "Applied";

  const isHired = application.status === "HIRED";
  const isRejected = application.status === "REJECTED";
  const isShortlisted = application.status === "SHORTLISTED" || isHired;
  const isProjectActive = application.project.status === "OPEN" || application.project.status === "IN_PROGRESS";

  // Build chronological interview rounds from pipeline history
  type InterviewRound = {
    roundNumber: number;
    scheduledAt: string;       // when recruiter created this round
    interviewDate?: string;    // actual interview date/time
    meetingLink?: string;
    notes?: string;
    status: "SCHEDULED" | "CONDUCTED" | "CANCELLED";
    conductedAt?: string;
    cancelledAt?: string;
    rescheduledAt?: string;    // last reschedule timestamp
    isLatestActive: boolean;   // is this the currently active (editable) round?
  };

  const interviewRounds: InterviewRound[] = [];
  {
    let roundIdx = 0;
    let currentRound: InterviewRound | null = null;
    for (const event of (appMeta.pipelineHistory || [])) {
      if (event.stage === "Interview Scheduled") {
        roundIdx++;
        currentRound = {
          roundNumber: roundIdx,
          scheduledAt: event.timestamp,
          interviewDate: event.interviewDate,
          meetingLink: event.meetingLink,
          notes: event.notes,
          status: "SCHEDULED",
          isLatestActive: false,
        };
        interviewRounds.push(currentRound);
      } else if (event.stage === "Interview Rescheduled" && currentRound && currentRound.status === "SCHEDULED") {
        // updateInterviewAction also mutates the original event, but audit here too
        if (event.interviewDate) currentRound.interviewDate = event.interviewDate;
        if (event.meetingLink) currentRound.meetingLink = event.meetingLink;
        currentRound.rescheduledAt = event.timestamp;
      } else if (event.stage === "Interview Conducted" && currentRound && currentRound.status === "SCHEDULED") {
        currentRound.status = "CONDUCTED";
        currentRound.conductedAt = event.timestamp;
        currentRound = null; // next schedule = new round
      } else if (event.stage === "Interview Cancelled" && currentRound && currentRound.status === "SCHEDULED") {
        currentRound.status = "CANCELLED";
        currentRound.cancelledAt = event.timestamp;
        currentRound = null;
      }
    }
    // Mark the last active scheduled round as editable
    const lastScheduled = [...interviewRounds].reverse().find(r => r.status === "SCHEDULED");
    if (lastScheduled) lastScheduled.isLatestActive = true;
  }

  const latestInterview = [...(appMeta.pipelineHistory || [])].reverse().find((e: any) => e.meetingLink);
  const interviewConducted = interviewRounds.some(r => r.status === "CONDUCTED");

  // Offer letter state
  const offerLetterMeta = appMeta.offerLetter;
  const offerSent = !!offerLetterMeta;
  const offerPending = offerLetterMeta?.status === "PENDING";
  const offerAccepted = offerLetterMeta?.status === "ACCEPTED";
  const offerDeclined = offerLetterMeta?.status === "DECLINED";

  const projMeta = getProjectMetadataDirect(application.project.description);
  const questionMap = new Map(projMeta.screeningQuestions?.map((q: any) => [q.id, q.question]) || []);
  const hasAnswers = appMeta.screeningAnswers && Object.keys(appMeta.screeningAnswers).length > 0;

  // Fetch DM messages
  const freelancerUserId = application.freelancer.user.id;
  const loadDmMessages = async () => {
    try {
      const msgs = await getDMMessagesAction(application.projectId, freelancerUserId);
      setDmMessages(msgs);
      const unread = msgs.some((m: any) => m.senderId === freelancerUserId && !m.seen);
      if (unread) {
        await markDMMessagesAsSeenAction(application.projectId, freelancerUserId);
        const updatedMsgs = await getDMMessagesAction(application.projectId, freelancerUserId);
        setDmMessages(updatedMsgs);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === "chat") {
      loadDmMessages();
    }
  }, [activeTab]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  const handleAction = async (actionType: "shortlist" | "reject" | "hire" | "remove") => {
    setLoading(actionType);
    try {
      if (actionType === "shortlist") await shortlistApplicant(application.id);
      else if (actionType === "reject") await rejectApplicant(application.id);
      else if (actionType === "hire") {
        if (confirm("Confirm hire? This marks the freelancer as active on the project."))
          await hireApplicant(application.id);
      } else if (actionType === "remove") await removeFreelancer(application.id);
      router.refresh();
    } catch (err) {
      alert("Action failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleTransitionStage = async (targetStage: string) => {
    const notes = notesText.trim() || `Moved to ${targetStage}`;
    setLoading("transition");
    try {
      const res = await transitionApplicationStage(application.id, targetStage, notes);
      if (res.success) { setNotesText(""); router.refresh(); }
      else alert(res.error || "Failed to transition stage.");
    } catch (err: any) {
      alert(err.message || "Failed to transition stage.");
    } finally { setLoading(null); }
  };

  const handleScheduleInterviewSubmit = async () => {
    setLoading("sched");
    try {
      if (isEditingMeeting) {
        // Edit existing meeting
        const res = await updateInterviewAction(
          application.id, interviewDate, interviewTime, meetLink,
          notesText.trim() || undefined
        );
        if (res.success) { setNotesText(""); setShowMeetModal(false); setIsEditingMeeting(false); router.refresh(); }
        else alert(res.error || "Failed to update interview.");
      } else {
        // Schedule new meeting
        const combinedDateTime = `${interviewDate}T${interviewTime}`;
        const notes = notesText.trim() || `Interview scheduled on ${interviewDate} at ${interviewTime}. Link: ${meetLink}`;
        const res = await transitionApplicationStage(application.id, "Interview Scheduled", notes, {
          date: combinedDateTime,
          meetingLink: meetLink,
        });
        if (res.success) { setNotesText(""); setShowMeetModal(false); router.refresh(); }
        else alert(res.error || "Failed to schedule interview.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to schedule/update interview.");
    } finally { setLoading(null); }
  };

  const handleCancelInterview = async () => {
    if (!confirm("Cancel the scheduled interview? The candidate will be notified.")) return;
    setLoading("cancelMeet");
    try {
      const res = await cancelInterviewAction(application.id, notesText.trim() || undefined);
      if (res.success) { router.refresh(); }
      else alert(res.error || "Failed to cancel.");
    } catch (err: any) {
      alert(err.message || "Failed to cancel.");
    } finally { setLoading(null); }
  };

  const openEditMeeting = () => {
    if (latestInterview) {
      const dt = latestInterview.interviewDate ? new Date(latestInterview.interviewDate) : null;
      setInterviewDate(dt ? dt.toISOString().split("T")[0] : "");
      setInterviewTime(dt ? dt.toTimeString().slice(0, 5) : "14:00");
      setMeetLink(latestInterview.meetingLink || "https://meet.google.com/");
    }
    setIsEditingMeeting(true);
    setShowMeetModal(true);
  };

  const handleMarkConducted = async () => {
    setLoading("conducted");
    try {
      const res = await transitionApplicationStage(
        application.id,
        "Interview Conducted",
        "Interview was completed. Awaiting evaluation."
      );
      if (res.success) router.refresh();
    } catch {}
    finally { setLoading(null); }
  };

  const handleSendDM = async () => {
    if (editingMessageId) return handleEditDM();
    if (!dmInput.trim()) return;
    setDmLoading(true);
    try {
      await sendDMMessageAction(application.projectId, freelancerUserId, dmInput.trim());
      setDmInput("");
      await loadDmMessages();
    } catch {}
    finally { setDmLoading(false); }
  };

  const handleEditDM = async () => {
    if (!editingMessageId || !dmInput.trim()) return;
    setDmLoading(true);
    try {
      await editDMMessageAction(editingMessageId, dmInput.trim());
      setDmInput("");
      setEditingMessageId(null);
      await loadDmMessages();
    } catch {}
    finally { setDmLoading(false); }
  };

  const handleDeleteDM = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;
    try {
      await deleteDMMessageAction(messageId);
      await loadDmMessages();
    } catch {}
  };

  const handleSendOffer = async () => {
    if (!offerText.trim()) { alert("Please write the offer letter text."); return; }
    if (offerStipend <= 0) { alert("Please enter a valid stipend amount."); return; }
    setLoading("offer");
    try {
      const res = await sendOfferLetterAction(
        application.id,
        offerText,
        offerStipend,
        offerMilestones.filter((m) => m.title.trim())
      );
      if (res.success) { 
        alert("Offer letter sent successfully!"); 
        setIsResendingOffer(false);
        router.refresh(); 
      }
      else alert(res.error || "Failed to send offer.");
    } catch (err: any) {
      alert(err.message || "Failed to send offer.");
    } finally { setLoading(null); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HIRED": return <Badge variant="success">Hired</Badge>;
      case "SHORTLISTED": return <Badge variant="primary">Shortlisted</Badge>;
      case "REJECTED": return <Badge variant="danger">Rejected</Badge>;
      default: return <Badge variant="neutral">Pending Review</Badge>;
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: FileText },
    ...(isShortlisted ? [{ id: "chat", label: "DM Chat", icon: MessageSquare }] : []),
    ...(isShortlisted && !isHired && !isRejected ? [{ id: "offer", label: "Send Offer", icon: Gift }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-xs font-bold text-slate-500 hover:text-[#002d59] transition-colors cursor-pointer flex items-center gap-1.5"
        >
          ← Back to applicants board
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left (70%) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-white text-[#002d59] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Cover Letter */}
              <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-3.5">
                <h3 className="text-sm font-black text-[#002d59] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <FileText className="h-4 w-4 text-sky-500" /> Cover Letter & Proposal
                </h3>
                <p className="text-xs text-slate-700 bg-slate-50 p-4 border border-slate-100 rounded-xl italic leading-relaxed text-left">
                  &quot;{cleanCoverLetter}&quot;
                </p>
              </Card>

              {/* ═══ INTERVIEW ROUNDS ═══ */}
              <Card className="p-5 border-slate-200/60 bg-white shadow-sm space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-sky-500" />
                    <h3 className="text-sm font-black text-[#002d59]">Interview Rounds</h3>
                    {interviewRounds.length > 0 && (
                      <span className="h-5 w-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black flex items-center justify-center">
                        {interviewRounds.length}
                      </span>
                    )}
                  </div>
                  {isShortlisted && !isRejected && isProjectActive && (
                    <Button
                      size="sm"
                      disabled={loading !== null}
                      onClick={() => { setIsEditingMeeting(false); setInterviewDate(""); setInterviewTime("14:00"); setMeetLink("https://meet.google.com/"); setShowMeetModal(true); }}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer text-xs"
                    >
                      <Video className="h-3.5 w-3.5 mr-1" /> + Schedule New Meeting
                    </Button>
                  )}
                </div>

                {/* Empty state */}
                {interviewRounds.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    No interviews scheduled yet. Click &quot;+ Schedule New Meeting&quot; to begin.
                  </p>
                )}

                {/* Rounds list */}
                {interviewRounds.length > 0 && (
                  <div className="space-y-3">
                    {interviewRounds.map((round) => {
                      const isConducted = round.status === "CONDUCTED";
                      const isCancelled = round.status === "CANCELLED";
                      const isScheduled = round.status === "SCHEDULED";

                      return (
                        <div
                          key={round.roundNumber}
                          className={`rounded-xl border p-4 space-y-3 ${
                            isConducted
                              ? "bg-emerald-50/60 border-emerald-200"
                              : isCancelled
                              ? "bg-rose-50/40 border-rose-200"
                              : "bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200"
                          }`}
                        >
                          {/* Round header */}
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                              isConducted
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : isCancelled
                                ? "bg-rose-100 text-rose-700 border-rose-200"
                                : "bg-sky-100 text-sky-800 border-sky-200"
                            }`}>
                              Round {round.roundNumber}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              isConducted
                                ? "text-emerald-700"
                                : isCancelled
                                ? "text-rose-600"
                                : "text-sky-700"
                            }`}>
                              {isConducted ? "✓ Conducted" : isCancelled ? "✕ Cancelled" : "● Scheduled"}
                            </span>
                            <span className="text-[9px] text-slate-400 ml-auto">Google Meet</span>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                            {/* Scheduled on (created time) */}
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Scheduled On</p>
                              <p className="font-semibold text-slate-600">
                                {new Date(round.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>

                            {/* Interview Date/Time */}
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Interview Date & Time</p>
                              <p className="font-bold text-[#002d59]">
                                {round.interviewDate
                                  ? new Date(round.interviewDate).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                  : "— TBD"}
                              </p>
                            </div>

                            {/* Meet Link */}
                            {round.meetingLink && (
                              <div className="col-span-2 space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Meeting Link</p>
                                <a
                                  href={round.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`font-bold underline flex items-center gap-1 truncate ${
                                    isConducted || isCancelled ? "text-slate-500 pointer-events-none" : "text-sky-600 hover:text-sky-500"
                                  }`}
                                >
                                  {round.meetingLink} <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </div>
                            )}

                            {/* Rescheduled label */}
                            {round.rescheduledAt && (
                              <div className="col-span-2 space-y-0.5">
                                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">✏️ Rescheduled</p>
                                <p className="text-[10px] text-amber-700 font-semibold">
                                  Last updated {new Date(round.rescheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            )}

                            {/* Conducted At */}
                            {isConducted && round.conductedAt && (
                              <div className="col-span-2 space-y-0.5">
                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">✓ Interview Completed</p>
                                <p className="text-[10px] text-emerald-700 font-bold">
                                  Conducted on {new Date(round.conductedAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            )}

                            {/* Cancelled At */}
                            {isCancelled && round.cancelledAt && (
                              <div className="col-span-2 space-y-0.5">
                                <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">✕ Cancelled</p>
                                <p className="text-[10px] text-rose-600 font-semibold">
                                  Cancelled on {new Date(round.cancelledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Action buttons — only for the latest active (scheduled) round */}
                          {isScheduled && round.isLatestActive && (
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-sky-200/60">
                              <Button
                                size="sm"
                                disabled={loading !== null}
                                onClick={handleMarkConducted}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer text-xs"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                {loading === "conducted" ? "Updating..." : "Mark as Conducted"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={loading !== null}
                                onClick={openEditMeeting}
                                className="text-sky-700 border-sky-200 hover:bg-sky-100 font-bold cursor-pointer text-xs"
                              >
                                ✏️ Edit & Notify Candidate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={loading !== null}
                                onClick={handleCancelInterview}
                                className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold cursor-pointer text-xs"
                              >
                                {loading === "cancelMeet" ? "Cancelling..." : "❌ Cancel"}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Offer Letter status (if sent) */}
              {offerSent && (
                <Card className={`p-5 border shadow-sm space-y-2 ${offerAccepted ? "border-emerald-200 bg-emerald-50" : offerDeclined ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-center gap-2">
                    <Gift className={`h-4 w-4 ${offerAccepted ? "text-emerald-600" : offerDeclined ? "text-rose-600" : "text-amber-600"}`} />
                    <h3 className={`text-sm font-black ${offerAccepted ? "text-emerald-800" : offerDeclined ? "text-rose-800" : "text-amber-800"}`}>
                      Offer Letter {offerAccepted ? "Accepted ✓" : offerDeclined ? "Declined ✗" : "Sent — Awaiting Response"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Stipend: <strong>₹{offerLetterMeta!.stipendAmount}</strong> · Sent: {new Date(offerLetterMeta!.sentAt).toLocaleDateString()}
                    {offerLetterMeta!.respondedAt && ` · Responded: ${new Date(offerLetterMeta!.respondedAt).toLocaleDateString()}`}
                  </p>
                </Card>
              )}

              {/* Questionnaire Answers */}
              {hasAnswers && (
                <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-[#002d59] uppercase tracking-wider flex items-center gap-1.5">
                    📋 Candidate Questionnaire Responses
                  </h3>
                  <div className="space-y-3 divide-y divide-slate-100">
                    {Object.entries(appMeta.screeningAnswers).map(([qid, ans]: any) => {
                      const questionText = questionMap.get(qid) || `Question (${qid})`;
                      return (
                        <div key={qid} className="pt-3 first:pt-0 space-y-1 text-left">
                          <p className="text-xs font-bold text-slate-800">{questionText}</p>
                          <div className="text-xs text-sky-850 font-semibold bg-slate-50 p-3 rounded-lg border border-slate-100/50">
                            Ans:{" "}
                            {ans ? (
                              ans.startsWith("http://") || ans.startsWith("https://") || ans.startsWith("www.") ? (
                                <a
                                  href={ans.startsWith("www.") ? `https://${ans}` : ans}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-500 underline cursor-pointer break-all"
                                >
                                  {ans} <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              ) : ans
                            ) : (
                              <span className="text-slate-400 italic font-medium">(No answer provided)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Pipeline History */}
              <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-4">
                <h3 className="text-sm font-black text-[#002d59] uppercase tracking-wider flex items-center gap-1.5">
                  <History className="h-4 w-4 text-sky-500" /> Recruitment Pipeline History
                </h3>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-600 text-left border-l-2 border-slate-350 pl-3">
                    <span className="font-bold text-[#002d59] block">Initial Application Submitted</span>
                    <span className="text-slate-400 text-[9px] block mt-0.5">{new Date(application.createdAt).toLocaleString()}</span>
                  </div>
                  {appMeta.pipelineHistory?.map((h: any, idx: number) => (
                    <div key={idx} className="text-xs text-slate-700 border-l-2 border-sky-400 pl-3 text-left">
                      <span className="font-black text-[#002d59] block">{h.stage}</span>
                      <span className="text-slate-400 text-[9px] block mt-0.5">
                        {new Date(h.timestamp).toLocaleString()} by {h.recruiterName || "System"}
                      </span>
                      {h.notes && (
                        <p className="text-[10px] text-slate-500 italic mt-1 font-medium bg-white p-2 rounded border border-slate-100">
                          &quot;{h.notes}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Digital Contract */}
              {appMeta.digitalContract && (
                <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-[#002d59] uppercase tracking-wider">
                      🤝 Active Work Contract
                    </h3>
                    <Badge variant="primary" className="text-[10px] px-2 py-0.5">
                      {appMeta.digitalContract.freelancerSigned ? "Signed & Active" : "Awaiting Signature"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold bg-slate-50 p-4 border border-slate-100 rounded-xl leading-relaxed text-left">
                    {appMeta.digitalContract.contractText}
                  </p>
                  <div className="space-y-2.5">
                    <span className="font-bold text-slate-700 block text-xs text-left">Contract Milestones</span>
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white text-xs">
                      {appMeta.digitalContract.milestones?.map((m: any, idx: number) => (
                        <div key={idx} className="p-3.5 flex justify-between items-center text-left">
                          <div>
                            <span className="font-bold text-[#002d59] block">{m.title}</span>
                            <span className="text-slate-455 text-[10px] block mt-0.5">₹{m.budget} Budget Allocation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.status === "RELEASED" ? (
                              <Badge variant="success" className="text-[10px] py-0.5 px-2.5">Paid & Released</Badge>
                            ) : (
                              <>
                                <Badge variant="neutral" className="text-[10px] py-0.5 px-2.5">{m.status.toLowerCase()}</Badge>
                                <Button
                                  size="xs"
                                  disabled={loading === `milestone-${idx}`}
                                  onClick={async () => {
                                    setLoading(`milestone-${idx}`);
                                    const res = await releaseMilestonePayment(application.id, idx);
                                    if (res.success) { alert("Milestone released!"); router.refresh(); }
                                    setLoading(null);
                                  }}
                                  className="cursor-pointer text-[10px] py-1 px-3"
                                >
                                  {loading === `milestone-${idx}` ? "Processing..." : "Release Pay"}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ═══ DM CHAT TAB ═══ */}
          {activeTab === "chat" && (
            <Card className="p-0 border-slate-200/60 bg-white shadow-sm flex flex-col overflow-hidden" style={{ minHeight: "420px" }}>
              {/* Chat header */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-[#f8faff] to-white">
                <div className="h-8 w-8 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-black text-sm overflow-hidden">
                  {application.freelancer.user.image ? (
                    <img src={application.freelancer.user.image} className="h-full w-full object-cover" />
                  ) : (
                    (application.freelancer.user.name?.[0] || "F").toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-[#002d59]">{application.freelancer.user.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Direct Message · Pre-hire channel</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
                {dmMessages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No messages yet. Start the conversation with the candidate.</p>
                ) : (
                  dmMessages.map((msg: any) => {
                    const isMe = msg.senderId === currentUserId;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                        {!isMe && (
                          <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0">
                            {msg.sender?.name?.[0] || "?"}
                          </div>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs ${isMe ? "bg-[#002d59] text-white rounded-tr-none" : "bg-slate-100 text-slate-800 rounded-tl-none"}`}>
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className={`text-[9px] mt-0.5 flex items-center gap-1.5 ${isMe ? "justify-end text-blue-200" : "text-slate-400"}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {isMe && (
                              <>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => { setEditingMessageId(msg.id); setDmInput(msg.content); }}
                                  className="text-blue-300 hover:text-white underline font-bold transition-colors cursor-pointer border-none bg-transparent p-0"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDM(msg.id)}
                                  className="text-rose-400 hover:text-rose-300 underline font-bold transition-colors cursor-pointer border-none bg-transparent p-0"
                                >
                                  Delete
                                </button>
                                <span className="ml-1 flex items-center">
                                  {msg.seen ? (
                                    <div className="flex animate-fade-in" title="Seen by candidate">
                                      <svg className="h-3 w-3 text-[#3ac0ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <svg className="h-3 w-3 text-[#3ac0ff] -ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <svg className="h-3 w-3 text-slate-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                      <title>Sent</title>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {isMe && (
                          <div className="h-6 w-6 rounded-full bg-[#002d59] flex items-center justify-center text-[10px] font-black text-white shrink-0">
                            R
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-slate-100 flex gap-2 items-center">
                {editingMessageId && (
                  <button onClick={() => { setEditingMessageId(null); setDmInput(""); }} className="text-[10px] text-slate-400 hover:text-slate-600 font-medium whitespace-nowrap cursor-pointer">
                    Cancel Edit
                  </button>
                )}
                <input
                  type="text"
                  value={dmInput}
                  onChange={(e) => setDmInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendDM(); } }}
                  placeholder={editingMessageId ? "Edit message..." : "Type a message to the candidate..."}
                  className="flex-1 h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-[#002d59] focus:outline-none"
                />
                <Button
                  size="sm"
                  disabled={dmLoading || !dmInput.trim()}
                  onClick={handleSendDM}
                  className="bg-[#002d59] hover:bg-[#001d3d] text-white font-bold cursor-pointer px-3"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          )}

          {/* ═══ OFFER LETTER TAB ═══ */}
          {activeTab === "offer" && (
            <div className="space-y-5">
              {offerSent && !isResendingOffer ? (
                <Card className={`p-6 border shadow-sm space-y-4 ${offerAccepted ? "border-emerald-200 bg-emerald-50" : offerDeclined ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-center gap-2">
                    <Gift className={`h-5 w-5 ${offerAccepted ? "text-emerald-600" : offerDeclined ? "text-rose-600" : "text-amber-600"}`} />
                    <h3 className={`text-sm font-black ${offerAccepted ? "text-emerald-800" : offerDeclined ? "text-rose-800" : "text-amber-800"}`}>
                      Offer Letter {offerAccepted ? "Accepted ✓" : offerDeclined ? "Declined ✗" : "Sent — Awaiting Response"}
                    </h3>
                  </div>
                  <div className="bg-white/70 p-4 rounded-xl border border-white space-y-3 text-xs text-slate-700">
                    <p className="italic leading-relaxed">&quot;{offerLetterMeta!.offerText}&quot;</p>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stipend</p>
                        <p className="font-black text-[#002d59] text-sm">₹{offerLetterMeta!.stipendAmount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                        <p className="font-bold capitalize">{offerLetterMeta!.status.toLowerCase()}</p>
                      </div>
                    </div>
                    {offerLetterMeta!.reason && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Reason for declining</p>
                        <p className="text-sm font-semibold text-rose-700 italic mt-0.5">&quot;{offerLetterMeta!.reason}&quot;</p>
                      </div>
                    )}
                    {offerLetterMeta!.milestones?.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestone Plan</p>
                        {offerLetterMeta!.milestones.map((m: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                            <span className="font-medium text-slate-700">{m.title}</span>
                            <span className="font-black text-[#002d59]">₹{m.budget}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {offerDeclined && !isResendingOffer && (
                    <div className="pt-3 border-t border-rose-200">
                      <Button onClick={() => setIsResendingOffer(true)} size="sm" variant="outline" className="w-full text-sm font-bold border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer">
                        Send Another Offer
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <Gift className="h-5 w-5 text-[#002d59]" />
                    <h3 className="text-sm font-black text-[#002d59]">Compose Hiring Offer Letter</h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Offer Text */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Offer Letter Message *
                      </label>
                      <textarea
                        rows={5}
                        value={offerText}
                        onChange={(e) => setOfferText(e.target.value)}
                        placeholder="Dear [Candidate Name], We are pleased to extend you an offer to join our project..."
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-[#002d59] focus:outline-none resize-none"
                      />
                    </div>

                    {/* Stipend Amount */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Stipend / Budget (₹) *
                      </label>
                      <input
                        type="number"
                        value={offerStipend}
                        onChange={(e) => setOfferStipend(Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-[#002d59] focus:outline-none"
                      />
                    </div>

                    {/* Milestones */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Payment Milestones
                        </label>
                        <button
                          type="button"
                          onClick={() => setOfferMilestones([...offerMilestones, { title: "", budget: 0 }])}
                          className="text-[10px] text-sky-600 hover:text-sky-500 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Add milestone
                        </button>
                      </div>
                      <div className="space-y-2">
                        {offerMilestones.map((m, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={m.title}
                              onChange={(e) => {
                                const updated = [...offerMilestones];
                                updated[i] = { ...updated[i], title: e.target.value };
                                setOfferMilestones(updated);
                              }}
                              placeholder={`Milestone ${i + 1} title`}
                              className="flex-1 h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-[#002d59] focus:outline-none"
                            />
                            <input
                              type="number"
                              value={m.budget}
                              onChange={(e) => {
                                const updated = [...offerMilestones];
                                updated[i] = { ...updated[i], budget: Number(e.target.value) };
                                setOfferMilestones(updated);
                              }}
                              placeholder="₹ Amount"
                              className="w-24 h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-[#002d59] focus:outline-none"
                            />
                            {offerMilestones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setOfferMilestones(offerMilestones.filter((_, j) => j !== i))}
                                className="text-rose-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isResendingOffer && (
                        <Button
                          variant="outline"
                          onClick={() => setIsResendingOffer(false)}
                          className="flex-1 font-bold border-slate-200 text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        disabled={loading === "offer"}
                        onClick={handleSendOffer}
                        className="flex-1 bg-[#002d59] hover:bg-[#001d3d] text-white font-bold cursor-pointer"
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        {loading === "offer" ? "Sending Offer..." : "Send Official Offer Letter"}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar (30%) */}
        <div className="space-y-5 lg:sticky lg:top-24">

          {/* Candidate Summary */}
          <Card className="p-6 border-slate-200/60 bg-white shadow-sm text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-[#f8faff] border border-slate-200 flex items-center justify-center font-black text-xl text-[#002d59] mx-auto shadow-inner overflow-hidden">
              {application.freelancer.user.image ? (
                <img src={application.freelancer.user.image} className="h-full w-full object-cover" />
              ) : (
                (application.freelancer.user.name?.[0] || "U").toUpperCase()
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#002d59]">{application.freelancer.user.name}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                {application.freelancer.professionalHeadline || "Software Engineer"}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Badge variant="accent" className="font-extrabold text-[10px] py-1 px-2.5 flex items-center gap-0.5">
                <BrainCircuit className="h-3 w-3" /> AI Match: {application.aiScore}%
              </Badge>
              {getStatusBadge(application.status)}
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs">
              <div>
                <p className="font-bold text-slate-700">{application.freelancer.experienceYears}y</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Exp</p>
              </div>
              <div className="border-x border-slate-200">
                <p className="font-bold text-[#002d59]">{application.freelancer.rating}★</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Rating</p>
              </div>
              <div>
                <p className="font-bold text-emerald-700">{application.freelancer.completionRate}%</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Done</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Link href={`/freelancers/${application.freelancer.id}`} target="_blank">
                <Button size="sm" variant="outline" className="w-full cursor-pointer font-bold text-[#002d59] border-[#002d59]/20 hover:bg-slate-50 gap-1">
                  View Full Profile <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              {application.freelancer.resumeUrl && (
                <a href={application.freelancer.resumeUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="w-full cursor-pointer font-bold text-sky-600 border-sky-100 hover:bg-sky-50/30 gap-1 mt-2">
                    Download Resume <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>
          </Card>

          {/* Recruiter Actions */}
          <Card className="p-6 border-slate-200/60 bg-white shadow-sm space-y-4 text-left">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block">Recruiter Actions</h3>

            {!isRejected && isProjectActive && (
              <div className="space-y-4 text-xs">
                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Evaluation Notes</label>
                  <input
                    type="text"
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Add comment for this pipeline change..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] focus:ring-1 focus:ring-[#002d59] focus:outline-none"
                  />
                </div>

                {/* Pipeline Stage Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transition Pipeline Stage</label>
                  <select
                    value={isHired ? "Project Started" : currentStage}
                    disabled={loading !== null}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Interview Scheduled") setShowMeetModal(true);
                      else if (val === "REJECTED") handleAction("reject");
                      else if (val) handleTransitionStage(val);
                    }}
                    className="w-full h-9 px-3 border border-slate-200 bg-white rounded-lg focus:outline-none cursor-pointer font-bold text-[#002d59]"
                  >
                    <option value="Applied">Applied</option>
                    <option value="Profile Reviewed">Profile Reviewed</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Assessment">Assessment</option>
                    <option value="Interview Scheduled">Schedule Interview</option>
                    <option value="Interview Conducted">Interview Conducted</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Selected">Selected</option>
                    <option value="Offer Sent">Offer Sent</option>
                    <option value="Offer Accepted">Offer Accepted</option>
                    <option value="Project Started">Project Started</option>
                    <option value="Milestone Review">Milestone Review</option>
                    <option value="Completed">Completed</option>
                    <option value="REJECTED">Reject / De-select</option>
                  </select>
                </div>

                {/* Quick action buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {!isShortlisted && application.status === "PENDING" && (
                    <Button
                      size="sm"
                      disabled={loading !== null}
                      onClick={() => handleAction("shortlist")}
                      className="w-full bg-[#002d59] text-white font-bold cursor-pointer"
                    >
                      {loading === "shortlist" ? "Processing..." : "Shortlist Candidate"}
                    </Button>
                  )}
                  {isShortlisted && !offerSent && !isHired && (
                    <Button
                      size="sm"
                      disabled={loading !== null}
                      onClick={() => { setActiveTab("offer"); }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                    >
                      <Gift className="h-3.5 w-3.5 mr-1" /> Compose & Send Offer Letter
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading !== null}
                    onClick={() => handleAction("reject")}
                    className="w-full text-rose-600 border-rose-100 hover:bg-rose-50/30 font-bold cursor-pointer"
                  >
                    Reject Candidate
                  </Button>
                </div>
              </div>
            )}

            {isRejected && (
              <p className="text-xs text-rose-500 font-bold italic py-2 text-center">This application has been rejected.</p>
            )}
            {isHired && (
              <p className="text-xs text-emerald-600 font-bold italic py-2 text-center">This freelancer is hired and active on the workspace.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Interview Scheduling Modal */}
      {showMeetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer" onClick={() => setShowMeetModal(false)} />
          <Card className="relative w-full max-w-md p-6 z-10 border-slate-100 bg-white shadow-2xl space-y-4 rounded-3xl text-left">
            <button onClick={() => setShowMeetModal(false)} className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-50 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#002d59]">
                {isEditingMeeting ? "✏️ Edit Scheduled Interview" : "📅 Schedule Google Meet Interview"}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditingMeeting
                  ? "Update the date, time or Meet link. The candidate will be notified immediately."
                  : "Candidate will receive an instant notification with the meeting details and join link."}
              </p>
            </div>
            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="space-y-1">
                <label className="block font-bold">Interview Date</label>
                <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold">Interview Time</label>
                <input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold">Google Meet Link</label>
                <input type="text" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://meet.google.com/..." className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white" />
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => { setShowMeetModal(false); setIsEditingMeeting(false); }}>Cancel</Button>
              <Button
                className="flex-1 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white font-bold"
                onClick={handleScheduleInterviewSubmit}
                disabled={loading === "sched"}
              >
                {loading === "sched"
                  ? (isEditingMeeting ? "Updating..." : "Scheduling...")
                  : (isEditingMeeting ? "Save Changes & Notify" : "Confirm & Notify Candidate")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
