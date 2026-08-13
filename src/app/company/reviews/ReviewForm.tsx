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
  const [selectedFreelancerUserId, setSelectedFreelancerUserId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const hiredFreelancers = selectedProject?.applications.map((app) => app.freelancer) || [];

  // Reset selected freelancer when project changes
  React.useEffect(() => {
    if (hiredFreelancers.length > 0) {
      setSelectedFreelancerUserId(hiredFreelancers[0].user.id);
    } else {
      setSelectedFreelancerUserId("");
    }
  }, [selectedProjectId, selectedProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedFreelancerUserId || !comment) {
      setMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await submitReview(
        selectedProjectId,
        selectedFreelancerUserId,
        rating,
        comment
      );

      if (res.success) {
        if (res.duplicate) {
          setMessage("You have already reviewed this freelancer for this project.");
        } else {
          setMessage("Review submitted successfully!");
          setComment("");
          // Clear project if there was only one freelancer or all are reviewed
          setSelectedProjectId("");
          router.refresh();
        }
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
      label: `${p.title} (${p.applications.map(a => a.freelancer.user.name).join(", ") || "No hired freelancers"})`,
    })),
  ];

  const freelancerOptions = hiredFreelancers.map((f) => ({
    value: f.user.id,
    label: f.user.name || "Unknown Freelancer",
  }));

  return (
    <Card className="p-8 max-w-xl bg-white border border-[#EDEFF2] shadow-sm">
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
        <p className="text-[#5A6472] text-xs py-4">No active or completed contracts to review.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Select Project Contract"
            options={projectOptions}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={loading}
          />

          {hiredFreelancers.length > 1 ? (
            <Select
              label="Select Freelancer to Review"
              options={freelancerOptions}
              value={selectedFreelancerUserId}
              onChange={(e) => setSelectedFreelancerUserId(e.target.value)}
              disabled={loading}
            />
          ) : hiredFreelancers.length === 1 ? (
            <div className="p-3.5 bg-[#F7F8FA] rounded-xl border border-[#EDEFF2] text-xs">
              <span className="text-[10px] text-[#5A6472] block">Freelancer details</span>
              <strong className="text-[#181d26] font-semibold">{hiredFreelancers[0].user.name}</strong>
            </div>
          ) : null}

          {/* Star Rating select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#5A6472]">Rating Score (1-5)</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 rounded hover:bg-[#EDEFF2] transition-colors cursor-pointer"
                  disabled={loading}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating ? "text-amber-400 fill-amber-400/25" : "text-[#C7CCD4]"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#5A6472]">Written Feedback</label>
            <textarea
              className="w-full min-h-[100px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-[#E2E5EA] text-[#181D26] focus:border-[#181d26] focus:ring-[#181d26]/20"
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
