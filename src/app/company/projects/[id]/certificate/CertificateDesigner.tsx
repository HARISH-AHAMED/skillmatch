"use client";

import { downloadCertificatePng } from "@/lib/downloadCertificate";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Save, Eye, Download } from "lucide-react";
import { saveCertificateDesign } from "@/actions/certificateActions";
import { CertificateControls, CertificatePreview, CertificateDynamicData } from "@/components/CertificateConfigurator";
import { CertificateConfig, defaultCertificateConfig } from "@/lib/workflowHelpers";

interface Props {
  projectId: string;
  initialConfig: CertificateConfig | null;
  data: CertificateDynamicData;
}

export function CertificateDesigner({ projectId, initialConfig, data }: Props) {
  const [config, setConfig] = useState<CertificateConfig>(initialConfig ?? defaultCertificateConfig());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [fullPreview, setFullPreview] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await saveCertificateDesign(projectId, config);
      setMessage({ type: "ok", text: "Certificate design saved. It will be used when certificates are issued." });
    } catch (err: any) {
      setMessage({ type: "err", text: err.message || "Failed to save certificate design." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/company/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#181d26]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to project
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => downloadCertificatePng("certificate-preview")}
          >
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button variant="outline" size="sm" className="cursor-pointer gap-1.5" onClick={() => setFullPreview((v) => !v)}>
            <Eye className="h-3.5 w-3.5" />
            {fullPreview ? "Back to editor" : "Preview Certificate"}
          </Button>
          <Button size="sm" className="cursor-pointer gap-1.5" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Certificate Design"}
          </Button>
        </div>
      </div>

      {message && (
        <Card
          className={`p-3 text-xs font-medium ${
            message.type === "ok" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </Card>
      )}

      {fullPreview ? (
        <Card className="bg-slate-100 p-4 sm:p-8">
          <CertificatePreview config={config} data={data} />
        </Card>
      ) : (
        /* Controls first on mobile, side-by-side from lg up. */
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-black text-[#181d26]">Customize Certificate</h2>
            <CertificateControls value={config} onChange={setConfig} disabled={saving} />
          </Card>

          <div className="space-y-2 lg:sticky lg:top-4 lg:self-start">
            <span className="block text-xs font-semibold text-slate-700">Live Preview</span>
            <Card className="bg-slate-100 p-3 sm:p-5">
              <CertificatePreview config={config} data={data} />
            </Card>
            <p className="text-[11px] text-slate-500">
              Recipient, project, role, skills, completion date, certificate ID and company name are filled
              automatically from Talentra and cannot be typed in manually.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
