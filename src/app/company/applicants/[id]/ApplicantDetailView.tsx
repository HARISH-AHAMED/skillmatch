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
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { shortlistApplicant, rejectApplicant, hireApplicant, removeFreelancer } from "@/actions/applicationActions";
import {
  transitionApplicationStage,
  releaseMilestonePayment,
  sendOfferLetterAction,
  respondToNegotiationAction,
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
  PAYMENT_CATEGORIES,
  PaymentCategory,
  getPaymentUnitLabel,
  getPaymentCategoryLabel,
  CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrencySymbol,
  formatMoney,
  NON_MONETARY_BENEFITS,
  NonMonetaryBenefit,
  getBenefitLabel,
  isNonMonetary,
  supportsBenefits,
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
  // Default the offer to whatever billing model the project was posted with.
  const [offerCurrency, setOfferCurrency] = useState<string>(
    getProjectMetadataDirect(application.project.description).currency || DEFAULT_CURRENCY
  );
  const [offerBenefits, setOfferBenefits] = useState<NonMonetaryBenefit[]>(
    getProjectMetadataDirect(application.project.description).nonMonetaryBenefits || []
  );
  const [offerBenefitDetails, setOfferBenefitDetails] = useState(
    getProjectMetadataDirect(application.project.description).nonMonetaryDetails || ""
  );
  const toggleOfferBenefit = (b: NonMonetaryBenefit) =>
    setOfferBenefits((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  const [offerCategory, setOfferCategory] = useState<PaymentCategory>(
    (getProjectMetadataDirect(application.project.description).paymentCategory as PaymentCategory) || "FIXED"
  );
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

  // Payment negotiation raised by the freelancer, if any
  const negotiations = offerLetterMeta?.negotiation ?? [];
  const pendingNegotiation = negotiations.find((n) => n.status === "PENDING");
  const resolvedNegotiations = negotiations.filter((n) => n.status !== "PENDING");

  const handleNegotiationResponse = async (decision: "ACCEPT" | "REJECT") => {
    let note: string | undefined;
    if (decision === "REJECT") {
      note = prompt("Optional note explaining why the original terms stand:") || undefined;
    }
    setLoading(`nego-${decision}`);
    try {
      const res = await respondToNegotiationAction(application.id, decision, note);
      if (!res.success) alert(res.error || "Failed to respond to the counter-offer.");
      else router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to respond to the counter-offer.");
    } finally {
      setLoading(null);
    }
  };

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
        offerMilestones.filter((m) => m.title.trim()),
        offerCategory,
        offerCurrency,
        offerBenefits,
        offerBenefitDetails
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
      <div className="flex items-center justify-between text-left">
        <button
          onClick={() => router.back()}
          className="text-xs font-medium text-ink hover:underline transition-colors cursor-pointer flex items-center gap-1.5"
        >
          ← Back to applicants board
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left (70%) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Tabs */}
          <Tabs
            label="Applicant detail sections"
            variant="pill"
            value={activeTab}
            onChange={(id) => setActiveTab(id as any)}
            className="w-fit"
            items={tabs.map((tab) => ({
              id: tab.id,
              label: tab.label,
              icon: <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />,
            }))}
          />

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Cover Letter */}
 <Card className="p-6 rounded-lg space-y-3.5">
                <h3 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline pb-3">
                  <FileText className="h-4 w-4 text-ink" /> Cover Letter & Proposal
                </h3>
                <p className="text-xs text-body bg-surface-soft p-4 border border-hairline rounded-lg italic leading-relaxed text-left font-normal">
                  &quot;{cleanCoverLetter}&quot;
                </p>
              </Card>

              {/* ═══ INTERVIEW ROUNDS ═══ */}
 <Card className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-hairline">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-link" />
                    <h3 className="text-sm font-semibold text-ink">Interview Rounds</h3>
                    {interviewRounds.length > 0 && (
                      <span className="h-5 w-5 rounded-full bg-link/10 text-link-active text-[11px] font-semibold flex items-center justify-center">
                        {interviewRounds.length}
                      </span>
                    )}
                  </div>
                  {isShortlisted && !isRejected && isProjectActive && (
                    <Button
                      size="sm"
                      disabled={loading !== null}
                      onClick={() => { setIsEditingMeeting(false); setInterviewDate(""); setInterviewTime("14:00"); setMeetLink("https://meet.google.com/"); setShowMeetModal(true); }}
                      className="bg-link hover:bg-link text-white font-bold cursor-pointer text-xs"
                    >
                      <Video className="h-3.5 w-3.5 mr-1" /> + Schedule New Meeting
                    </Button>
                  )}
                </div>

                {/* Empty state */}
                {interviewRounds.length === 0 && (
                  <p className="text-xs text-border-strong italic text-center py-6">
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
                          className={`rounded-lg border p-4 space-y-3 ${
                            isConducted
                              ? "bg-success-surface/60 border-success-border/40"
                              : isCancelled
                              ? "bg-danger-surface/40 border-danger-border"
                              : "bg-link/5 border-link/20"
                          }`}
                        >
                          {/* Round header */}
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              isConducted
                                ? "bg-success-surface text-success border-success-border/40"
                                : isCancelled
                                ? "bg-danger-surface text-danger border-danger-border"
                                : "bg-link/10 text-link-active border-link/20"
                            }`}>
                              Round {round.roundNumber}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isConducted
                                ? "text-success"
                                : isCancelled
                                ? "text-danger"
                                : "text-link-active"
                            }`}>
                              {isConducted ? "Conducted" : isCancelled ? "Cancelled" : "Scheduled"}
                            </span>
                            <span className="text-[11px] text-border-strong ml-auto">Google Meet</span>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                            {/* Scheduled on (created time) */}
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold text-border-strong uppercase tracking-wider">Scheduled On</p>
                              <p className="font-semibold text-body">
                                {new Date(round.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>

                            {/* Interview Date/Time */}
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold text-border-strong uppercase tracking-wider">Interview Date & Time</p>
                              <p className="font-bold text-ink">
                                {round.interviewDate
                                  ? new Date(round.interviewDate).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                  : "— TBD"}
                              </p>
                            </div>

                            {/* Meet Link */}
                            {round.meetingLink && (
                              <div className="col-span-2 space-y-0.5">
                                <p className="text-[11px] font-bold text-border-strong uppercase tracking-wider">Meeting Link</p>
                                <a
                                  href={round.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`font-bold underline flex items-center gap-1 truncate ${
                                    isConducted || isCancelled ? "text-muted pointer-events-none" : "text-link hover:text-link"
                                  }`}
                                >
                                  {round.meetingLink} <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </div>
                            )}

                            {/* Rescheduled label */}
                            {round.rescheduledAt && (
                              <div className="col-span-2 space-y-0.5">
                                <p className="text-[11px] font-bold text-star uppercase tracking-wider">Rescheduled</p>
                                <p className="text-[11px] text-warning font-semibold">
                                  Last updated {new Date(round.rescheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            )}

                            {/* Conducted At */}
                            {isConducted && round.conductedAt && (
                              <div className="col-span-2 space-y-0.5">
                                <p className="text-[11px] font-bold text-success uppercase tracking-wider">Interview Completed</p>
                                <p className="text-[11px] text-success font-bold">
                                  Conducted on {new Date(round.conductedAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            )}

                            {/* Cancelled At */}
                            {isCancelled && round.cancelledAt && (
                              <div className="col-span-2 space-y-0.5">
                                <p className="text-[11px] font-bold text-danger uppercase tracking-wider">Cancelled</p>
                                <p className="text-[11px] text-danger font-semibold">
                                  Cancelled on {new Date(round.cancelledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Action buttons — only for the latest active (scheduled) round */}
                          {isScheduled && round.isLatestActive && (
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-link/20/60">
                              <Button
                                size="sm"
                                disabled={loading !== null}
                                onClick={handleMarkConducted}
                                className="bg-success hover:bg-success text-white font-bold cursor-pointer text-xs"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                {loading === "conducted" ? "Updating..." : "Mark as Conducted"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={loading !== null}
                                onClick={openEditMeeting}
                                className="text-link-active border-link/20 hover:bg-link/10 font-bold cursor-pointer text-xs"
                              >
                                Edit & Notify Candidate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={loading !== null}
                                onClick={handleCancelInterview}
                                className="text-danger border-danger-border hover:bg-danger-surface font-bold cursor-pointer text-xs"
                              >
                                {loading === "cancelMeet" ? "Cancelling..." : "Cancel"}
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
 <Card className={`p-5 border space-y-2 ${offerAccepted ?"border-success-border/40 bg-success-surface" : offerDeclined ?"border-danger-border bg-danger-surface" :"border-warning-border bg-warning-surface"}`}>
                  <div className="flex items-center gap-2">
                    <Gift className={`h-4 w-4 ${offerAccepted ? "text-success" : offerDeclined ? "text-danger" : "text-warning"}`} />
                    <h3 className={`text-sm font-semibold ${offerAccepted ? "text-success" : offerDeclined ? "text-danger" : "text-warning"}`}>
                      Offer Letter {offerAccepted ? "Accepted" : offerDeclined ? "Declined" : "Sent — Awaiting Response"}
                    </h3>
                  </div>
                  <p className="text-xs text-body font-medium">
                    Stipend: <strong>{formatMoney(offerLetterMeta!.stipendAmount, offerLetterMeta!.currency, offerLetterMeta!.paymentCategory)}</strong> · Sent: {new Date(offerLetterMeta!.sentAt).toLocaleDateString()}
                    {offerLetterMeta!.respondedAt && ` · Responded: ${new Date(offerLetterMeta!.respondedAt).toLocaleDateString()}`}
                  </p>
                </Card>
              )}

              {/* Questionnaire Answers */}
              {hasAnswers && (
 <Card className="p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    Candidate Questionnaire Responses
                  </h3>
                  <div className="space-y-3 divide-y divide-hairline">
                    {Object.entries(appMeta.screeningAnswers).map(([qid, ans]: any) => {
                      const questionText = questionMap.get(qid) || `Question (${qid})`;
                      return (
                        <div key={qid} className="pt-3 first:pt-0 space-y-1 text-left">
                          <p className="text-xs font-bold text-ink">{questionText}</p>
                          <div className="text-xs text-link-active font-semibold bg-surface-soft p-3 rounded-lg border border-hairline/50">
                            Ans:{" "}
                            {ans ? (
                              ans.startsWith("http://") || ans.startsWith("https://") || ans.startsWith("www.") ? (
                                <a
                                  href={ans.startsWith("www.") ? `https://${ans}` : ans}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-link hover:text-link underline cursor-pointer break-all"
                                >
                                  {ans} <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              ) : ans
                            ) : (
                              <span className="text-border-strong italic font-medium">(No answer provided)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Pipeline History */}
 <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <History className="h-4 w-4 text-link" /> Recruitment Pipeline History
                </h3>
                <div className="space-y-3 bg-surface-soft p-4 rounded-lg border border-hairline">
                  <div className="text-xs text-body text-left border-l-2 border-border-strong pl-3">
                    <span className="font-bold text-ink block">Initial Application Submitted</span>
                    <span className="text-border-strong text-[11px] block mt-0.5">{new Date(application.createdAt).toLocaleString()}</span>
                  </div>
                  {appMeta.pipelineHistory?.map((h: any, idx: number) => (
                    <div key={idx} className="text-xs text-body border-l-2 border-link pl-3 text-left">
                      <span className="font-semibold text-ink block">{h.stage}</span>
                      <span className="text-border-strong text-[11px] block mt-0.5">
                        {new Date(h.timestamp).toLocaleString()} by {h.recruiterName || "System"}
                      </span>
                      {h.notes && (
                        <p className="text-[11px] text-muted italic mt-1 font-medium bg-white p-2 rounded-lg border border-hairline">
                          &quot;{h.notes}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Digital Contract */}
              {appMeta.digitalContract && (
 <Card className="p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-hairline pb-3">
                    <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">
                      Active Work Contract
                    </h3>
                    <Badge variant="primary" className="text-[11px] px-2 py-0.5">
                      {appMeta.digitalContract.freelancerSigned ? "Signed & Active" : "Awaiting Signature"}
                    </Badge>
                  </div>
                  <p className="text-xs text-body font-semibold bg-surface-soft p-4 border border-hairline rounded-lg leading-relaxed text-left">
                    {appMeta.digitalContract.contractText}
                  </p>
                  <div className="space-y-2.5">
                    <span className="font-bold text-body block text-xs text-left">Contract Milestones</span>
                    <div className="border border-hairline rounded-lg divide-y divide-hairline bg-white text-xs">
                      {appMeta.digitalContract.milestones?.map((m: any, idx: number) => (
                        <div key={idx} className="p-3.5 flex justify-between items-center text-left">
                          <div>
                            <span className="font-bold text-ink block">{m.title}</span>
                            <span className="text-border-strong text-[11px] block mt-0.5">{formatMoney(m.budget, offerLetterMeta?.currency)} Budget Allocation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.status === "RELEASED" ? (
                              <Badge variant="success" className="text-[11px] py-0.5 px-2.5">Paid & Released</Badge>
                            ) : (
                              <>
                                <Badge variant="neutral" className="text-[11px] py-0.5 px-2.5">{m.status.toLowerCase()}</Badge>
                                <Button
                                  size="xs"
                                  disabled={loading === `milestone-${idx}`}
                                  onClick={async () => {
                                    setLoading(`milestone-${idx}`);
                                    const res = await releaseMilestonePayment(application.id, idx);
                                    if (res.success) { alert("Milestone released!"); router.refresh(); }
                                    setLoading(null);
                                  }}
                                  className="cursor-pointer text-[11px] py-1 px-3"
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
 <Card className="p-0 flex flex-col overflow-hidden" style={{ minHeight:"420px" }}>
              {/* Chat header */}
              <div className="p-4 border-b border-hairline flex items-center gap-3 bg-surface-soft">
                <div className="h-8 w-8 rounded-lg bg-link/10 flex items-center justify-center text-link-active font-semibold text-sm overflow-hidden">
                  {application.freelancer.user.image ? (
                    <img src={application.freelancer.user.image} className="h-full w-full object-cover" />
                  ) : (
                    (application.freelancer.user.name?.[0] || "F").toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">{application.freelancer.user.name}</p>
                  <p className="text-[11px] text-border-strong font-medium">Direct Message · Pre-hire channel</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
                {dmMessages.length === 0 ? (
                  <p className="text-xs text-border-strong italic text-center py-8">No messages yet. Start the conversation with the candidate.</p>
                ) : (
                  dmMessages.map((msg: any) => {
                    const isMe = msg.senderId === currentUserId;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                        {!isMe && (
                          <div className="h-6 w-6 rounded-full bg-surface-strong flex items-center justify-center text-[11px] font-semibold text-body shrink-0">
                            {msg.sender?.name?.[0] || "?"}
                          </div>
                        )}
                        <div className={`max-w-[75%] rounded-lg px-3.5 py-2 text-xs ${isMe ? "bg-ink text-white rounded-tr-none" : "bg-surface-strong text-ink rounded-tl-none"}`}>
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className={`text-[11px] mt-0.5 flex items-center gap-1.5 ${isMe ? "justify-end text-white/70" : "text-border-strong"}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {isMe && (
                              <>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => { setEditingMessageId(msg.id); setDmInput(msg.content); }}
                                  className="text-white/70 hover:text-white underline font-bold transition-colors cursor-pointer border-none bg-transparent p-0"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDM(msg.id)}
                                  className="text-danger/70 hover:text-danger/70 underline font-bold transition-colors cursor-pointer border-none bg-transparent p-0"
                                >
                                  Delete
                                </button>
                                <span className="ml-1 flex items-center">
                                  {msg.seen ? (
                                    <div className="flex animate-fade-in" title="Seen by candidate">
                                      <svg className="h-3 w-3 text-link" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <svg className="h-3 w-3 text-link -ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <svg className="h-3 w-3 text-border-strong opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
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
                          <div className="h-6 w-6 rounded-full bg-ink flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
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
              <div className="p-3 border-t border-hairline flex gap-2 items-center">
                {editingMessageId && (
                  <button onClick={() => { setEditingMessageId(null); setDmInput(""); }} className="text-[11px] text-border-strong hover:text-body font-medium whitespace-nowrap cursor-pointer">
                    Cancel Edit
                  </button>
                )}
                <input
                  type="text"
                  value={dmInput}
                  onChange={(e) => setDmInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendDM(); } }}
                  placeholder={editingMessageId ? "Edit message..." : "Type a message to the candidate..."}
                  className="flex-1 h-9 px-3 rounded-md border border-hairline bg-white text-xs focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                />
                <Button
                  size="sm"
                  disabled={dmLoading || !dmInput.trim()}
                  onClick={handleSendDM}
                  className="bg-ink hover:bg-primary-active text-white font-bold cursor-pointer px-3"
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
 <Card className={`p-6 border space-y-4 ${offerAccepted ?"border-success-border/40 bg-success-surface" : offerDeclined ?"border-danger-border bg-danger-surface" :"border-warning-border bg-warning-surface"}`}>
                  <div className="flex items-center gap-2">
                    <Gift className={`h-5 w-5 ${offerAccepted ? "text-success" : offerDeclined ? "text-danger" : "text-warning"}`} />
                    <h3 className={`text-sm font-semibold ${offerAccepted ? "text-success" : offerDeclined ? "text-danger" : "text-warning"}`}>
                      Offer Letter {offerAccepted ? "Accepted" : offerDeclined ? "Declined" : "Sent — Awaiting Response"}
                    </h3>
                  </div>
                  <div className="bg-white/70 p-4 rounded-lg border border-white space-y-3 text-xs text-body">
                    <p className="italic leading-relaxed">&quot;{offerLetterMeta!.offerText}&quot;</p>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-hairline">
                      <div>
                        <p className="text-[11px] font-bold text-border-strong uppercase tracking-wider">Stipend</p>
                        <p className="font-semibold text-ink text-sm">
                          {formatMoney(offerLetterMeta!.stipendAmount, offerLetterMeta!.currency, offerLetterMeta!.paymentCategory)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-border-strong uppercase tracking-wider">Payment Category</p>
                        <p className="font-semibold text-ink text-sm">{getPaymentCategoryLabel(offerLetterMeta!.paymentCategory)}</p>
                        <p className="text-[11px] text-border-strong mt-0.5">{offerLetterMeta!.currency || DEFAULT_CURRENCY}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-border-strong uppercase tracking-wider">Status</p>
                        <p className="font-bold capitalize">{offerLetterMeta!.status.toLowerCase()}</p>
                      </div>
                    </div>

                    {(offerLetterMeta!.nonMonetaryBenefits?.length ?? 0) > 0 && (
                      <div className="pt-2 border-t border-hairline space-y-1.5">
                        <p className="text-[11px] font-bold text-border-strong uppercase tracking-wider">
                          Non-Monetary Compensation
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {offerLetterMeta!.nonMonetaryBenefits!.map((b) => (
                            <Badge key={b} variant="secondary" className="text-[11px]">{getBenefitLabel(b)}</Badge>
                          ))}
                        </div>
                        {offerLetterMeta!.nonMonetaryDetails && (
                          <p className="text-[11px] text-muted italic">{offerLetterMeta!.nonMonetaryDetails}</p>
                        )}
                      </div>
                    )}

                    {/* Counter-offer awaiting the company's decision */}
                    {pendingNegotiation && (
                      <div className="pt-3 border-t border-hairline space-y-2.5">
                        <p className="text-[11px] font-bold text-warning uppercase tracking-wider">
                          Counter-offer from freelancer
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] text-border-strong uppercase tracking-wider">Current</p>
                            <p className="text-xs font-medium text-muted line-through">
                              {formatMoney(pendingNegotiation.previousAmount, pendingNegotiation.previousCurrency, pendingNegotiation.previousCategory)}
                              {" · "}{getPaymentCategoryLabel(pendingNegotiation.previousCategory)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-border-strong uppercase tracking-wider">Proposed</p>
                            <p className="text-xs font-semibold text-ink">
                              {formatMoney(pendingNegotiation.proposedAmount, pendingNegotiation.proposedCurrency, pendingNegotiation.proposedCategory)}
                              {" · "}{getPaymentCategoryLabel(pendingNegotiation.proposedCategory)}
                            </p>
                          </div>
                        </div>
                        {pendingNegotiation.message && (
                          <p className="text-xs italic text-body">&quot;{pendingNegotiation.message}&quot;</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="xs"
                            disabled={loading !== null}
                            onClick={() => handleNegotiationResponse("ACCEPT")}
                            className="cursor-pointer"
                          >
                            {loading === "nego-ACCEPT" ? "Accepting..." : "Accept New Terms"}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={loading !== null}
                            onClick={() => handleNegotiationResponse("REJECT")}
                            className="cursor-pointer"
                          >
                            {loading === "nego-REJECT" ? "Rejecting..." : "Keep Original"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Settled negotiation rounds */}
                    {resolvedNegotiations.length > 0 && (
                      <div className="pt-2 border-t border-hairline space-y-1.5">
                        <p className="text-[11px] font-bold text-border-strong uppercase tracking-wider">
                          Negotiation History ({resolvedNegotiations.length})
                        </p>
                        {resolvedNegotiations.map((n, i) => (
                          <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b border-hairline last:border-0">
                            <span className="text-body">
                              {formatMoney(n.proposedAmount, n.proposedCurrency, n.proposedCategory)} · {getPaymentCategoryLabel(n.proposedCategory)}
                            </span>
                            <Badge variant={n.status === "ACCEPTED" ? "success" : "danger"} className="text-[11px]">
                              {n.status.toLowerCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {offerLetterMeta!.reason && (
                      <div className="pt-2 border-t border-hairline">
                        <p className="text-[11px] font-bold text-danger uppercase tracking-wider">Reason for declining</p>
                        <p className="text-sm font-semibold text-danger italic mt-0.5">&quot;{offerLetterMeta!.reason}&quot;</p>
                      </div>
                    )}
                    {offerLetterMeta!.milestones?.length > 0 && (
                      <div className="pt-2 border-t border-hairline space-y-1.5">
                        <p className="text-[11px] font-bold text-border-strong uppercase tracking-wider">Milestone Plan</p>
                        {offerLetterMeta!.milestones.map((m: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-1 border-b border-hairline last:border-0">
                            <span className="font-medium text-body">{m.title}</span>
                            <span className="font-semibold text-ink">{formatMoney(m.budget, offerLetterMeta!.currency)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {offerDeclined && !isResendingOffer && (
                    <div className="pt-3 border-t border-danger-border">
                      <Button onClick={() => setIsResendingOffer(true)} size="sm" variant="outline" className="w-full text-sm font-bold border-danger-border text-danger hover:bg-danger-surface cursor-pointer">
                        Send Another Offer
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
 <Card className="p-6 space-y-5">
                  <div className="flex items-center gap-2 border-b border-hairline pb-4">
                    <Gift className="h-5 w-5 text-ink" />
                    <h3 className="text-sm font-semibold text-ink">Compose Hiring Offer Letter</h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Offer Text */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider">
                        Offer Letter Message *
                      </label>
                      <textarea
                        rows={5}
                        value={offerText}
                        onChange={(e) => setOfferText(e.target.value)}
                        placeholder="Dear [Candidate Name], We are pleased to extend you an offer to join our project..."
                        className="w-full px-3 py-2.5 rounded-md border border-hairline bg-white text-xs focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none resize-none"
                      />
                    </div>

                    {/* Currency */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider">
                        Currency *
                      </label>
                      <select
                        value={offerCurrency}
                        onChange={(e) => setOfferCurrency(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-hairline bg-white text-xs focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none cursor-pointer"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Category */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider">
                        Payment Category *
                      </label>
                      <select
                        value={offerCategory}
                        onChange={(e) => setOfferCategory(e.target.value as PaymentCategory)}
                        className="w-full h-9 px-3 rounded-md border border-hairline bg-white text-xs focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none cursor-pointer"
                      >
                        {PAYMENT_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-border-strong">
                        {PAYMENT_CATEGORIES.find((c) => c.value === offerCategory)?.hint}
                      </p>
                    </div>

                    {/* Stipend Amount */}
                    {!isNonMonetary(offerCategory) && (
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider">
                        {offerCategory === "HOURLY"
                          ? `Hourly Rate (${getCurrencySymbol(offerCurrency)} per hour) *`
                          : offerCategory === "MONTHLY"
                          ? `Monthly Rate (${getCurrencySymbol(offerCurrency)} per month) *`
                          : `Total Stipend / Budget (${getCurrencySymbol(offerCurrency)}) *`}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={offerStipend}
                        onChange={(e) => setOfferStipend(Number(e.target.value))}
                        className="w-full h-9 px-3 rounded-md border border-hairline bg-white text-xs focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                      />
                    </div>
                    )}

                    {supportsBenefits(offerCategory) && (
                      <div className="space-y-2 p-3 rounded-lg border border-hairline bg-surface-soft">
                        <label className="block text-[11px] font-bold text-muted uppercase tracking-wider">
                          Non-Monetary Compensation
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                          {NON_MONETARY_BENEFITS.map((b) => (
                            <label key={b.value} className="flex items-start gap-2 text-[11px] text-body cursor-pointer" title={b.hint}>
                              <input
                                type="checkbox"
                                checked={offerBenefits.includes(b.value)}
                                onChange={() => toggleOfferBenefit(b.value)}
                                className="mt-0.5 accent-ink cursor-pointer"
                              />
                              {b.label}
                            </label>
                          ))}
                        </div>
                        <input
                          value={offerBenefitDetails}
                          onChange={(e) => setOfferBenefitDetails(e.target.value)}
                          placeholder="Additional detail (equity %, certificate issuer, etc.)"
                          className="w-full h-9 px-3 rounded-md border border-hairline bg-white text-xs focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Milestones */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                          Payment Milestones
                        </label>
                        <button
                          type="button"
                          onClick={() => setOfferMilestones([...offerMilestones, { title: "", budget: 0 }])}
                          className="text-[11px] text-link hover:text-link font-bold flex items-center gap-0.5 cursor-pointer"
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
                              className="flex-1 h-8 px-3 rounded-md border border-hairline bg-white text-xs focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                            />
                            <input
                              type="number"
                              value={m.budget}
                              onChange={(e) => {
                                const updated = [...offerMilestones];
                                updated[i] = { ...updated[i], budget: Number(e.target.value) };
                                setOfferMilestones(updated);
                              }}
                              placeholder={`${getCurrencySymbol(offerCurrency)} Amount`}
                              className="w-24 h-8 px-3 rounded-md border border-hairline bg-white text-xs focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                            />
                            {offerMilestones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setOfferMilestones(offerMilestones.filter((_, j) => j !== i))}
                                className="text-danger/70 hover:text-danger cursor-pointer"
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
                          className="flex-1 font-bold border-hairline text-body cursor-pointer"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        disabled={loading === "offer"}
                        onClick={handleSendOffer}
                        className="flex-1 bg-ink hover:bg-primary-active text-white font-bold cursor-pointer"
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
 <Card className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-lg bg-surface-soft border border-hairline flex items-center justify-center font-semibold text-xl text-ink mx-auto shadow-inner overflow-hidden">
              {application.freelancer.user.image ? (
                <img src={application.freelancer.user.image} className="h-full w-full object-cover" />
              ) : (
                (application.freelancer.user.name?.[0] || "U").toUpperCase()
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-ink">{application.freelancer.user.name}</h4>
              <p className="text-[11px] text-border-strong font-bold uppercase tracking-wider truncate">
                {application.freelancer.professionalHeadline || "Software Engineer"}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Badge variant="accent" className="font-bold text-[11px] py-1 px-2.5 flex items-center gap-0.5">
                <BrainCircuit className="h-3 w-3" /> AI Match: {application.aiScore}%
              </Badge>
              {getStatusBadge(application.status)}
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 bg-surface-soft border border-hairline rounded-lg text-center text-xs">
              <div>
                <p className="font-bold text-body">{application.freelancer.experienceYears}y</p>
                <p className="text-[11px] text-border-strong font-bold uppercase tracking-wider mt-0.5">Exp</p>
              </div>
              <div className="border-x border-hairline">
                <p className="font-bold text-ink">{application.freelancer.rating}/5</p>
                <p className="text-[11px] text-border-strong font-bold uppercase tracking-wider mt-0.5">Rating</p>
              </div>
              <div>
                <p className="font-bold text-success">{application.freelancer.completionRate}%</p>
                <p className="text-[11px] text-border-strong font-bold uppercase tracking-wider mt-0.5">Done</p>
              </div>
            </div>
            <div className="pt-2 border-t border-hairline space-y-2">
              <Link href={`/freelancers/${application.freelancer.id}`} target="_blank">
                <Button size="sm" variant="outline" className="w-full cursor-pointer font-bold text-ink border-ink/20 hover:bg-surface-soft gap-1">
                  View Full Profile <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              {application.freelancer.resumeUrl && (
                <a href={application.freelancer.resumeUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="w-full cursor-pointer font-bold text-link border-link/20 hover:bg-link/5/30 gap-1 mt-2">
                    Download Resume <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>
          </Card>

          {/* Recruiter Actions */}
 <Card className="p-6 space-y-4 text-left">
            <h3 className="text-xs font-semibold text-border-strong uppercase tracking-widest block">Recruiter Actions</h3>

            {!isRejected && isProjectActive && (
              <div className="space-y-4 text-xs">
                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider">Evaluation Notes</label>
                  <input
                    type="text"
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Add comment for this pipeline change..."
                    className="w-full h-9 px-3 rounded-md border border-hairline bg-white text-[11px] focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                  />
                </div>

                {/* Pipeline Stage Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider">Transition Pipeline Stage</label>
                  <select
                    value={isHired ? "Project Started" : currentStage}
                    disabled={loading !== null}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Interview Scheduled") setShowMeetModal(true);
                      else if (val === "REJECTED") handleAction("reject");
                      else if (val) handleTransitionStage(val);
                    }}
                    className="w-full h-9 px-3 border border-hairline bg-white rounded-md focus:outline-none cursor-pointer font-bold text-ink"
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
                <div className="space-y-2 pt-2 border-t border-hairline">
                  {!isShortlisted && application.status === "PENDING" && (
                    <Button
                      size="sm"
                      disabled={loading !== null}
                      onClick={() => handleAction("shortlist")}
                      className="w-full bg-ink text-white font-bold cursor-pointer"
                    >
                      {loading === "shortlist" ? "Processing..." : "Shortlist Candidate"}
                    </Button>
                  )}
                  {isShortlisted && !offerSent && !isHired && (
                    <Button
                      size="sm"
                      disabled={loading !== null}
                      onClick={() => { setActiveTab("offer"); }}
                      className="w-full bg-success hover:bg-success text-white font-bold cursor-pointer"
                    >
                      <Gift className="h-3.5 w-3.5 mr-1" /> Compose & Send Offer Letter
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading !== null}
                    onClick={() => handleAction("reject")}
                    className="w-full text-danger border-danger-border hover:bg-danger-surface/30 font-bold cursor-pointer"
                  >
                    Reject Candidate
                  </Button>
                </div>
              </div>
            )}

            {isRejected && (
              <p className="text-xs text-danger font-bold italic py-2 text-center">This application has been rejected.</p>
            )}
            {isHired && (
              <p className="text-xs text-success font-bold italic py-2 text-center">This freelancer is hired and active on the workspace.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Interview Scheduling Modal */}
      {showMeetModal && (
        <Modal open onClose={() => setShowMeetModal(false)} size="lg">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-ink">
                {isEditingMeeting ? "Edit Scheduled Interview" : "Schedule Google Meet Interview"}
              </h3>
              <p className="text-xs text-muted">
                {isEditingMeeting
                  ? "Update the date, time or Meet link. The candidate will be notified immediately."
                  : "Candidate will receive an instant notification with the meeting details and join link."}
              </p>
            </div>
            <div className="space-y-3.5 text-xs text-body">
              <div className="space-y-1">
                <label className="block font-bold">Interview Date</label>
                <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className="w-full h-10 px-3 border border-hairline rounded-md bg-white" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold">Interview Time</label>
                <input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} className="w-full h-10 px-3 border border-hairline rounded-md bg-white" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold">Google Meet Link</label>
                <input type="text" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://meet.google.com/..." className="w-full h-10 px-3 border border-hairline rounded-md bg-white" />
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => { setShowMeetModal(false); setIsEditingMeeting(false); }}>Cancel</Button>
              <Button
                className="flex-1 cursor-pointer bg-link hover:bg-link text-white font-bold"
                onClick={handleScheduleInterviewSubmit}
                disabled={loading === "sched"}
              >
                {loading === "sched"
                  ? (isEditingMeeting ? "Updating..." : "Scheduling...")
                  : (isEditingMeeting ? "Save Changes & Notify" : "Confirm & Notify Candidate")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
