"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/actions/reviewActions";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Star } from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  applications: {
    freelancer: {
      id: string;
      user: {
        id: string;
        name: string | null;
      };
    };
  }[];
}

interface ReviewFormProps {
  projects: ProjectItem[];
  initialProjectId?: string;
}

export function ReviewForm({ projects, initialProjectId = "" }: ReviewFormProps) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const hiredFreelancer = selectedProject?.applications[0]?.freelancer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !hiredFreelancer || !comment) {
      setMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await submitReview(
        selectedProjectId,
        hiredFreelancer.user.id,
        rating,
        comment
      );

      if (res.success) {
        setMessage("Review submitted successfully! Contract closed.");
        setComment("");
        setSelectedProjectId("");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  const projectOptions = [
    { value: "", label: "-- Choose a project contract to review --" },
    ...projects.map((p) => ({
      value: p.id,
      label: `${p.title} (${p.applications[0]?.freelancer.user.name || "Unknown Freelancer"})`,
    })),
  ];

  return (
    <Card className="p-8 max-w-xl bg-white border border-slate-100 shadow-sm">
      {message && (
        <div
          className={`p-3.5 mb-6 rounded-xl text-xs font-semibold border ${
            message.includes("successfully")
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message}
        </div>
      )}

      {projects.length === 0 ? (
        <p className="text-slate-500 text-xs py-4">No active or completed contracts to review.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Select Project Contract"
            options={projectOptions}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={loading}
          />

          {hiredFreelancer && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="text-[10px] text-slate-500 block">Freelancer details</span>
              <strong className="text-[#002d59] font-semibold">{hiredFreelancer.user.name}</strong>
            </div>
          )}

          {/* Star Rating select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Rating Score (1-5)</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  disabled={loading}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating ? "text-amber-400 fill-amber-400/25" : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Written Feedback</label>
            <textarea
              className="w-full min-h-[100px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
              placeholder="Leave a review detailing freelancer communication, efficiency, and quality..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full mt-2 cursor-pointer" disabled={loading}>
            {loading ? "Submitting Review..." : "Submit Review & Complete Contract"}
          </Button>
        </form>
      )}
    </Card>
  );
}
