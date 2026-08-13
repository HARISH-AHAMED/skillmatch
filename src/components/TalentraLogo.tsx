import React from "react";

/**
 * Talentra brand mark: a stylised "T" cut from a rotated diamond, echoing the
 * platform's angular geometry. Pure SVG so it stays crisp in print and needs no
 * asset hosting.
 */
export function TalentraMark({ size = 28, color = "#1968E5" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="24" y="2" width="31" height="31" rx="5" transform="rotate(45 24 2)" fill={color} />
      <path d="M15 18h18v5h-6.5v13h-5V23H15v-5z" fill="#fff" />
    </svg>
  );
}

/** Mark plus wordmark, for footers and headers. */
export function TalentraLogo({ size = 20, color = "#1968E5" }: { size?: number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <TalentraMark size={size} color={color} />
      <span
        className="font-black uppercase tracking-[0.18em]"
        style={{ color, fontSize: size * 0.62 }}
      >
        Talentra
      </span>
    </span>
  );
}
