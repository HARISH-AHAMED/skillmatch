"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2, X, Building2, User, Send, Award, MessageSquare, CreditCard, FileText } from "lucide-react";
import { submitReview, submitCompanyReview } from "@/actions/reviewActions";
import { Button } from "@/components/ui/Button";

interface FreelancerItem {
  userId: string;
  name: string | null;
  image: string | null;
  freelancerId: string;
}

interface ProjectCompletionModalProps {
  projectId: string;
  projectTitle: string;
  role: "COMPANY" | "FREELANCER";
  // Company reviewing freelancers
  hiredFreelancers?: FreelancerItem[];
  alreadyReviewedIds?: string[]; // freelancer userIds company already reviewed
  // Freelancer reviewing company
  companyId?: string;
  companyName?: string;
  alreadyReviewedCompany?: boolean;
  onClose: () => void;
  onDone: () => void;
}

function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 cursor-pointer disabled:cursor-default transition-transform hover:scale-110"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              star <= (hover || value)
                ? "text-amber-400 fill-amber-400"
                : "text-slate-300"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-bold text-slate-600 self-center">{value}/5</span>
    </div>
  );
}

function SubScoreRow({ label, icon: Icon, value, onChange }: { label: string; icon: any; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-40 shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)} className="cursor-pointer">
            <Star className={`h-4 w-4 transition-colors ${s <= value ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
          </button>
        ))}
      </div>
      <span className="text-xs font-bold text-slate-500 ml-1">{value}/5</span>
    </div>
  );
}

// ─── Company Reviews Freelancers ─────────────────────────────────────────────
function CompanyReviewPanel({
  projectId,
  hiredFreelancers,
  alreadyReviewedIds,
  onDone,
}: {
  projectId: string;
  hiredFreelancers: FreelancerItem[];
  alreadyReviewedIds: string[];
  onDone: () => void;
}) {
  const pending = hiredFreelancers.filter((f) => !alreadyReviewedIds.includes(f.userId));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [error, setError] = useState("");

  const allPending = [...pending].filter((f) => !reviewed.includes(f.userId));
  const current = allPending[0];
  const doneCount = alreadyReviewedIds.length + reviewed.length;
  const total = hiredFreelancers.length;

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-black text-[#002d59]">All Freelancers Reviewed!</h3>
        <p className="text-sm text-slate-500">Your reviews have been submitted and the freelancers have been notified.</p>
        <Button onClick={onDone} className="mt-2">Close</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) { setError("Please write a comment."); return; }
    setSubmitting(true);
    setError("");
    try {
      await submitReview(projectId, current.userId, rating, comment);
      setReviewed((prev) => [...prev, current.userId]);
      setRating(5);
      setComment("");
    } catch (err: any) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-semibold text-slate-500">
          <span>Reviewing freelancers</span>
          <span>{doneCount}/{total} done</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#3ac0ff] to-[#002d59] rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Freelancer card */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
        {current.image ? (
          <img src={current.image} alt={current.name ?? ""} className="h-12 w-12 rounded-xl object-cover border border-slate-200" />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-[#002d59] flex items-center justify-center text-white font-black text-lg">
            {(current.name ?? "F")[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-black text-[#002d59]">{current.name}</p>
          <p className="text-xs text-slate-400">Hired Freelancer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Overall Rating</label>
          <StarRating value={rating} onChange={setRating} disabled={submitting} />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Written Feedback</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={submitting}
            placeholder="Describe the freelancer's communication, work quality, and overall performance..."
            className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002d59]/20 focus:border-[#002d59] text-slate-800 resize-none"
          />
        </div>

        {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting..." : `Submit Review for ${current.name}`}
        </Button>
      </form>
    </div>
  );
}

// ─── Freelancer Reviews Company ──────────────────────────────────────────────
function FreelancerReviewPanel({
  projectId,
  companyId,
  companyName,
  onDone,
}: {
  projectId: string;
  companyId: string;
  companyName: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [commScore, setCommScore] = useState(5);
  const [payScore, setPayScore] = useState(5);
  const [clarityScore, setClarityScore] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) { setError("Please write a comment."); return; }
    setSubmitting(true);
    setError("");
    try {
      await submitCompanyReview(projectId, companyId, rating, comment, commScore, payScore, clarityScore);
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-black text-[#002d59]">Review Submitted!</h3>
        <p className="text-sm text-slate-500">Your feedback helps improve the platform for all freelancers.</p>
        <Button onClick={onDone} className="mt-2">Close</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Company card */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
        <div className="h-12 w-12 rounded-xl bg-[#002d59] flex items-center justify-center">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="font-black text-[#002d59]">{companyName}</p>
          <p className="text-xs text-slate-400">Company — Client</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Overall Rating</label>
        <StarRating value={rating} onChange={setRating} disabled={submitting} />
      </div>

      {/* Sub-scores */}
      <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detailed Scores</p>
        <SubScoreRow label="Communication" icon={MessageSquare} value={commScore} onChange={setCommScore} />
        <SubScoreRow label="Payment Reliability" icon={CreditCard} value={payScore} onChange={setPayScore} />
        <SubScoreRow label="Project Clarity" icon={FileText} value={clarityScore} onChange={setClarityScore} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Written Feedback</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          disabled={submitting}
          placeholder="Describe the company's communication, payment process, and how clearly the project was defined..."
          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002d59]/20 focus:border-[#002d59] text-slate-800 resize-none"
        />
      </div>

      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit Company Review"}
      </Button>
    </form>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export function ProjectCompletionModal({
  projectId,
  projectTitle,
  role,
  hiredFreelancers = [],
  alreadyReviewedIds = [],
  companyId,
  companyName,
  alreadyReviewedCompany = false,
  onClose,
  onDone,
}: ProjectCompletionModalProps) {
  if (alreadyReviewedCompany && role === "FREELANCER") {
    return null; // already done
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-[#002d59] to-[#0a4885] p-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
                <Award className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider">Project Complete</p>
                <h2 className="text-base font-black leading-tight">{projectTitle}</h2>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/70">
              {role === "COMPANY"
                ? "Leave a review for each freelancer who worked on this project."
                : "Share your experience working with this company."}
            </p>
          </div>

          {/* Body */}
          <div className="p-6">
            {role === "COMPANY" ? (
              <CompanyReviewPanel
                projectId={projectId}
                hiredFreelancers={hiredFreelancers}
                alreadyReviewedIds={alreadyReviewedIds}
                onDone={onDone}
              />
            ) : (
              <FreelancerReviewPanel
                projectId={projectId}
                companyId={companyId!}
                companyName={companyName!}
                onDone={onDone}
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
