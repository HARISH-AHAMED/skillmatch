"use client";

import React from "react";
import Link from "next/link";
import { Award, Eye, EyeOff, ExternalLink } from "lucide-react";
import { setCertificateVisibility } from "@/actions/certificateActions";

export interface EarnedCertificate {
  id: string;
  publicId: string;
  projectTitle: string;
  roleTitle: string;
  issuerName: string;
  issuedAt: string | Date;
  hidden: boolean;
}

/**
 * The freelancer's own view of their platform-issued certificates: view/download
 * links plus a per-certificate switch controlling whether it appears on their
 * public profile.
 */
export function EarnedCertificatesPanel({ certificates }: { certificates: EarnedCertificate[] }) {
  const [items, setItems] = React.useState(certificates);
  const [pending, setPending] = React.useState<string | null>(null);

  const toggle = async (cert: EarnedCertificate) => {
    setPending(cert.id);
    const res = await setCertificateVisibility(cert.id, cert.hidden);
    if (res.success) {
      setItems((prev) => prev.map((c) => (c.id === cert.id ? { ...c, hidden: !c.hidden } : c)));
    }
    setPending(null);
  };

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-[#E3E5EA]">
        <h4 className="text-xs font-bold text-[#5B6272]">Certificates</h4>
        <p className="text-[11px] text-[#5B6272]">
          Certificates companies issued to you on completed projects. Choose which ones show on
          your public profile.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-[#5B6272] italic text-center p-6 bg-[#F8F9FB] rounded-lg">
          No certificates yet. They appear here once a company completes a project you worked on.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((cert) => (
            <div
              key={cert.id}
              className="p-4 bg-white border border-[#E3E5EA] rounded-lg flex flex-wrap justify-between items-center gap-3 hover:border-[#E3E5EA] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-[#FFF3DC] border border-[#F5DEB0] rounded-lg text-[#8F5E08] shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#1A1D29] truncate">{cert.projectTitle}</h4>
                  <p className="text-[11px] text-[#5B6272] font-semibold truncate">
                    {cert.roleTitle} • {cert.issuerName} •{" "}
                    {new Date(cert.issuedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/freelancer/certificates/${cert.publicId}`}
                  className="px-3 py-1.5 text-[11px] font-bold text-[#2159C9] border border-[#E3E5EA] rounded-full hover:bg-[#F8F9FB] inline-flex items-center gap-1"
                >
                  View / Download <ExternalLink className="h-3 w-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(cert)}
                  disabled={pending === cert.id}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-full border inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 ${
                    cert.hidden
                      ? "text-[#5B6272] border-[#E3E5EA] hover:bg-[#F8F9FB]"
                      : "text-[#147A44] border-[#BFE9D2] bg-[#E4F7EC] hover:bg-[#E4F7EC]"
                  }`}
                  title={cert.hidden ? "Show on public profile" : "Hide from public profile"}
                >
                  {cert.hidden ? (
                    <>
                      <EyeOff className="h-3 w-3" /> Hidden
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" /> Visible
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
