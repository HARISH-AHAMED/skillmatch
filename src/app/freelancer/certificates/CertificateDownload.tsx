"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { downloadCertificatePng } from "@/lib/downloadCertificate";

/**
 * Downloads the certificate artwork alone as a PNG file — the surrounding page
 * is never printed.
 */
export function CertificateDownload({ fileName }: { fileName?: string }) {
  const [busy, setBusy] = React.useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      await downloadCertificatePng(fileName || "certificate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" className="cursor-pointer gap-1.5" onClick={handle} disabled={busy}>
      <Download className="h-3.5 w-3.5" /> {busy ? "Preparing…" : "Download Certificate"}
    </Button>
  );
}
