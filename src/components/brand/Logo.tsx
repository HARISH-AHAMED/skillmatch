import { cn } from "@/lib/utils";

/* ============================================================================
   FRIVVO brand marks — vector so they stay crisp at every size and can be
   recoloured for dark surfaces without a second asset.
   ========================================================================= */

export function LogoMark({
  size = 32,
  className,
  tile = true,
}: {
  size?: number;
  className?: string;
  tile?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FRIVVO"
      className={cn("shrink-0", className)}
    >
      {tile && (
        <>
          <rect width="64" height="64" rx="16" fill="var(--color-brand-ink)" />
          <rect
            width="64"
            height="64"
            rx="16"
            fill="url(#frivvo-glow)"
            fillOpacity="0.55"
          />
        </>
      )}
      {/* F */}
      <path
        d="M17.5 50V23.5C17.5 19.9 20.4 17 24 17H47L42 25.2H25.6V31.4H40.2L35.2 39.6H25.6V50H17.5Z"
        fill={tile ? "#FFFFFF" : "var(--color-brand-ink)"}
      />
      {/* V */}
      <path
        d="M31.8 24H40.2L44.6 35.6L48.9 24H57.3L48.4 46.6H40.7L31.8 24Z"
        fill="var(--color-brand-bright)"
      />
      <defs>
        <radialGradient
          id="frivvo-glow"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(58 60) rotate(-135) scale(52)"
        >
          <stop stopColor="var(--color-brand)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--color-brand)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function LogoWordmark({
  className,
  inverse = false,
}: {
  className?: string;
  inverse?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-extrabold tracking-[-0.03em] leading-none select-none",
        className,
      )}
      style={{ fontSize: "inherit" }}
    >
      <span style={{ color: inverse ? "#FFFFFF" : "var(--color-brand-ink)" }}>FRI</span>
      <span style={{ color: "var(--color-brand-bright)" }}>VV</span>
      <span style={{ color: inverse ? "#FFFFFF" : "var(--color-brand-ink)" }}>O</span>
    </span>
  );
}

export function Logo({
  size = 32,
  showWordmark = true,
  inverse = false,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <LogoWordmark inverse={inverse} className="text-[19px] pt-px" />
      )}
    </span>
  );
}
