"use client";

import React, { useState } from "react";
import { Star, CheckCircle2, Building2, User, Send, Award, MessageSquare, CreditCard, FileText } from "lucide-react";
import { submitReview, submitCompanyReview } from "@/actions/reviewActions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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
          className="p-0.5 cursor-pointer disabled:cursor-default transition-transform"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= (hover || value)
                ? "text-[#8F5E08] fill-[#F5B942]"
                : "text-[#2159C9]"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-[#5B6272] self-center">{value}/5</span>
    </div>
  );
}

function SubScoreRow({ label, icon: Icon, value, onChange }: { label: string; icon: any; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-40 shrink-0">
        <Icon className="h-3.5 w-3.5 text-[#5B6272]" />
        <span className="text-xs font-medium text-[#5B6272]">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)} className="cursor-pointer">
            <Star className={`h-4 w-4 transition-colors ${s <= value ? "text-[#8F5E08] fill-[#F5B942]" : "text-[#5B6272]"}`} />
          </button>
        ))}
      </div>
      <span className="text-xs font-medium text-[#5B6272] ml-1">{value}/5</span>
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
        <div className="h-14 w-14 rounded-full bg-[#E8F1FE] border border-[#E3E5EA]/40 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-[#1A1D29]" />
        </div>
        <h3 className="text-lg font-normal text-[#1A1D29]">All Freelancers Reviewed!</h3>
        <p className="text-sm text-[#5B6272]">Your reviews have been submitted and the freelancers have been notified.</p>
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
        <div className="flex justify-between text-xs font-medium text-[#5B6272]">
          <span>Reviewing freelancers</span>
          <span>{doneCount}/{total} done</span>
        </div>
        <div className="w-full h-1.5 bg-[#F8F9FB] border border-[#C7CBD6] rounded-lg overflow-hidden">
          <div
            className="h-full bg-[#152C55] rounded-lg transition-all duration-300"
            style={{ width: `${(doneCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Freelancer card */}
      <div className="flex items-center gap-3 p-4 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg">
        {current.image ? (
          <img src={current.image} alt={current.name ?? ""} className="h-10 w-10 rounded-full object-cover border border-[#E3E5EA]" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[#152C55] flex items-center justify-center text-white font-medium text-base">
            {(current.name ?? "F")[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-[#1A1D29] text-sm">{current.name}</p>
          <p className="text-xs text-[#5B6272]">Hired Freelancer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#5B6272] uppercase tracking-wider">Overall Rating</label>
          <StarRating value={rating} onChange={setRating} disabled={submitting} />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-[#5B6272] uppercase tracking-wider">Written Feedback</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={submitting}
            placeholder="Describe the freelancer's communication, work quality, and overall performance..."
            className="w-full p-3 text-sm bg-white border border-[#E3E5EA] rounded-md focus:outline-none focus:border-[#E3E5EA] text-[#1A1D29] resize-none"
          />
        </div>

        {error && <p className="text-xs text-[#BC2A2A] font-medium">{error}</p>}

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
        <div className="h-14 w-14 rounded-full bg-[#F0F3F9] border border-[#C7CBD6]/40 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-[#1A1D29]" />
        </div>
        <h3 className="text-lg font-normal text-[#1A1D29]">Review Submitted!</h3>
        <p className="text-sm text-[#5B6272]">Your feedback helps improve the platform for all freelancers.</p>
        <Button onClick={onDone} className="mt-2">Close</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Company card */}
      <div className="flex items-center gap-3 p-4 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg">
        <div className="h-10 w-10 rounded-full bg-[#152C55] flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-[#1A1D29] text-sm">{companyName}</p>
          <p className="text-xs text-[#5B6272]">Company — Client</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#5B6272] uppercase tracking-wider">Overall Rating</label>
        <StarRating value={rating} onChange={setRating} disabled={submitting} />
      </div>

      {/* Sub-scores */}
      <div className="space-y-3 p-4 bg-[#F8F9FB] border border-[#E3E5EA] rounded-lg">
        <p className="text-xs font-medium text-[#5B6272] uppercase tracking-wider">Detailed Scores</p>
        <SubScoreRow label="Communication" icon={MessageSquare} value={commScore} onChange={setCommScore} />
        <SubScoreRow label="Payment Reliability" icon={CreditCard} value={payScore} onChange={setPayScore} />
        <SubScoreRow label="Project Clarity" icon={FileText} value={clarityScore} onChange={setClarityScore} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#5B6272] uppercase tracking-wider">Written Feedback</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          disabled={submitting}
          placeholder="Describe the company's communication, payment process, and how clearly the project was defined..."
          className="w-full p-3 text-sm bg-white border border-[#E3E5EA] rounded-md focus:outline-none focus:border-[#C7CBD6] text-[#1A1D29] resize-none"
        />
      </div>

      {error && <p className="text-xs text-[#BC2A2A] font-medium">{error}</p>}

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
    return null;
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF1FE]">
            <Award className="h-5 w-5 text-[#2159C9]" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#8A90A0]">
              Project Complete
            </span>
            <span className="block truncate">{projectTitle}</span>
          </span>
        </span>
      }
      description={
        role === "COMPANY"
          ? "Leave a review for each freelancer who worked on this project."
          : "Share your experience working with this company."
      }
    >
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
    </Modal>
  );
}

