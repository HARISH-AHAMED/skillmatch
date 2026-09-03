"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, initials, avatarTone } from "@/lib/utils";

const SIZES = {
  xs: { px: 24, text: "text-[10px]" },
  sm: { px: 32, text: "text-[11px]" },
  md: { px: 40, text: "text-[13px]" },
  lg: { px: 56, text: "text-[17px]" },
  xl: { px: 80, text: "text-[24px]" },
  "2xl": { px: 112, text: "text-[34px]" },
} as const;

export type AvatarSize = keyof typeof SIZES;

export function Avatar({
  src,
  name,
  size = "md",
  sizeClassName,
  rounded = "full",
  className,
  ring = false,
  status,
}: {
  src?: string;
  name: string;
  size?: AvatarSize;
  /**
   * Width/height utilities that replace `size` — the way to make an avatar
   * responsive, since `size` resolves to one fixed pixel value. A profile
   * header wants a smaller logo on a phone than on a desktop.
   */
  sizeClassName?: string;
  rounded?: "full" | "md";
  className?: string;
  ring?: boolean;
  status?: "AVAILABLE" | "BUSY" | "UNAVAILABLE";
}) {
  const [failed, setFailed] = useState(false);
  const { px, text } = SIZES[size];
  const radius = rounded === "full" ? "rounded-full" : "rounded-[var(--radius-md)]";

  const statusColor =
    status === "AVAILABLE"
      ? "bg-[var(--color-brand)]"
      : status === "BUSY"
        ? "bg-[var(--color-warning-fg)]"
        : "bg-[var(--color-text-muted)]";

  return (
    <span
      className={cn("relative inline-flex shrink-0", sizeClassName, className)}
      // An inline width would beat the responsive classes, so it is only
      // applied when the caller has not supplied its own sizing.
      style={sizeClassName ? undefined : { width: px, height: px }}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          onError={() => setFailed(true)}
          className={cn(
            radius,
            "h-full w-full object-cover",
            ring && "ring-2 ring-white",
          )}
        />
      ) : (
        <span
          className={cn(
            radius,
            "flex h-full w-full items-center justify-center font-semibold",
            text,
            avatarTone(name),
            ring && "ring-2 ring-white",
          )}
          aria-hidden
        >
          {initials(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-white",
            statusColor,
            px <= 32 ? "h-2 w-2" : "h-2.5 w-2.5",
          )}
          title={status}
        />
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
  size = "sm",
}: {
  people: { name: string; avatarUrl?: string }[];
  max?: number;
  size?: AvatarSize;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const px = SIZES[size].px;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <span key={`${p.name}-${i}`} className={i === 0 ? "" : "-ml-2"}>
          <Avatar src={p.avatarUrl} name={p.name} size={size} ring />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="-ml-2 flex items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[11px] font-semibold text-[var(--color-text-secondary)] ring-2 ring-white"
          style={{ width: px, height: px }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
