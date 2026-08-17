"use client";

import React from "react";
import { RecruitmentRound, ROUND_TYPE_CATALOG, isRoundTypeSupported } from "@/lib/workflowHelpers";

/**
 * Renders only the configuration fields the selected round type declares in
 * ROUND_TYPE_CATALOG. Rounds whose type declares no extra fields (e.g. the
 * original screening questionnaire) render nothing, so existing behaviour and
 * their dedicated builders are untouched.
 */
export function RoundConfigPanel({
  round,
  onChange,
}: {
  round: RecruitmentRound;
  onChange: (config: NonNullable<RecruitmentRound["config"]>) => void;
}) {
  const entry = ROUND_TYPE_CATALOG.find((t) => t.value === round.type);
  if (!entry || (entry.fields.length === 0 && isRoundTypeSupported(round.type))) return null;

  const cfg = round.config || {};
  const set = (patch: Partial<NonNullable<RecruitmentRound["config"]>>) =>
    onChange({ ...cfg, ...patch });

  const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-[#5B6272] mb-1";
  const inputCls =
    "w-full px-3 py-2 rounded-lg text-xs bg-white border border-[#E3E5EA] text-[#1A1D29] focus:outline-none focus:border-[#C7CBD6]";

  return (
    <div className="space-y-3 border-t border-[#E3E5EA] pt-4 text-left">
      {/*
        EVAL-001…006 — a round whose type the platform cannot yet run keeps its
        stored settings (nothing is deleted) but must say plainly that they are
        not applied to candidates. Previously these settings were collected and
        silently ignored.
      */}
      {!isRoundTypeSupported(round.type) && (
        <div className="rounded-lg border border-[#F5DEB0] bg-[#FFF3DC] px-3 py-2">
          <span className="text-[11px] font-bold text-[#8F5E08]">
            Coming soon — this round type is not yet run by the platform. These settings are
            saved but candidates are not asked to complete this round.
          </span>
        </div>
      )}
      <div>
        <h4 className="text-xs font-bold text-[#1A1D29]">Configure: {entry.label}</h4>
        <p className="text-[11px] text-[#5B6272] font-semibold">{entry.description}</p>
      </div>

      {entry.fields.includes("instructions") && (
        <div>
          <label className={labelCls}>Instructions / Prompt</label>
          <textarea
            rows={3}
            className={inputCls}
            placeholder="What should the candidate do in this round?"
            value={cfg.instructions || ""}
            onChange={(e) => set({ instructions: e.target.value })}
          />
        </div>
      )}

      {entry.fields.includes("maxDurationMinutes") && (
        <div>
          <label className={labelCls}>Maximum Video Duration (minutes)</label>
          <input
            type="number"
            min={1}
            max={30}
            className={inputCls}
            value={cfg.maxDurationMinutes ?? ""}
            onChange={(e) =>
              set({ maxDurationMinutes: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      )}

      {entry.fields.includes("submissionRequirements") && (
        <div>
          <label className={labelCls}>What the candidate should submit</label>
          <textarea
            rows={2}
            className={inputCls}
            placeholder="e.g. two case studies with your role and outcome"
            value={cfg.submissionRequirements || ""}
            onChange={(e) => set({ submissionRequirements: e.target.value })}
          />
        </div>
      )}

      {entry.fields.includes("referenceUrl") && (
        <div>
          <label className={labelCls}>Reference / Work-sample URL (optional)</label>
          <input
            type="url"
            className={inputCls}
            placeholder="https://"
            value={cfg.referenceUrl || ""}
            onChange={(e) => set({ referenceUrl: e.target.value })}
          />
          <p className="mt-1 text-[11px] text-[#5B6272]">
            Candidates may also upload work samples using the existing application upload flow.
          </p>
        </div>
      )}

      {entry.fields.includes("evaluationCriteria") && (
        <div>
          <label className={labelCls}>Evaluation Criteria</label>
          <textarea
            rows={2}
            className={inputCls}
            placeholder="How will the reasoning / output be judged?"
            value={cfg.evaluationCriteria || ""}
            onChange={(e) => set({ evaluationCriteria: e.target.value })}
          />
        </div>
      )}

      {entry.fields.includes("verificationItems") && (
        <div>
          <label className={labelCls}>Verification items requested for this project</label>
          <textarea
            rows={2}
            className={inputCls}
            placeholder="e.g. government ID check, prior employment reference"
            value={cfg.verificationItems || ""}
            onChange={(e) => set({ verificationItems: e.target.value })}
          />
          <p className="mt-1 text-[11px] text-[#8F5E08]">
            Project-specific request. This is separate from the platform-level “Identity Verified”
            badge on a freelancer’s profile.
          </p>
        </div>
      )}

      {entry.fields.includes("reuseProfileVerification") && (
        <label className="flex items-center gap-2 text-[11px] font-semibold text-[#5B6272]">
          <input
            type="checkbox"
            checked={!!cfg.reuseProfileVerification}
            onChange={(e) => set({ reuseProfileVerification: e.target.checked })}
          />
          Accept the freelancer’s existing platform verification data where available
        </label>
      )}

      {entry.fields.includes("useTeamMatchConfirmation") && (
        <label className="flex items-center gap-2 text-[11px] font-semibold text-[#5B6272]">
          <input
            type="checkbox"
            checked={cfg.useTeamMatchConfirmation !== false}
            onChange={(e) => set({ useTeamMatchConfirmation: e.target.checked })}
          />
          Run this session against the existing Team Match Confirmation roster
        </label>
      )}

      {entry.fields.includes("deadline") && (
        <div>
          <label className={labelCls}>Submission Deadline (optional)</label>
          <input
            type="date"
            className={inputCls}
            value={cfg.deadline || ""}
            onChange={(e) => set({ deadline: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
