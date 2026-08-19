import React from "react";
import { CheckCircle2, Clock, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One status-indicator treatment for the whole app.
 *
 * Requirements #1 and #2 were two different flat bars with two different
 * colour choices, one of which put low-contrast text on a tinted background.
 * Both now render through this, so a status reads the same wherever it appears.
 *
 * Every tone pairs a light tint with a dark ink from the existing palette
 * family; the lowest ratio here is ~7:1 on white-ish tint, comfortably past
 * WCAG AA for body text.
 */
export type StatusTone = "success" | "pending" | "info" | "danger";

const TONES: Record<StatusTone, { wrap: string; ink: string; Icon: typeof CheckCircle2 }> = {
  // #145A32 on #E7F4EC ≈ 7.6:1
  success: { wrap: "border-[#BFE0CC] bg-[#E7F4EC]", ink: "text-[#145A32]", Icon: CheckCircle2 },
  // #7A4E00 on #FDF3E2 ≈ 7.1:1
  pending: { wrap: "border-[#F0DCB4] bg-[#FDF3E2]", ink: "text-[#7A4E00]", Icon: Clock },
  // #17408F on #E8F1FE ≈ 8.2:1
  info: { wrap: "border-[#C7D9F7] bg-[#E8F1FE]", ink: "text-[#17408F]", Icon: Info },
  // #8A1F1F on #FBEAEA ≈ 8.0:1
  danger: { wrap: "border-[#F0C9C9] bg-[#FBEAEA]", ink: "text-[#8A1F1F]", Icon: AlertCircle },
};

interface StatusIndicatorProps {
  tone: StatusTone;
  label: string;
  /** Supporting line, e.g. the reason completion is blocked. */
  detail?: string | null;
  /** Optional trailing control; wraps below the text on narrow screens. */
  action?: React.ReactNode;
  className?: string;
}

export function StatusIndicator({ tone, label, detail, action, className }: StatusIndicatorProps) {
  const { wrap, ink, Icon } = TONES[tone];
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-2 rounded-lg border px-4 py-3",
        "sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        wrap,
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon className={cn("mt-px h-4 w-4 shrink-0", ink)} aria-hidden="true" />
        <div className="min-w-0">
          <p className={cn("text-xs font-semibold leading-tight", ink)}>{label}</p>
          {detail && (
            <p className={cn("mt-0.5 text-[11px] leading-relaxed", ink, "opacity-90")}>{detail}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0 sm:ml-auto">{action}</div>}
    </div>
  );
}
