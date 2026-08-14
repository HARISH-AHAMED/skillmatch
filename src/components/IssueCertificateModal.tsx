"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Award, CheckCircle2 } from "lucide-react";
import { issueCertificate } from "@/actions/certificateActions";

interface IssueCertificateModalProps {
  projectId: string;
  projectTitle: string;
  freelancerId: string;
  freelancerName: string;
  companyName: string;
  /** Prefilled from the project's required skills. */
  suggestedSkills?: string[];
  suggestedDuration?: string;
  onClose: () => void;
}

export function IssueCertificateModal({
  projectId,
  projectTitle,
  freelancerId,
  freelancerName,
  companyName,
  suggestedSkills = [],
  suggestedDuration = "",
  onClose,
}: IssueCertificateModalProps) {
  const router = useRouter();
  const [roleTitle, setRoleTitle] = useState("");
  const [skills, setSkills] = useState<string[]>(suggestedSkills);
  const [skillInput, setSkillInput] = useState("");
  const [durationText, setDurationText] = useState(suggestedDuration);
  const [summary, setSummary] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState("");
  const [issuedId, setIssuedId] = useState<string | null>(null);

  const addSkill = () => {
    const v = skillInput.trim();
    if (!v || skills.includes(v)) return;
    setSkills([...skills, v]);
    setSkillInput("");
  };

  const handleIssue = async () => {
    if (!roleTitle.trim()) {
      setError("Role title is required.");
      return;
    }
    setIssuing(true);
    setError("");
    try {
      const res = await issueCertificate({
        projectId,
        freelancerId,
        roleTitle,
        skills,
        durationText,
        summary,
      });
      if (res.success && res.publicId) {
        setIssuedId(res.publicId);
        router.refresh();
      } else {
        setError(res.error || "Failed to issue the certificate.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue the certificate.");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="3xl"
      title={
        <span className="flex items-center gap-2">
          <Award className="h-[18px] w-[18px] text-[#5B6272]" aria-hidden="true" />
          Issue Certificate
        </span>
      }
      description={
        <>
          Award <strong className="font-semibold text-[#1A1D29]">{freelancerName}</strong> a
          publicly verifiable credential for &ldquo;{projectTitle}&rdquo;.
        </>
      }
    >
      <div className="space-y-4 text-left">
        {issuedId ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="text-sm font-semibold text-ink">Certificate issued</p>
            <p className="text-xs text-muted">
              {freelancerName} has been notified. Anyone can verify it at:
            </p>
            <p className="font-mono text-sm text-link">/verify/{issuedId}</p>
            <Button size="sm" onClick={onClose} className="cursor-pointer mt-2">
              Done
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Form */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Role Title *
                </label>
                <input
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  disabled={issuing}
                  className="w-full h-9 px-3 rounded-md border border-hairline bg-white text-xs text-ink focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Skills Demonstrated
                </label>
                <div className="flex gap-2">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Type a skill and press Enter"
                    disabled={issuing}
                    className="flex-1 h-9 px-3 rounded-md border border-hairline bg-white text-xs text-ink focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                  />
                  <Button size="xs" variant="outline" onClick={addSkill} disabled={issuing} className="cursor-pointer">
                    Add
                  </Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSkills(skills.filter((x) => x !== s))}
                        disabled={issuing}
                        className="text-[11px] font-medium bg-surface-soft border border-hairline text-ink px-2 py-0.5 rounded-full cursor-pointer hover:border-border-strong"
                        title="Remove"
                      >
                        {s} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Engagement Duration
                </label>
                <input
                  value={durationText}
                  onChange={(e) => setDurationText(e.target.value)}
                  placeholder="e.g. 3 months (Jan – Mar 2026)"
                  disabled={issuing}
                  className="w-full h-9 px-3 rounded-md border border-hairline bg-white text-xs text-ink focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Summary (optional)
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="A sentence on what they delivered…"
                  disabled={issuing}
                  className="w-full px-3 py-2 rounded-md border border-hairline bg-white text-xs text-ink focus:border-[#2E6BEA] focus:shadow-[0_0_0_3px_rgba(46,107,234,0.15)] focus:outline-none resize-none"
                />
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleIssue}
                  disabled={issuing || !roleTitle.trim()}
                  className="flex-1 cursor-pointer gap-1.5"
                >
                  <Award className="h-3.5 w-3.5" />
                  {issuing ? "Issuing…" : "Issue Certificate"}
                </Button>
                <Button variant="outline" onClick={onClose} disabled={issuing} className="cursor-pointer">
                  Cancel
                </Button>
              </div>
              <p className="text-[11px] text-muted">
                Once issued, a certificate can be revoked but not edited — it is a permanent record.
              </p>
            </div>

            {/* Live preview — what gets issued is what is shown */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                Preview
              </span>
              <div className="border border-hairline rounded-lg overflow-hidden bg-white">
                <div className="bg-ink px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                    Talentra Verified Credential
                  </p>
                  <p className="text-xs font-semibold text-white mt-0.5">Certificate of Completion</p>
                </div>
                <div className="px-4 py-5 space-y-3 text-center">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted">This certifies that</p>
                    <p className="text-sm font-semibold text-ink">{freelancerName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted">completed the role of</p>
                    <p className="text-xs font-semibold text-ink">
                      {roleTitle || <span className="text-border-strong">Role title…</span>}
                    </p>
                    <p className="text-[11px] text-body mt-0.5">on &ldquo;{projectTitle}&rdquo;</p>
                  </div>
                  {durationText && <p className="text-[11px] text-muted">{durationText}</p>}
                  {summary && (
                    <p className="text-[11px] text-body italic leading-relaxed">&ldquo;{summary}&rdquo;</p>
                  )}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center pt-1">
                      {skills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[11px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="pt-2 border-t border-hairline">
                    <p className="text-[11px] uppercase tracking-wider text-muted">Issued by</p>
                    <p className="text-[11px] font-semibold text-ink">{companyName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
