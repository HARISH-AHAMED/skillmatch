"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { respondToInvite } from "@/actions/inviteActions";

/**
 * Declines a project invitation. Accepting is a link into the existing apply
 * flow, so only the decline path needs client interactivity here.
 */
export function DeclineInviteButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const decline = async () => {
    if (!confirm("Decline this invitation? It will be removed from your dashboard.")) return;
    setBusy(true);
    try {
      const res = await respondToInvite(projectId, "DISMISS");
      if (res.success) router.refresh();
      else alert(res.error || "Could not decline the invitation.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not decline the invitation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={decline} className="cursor-pointer">
      {busy ? "Declining…" : "Decline"}
    </Button>
  );
}
