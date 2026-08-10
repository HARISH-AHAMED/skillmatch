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
      <div className="pb-2 border-b border-slate-100">
        <h4 className="text-xs font-bold text-slate-700">Certificates</h4>
        <p className="text-[10px] text-slate-500">
          Certificates companies issued to you on completed projects. Choose which ones show on
          your public profile.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center p-6 bg-slate-50 rounded-2xl">
          No certificates yet. They appear here once a company completes a project you worked on.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((cert) => (
            <div
              key={cert.id}
              className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-wrap justify-between items-center gap-3 hover:border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#181d26] truncate">{cert.projectTitle}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">
                    {cert.roleTitle} • {cert.issuerName} •{" "}
                    {new Date(cert.issuedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/freelancer/certificates/${cert.publicId}`}
                  className="px-3 py-1.5 text-[10px] font-bold text-[#1b61c9] border border-slate-200 rounded-xl hover:bg-slate-50 inline-flex items-center gap-1"
                >
                  View / Download <ExternalLink className="h-3 w-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(cert)}
                  disabled={pending === cert.id}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-xl border inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 ${
                    cert.hidden
                      ? "text-slate-500 border-slate-200 hover:bg-slate-50"
                      : "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
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
