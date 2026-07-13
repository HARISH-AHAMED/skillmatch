"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { parseApplicationMetadata, getApplicationCoverLetterText } from "@/lib/workflowHelpers";
import {
  signDigitalContract,
  respondToOfferLetterAction,
  sendDMMessageAction,
  getDMMessagesAction,
  editDMMessageAction,
  deleteDMMessageAction,
  markDMMessagesAsSeenAction,
} from "@/actions/workflowActions";
import {
  Calendar,
  DollarSign,
  BrainCircuit,
  CheckCircle,
  Video,
  ExternalLink,
  FileText,
  MessageSquare,
  Send,
  Gift,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

interface FreelancerApplicationCardProps {
  app: any;
  currentUserId: string;
}

export function FreelancerApplicationCard({ app, currentUserId }: FreelancerApplicationCardProps) {
  const router = useRouter();
  const [signing, setSigning] = useState(false);
  const [offerLoading, setOfferLoading] = useState<"ACCEPT" | "DECLINE" | null>(null);
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "chat">("overview");
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [dmLoading, setDmLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const appMeta = parseApplicationMetadata(app.coverLetter);
  const coverLetterText = getApplicationCoverLetterText(app.coverLetter);

  // Detect interview states from pipeline history
  const latestInterview = [...(appMeta.pipelineHistory || [])]
    .reverse()
    .find((h: any) => h.meetingLink);

  const interviewConducted = appMeta.pipelineHistory?.some(
    (h: any) => h.stage === "Interview Conducted"
  );
  const interviewCancelled = appMeta.pipelineHistory?.some(
    (h: any) => h.stage === "Interview Cancelled"
  );

  const activeStage =
    appMeta.pipelineHistory && appMeta.pipelineHistory.length > 0
      ? appMeta.pipelineHistory[appMeta.pipelineHistory.length - 1].stage
      : "Applied";

  const isSigned = appMeta.digitalContract?.freelancerSigned;
  const isShortlisted = app.status === "SHORTLISTED" || app.status === "HIRED";

  // Offer letter states
  const offerLetter = appMeta.offerLetter;
  const hasOffer = !!offerLetter;
  const offerPending = offerLetter?.status === "PENDING";
  const offerAccepted = offerLetter?.status === "ACCEPTED";
  const offerDeclined = offerLetter?.status === "DECLINED";

  // Company recruiter user id (for DM)
  const companyUserId = app.project?.company?.userId;

  const loadDmMessages = async () => {
    if (!companyUserId) return;
    try {
      const msgs = await getDMMessagesAction(app.projectId, companyUserId);
      setDmMessages(msgs);
      const unread = msgs.some((m: any) => m.senderId === companyUserId && !m.seen);
      if (unread) {
        await markDMMessagesAsSeenAction(app.projectId, companyUserId);
        const updatedMsgs = await getDMMessagesAction(app.projectId, companyUserId);
        setDmMessages(updatedMsgs);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === "chat") loadDmMessages();
  }, [activeTab]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  const handleSignContract = async () => {
    setSigning(true);
    try {
      const res = await signDigitalContract(app.id, "FREELANCER");
      if (res.success) { alert("Contract signed! The project workspace is now active."); router.refresh(); }
      else alert(res.error || "Failed to sign contract.");
    } catch (err: any) {
      alert(err.message || "Failed to sign contract.");
    } finally { setSigning(false); }
  };

  const handleOfferResponse = async (decision: "ACCEPT" | "DECLINE") => {
    let reason = "";
    if (decision === "DECLINE") {
      reason = declineReason.trim();
      if (!reason) {
        if (!confirm("Are you sure you want to decline without providing a reason?")) return;
      }
    } else {
      if (!confirm("Accept this offer? This will start the project and activate the workspace.")) return;
    }

    setOfferLoading(decision);
    try {
      const res = await respondToOfferLetterAction(app.id, decision, reason);
      if (res.success) router.refresh();
      else alert(res.error || "Action failed.");
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally { 
      setOfferLoading(null); 
      setIsDeclining(false);
      setDeclineReason("");
    }
  };

  const handleSendDM = async () => {
    if (editingMessageId) return handleEditDM();
    if (!dmInput.trim() || !companyUserId) return;
    setDmLoading(true);
    try {
      await sendDMMessageAction(app.projectId, companyUserId, dmInput.trim());
      setDmInput("");
      await loadDmMessages();
    } catch {} finally { setDmLoading(false); }
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

  // Pipeline progress order
  const pipelineOrder = ["Applied", "Shortlisted", "Interview Scheduled", "Interview Conducted", "Offer Sent", "Offer Accepted"];
  const currentPipelineIdx = (() => {
    if (offerAccepted || app.status === "HIRED") return 5;
    if (offerPending || activeStage === "Offer Sent") return 4;
    if (interviewConducted) return 3;
    if (latestInterview && !interviewCancelled) return 2;
    if (app.status === "SHORTLISTED" || activeStage === "Shortlisted") return 1;
    return 0;
  })();

  const tabs = [
    { id: "overview", label: "Overview", icon: FileText },
    ...(isShortlisted ? [{ id: "chat", label: "DM Chat", icon: MessageSquare }] : []),
  ];

  return (
    <Card className="p-0 border border-slate-100 bg-white shadow-sm overflow-hidden">

      {/* ═══ OFFER LETTER BANNER ═══ */}
      {hasOffer && offerPending && (
        <div className="px-6 pt-5 pb-5 bg-gradient-to-r from-[#002d59] to-[#0055a5] text-white space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl shrink-0">
              <Gift className="h-5 w-5 text-yellow-300" />
            </div>
            <div className="flex-1 space-y-1 text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Official Hiring Offer Received</p>
              <h3 className="text-sm font-black">You&apos;ve been offered a position on this project!</h3>
              <p className="text-xs text-blue-100 leading-relaxed">{offerLetter!.offerText}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-white/10 rounded-2xl p-4">
            <div>
              <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Total Stipend</p>
              <p className="text-lg font-black text-yellow-300">₹{offerLetter!.stipendAmount}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Payment Plan</p>
              <p className="text-xs font-bold text-white">{offerLetter!.milestones?.length || 0} milestones</p>
            </div>
          </div>
          {offerLetter!.milestones?.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-3.5 space-y-1.5">
              <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider mb-2">Milestone Breakdown</p>
              {offerLetter!.milestones.map((m: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-white/10 last:border-0">
                  <span className="text-blue-100 font-medium">{m.title}</span>
                  <span className="font-black text-yellow-300">₹{m.budget}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            {isDeclining ? (
              <div className="w-full space-y-3 bg-white/10 p-4 rounded-xl border border-white/20 animate-fade-in text-left">
                <label className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">Reason for declining</label>
                <textarea
                  autoFocus
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please let the recruiter know why you are declining..."
                  className="w-full px-3 py-2.5 rounded-xl border-none bg-white/10 text-white placeholder-blue-200/50 text-xs focus:ring-1 focus:ring-yellow-300 focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <Button disabled={offerLoading !== null} onClick={() => handleOfferResponse("DECLINE")} className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-black cursor-pointer">
                    {offerLoading === "DECLINE" ? "Declining..." : "Confirm Decline"}
                  </Button>
                  <Button disabled={offerLoading !== null} onClick={() => { setIsDeclining(false); setDeclineReason(""); }} variant="outline" className="flex-1 border-white/30 text-white hover:bg-white/10 font-bold cursor-pointer">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button disabled={offerLoading !== null} onClick={() => handleOfferResponse("ACCEPT")} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black cursor-pointer">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {offerLoading === "ACCEPT" ? "Accepting..." : "Accept Offer & Start Project"}
                </Button>
                <Button disabled={offerLoading !== null} onClick={() => setIsDeclining(true)} variant="outline" className="flex-1 border-white/30 text-white hover:bg-white/10 font-bold cursor-pointer">
                  <X className="h-4 w-4 mr-2" />
                  Decline Offer
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Offer accepted ribbon */}
      {hasOffer && offerAccepted && (
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 flex items-center gap-3">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <div className="text-left flex-1">
            <p className="text-xs font-black text-emerald-800">Offer Accepted — Project In Progress</p>
            <p className="text-[10px] text-emerald-600">Stipend ₹{offerLetter!.stipendAmount} · Accepted {new Date(offerLetter!.respondedAt || offerLetter!.sentAt).toLocaleDateString()}</p>
          </div>
          {app.status === "HIRED" && (
            <Link href={`/workspace/${app.id}`} target="_blank">
              <Button size="xs" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">Open Workspace</Button>
            </Link>
          )}
        </div>
      )}

      {/* Offer declined ribbon */}
      {hasOffer && offerDeclined && (
        <div className="px-6 py-3 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
          <X className="h-4 w-4 text-rose-500 shrink-0" />
          <p className="text-xs font-bold text-rose-700">You declined the hiring offer for this project.</p>
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
          <div className="space-y-1 text-left">
            <h3 className="text-sm font-bold text-[#002d59]">{app.project.title}</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {app.project.company.companyName} • {app.project.company.location || "Remote"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" className="bg-sky-50 text-[#002d59] border border-sky-100 text-[10px] px-2 py-0.5 capitalize">
              {activeStage}
            </Badge>
            {app.status === "HIRED" && (
              <Link href={`/workspace/${app.id}`} target="_blank">
                <Button size="xs" className="cursor-pointer bg-[#3ac0ff] hover:bg-[#29aaeb] text-white font-bold text-[10px] py-1 px-3 h-auto">Open Workspace</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id ? "bg-white text-[#002d59] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.id === "chat" && dmMessages.length > 0 && (
                  <span className="ml-0.5 h-4 w-4 rounded-full bg-sky-500 text-white text-[9px] font-black flex items-center justify-center">
                    {dmMessages.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Pipeline progress */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">Recruitment Progress</span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {pipelineOrder.map((stage, idx) => {
                  const isPast = idx < currentPipelineIdx;
                  const isCurrent = idx === currentPipelineIdx;
                  return (
                    <div key={stage} className="flex flex-col items-center shrink-0 min-w-[80px]">
                      <div className={`h-2 w-full rounded-full transition-all ${isPast ? "bg-[#3ac0ff]" : isCurrent ? "bg-[#002d59]" : "bg-slate-100"}`} />
                      <span className={`text-[8px] font-bold mt-1 text-center leading-tight ${isCurrent ? "text-[#002d59]" : isPast ? "text-sky-500" : "text-slate-400"}`}>
                        {stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-left">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Applied: {new Date(app.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <span>Budget: ₹{app.project.budget}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <BrainCircuit className="h-4 w-4 text-slate-400" />
                <span>AI Match: {app.aiScore}%</span>
              </div>
            </div>

            {/* ═══ INTERVIEW SECTION ═══ */}
            {/* Conducted — no join button, show completed badge */}
            {interviewConducted && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-emerald-800">Interview Completed</p>
                  <p className="text-[10px] text-emerald-600">Your interview has been conducted. Awaiting recruiter evaluation and decision.</p>
                </div>
              </div>
            )}

            {/* Cancelled */}
            {interviewCancelled && !interviewConducted && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <X className="h-5 w-5 text-rose-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-rose-800">Interview Cancelled</p>
                  <p className="text-[10px] text-rose-600">The recruiter cancelled the scheduled interview session. Please check your DM for further details.</p>
                </div>
              </div>
            )}

            {/* Scheduled — show Google Meet join (Option A) — hidden once conducted or cancelled */}
            {latestInterview && !interviewConducted && !interviewCancelled && (
              <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-sky-700 uppercase tracking-widest block flex items-center gap-1">
                    <Video className="h-3 w-3 inline" /> Interview Scheduled via Google Meet
                  </span>
                  <p className="text-xs font-bold text-[#002d59]">
                    {latestInterview.interviewDate
                      ? new Date(latestInterview.interviewDate).toLocaleString("en-IN", {
                          weekday: "long", day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "Date TBD"}
                  </p>
                  <p className="text-[10px] text-slate-500">Click the button to join via Google Meet at the scheduled time.</p>
                </div>
                {latestInterview.meetingLink && (
                  <a
                    href={latestInterview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs bg-sky-600 hover:bg-sky-500 font-black text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-sky-200 transition-all shrink-0"
                  >
                    <Video className="h-3.5 w-3.5" /> Join Google Meet <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Proposal */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-left space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Your Proposal Pitch</span>
              <p className="text-slate-700 italic">&quot;{coverLetterText}&quot;</p>
            </div>

            {/* Contract sign prompt */}
            {activeStage === "Contract Sent" && !isSigned && appMeta.digitalContract && (
              <div className="p-5 bg-sky-50 border border-sky-200 rounded-2xl text-left space-y-3.5">
                <h4 className="text-xs font-bold text-[#002d59] flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#3ac0ff]" /> Action Required: Sign Workspace Contract
                </h4>
                <p className="text-[10px] text-slate-500">{appMeta.digitalContract.contractText}</p>
                <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-white text-xs">
                  {appMeta.digitalContract.milestones?.map((m: any, idx: number) => (
                    <div key={idx} className="p-3 flex justify-between">
                      <span className="font-bold text-[#002d59]">{m.title}</span>
                      <span className="text-slate-500">₹{m.budget}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handleSignContract} disabled={signing} className="cursor-pointer bg-[#002d59] text-white hover:bg-[#083a6b] w-full">
                  {signing ? "Signing..." : "Sign Digital Contract"}
                </Button>
              </div>
            )}

            {/* Signed contract tracker */}
            {isSigned && appMeta.digitalContract && (
              <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-left space-y-3">
                <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" /> Signed Contract Active
                </h4>
                <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-100 bg-white text-xs">
                  {appMeta.digitalContract.milestones?.map((m: any, idx: number) => (
                    <div key={idx} className="p-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-[#002d59]">{m.title}</span>
                        <span className="text-slate-400 ml-1.5">₹{m.budget}</span>
                      </div>
                      {m.status === "RELEASED" ? (
                        <Badge variant="success" className="text-[9px]">Released</Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[9px]">{m.status.toLowerCase()}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ DM CHAT TAB ═══ */}
        {activeTab === "chat" && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "340px" }}>
            {/* Chat header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
              <div className="h-8 w-8 rounded-xl bg-[#002d59]/10 flex items-center justify-center text-[#002d59] font-black text-sm">
                R
              </div>
              <div>
                <p className="text-xs font-black text-[#002d59]">{app.project.company.companyName} Recruiter</p>
                <p className="text-[10px] text-slate-400 font-medium">Direct Message · Pre-hire private channel</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[260px]">
              {dmMessages.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">No messages yet. You can reach out to the recruiter directly here.</p>
              ) : (
                dmMessages.map((msg: any) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe && (
                        <div className="h-6 w-6 rounded-full bg-[#002d59] flex items-center justify-center text-[10px] font-black text-white shrink-0">R</div>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs ${isMe ? "bg-sky-600 text-white rounded-tr-none" : "bg-slate-100 text-slate-800 rounded-tl-none"}`}>
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={`text-[9px] mt-0.5 flex items-center gap-1.5 ${isMe ? "justify-end text-sky-200" : "text-slate-400"}`}>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {isMe && (
                            <>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={() => { setEditingMessageId(msg.id); setDmInput(msg.content); }}
                                className="text-sky-300 hover:text-white underline font-bold transition-colors cursor-pointer border-none bg-transparent p-0"
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
                                  <div className="flex animate-fade-in" title="Seen by recruiter">
                                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <svg className="h-3 w-3 text-white -ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                ) : (
                                  <svg className="h-3 w-3 text-sky-300 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
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
                        <div className="h-6 w-6 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                          {currentUserId[0]?.toUpperCase()}
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
                placeholder={editingMessageId ? "Edit message..." : "Type a message to the recruiter..."}
                className="flex-1 h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:ring-1 focus:ring-sky-600 focus:outline-none"
              />
              <Button
                size="sm"
                disabled={dmLoading || !dmInput.trim()}
                onClick={handleSendDM}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer px-3"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
