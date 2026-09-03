"use client";

import { useRouter } from "next/navigation";

import Image from "next/image";
import {
  CheckCircle2,
  Download,
  FileText,
  FileVideo,
  History,
  Upload,
  XCircle,
} from "lucide-react";
import { useMemo, useState , useRef, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { shareFile, updateDeliverableStatus, uploadDeliverableVersion } from "@/actions/collaborationActions";
import { uploadFile } from "@/lib/upload";
import { DELIVERABLE_REVISION_CAP, MAX_SIZES } from "@/lib/constants";
import type { Project, Role, SharedFile } from "@/lib/types";
import type { WorkspaceData } from "@/data/server/workspace";
import { relativeTime } from "@/lib/utils";

const STATUS_META = {
  PENDING: { label: "In review", tone: "warning" as const },
  APPROVED: { label: "Approved", tone: "success" as const },
  REVISION_REQUESTED: { label: "Revision requested", tone: "error" as const },
};

export function WorkspaceDeliverables({
  data,
  project,
  viewerRole,
}: {
  data: WorkspaceData;
  project: Project;
  viewerRole: Role;
}) {
  const toast = useToast();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const isCompany = viewerRole === "COMPANY";

  // Straight from the server. This was a local copy that nothing wrote back,
  // so an upload or a review only ever existed in this tab.
  const files = useMemo(
    () => data.files.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [data.files],
  );
  const [reviewTarget, setReviewTarget] = useState<SharedFile | null>(null);
  const [versionTarget, setVersionTarget] = useState<SharedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deliverables = files.filter((f) => f.meta.isDeliverable);
  const attachments = files.filter((f) => !f.meta.isDeliverable);

  const review = (approve: boolean) => {
    if (!reviewTarget) return;
    const used = reviewTarget.meta.revisionCount ?? 0;
    if (!approve && used >= DELIVERABLE_REVISION_CAP) {
      setError(
        `Revision limit reached (${DELIVERABLE_REVISION_CAP} of ${DELIVERABLE_REVISION_CAP} used). Approve the deliverable or agree new terms with the freelancer.`,
      );
      return;
    }
    // The verdict used to be applied to a local copy only: the freelancer was
    // never told and the deliverable stayed in review for everyone else.
    const target = reviewTarget;
    const note = feedback.trim();

    startTransition(async () => {
      const result = await updateDeliverableStatus(
        project.id,
        target.id,
        approve ? "APPROVED" : "REVISION_REQUESTED",
        note,
      );
      if (!result || "error" in result) {
        setError((result && "error" in result ? result.error : undefined) ?? "That review could not be saved.");
        return;
      }
      setReviewTarget(null);
      setFeedback("");
      setError(null);
      toast.success(
        approve ? "Deliverable approved" : "Revision requested",
        approve ? undefined : `${used + 1} of ${DELIVERABLE_REVISION_CAP} revisions used.`,
      );
      router.refresh();
    });
  };

  /**
   * A deliverable is a real file. This dialog used to take a *typed filename*
   * and invent the rest — a made-up /uploads/ URL, "1.2 MB", application/pdf —
   * then keep the row in local state. Nothing was uploaded and nothing stored.
   *
   * The file now goes through the upload route, and the row is written by the
   * same action the rest of the workspace uses. `fileSize` carries the JSON
   * meta block the adapter reads, which is what marks it a deliverable.
   */
  const submitFile = (target: SharedFile | null) => {
    const file = picked;
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    setBusy(true);
    startTransition(async () => {
      try {
        const uploaded = await uploadFile(file);
        if ("error" in uploaded) {
          setError(uploaded.error);
          return;
        }

        const size =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.max(1, Math.round(file.size / 1024))} KB`;

        const result = target
          ? await uploadDeliverableVersion(project.id, target.id, file.name, uploaded.url, size)
          : await shareFile(
              project.id,
              file.name,
              uploaded.url,
              JSON.stringify({
                size,
                mime: file.type || "application/octet-stream",
                isDeliverable: true,
                status: "PENDING",
                version: 1,
                revisionCount: 0,
                revisionCap: DELIVERABLE_REVISION_CAP,
              }),
              "group",
            );

        if (!result || "error" in result) {
          setError((result && "error" in result ? result.error : undefined) ?? "That file could not be uploaded.");
          return;
        }

        setVersionTarget(null);
        setUploading(false);
        setPicked(null);
        setError(null);
        if (fileInput.current) fileInput.current.value = "";
        toast.success(
          target ? "New version uploaded" : "Deliverable uploaded",
          target ? "The status has reset to in-review." : "Sent to the company for review.",
        );
        router.refresh();
      } finally {
        setBusy(false);
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Card padding="md">
        <CardHeader
          title="Deliverables"
          description={`Versioned work submitted for review. A maximum of ${DELIVERABLE_REVISION_CAP} revisions can be requested on each one.`}
          icon={<FileText />}
          action={
            !isCompany && (
              <Button size="sm" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => setUploading(true)}>
                Upload deliverable
              </Button>
            )
          }
        />

        {deliverables.length === 0 ? (
          <EmptyState
            compact
            icon={<FileText />}
            title="No deliverables yet"
            description={
              isCompany
                ? "Submitted work will appear here for review."
                : "Upload your first deliverable when a piece of work is ready for review."
            }
            action={!isCompany ? { label: "Upload a deliverable", onClick: () => setUploading(true) } : undefined}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {deliverables.map((file) => {
              const meta = STATUS_META[file.meta.status ?? "PENDING"];
              const used = file.meta.revisionCount ?? 0;
              const isVideo = file.meta.mime.startsWith("video/");
              return (
                <li
                  key={file.id}
                  className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"
                >
                  <div className="relative aspect-[16/9] bg-[var(--color-surface-sunken)]">
                    {file.meta.previewUrl && (
                      <Image
                        src={file.meta.previewUrl}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover opacity-90"
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-[rgba(12,20,17,0.45)]">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95">
                        {isVideo ? (
                          <FileVideo className="h-5 w-5 text-[var(--color-text-primary)]" />
                        ) : (
                          <FileText className="h-5 w-5 text-[var(--color-text-primary)]" />
                        )}
                      </span>
                    </span>
                    <span className="absolute left-2.5 top-2.5 flex gap-1.5">
                      <Badge tone={meta.tone} size="sm">
                        {meta.label}
                      </Badge>
                      <Badge tone="neutral" size="sm">
                        v{file.meta.version ?? 1}
                      </Badge>
                    </span>
                  </div>

                  <div className="p-3.5">
                    <h4 className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                      {file.fileName}
                    </h4>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar src={file.uploadedByAvatar} name={file.uploadedByName} size="xs" />
                        {file.uploadedByName}
                      </span>
                      <span>{file.meta.size}</span>
                      <span>{relativeTime(file.uploadedAt)}</span>
                    </p>

                    {file.meta.feedback && (
                      <div
                        className={`mt-2.5 rounded-[var(--radius-sm)] p-2.5 ${
                          file.meta.status === "REVISION_REQUESTED"
                            ? "bg-[var(--color-error-bg)]"
                            : "bg-[var(--color-success-bg)]"
                        }`}
                      >
                        <p
                          className={`text-[12px] leading-[1.55] ${
                            file.meta.status === "REVISION_REQUESTED"
                              ? "text-[var(--color-error-fg)]"
                              : "text-[var(--color-success-fg)]"
                          }`}
                        >
                          {file.meta.feedback}
                        </p>
                      </div>
                    )}

                    {used > 0 && (
                      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-muted)]">
                        <History className="h-3 w-3" />
                        {used} of {DELIVERABLE_REVISION_CAP} revisions used
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-3">
                      <Button size="xs" variant="secondary" leftIcon={<Download className="h-3 w-3" />}>
                        Download
                      </Button>
                      {isCompany && file.meta.status === "PENDING" && (
                        <Button
                          size="xs"
                          onClick={() => {
                            setReviewTarget(file);
                            setFeedback("");
                            setError(null);
                          }}
                        >
                          Review
                        </Button>
                      )}
                      {!isCompany && file.meta.status === "REVISION_REQUESTED" && (
                        <Button
                          size="xs"
                          leftIcon={<Upload className="h-3 w-3" />}
                          onClick={() => {
                            setVersionTarget(file);
                            setPicked(null);
                          }}
                        >
                          Upload new version
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ---- Shared attachments ---- */}
      {attachments.length > 0 && (
        <Card padding="md">
          <CardHeader
            title="Shared files"
            description="Reference material shared in the workspace. Not part of the deliverable review flow."
            icon={<FileText />}
          />
          <ul className="flex flex-col gap-2">
            {attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)]">
                  <FileText className="h-4 w-4 text-[var(--color-text-secondary)]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                    {file.fileName}
                  </p>
                  <p className="text-[11.5px] text-[var(--color-text-muted)]">
                    {file.uploadedByName} · {file.meta.size} · {relativeTime(file.uploadedAt)}
                    {file.channel === "freelancers" && " · freelancers-only"}
                  </p>
                </div>
                <Button size="xs" variant="ghost" aria-label="Download">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---- Modals ---- */}
      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => {
          setReviewTarget(null);
          setError(null);
        }}
        title="Review deliverable"
        description={reviewTarget?.fileName}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => review(false)}
              disabled={(reviewTarget?.meta.revisionCount ?? 0) >= DELIVERABLE_REVISION_CAP}
              leftIcon={<XCircle className="h-4 w-4" />}
            >
              Request revision
            </Button>
            <Button onClick={() => review(true)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Approve
            </Button>
          </>
        }
      >
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        {(reviewTarget?.meta.revisionCount ?? 0) >= DELIVERABLE_REVISION_CAP && (
          <Alert tone="warning" className="mb-4" title="Revision limit reached">
            {DELIVERABLE_REVISION_CAP} of {DELIVERABLE_REVISION_CAP} revisions used. Approve the
            deliverable or agree new terms with the freelancer.
          </Alert>
        )}
        <Field
          label="Feedback"
          help="Sent with your decision. Be specific about what needs to change if you are requesting a revision."
        >
          <Textarea
            rows={5}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Four resource overviews still describe the v1 pagination behaviour. Please correct those and resubmit."
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(versionTarget) || uploading}
        onClose={() => {
          setVersionTarget(null);
          setUploading(false);
        }}
        title={versionTarget ? "Upload a new version" : "Upload a deliverable"}
        description={
          versionTarget
            ? `This becomes v${(versionTarget.meta.version ?? 1) + 1} and resets the status to in-review.`
            : "PDF, PNG, JPEG, WebP, GIF, MP4, WebM, OGG or MOV."
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setVersionTarget(null);
                setUploading(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!picked || busy}
              loading={busy}
              onClick={() => submitFile(versionTarget)}
            >
              Upload
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={(e) => {
              setPicked(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="w-full rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-emphasis)] bg-[var(--color-surface-alt)] p-6 text-center transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-hover)]"
          >
            <Upload className="mx-auto h-6 w-6 text-[var(--color-text-muted)]" />
            <p className="mt-2.5 text-[13px] font-medium text-[var(--color-text-primary)]">
              {picked ? picked.name : "Choose a file"}
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Images and PDFs up to {MAX_SIZES.image} MB · video up to {MAX_SIZES.video} MB
            </p>
            <p className="mt-2 text-[11.5px] text-[var(--color-text-muted)]">
              SVG is not accepted — use PNG, JPEG, WebP or GIF instead.
            </p>
          </button>
        </div>
      </Modal>
    </div>
  );
}
