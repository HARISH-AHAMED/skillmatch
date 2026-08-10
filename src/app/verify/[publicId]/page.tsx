import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/Badge";
import { getCertificateByPublicId } from "@/actions/certificateActions";
import { CheckCircle2, ShieldAlert, Search, Building2, User } from "lucide-react";

interface PageProps {
  params: Promise<{ publicId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const cert = await getCertificateByPublicId(publicId);
  if (!cert) return { title: "Certificate Not Found — Talentra" };
  return {
    title: `${cert.recipientName} — ${cert.roleTitle} | Talentra Verified Certificate`,
    description: `Verified certificate issued by ${cert.issuerName} to ${cert.recipientName} for "${cert.projectTitle}".`,
  };
}

/**
 * Public certificate verification. Intentionally requires no authentication —
 * a credential only has value if an outside party (a recruiter, a university)
 * can confirm it independently.
 */
export default async function VerifyCertificatePage({ params }: PageProps) {
  const { publicId } = await params;
  const cert = await getCertificateByPublicId(publicId);

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-2xl w-full mx-auto px-6 py-12">
        {!cert ? (
          <div className="bg-white border border-hairline rounded-[12px] p-10 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-surface-soft border border-hairline flex items-center justify-center mx-auto">
              <Search className="h-5 w-5 text-muted" />
            </div>
            <h1 className="text-lg font-semibold text-ink">No certificate found</h1>
            <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
              No Talentra certificate matches the code{" "}
              <span className="font-mono text-ink">{publicId}</span>. Check the code and try again —
              codes look like <span className="font-mono">TLA-XXXX-XXXX</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Verification verdict — the single thing a visitor came here for */}
            <div
              className={`rounded-[12px] border p-4 flex items-start gap-3 ${
                cert.revokedAt
                  ? "bg-danger-surface border-danger-border"
                  : "bg-success-surface border-success-border/40"
              }`}
            >
              {cert.revokedAt ? (
                <ShieldAlert className="h-5 w-5 text-danger shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-semibold ${cert.revokedAt ? "text-danger" : "text-success"}`}>
                  {cert.revokedAt ? "This certificate has been revoked" : "Verified certificate"}
                </p>
                <p className="text-xs text-body mt-0.5">
                  {cert.revokedAt
                    ? `Withdrawn by the issuer on ${new Date(cert.revokedAt).toLocaleDateString()}.${
                        cert.revokeReason ? ` Reason: "${cert.revokeReason}"` : ""
                      }`
                    : "Issued through Talentra and confirmed against our records."}
                </p>
              </div>
            </div>

            {/* The certificate itself */}
            <div className="bg-white border border-hairline rounded-[12px] overflow-hidden">
              <div className="bg-ink px-8 py-6 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                  Talentra Verified Credential
                </p>
                <h1 className="text-xl font-semibold text-white mt-1">Certificate of Completion</h1>
              </div>

              <div className="px-8 py-8 space-y-6 text-center">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted">This certifies that</p>
                  <p className="text-2xl font-semibold text-ink mt-1">{cert.recipientName}</p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted">
                    successfully completed the role of
                  </p>
                  <p className="text-base font-semibold text-ink mt-1">{cert.roleTitle}</p>
                  <p className="text-xs text-body mt-1">on &ldquo;{cert.projectTitle}&rdquo;</p>
                </div>

                {cert.durationText && (
                  <p className="text-xs text-muted">Engagement duration: {cert.durationText}</p>
                )}

                {cert.summary && (
                  <p className="text-xs text-body leading-relaxed max-w-md mx-auto italic">
                    &ldquo;{cert.summary}&rdquo;
                  </p>
                )}

                {cert.skills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted">Skills demonstrated</p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {cert.skills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-hairline grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted">Issued by</p>
                      <p className="text-xs font-semibold text-ink">{cert.issuerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted">Issued on</p>
                      <p className="text-xs font-semibold text-ink">
                        {new Date(cert.issuedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-hairline">
                  <p className="text-[10px] uppercase tracking-wider text-muted">Credential ID</p>
                  <p className="font-mono text-sm text-ink tracking-wider mt-0.5">{cert.publicId}</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted text-center">
              Anyone can verify this credential at{" "}
              <Link href={`/verify/${cert.publicId}`} className="text-link hover:underline">
                /verify/{cert.publicId}
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
