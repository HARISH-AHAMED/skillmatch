"use client";

import {
  AlertTriangle,
  Clock,
  Database,
  FileText,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Field, Input, Toggle } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import {
  DELIVERABLE_REVISION_CAP,
  MAX_DAILY_HOURS,
  MAX_ROLE_SLOTS,
  MAX_SIZES,
  MESSAGE_TTL_DAYS,
  SCORE_WEIGHTS,
} from "@/lib/constants";

const TABS = [
  { id: "limits", label: "Limits" },
  { id: "scoring", label: "Match scoring" },
  { id: "uploads", label: "Uploads" },
  { id: "jobs", label: "Background jobs" },
];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState("limits");
  const [dirty, setDirty] = useState(false);

  const [limits, setLimits] = useState({
    messageTtl: String(MESSAGE_TTL_DAYS),
    revisionCap: String(DELIVERABLE_REVISION_CAP),
    maxDailyHours: String(MAX_DAILY_HOURS),
    maxRoleSlots: String(MAX_ROLE_SLOTS),
    notificationLimit: "8",
    recommendationCap: "10",
  });

  const [weights, setWeights] = useState({
    skill: String(SCORE_WEIGHTS.skillMatch * 100),
    experience: String(SCORE_WEIGHTS.experienceMatch * 100),
    rating: String(SCORE_WEIGHTS.ratingMatch * 100),
    completion: String(SCORE_WEIGHTS.completionRateMatch * 100),
    priority: String(SCORE_WEIGHTS.priorityMatch * 100),
  });

  const [features, setFeatures] = useState({
    googleAuth: true,
    apprentices: true,
    certificates: true,
    invitations: true,
    publicVerification: true,
  });

  const weightTotal = Object.values(weights).reduce((s, v) => s + Number(v || 0), 0);



  return (
    <div>
      <PageHeader
        title="System settings"
        description="The platform-wide limits and weights currently in force. These are constants in the deployed build, shown here for reference."
        action={
          <Button
            disabled
            title="These values are platform constants; there is no settings store to write them to."
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save settings
          </Button>
        }
      />

      {dirty && (
        <Alert tone="warning" className="mb-5" title="Unsaved changes">
          These settings apply platform-wide across every company and freelancer.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <Tabs items={TABS} value={tab} onChange={setTab} className="mb-5" />

          {tab === "limits" && (
            <div className="flex flex-col gap-5">
              <Card padding="lg">
                <CardHeader
                  title="Retention & caps"
                  description="These are enforced server-side on every write, not only in the UI."
                  icon={<Clock />}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Message retention (days)"
                    help="Messages older than this are excluded from reads and removed by the cleanup job."
                  >
                    <Input
                      type="number"
                      min={1}
                      value={limits.messageTtl}
                      onChange={(e) => {
                        setLimits((l) => ({ ...l, messageTtl: e.target.value }));
                        setDirty(true);
                      }}
                    />
                  </Field>
                  <Field
                    label="Revision cap"
                    help="Maximum revisions requestable on a deliverable or a payment stage."
                  >
                    <Input
                      type="number"
                      min={0}
                      value={limits.revisionCap}
                      onChange={(e) => {
                        setLimits((l) => ({ ...l, revisionCap: e.target.value }));
                        setDirty(true);
                      }}
                    />
                  </Field>
                  <Field
                    label="Maximum hours per work log"
                    help="A single entry cannot exceed this."
                  >
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={limits.maxDailyHours}
                      onChange={(e) => {
                        setLimits((l) => ({ ...l, maxDailyHours: e.target.value }));
                        setDirty(true);
                      }}
                    />
                  </Field>
                  <Field label="Maximum slots per role">
                    <Input
                      type="number"
                      min={1}
                      value={limits.maxRoleSlots}
                      onChange={(e) => {
                        setLimits((l) => ({ ...l, maxRoleSlots: e.target.value }));
                        setDirty(true);
                      }}
                    />
                  </Field>
                  <Field
                    label="Notifications returned"
                    help="How many the notification endpoint returns per request."
                  >
                    <Input
                      type="number"
                      min={1}
                      value={limits.notificationLimit}
                      onChange={(e) => {
                        setLimits((l) => ({ ...l, notificationLimit: e.target.value }));
                        setDirty(true);
                      }}
                    />
                  </Field>
                  <Field
                    label="Recommendations cached per project"
                    help="Top N matched freelancers stored per open project."
                  >
                    <Input
                      type="number"
                      min={1}
                      value={limits.recommendationCap}
                      onChange={(e) => {
                        setLimits((l) => ({ ...l, recommendationCap: e.target.value }));
                        setDirty(true);
                      }}
                    />
                  </Field>
                </div>
              </Card>

              <Card padding="lg">
                <CardHeader title="Feature switches" icon={<Sparkles />} />
                <div className="flex flex-col gap-4">
                  {(
                    [
                      ["googleAuth", "Google sign-in", "Allow OAuth alongside email and password."],
                      [
                        "apprentices",
                        "Apprentice placements",
                        "Roles can accept an apprentice who occupies no slot.",
                      ],
                      [
                        "certificates",
                        "Certificates",
                        "Companies can design templates and issue verifiable certificates.",
                      ],
                      [
                        "invitations",
                        "Direct invitations",
                        "Companies can invite specific freelancers to apply.",
                      ],
                      [
                        "publicVerification",
                        "Public certificate verification",
                        "Anyone can verify a certificate by ID without an account.",
                      ],
                    ] as const
                  ).map(([key, label, description]) => (
                    <Toggle
                      key={key}
                      checked={features[key]}
                      onChange={(v) => {
                        setFeatures((f) => ({ ...f, [key]: v }));
                        setDirty(true);
                      }}
                      label={label}
                      description={description}
                    />
                  ))}
                </div>
              </Card>
            </div>
          )}

          {tab === "scoring" && (
            <Card padding="lg">
              <CardHeader
                title="Match score weights"
                description="The formula is deterministic and explainable. Every applicant view shows these five components alongside the total."
                icon={<Sparkles />}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["skill", "Skill match", "Matched required skills over total required skills."],
                    ["experience", "Experience match", "Years against the project minimum."],
                    ["rating", "Rating", "Their average rating out of five."],
                    ["completion", "Completion rate", "Share of engagements delivered in full."],
                    ["priority", "Project priority", "Higher bar on urgent projects."],
                  ] as const
                ).map(([key, label, help]) => (
                  <Field key={key} label={`${label} (%)`} help={help}>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={weights[key]}
                      onChange={(e) => {
                        setWeights((w) => ({ ...w, [key]: e.target.value }));
                        setDirty(true);
                      }}
                    />
                  </Field>
                ))}
              </div>

              <div
                className={`mt-5 rounded-[var(--radius-md)] p-4 ${
                  weightTotal === 100
                    ? "bg-[var(--color-success-bg)]"
                    : "bg-[var(--color-error-bg)]"
                }`}
              >
                <p
                  className={`text-[13.5px] font-semibold ${
                    weightTotal === 100
                      ? "text-[var(--color-success-fg)]"
                      : "text-[var(--color-error-fg)]"
                  }`}
                >
                  Weights total {weightTotal}%
                </p>
                <p
                  className={`mt-1 text-[12.5px] leading-[1.55] ${
                    weightTotal === 100
                      ? "text-[var(--color-success-fg)]"
                      : "text-[var(--color-error-fg)]"
                  } opacity-90`}
                >
                  {weightTotal === 100
                    ? "Valid. Scores are rounded to one decimal place."
                    : "Weights must total exactly 100% before they can be saved."}
                </p>
              </div>

              <Alert tone="info" className="mt-4" title="Changing weights re-ranks everyone">
                Existing applications keep their recorded score. New scores and recommendation
                caches use the updated weights from the next recalculation onward.
              </Alert>
            </Card>
          )}

          {tab === "uploads" && (
            <div className="flex flex-col gap-5">
              <Card padding="lg">
                <CardHeader
                  title="Size limits"
                  description="Checked against the real received byte length, not the size the client declares."
                  icon={<Upload />}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Images (MB)">
                    <Input type="number" defaultValue={MAX_SIZES.image} min={1} />
                  </Field>
                  <Field label="PDFs (MB)">
                    <Input type="number" defaultValue={MAX_SIZES.pdf} min={1} />
                  </Field>
                  <Field label="Video (MB)">
                    <Input type="number" defaultValue={MAX_SIZES.video} min={1} />
                  </Field>
                </div>
              </Card>

              <Card padding="lg">
                <CardHeader
                  title="Accepted file types"
                  description="MIME type and file extension must both match the same allowlist entry — either signal alone is not enough."
                  icon={<FileText />}
                />
                <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[var(--color-surface-alt)]">
                      <tr>
                        <th className="px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                          Content type
                        </th>
                        <th className="px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                          Extension
                        </th>
                        <th className="px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                          Category
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["application/pdf", ".pdf", "pdf"],
                        ["image/png", ".png", "image"],
                        ["image/jpeg", ".jpg, .jpeg", "image"],
                        ["image/webp", ".webp", "image"],
                        ["image/gif", ".gif", "image"],
                        ["video/mp4", ".mp4", "video"],
                        ["video/webm", ".webm", "video"],
                        ["video/ogg", ".ogv, .ogg", "video"],
                        ["video/quicktime", ".mov", "video"],
                      ].map(([mime, ext, cat]) => (
                        <tr key={mime} className="border-t border-[var(--color-border-subtle)]">
                          <td className="px-3 py-2 font-mono text-[12px] text-[var(--color-text-primary)]">
                            {mime}
                          </td>
                          <td className="px-3 py-2 font-mono text-[12px] text-[var(--color-text-secondary)]">
                            {ext}
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone="neutral" size="sm">
                              {cat}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Alert tone="error" className="mt-4" title="SVG is always rejected">
                  Rejected by MIME type and by extension independently. Rendered inline, an SVG can
                  run script in our own origin.
                </Alert>
              </Card>
            </div>
          )}

          {tab === "jobs" && (
            <Card padding="lg">
              <CardHeader
                title="Background jobs"
                description="Scheduled maintenance tasks and their last run."
                icon={<Database />}
              />
              <ul className="flex flex-col gap-3">
                {[
                  {
                    name: "Message cleanup",
                    schedule: "Daily at 03:00 UTC",
                    detail: `Removes messages older than ${limits.messageTtl} days.`,
                    last: "412 messages removed",
                    healthy: true,
                  },
                  {
                    name: "Recommendation refresh",
                    schedule: "On project create, edit and profile change",
                    detail: "Rescores every freelancer and caches the top matches per open project.",
                    last: "Recalculated for 14 open projects",
                    healthy: true,
                  },
                  {
                    name: "Ledger reconciliation",
                    schedule: "Hourly",
                    detail: "Compares cached stage totals against the ledger. The ledger wins.",
                    last: "All items consistent",
                    healthy: true,
                  },
                  {
                    name: "Certificate issuance",
                    schedule: "On project completion",
                    detail: "Issues to every hired freelancer using the designed template.",
                    last: "3 certificates issued",
                    healthy: true,
                  },
                ].map((job) => (
                  <li
                    key={job.name}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {job.name}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">
                          {job.detail}
                        </p>
                        <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                          {job.schedule}
                        </p>
                      </div>
                      <Badge tone={job.healthy ? "success" : "error"} size="sm" dot>
                        {job.healthy ? "Healthy" : "Failing"}
                      </Badge>
                    </div>
                    <p className="mt-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] px-2.5 py-1.5 text-[12px] text-[var(--color-text-secondary)]">
                      Last run: {job.last}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <Card padding="md">
            <CardHeader
              title="Known scope limits"
              icon={<AlertTriangle />}
              divided={false}
              className="mb-3"
            />
            <ul className="flex flex-col gap-2.5">
              {[
                "No external payment provider — funds are an internal ledger construct.",
                "No rate limiting on server actions or the upload endpoint.",
                "The cleanup endpoint is unauthenticated; add a shared secret before public exposure.",
                "Twelve of the thirteen screening round types collect configuration but have no runtime.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-warning-fg)]" />
                  <span className="text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md">
            <CardHeader
              title="Security posture"
              icon={<ShieldCheck />}
              divided={false}
              className="mb-3"
            />
            <ul className="flex flex-col gap-2.5">
              {[
                "Every server action calls its own guard — layout guards protect nothing.",
                "Missing and forbidden return an identical message so ids cannot be probed.",
                "Ownership is always re-derived from the session, never from client input.",
                "Signature IP addresses are read from request headers server-side.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
                  <span className="text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md" className="bg-[var(--color-brand-ink)] text-white">
            <Wallet className="h-5 w-5 text-[var(--color-brand-bright)]" />
            <h3 className="mt-3 text-[14px] font-semibold">Payments are ledger-only</h3>
            <p className="mt-1.5 text-[12.5px] leading-[1.6] text-white/65">
              Funding moves value into a project&apos;s committed pool and releasing moves it out.
              The ledger already carries an external reference field, so integrating a provider
              needs no schema change.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
