"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { editProject } from "@/actions/projectActions";
import { ProjectPriority } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface EditProjectFormProps {
  project: {
    id: string;
    title: string;
    description: string;
    budget: number;
    priority: ProjectPriority;
    requiredSkills: string[];
    experienceRequired: number;
    freelancersLimit: number;
    isVisible: boolean;
  };
}

export function EditProjectForm({ project }: EditProjectFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [budget, setBudget] = useState(project.budget);
  const [priority, setPriority] = useState<ProjectPriority>(project.priority);
  const [skillsStr, setSkillsStr] = useState(project.requiredSkills.join(", "));
  const [experienceRequired, setExperienceRequired] = useState(project.experienceRequired);
  const [freelancersLimit, setFreelancersLimit] = useState(project.freelancersLimit);
  const [isVisible, setIsVisible] = useState(project.isVisible);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !skillsStr) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);

    const requiredSkills = skillsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await editProject(project.id, {
        title,
        description,
        budget: Number(budget),
        priority,
        requiredSkills,
        experienceRequired: Number(experienceRequired),
        freelancersLimit: Number(freelancersLimit),
        isVisible,
      });

      if (res.success) {
        router.push("/company/projects");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update project listing.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 bg-white border border-slate-100 shadow-sm">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Project Title"
          placeholder="e.g. Next.js 15 Tailwind UI Designer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600">Project Description</label>
          <textarea
            className="w-full min-h-[140px] px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 bg-white border border-slate-200 text-slate-800 focus:border-[#002d59] focus:ring-[#002d59]/20"
            placeholder="Detail the project goals, scopes of work, deliverables, and tech requirements..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Budget ($)"
            type="number"
            min="0"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            disabled={loading}
          />

          <Select
            label="Project Priority"
            options={[
              { value: ProjectPriority.LOW, label: "Low Urgency" },
              { value: ProjectPriority.MEDIUM, label: "Medium Urgency" },
              { value: ProjectPriority.HIGH, label: "High Urgency" },
            ]}
            value={priority}
            onChange={(e) => setPriority(e.target.value as ProjectPriority)}
            disabled={loading}
          />
        </div>

        <Input
          label="Required Skills (comma separated)"
          placeholder="typescript, react, framer motion, node.js"
          value={skillsStr}
          onChange={(e) => setSkillsStr(e.target.value)}
          disabled={loading}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Required Experience (Years)"
            type="number"
            min="0"
            value={experienceRequired}
            onChange={(e) => setExperienceRequired(Number(e.target.value))}
            disabled={loading}
          />

          <Input
            label="Freelancers Limit"
            type="number"
            min="1"
            value={freelancersLimit}
            onChange={(e) => setFreelancersLimit(Number(e.target.value))}
            disabled={loading}
          />
        </div>

        {/* Visibility Toggle Field */}
        <Select
          label="Listing Visibility"
          options={[
            { value: "true", label: "Public (Show in Gig Directory)" },
            { value: "false", label: "Private (Hide Listing)" },
          ]}
          value={isVisible ? "true" : "false"}
          onChange={(e) => setIsVisible(e.target.value === "true")}
          disabled={loading}
        />

        <div className="flex gap-4 pt-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push("/company/projects")}
            disabled={loading}
            className="w-1/3 cursor-pointer"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-2/3 cursor-pointer">
            {loading ? "Saving Spec..." : "Save Project Spec"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
