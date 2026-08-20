"use client";

import { Award, Copy, Download, ExternalLink, EyeOff, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { CertificateRender } from "@/components/shared/CertificateRender";
import { certificateFrom } from "@/lib/certificate";
import { Stagger, StaggerItem } from "@/components/motion/Motion";
import { useSession } from "@/lib/session";
import { certificatesFor, getFreelancerByUserId } from "@/data/queries";
import type { Certificate } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function FreelancerCertificatesPage() {
  const { session } = useSession();
  const toast = useToast();
  const freelancer = session ? getFreelancerByUserId(session.userId) : undefined;

  const [hidden, setHidden] = useState<string[]>([]);
  const [preview, setPreview] = useState<Certificate | null>(null);

  const certificates = useMemo(
    () => (freelancer ? certificatesFor(freelancer.id, true) : []),
    [freelancer],
  );

  if (!freelancer) return null;

  const isHidden = (c: Certificate) => hidden.includes(c.id) || (c.hidden && !hidden.includes(c.id));

  const copyId = (publicId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(publicId);
      toast.success("Certificate ID copied");
    }
  };

  return (
    <div>
      <PageHeader
        title="My certificates"
        description="Issued automatically when an engagement completes. Every one has a public verification page that works without an account."
        action={
          <Button href="/verify" variant="secondary" leftIcon={<ShieldCheck className="h-4 w-4" />}>
            Verification page
          </Button>
        }
      />

      {certificates.length === 0 ? (
        <EmptyState
          icon={<Award />}
          title="No certificates yet"
          description="A certificate is issued for every engagement you complete — including apprentice placements, which get their own."
          action={{ label: "Browse open projects", href: "/freelancer/projects" }}
        />
      ) : (
        <>
          <Card padding="md" className="mb-5 bg-[var(--color-brand-softer)] border-[var(--color-brand-border)]">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]">
                <ShieldCheck className="h-4 w-4 text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                  Your certificates are portable
                </p>
                <p className="mt-1 text-[12.5px] leading-[1.6] text-[var(--color-text-secondary)]">
                  Content is snapshotted at issue time, so a certificate keeps saying what it said
                  the day it was issued — even if you change your display name later. Hiding one
                  removes it from your public profile, but direct verification by ID always works.
                </p>
              </div>
            </div>
          </Card>

          <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {certificates.map((c) => {
              const hiddenNow = isHidden(c);
              return (
                <StaggerItem key={c.id}>
                  <Card padding="none" className="flex h-full flex-col overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPreview(c)}
                      className="group relative block w-full overflow-hidden border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-alt)]"
                      aria-label={`Preview certificate for ${c.projectTitle}`}
                    >
                      <div className="pointer-events-none origin-top-left scale-[0.55] [width:181.8%]">
                        <CertificateRender data={certificateFrom(c)} config={c.config} />
                      </div>
                      <span className="absolute inset-0 flex items-center justify-center bg-[rgba(12,20,17,0)] transition-colors group-hover:bg-[rgba(12,20,17,0.28)]">
                        <span className="rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium opacity-0 shadow-[var(--shadow-md)] transition-opacity group-hover:opacity-100">
                          Preview
                        </span>
                      </span>
                    </button>

                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-[14px] font-semibold leading-[1.4] text-[var(--color-text-primary)]">
                          {c.projectTitle}
                        </h3>
                        {hiddenNow && (
                          <Badge tone="neutral" size="sm" icon={<EyeOff />}>
                            Hidden
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-[12.5px] text-[var(--color-text-secondary)]">
                        {c.roleTitle}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                        {c.issuerName} · {formatDate(c.issuedAt)}
                      </p>

                      <button
                        type="button"
                        onClick={() => copyId(c.publicId)}
                        className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-surface-alt)] px-2.5 py-1 font-mono text-[11.5px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-hover)]"
                      >
                        {c.publicId}
                        <Copy className="h-3 w-3" />
                      </button>

                      <div className="mt-auto pt-4">
                        <div className="mb-3 border-t border-[var(--color-border-subtle)] pt-3">
                          <Toggle
                            size="sm"
                            checked={!hiddenNow}
                            onChange={(v) => {
                              setHidden((prev) =>
                                v ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                              );
                              toast.toast({
                                title: v ? "Shown on your profile" : "Hidden from your profile",
                                tone: "success",
                              });
                            }}
                            label="Show on public profile"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            href={`/verify/${c.publicId}`}
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            aria-label="Download certificate"
                            onClick={() =>
                              toast.success(
                                "Certificate downloading",
                                "A PDF copy has been generated in your browser.",
                              )
                            }
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>
        </>
      )}

      {/* ---- Preview modal ---- */}
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.projectTitle}
        description={`Certificate ${preview?.publicId} · issued ${preview ? formatDate(preview.issuedAt) : ""}`}
        size="full"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Close
            </Button>
            {preview && (
              <>
                <Button
                  href={`/verify/${preview.publicId}`}
                  variant="secondary"
                  rightIcon={<ExternalLink className="h-4 w-4" />}
                >
                  Public page
                </Button>
                <Button
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => toast.success("Certificate downloading")}
                >
                  Download
                </Button>
              </>
            )}
          </>
        }
      >
        {preview && (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <CertificateRender data={certificateFrom(preview)} config={preview.config} />
          </div>
        )}
      </Modal>
    </div>
  );
}
