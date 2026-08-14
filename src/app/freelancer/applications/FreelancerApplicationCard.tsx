"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TeamMatchConfirmation } from "@/components/TeamMatchConfirmation";
import {
  parseApplicationMetadata,
  getApplicationCoverLetterText,
  PAYMENT_CATEGORIES,
  PaymentCategory,
  getPaymentUnitLabel,
  getPaymentCategoryLabel,
  CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrencySymbol,
  formatMoney,
  getBenefitLabel,
  isNonMonetary,
} from "@/lib/workflowHelpers";
import {
  signDigitalContract,
  respondToOfferLetterAction,
  negotiateOfferAction,
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
  const [offerLoading, setOfferLoading] = useState<"ACCEPT" | "DECLINE" | "NEGOTIATE" | null>(null);
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [showTeamMatch, setShowTeamMatch] = useState(false);
  const [negoAmount, setNegoAmount] = useState(0);
  const [negoCategory, setNegoCategory] = useState<PaymentCategory>("FIXED");
  const [negoCurrency, setNegoCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [negoMessage, setNegoMessage] = useState("");
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
  // While a counter-offer is outstanding the offer is parked in NEGOTIATING —
  // the card must stay visible or the freelancer loses sight of it entirely.
  const offerNegotiating = offerLetter?.status === "NEGOTIATING";
  const pendingNegotiation = offerLetter?.negotiation?.find((n) => n.status === "PENDING");
  const lastResolvedNegotiation = [...(offerLetter?.negotiation ?? [])]
    .reverse()
    .find((n) => n.status !== "PENDING");
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

  const handleNegotiate = async () => {
    if (negoCategory !== "NON_MONETARY" && negoAmount <= 0) {
      alert("Please enter a proposed amount greater than zero.");
      return;
    }
    setOfferLoading("NEGOTIATE");
    try {
      const res = await negotiateOfferAction(app.id, negoAmount, negoCategory, negoCurrency, negoMessage.trim() || undefined);
      if (res.success) {
        setIsNegotiating(false);
        setNegoMessage("");
        router.refresh();
      } else {
        alert(res.error || "Failed to send counter-offer.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to send counter-offer.");
    } finally {
      setOfferLoading(null);
    }
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
    <Card className="p-0 border border-[#E3E5EA] bg-white rounded-lg overflow-hidden">

      {/* ═══ OFFER LETTER BANNER ═══ */}
      {hasOffer && (offerPending || offerNegotiating) && (
        <div className="px-6 pt-5 pb-5 bg-[#152C55] text-white space-y-4 text-left">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/10 rounded-lg shrink-0">
              <Gift className="h-5 w-5 text-[#8F5E08]" />
            </div>
            <div className="flex-1 space-y-1 text-left">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#2159C9]">Official Hiring Offer Received</p>
              <h3 className="text-sm font-semibold">You&apos;ve been offered a position on this project!</h3>
              <p className="text-xs text-[#5B6272] leading-relaxed font-normal">{offerLetter!.offerText}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-white/10 rounded-lg p-4">
            <div>
              <p className="text-[11px] font-medium text-[#2159C9] uppercase tracking-wider">
                {offerLetter!.paymentCategory === "HOURLY"
                  ? "Hourly Rate"
                  : offerLetter!.paymentCategory === "MONTHLY"
                  ? "Monthly Rate"
                  : "Total Stipend"}
              </p>
              <p className="text-lg font-semibold text-[#8F5E08]">
                {formatMoney(offerLetter!.stipendAmount, offerLetter!.currency, offerLetter!.paymentCategory)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#2159C9] uppercase tracking-wider">Payment Category</p>
              <p className="text-xs font-semibold text-white">{getPaymentCategoryLabel(offerLetter!.paymentCategory)}</p>
              <p className="text-[11px] text-white/60 mt-0.5">{offerLetter!.currency || DEFAULT_CURRENCY}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#2159C9] uppercase tracking-wider">Payment Plan</p>
              <p className="text-xs font-semibold text-white">{offerLetter!.milestones?.length || 0} milestones</p>
            </div>
          </div>

          {(offerLetter!.nonMonetaryBenefits?.length ?? 0) > 0 && (
            <div className="bg-white/10 rounded-lg p-4 space-y-2">
              <p className="text-[11px] font-medium text-[#2159C9] uppercase tracking-wider">
                {isNonMonetary(offerLetter!.paymentCategory) ? "What You Receive" : "Additional Benefits"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {offerLetter!.nonMonetaryBenefits!.map((b) => (
                  <span key={b} className="text-[11px] font-semibold bg-white/10 border border-white/20 text-white px-2 py-0.5 rounded-full">
                    {getBenefitLabel(b)}
                  </span>
                ))}
              </div>
              {offerLetter!.nonMonetaryDetails && (
                <p className="text-[11px] text-white/70 italic">{offerLetter!.nonMonetaryDetails}</p>
              )}
            </div>
          )}

          {/* Awaiting the company's decision on a counter-offer */}
          {pendingNegotiation && (
            <div className="bg-white/10 border border-white/20 rounded-lg p-4 space-y-1.5">
              <p className="text-[11px] font-bold text-[#8F5E08] uppercase tracking-wider">
                Counter-offer sent — awaiting response
              </p>
              <p className="text-xs text-white font-semibold">
                You proposed {formatMoney(pendingNegotiation.proposedAmount, pendingNegotiation.proposedCurrency, pendingNegotiation.proposedCategory)}
                {" · "}{getPaymentCategoryLabel(pendingNegotiation.proposedCategory)}
              </p>
              <p className="text-[11px] text-white/70">
                You can accept or decline the original offer once the company responds.
              </p>
            </div>
          )}

          {/* Outcome of the previous round, once the company has replied */}
          {!pendingNegotiation && lastResolvedNegotiation && (
            <div className="bg-white/10 border border-white/20 rounded-lg p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                Your counter-offer was {lastResolvedNegotiation.status.toLowerCase()}
              </p>
              {lastResolvedNegotiation.status === "ACCEPTED" ? (
                <p className="text-xs text-white font-semibold">
                  The terms above reflect your proposal.
                </p>
              ) : (
                <p className="text-xs text-white font-semibold">
                  The original terms stand.
                  {lastResolvedNegotiation.responseNote ? ` "${lastResolvedNegotiation.responseNote}"` : ""}
                </p>
              )}
            </div>
          )}
          {offerLetter!.milestones?.length > 0 && (
            <div className="bg-white/10 rounded-lg p-3.5 space-y-1.5">
              <p className="text-[11px] font-bold text-[#2159C9] uppercase tracking-wider mb-2">Milestone Breakdown</p>
              {offerLetter!.milestones.map((m: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-white/10 last:border-0">
                  <span className="text-[#2159C9] font-medium">{m.title}</span>
                  <span className="font-bold text-[#8F5E08]">{formatMoney(m.budget, offerLetter!.currency)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            {isDeclining ? (
              <div className="w-full space-y-3 bg-white/10 p-4 rounded-lg border border-white/20 animate-fade-in text-left">
                <label className="text-[11px] font-bold text-[#2159C9] uppercase tracking-wider block">Reason for declining</label>
                <textarea
                  autoFocus
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please let the recruiter know why you are declining..."
                  className="w-full px-3 py-2.5 rounded-md border-none bg-white/10 text-white placeholder-[#2159C9]/50 text-xs focus:ring-1 focus:ring-[#96620A] focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <Button disabled={offerLoading !== null} onClick={() => handleOfferResponse("DECLINE")} className="flex-1 bg-[#C22B2B] hover:bg-[#FDEAEA] text-white font-bold cursor-pointer">
                    {offerLoading === "DECLINE" ? "Declining..." : "Confirm Decline"}
                  </Button>
                  <Button disabled={offerLoading !== null} onClick={() => { setIsDeclining(false); setDeclineReason(""); }} variant="outline" className="flex-1 border-white/30 text-white hover:bg-white/10 font-bold cursor-pointer">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : isNegotiating ? (
              <div className="w-full space-y-3 bg-white/10 p-4 rounded-lg border border-white/20 animate-fade-in text-left">
                <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block">
                  Propose new payment terms
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-white/60 uppercase tracking-wider">Category</span>
                    <select
                      value={negoCategory}
                      onChange={(e) => setNegoCategory(e.target.value as PaymentCategory)}
                      className="w-full px-3 py-2.5 rounded-md border-none bg-white/10 text-white text-xs focus:ring-1 focus:ring-[#F5B942] focus:outline-none cursor-pointer"
                    >
                      {PAYMENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value} className="text-ink">{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-white/60 uppercase tracking-wider">Currency</span>
                    <select
                      value={negoCurrency}
                      onChange={(e) => setNegoCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-md border-none bg-white/10 text-white text-xs focus:ring-1 focus:ring-[#F5B942] focus:outline-none cursor-pointer"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code} className="text-ink">
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-white/60 uppercase tracking-wider">
                      Amount ({getCurrencySymbol(negoCurrency)}){getPaymentUnitLabel(negoCategory)}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={negoAmount}
                      onChange={(e) => setNegoAmount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-md border-none bg-white/10 text-white text-xs focus:ring-1 focus:ring-[#F5B942] focus:outline-none"
                    />
                  </div>
                </div>
                {negoCurrency !== (offerLetter!.currency || DEFAULT_CURRENCY) && (
                  <p className="text-[11px] text-[#8F5E08]">
                    You are proposing a currency change from {offerLetter!.currency || DEFAULT_CURRENCY} to {negoCurrency}.
                    The amount is not converted — enter the value you want in {negoCurrency}.
                  </p>
                )}
                <textarea
                  rows={2}
                  value={negoMessage}
                  onChange={(e) => setNegoMessage(e.target.value)}
                  placeholder="Briefly explain your proposed terms (optional)..."
                  className="w-full px-3 py-2.5 rounded-md border-none bg-white/10 text-white placeholder-white/40 text-xs focus:ring-1 focus:ring-[#F5B942] focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    disabled={offerLoading !== null || (negoCategory !== "NON_MONETARY" && negoAmount <= 0)}
                    onClick={handleNegotiate}
                    className="flex-1 bg-[#FFF3DC] hover:bg-[#FFF3DC] text-ink font-semibold cursor-pointer"
                  >
                    {offerLoading === "NEGOTIATE" ? "Sending..." : "Send Counter-Offer"}
                  </Button>
                  <Button
                    disabled={offerLoading !== null}
                    onClick={() => setIsNegotiating(false)}
                    variant="outline"
                    className="flex-1 border-white/30 text-white hover:bg-white/10 font-bold cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  disabled={offerLoading !== null || !!pendingNegotiation}
                  title={pendingNegotiation ? "Waiting for the company to respond to your counter-offer" : undefined}
                  onClick={() => handleOfferResponse("ACCEPT")}
                  className="flex-1 bg-[#F1F2F4] hover:bg-[#E4F7EC] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {offerLoading === "ACCEPT" ? "Accepting..." : "Accept Offer & Start Project"}
                </Button>
                {!pendingNegotiation && (
                  <Button
                    disabled={offerLoading !== null}
                    onClick={() => {
                      setNegoAmount(offerLetter!.stipendAmount);
                      setNegoCategory((offerLetter!.paymentCategory as PaymentCategory) || "FIXED");
                      setNegoCurrency(offerLetter!.currency || DEFAULT_CURRENCY);
                      setIsNegotiating(true);
                    }}
                    variant="outline"
                    className="flex-1 border-white/30 text-white hover:bg-white/10 font-bold cursor-pointer"
                  >
                    Negotiate
                  </Button>
                )}
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
        <div className="px-6 py-3 bg-[#F8F9FB] border-b border-[#E3E5EA] flex items-center gap-3">
          <CheckCircle className="h-4 w-4 text-[#1A1D29] shrink-0" />
          <div className="text-left flex-1">
            <p className="text-xs font-bold text-[#1A1D29]">Offer Accepted — Project In Progress</p>
            <p className="text-[11px] text-[#1A1D29]">Stipend {formatMoney(offerLetter!.stipendAmount, offerLetter!.currency, offerLetter!.paymentCategory)} · Accepted {new Date(offerLetter!.respondedAt || offerLetter!.sentAt).toLocaleDateString()}</p>
          </div>
          {app.status === "HIRED" && (
            <Link href={`/workspace/${app.id}`} target="_blank">
              <Button size="xs" className="bg-[#152C55] hover:bg-[#1E3D71] text-white font-bold cursor-pointer">Open Workspace</Button>
            </Link>
          )}
        </div>
      )}

      {/* Team Match Confirmation — only for role-based projects where this
          freelancer is hired but has not yet seen and confirmed their team. */}
      {app.status === "HIRED" && app.roleId && !app.teamConfirmedAt && (
        <div className="px-6 py-3.5 bg-[#F8F9FB] border-b border-[#E3E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-left min-w-0">
            <p className="text-xs font-semibold text-[#1A1D29]">
              You&apos;ve been placed on this team
            </p>
            <p className="text-[11px] text-[#5B6272]">
              Review your teammates before confirming your place.
            </p>
          </div>
          <Button
            size="xs"
            onClick={() => setShowTeamMatch(true)}
            className="cursor-pointer shrink-0"
          >
            Meet Your Team
          </Button>
        </div>
      )}

      {showTeamMatch && (
        <TeamMatchConfirmation
          applicationId={app.id}
          projectId={app.projectId}
          projectTitle={app.project.title}
          companyName={app.project.company?.companyName || "the company"}
          currentFreelancerId={app.freelancerId}
          onClose={() => setShowTeamMatch(false)}
        />
      )}

      {/* Confirmed marker, so the state is visible after the fact too */}
      {app.status === "HIRED" && app.roleId && app.teamConfirmedAt && (
        <div className="px-6 py-2.5 bg-[#F8F9FB] border-b border-[#E3E5EA] flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5 text-[#1A1D29] shrink-0" />
          <p className="text-[11px] font-semibold text-[#1A1D29]">
            Team confirmed — you&apos;re on the roster.
          </p>
        </div>
      )}

      {/* Offer declined ribbon */}
      {hasOffer && offerDeclined && (
        <div className="px-6 py-3 bg-[#FDEAEA] border-b border-[#F5C2C2] flex items-center gap-2">
          <X className="h-4 w-4 text-[#BC2A2A] shrink-0" />
          <p className="text-xs font-bold text-[#BC2A2A]">You declined the hiring offer for this project.</p>
        </div>
      )}

      <div className="p-6 space-y-5 text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-[#E3E5EA]">
          <div className="space-y-1 text-left">
            <Link href={`/freelancer/applications/${app.id}`} className="hover:underline">
              <h3 className="text-sm font-semibold text-[#1A1D29]">{app.project.title}</h3>
            </Link>
            <p className="text-[11px] text-[#5B6272] font-normal">
              {app.project.company.companyName} • {app.project.company.location || "Remote"}
            </p>
          </div>
          <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
            <Badge variant="primary" className="text-[11px] px-2 py-0.5 capitalize">
              {activeStage}
            </Badge>
            <div className="flex flex-wrap items-center gap-2">
            <Link href={`/freelancer/applications/${app.id}`}>
              <Button size="sm" className="h-8 min-w-[170px] justify-center rounded-full bg-[#152C55] px-3 text-[11px] font-medium text-white hover:bg-[#1E3D71] cursor-pointer">
                Track Application Details →
              </Button>
            </Link>
            {app.status === "HIRED" && (
              <Link href={`/workspace/${app.id}`}>
                <Button size="sm" className="h-8 min-w-[170px] justify-center rounded-full bg-[#152C55] px-3 text-[11px] font-medium text-white hover:bg-[#1E3D71] cursor-pointer">
                  Open Workspace
                </Button>
              </Link>
            )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          label="Application sections"
          variant="pill"
          value={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          className="w-fit"
          items={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />,
            // Unread DM count rides the shared count chip.
            ...(tab.id === "chat" && dmMessages.length > 0 ? { count: dmMessages.length } : {}),
          }))}
        />

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Pipeline progress */}
            <div className="space-y-2">
              <span className="block text-[11px] font-bold text-[#5B6272] uppercase tracking-wider text-left">Recruitment Progress</span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {pipelineOrder.map((stage, idx) => {
                  const isPast = idx < currentPipelineIdx;
                  const isCurrent = idx === currentPipelineIdx;
                  return (
                    <div key={stage} className="flex flex-col items-center shrink-0 min-w-[80px]">
                      <div className={`h-2 w-full rounded-lg transition-all ${isPast ? "bg-[#F1F2F4]" : isCurrent ? "bg-[#152C55]" : "bg-[#E8F1FE]"}`} />
                      <span className={`text-[11px] font-bold mt-1 text-center leading-tight ${isCurrent ? "text-[#1A1D29]" : isPast ? "text-[#5B6272]" : "text-[#5B6272]"}`}>
                        {stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-left">
              <div className="flex items-center gap-2 text-[#5B6272] font-medium">
                <Calendar className="h-4 w-4 text-[#5B6272]" />
                <span>Applied: {new Date(app.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-[#5B6272] font-medium">
                <DollarSign className="h-4 w-4 text-[#5B6272]" />
                <span>Budget: ₹{app.project.budget}</span>
              </div>
              <div className="flex items-center gap-2 text-[#5B6272] font-medium">
                <BrainCircuit className="h-4 w-4 text-[#5B6272]" />
                <span>AI Match: {app.aiScore}%</span>
              </div>
            </div>

            {/* ═══ INTERVIEW SECTION ═══ */}
            {/* Conducted — no join button, show completed badge */}
            {interviewConducted && (
              <div className="p-4 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <CheckCircle className="h-5 w-5 text-[#1A1D29]" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-[#1A1D29]">Interview Completed</p>
                  <p className="text-[11px] text-[#1A1D29]">Your interview has been conducted. Awaiting recruiter evaluation and decision.</p>
                </div>
              </div>
            )}

            {/* Cancelled */}
            {interviewCancelled && !interviewConducted && (
              <div className="p-4 bg-[#FDEAEA] border border-[#F5C2C2] rounded-lg flex items-center gap-3">
                <div className="p-2 bg-[#FDEAEA] rounded-lg">
                  <X className="h-5 w-5 text-[#BC2A2A]" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-[#BC2A2A]">Interview Cancelled</p>
                  <p className="text-[11px] text-[#BC2A2A]">The recruiter cancelled the scheduled interview session. Please check your DM for further details.</p>
                </div>
              </div>
            )}

            {/* Scheduled — show Google Meet join (Option A) — hidden once conducted or cancelled */}
            {latestInterview && !interviewConducted && !interviewCancelled && (
              <div className="p-4 bg-[#E8F1FE] border border-[#C7CBD6] rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#2159C9] uppercase tracking-widest block flex items-center gap-1">
                    <Video className="h-3 w-3 inline" /> Interview Scheduled via Google Meet
                  </span>
                  <p className="text-xs font-bold text-[#1A1D29]">
                    {latestInterview.interviewDate
                      ? new Date(latestInterview.interviewDate).toLocaleString("en-IN", {
                          weekday: "long", day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "Date TBD"}
                  </p>
                  <p className="text-[11px] text-[#5B6272]">Click the button to join via Google Meet at the scheduled time.</p>
                </div>
                {latestInterview.meetingLink && (
                  <a
                    href={latestInterview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs bg-[#2E6BEA] hover:bg-[#2E6BEA] font-bold text-white rounded-full flex items-center gap-1.5 shadow-md shadow-[#2E6BEA] transition-all shrink-0"
                  >
                    <Video className="h-3.5 w-3.5" /> Join Google Meet <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Proposal */}
            <div className="bg-[#F8F9FB] p-4 rounded-lg border border-[#E3E5EA] text-xs text-left space-y-1.5">
              <span className="text-[11px] font-bold text-[#5B6272] uppercase tracking-wider block">Your Proposal Pitch</span>
              <p className="text-[#5B6272] italic">&quot;{coverLetterText}&quot;</p>
            </div>

            {/* Contract sign prompt */}
            {activeStage === "Contract Sent" && !isSigned && appMeta.digitalContract && (
              <div className="p-5 bg-[#E8F1FE] border border-[#C7CBD6] rounded-lg text-left space-y-3.5">
                <h4 className="text-xs font-bold text-[#1A1D29] flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#2159C9]" /> Action Required: Sign Workspace Contract
                </h4>
                <p className="text-[11px] text-[#5B6272]">{appMeta.digitalContract.contractText}</p>
                <div className="border border-[#C7CBD6]/80 rounded-lg divide-y divide-[#E3E5EA] bg-white text-xs">
                  {appMeta.digitalContract.milestones?.map((m: any, idx: number) => (
                    <div key={idx} className="p-3 flex justify-between">
                      <span className="font-bold text-[#1A1D29]">{m.title}</span>
                      <span className="text-[#5B6272]">{formatMoney(m.budget, offerLetter?.currency)}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handleSignContract} disabled={signing} className="cursor-pointer bg-[#152C55] text-white hover:bg-[#EAF1FE] w-full">
                  {signing ? "Signing..." : "Sign Digital Contract"}
                </Button>
              </div>
            )}

            {/* Signed contract tracker */}
            {isSigned && appMeta.digitalContract && (
              <div className="p-5 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg text-left space-y-3">
                <h4 className="text-xs font-bold text-[#1A1D29] flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-[#1A1D29]" /> Signed Contract Active
                </h4>
                <div className="border border-[#E3E5EA]/80 rounded-lg divide-y divide-[#E3E5EA] bg-white text-xs">
                  {appMeta.digitalContract.milestones?.map((m: any, idx: number) => (
                    <div key={idx} className="p-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-[#1A1D29]">{m.title}</span>
                        <span className="text-[#5B6272] ml-1.5">{formatMoney(m.budget, offerLetter?.currency)}</span>
                      </div>
                      {m.status === "RELEASED" ? (
                        <Badge variant="success" className="text-[11px]">Released</Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[11px]">{m.status.toLowerCase()}</Badge>
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
          <div className="border border-[#E3E5EA] rounded-lg overflow-hidden flex flex-col" style={{ minHeight: "340px" }}>
            {/* Chat header */}
            <div className="p-3.5 border-b border-[#E3E5EA] flex items-center gap-3 bg-[#F8F9FB]">
              <div className="h-8 w-8 rounded-lg bg-[#152C55]/10 flex items-center justify-center text-[#1A1D29] font-bold text-sm">
                R
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1D29]">{app.project.company.companyName} Recruiter</p>
                <p className="text-[11px] text-[#5B6272] font-medium">Direct Message · Pre-hire private channel</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[260px]">
              {dmMessages.length === 0 ? (
                <p className="text-xs text-[#5B6272] italic text-center py-8">No messages yet. You can reach out to the recruiter directly here.</p>
              ) : (
                dmMessages.map((msg: any) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe && (
                        <div className="h-6 w-6 rounded-full bg-[#152C55] flex items-center justify-center text-[11px] font-bold text-white shrink-0">R</div>
                      )}
                      <div className={`max-w-[75%] rounded-lg px-3.5 py-2 text-xs ${isMe ? "bg-[#2E6BEA] text-white rounded-tr-none" : "bg-[#E8F1FE] text-[#1A1D29] rounded-tl-none"}`}>
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={`text-[11px] mt-0.5 flex items-center gap-1.5 ${isMe ? "justify-end text-[#2159C9]" : "text-[#5B6272]"}`}>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {isMe && (
                            <>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={() => { setEditingMessageId(msg.id); setDmInput(msg.content); }}
                                className="text-[#2159C9] hover:text-white underline font-bold transition-colors cursor-pointer border-none bg-transparent p-0"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDM(msg.id)}
                                className="text-[#BC2A2A] hover:text-[#BC2A2A] underline font-bold transition-colors cursor-pointer border-none bg-transparent p-0"
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
                                  <svg className="h-3 w-3 text-[#2159C9] opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
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
                        <div className="h-6 w-6 rounded-full bg-[#2E6BEA] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
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
            <div className="p-3 border-t border-[#E3E5EA] flex gap-2 items-center">
              {editingMessageId && (
                <button onClick={() => { setEditingMessageId(null); setDmInput(""); }} className="text-[11px] text-[#5B6272] hover:text-[#5B6272] font-medium whitespace-nowrap cursor-pointer">
                  Cancel Edit
                </button>
              )}
              <input
                type="text"
                value={dmInput}
                onChange={(e) => setDmInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendDM(); } }}
                placeholder={editingMessageId ? "Edit message..." : "Type a message to the recruiter..."}
                className="flex-1 h-9 px-3 rounded-md border border-[#C7CBD6] bg-[#F8F9FB] text-xs focus:ring-1 focus:ring-[#2E6BEA] focus:outline-none"
              />
              <Button
                size="sm"
                disabled={dmLoading || !dmInput.trim()}
                onClick={handleSendDM}
                className="bg-[#2E6BEA] hover:bg-[#2E6BEA] text-white font-bold cursor-pointer px-3"
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
