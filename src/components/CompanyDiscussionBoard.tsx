"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { replyToDiscussionQuestion } from "@/actions/workflowActions";

interface FAQItem {
  question: string;
  answer: string;
}

interface CompanyDiscussionBoardProps {
  projectId: string;
  faqList: FAQItem[];
}

export function CompanyDiscussionBoard({ projectId, faqList }: CompanyDiscussionBoardProps) {
  const router = useRouter();
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  // Filter for discussion forum questions
  const discussionQuestions = faqList
    .map((item, idx) => ({ ...item, originalIndex: idx }))
    .filter((item) => item.question.startsWith("[Discussion Question"));

  if (discussionQuestions.length === 0) {
    return null;
  }

  const handleReplySubmit = async (faqIndex: number) => {
    const text = replyText[faqIndex]?.trim();
    if (!text) return;

    setSubmitting((prev) => ({ ...prev, [faqIndex]: true }));
    try {
      const res = await replyToDiscussionQuestion(projectId, faqIndex, text);
      if (res.success) {
        setReplyText((prev) => ({ ...prev, [faqIndex]: "" }));
        setEditingIndex(null);
        router.refresh();
      } else {
        alert(res.error || "Failed to submit answer.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit answer.");
    } finally {
      setSubmitting((prev) => ({ ...prev, [faqIndex]: false }));
    }
  };

  return (
    <div className="mt-4 bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-3.5 text-xs text-left">
      <div className="flex items-center gap-1.5 text-[#002d59]">
        <MessageSquare className="h-4 w-4 text-sky-500" />
        <span className="text-[10px] font-black uppercase tracking-wider block">
          💬 Pre-Application Q&A Board ({discussionQuestions.length})
        </span>
      </div>

      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
        {discussionQuestions.map((q) => {
          const isEditing = editingIndex === q.originalIndex;
          const currentReplyVal = replyText[q.originalIndex] || "";
          
          return (
            <div key={q.originalIndex} className="p-3 bg-white border border-slate-200/50 rounded-xl space-y-2">
              <div className="font-semibold text-slate-800">
                {q.question}
              </div>

              {q.answer && !isEditing ? (
                <div className="pl-3.5 border-l-2 border-emerald-500 bg-emerald-50/30 p-2 rounded-r-lg space-y-1">
                  <p className="text-slate-600 italic">&quot;{q.answer}&quot;</p>
                  <button
                    onClick={() => {
                      setReplyText((prev) => ({ ...prev, [q.originalIndex]: q.answer }));
                      setEditingIndex(q.originalIndex);
                    }}
                    className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                  >
                    Edit Reply
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={currentReplyVal}
                    onChange={(e) => setReplyText((prev) => ({ ...prev, [q.originalIndex]: e.target.value }))}
                    placeholder="Type your response to this freelancer query..."
                    disabled={submitting[q.originalIndex]}
                    className="flex-1 h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] focus:ring-1 focus:ring-[#002d59] focus:outline-none"
                  />
                  <Button
                    size="sm"
                    disabled={!currentReplyVal.trim() || submitting[q.originalIndex]}
                    onClick={() => handleReplySubmit(q.originalIndex)}
                    className="h-8 px-3 cursor-pointer shrink-0"
                  >
                    {submitting[q.originalIndex] ? (
                      "Saving..."
                    ) : (
                      <span className="flex items-center gap-1">
                        Answer <Send className="h-3 w-3" />
                      </span>
                    )}
                  </Button>
                  {isEditing && (
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="text-[10px] text-slate-400 font-bold hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
