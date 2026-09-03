"use client";

import Image from "next/image";
import { LogoMark } from "@/components/brand/Logo";
import type { CertificateConfig } from "@/lib/types";
import type { CertificateData } from "@/lib/certificate";
import { cn, formatDate } from "@/lib/utils";

/* ============================================================================
   CERTIFICATE RENDER

   One landscape award design: corner ribbons, the platform wordmark, the
   award statement, the issuer's own logo and signature, and a verification
   footer. Presentation still comes from CertificateConfig (§17.1) — accent
   colour, copy, alignment, signatories — and every factual value comes from
   the issued record and is never re-derived here.

   `layout` tunes the density rather than selecting a different design, so a
   certificate issued under any of the three settings stays recognisable as the
   same document.
   ========================================================================= */

export function CertificateRender({
  data,
  config,
  className,
  scale = 1,
}: {
  data: CertificateData;
  config: CertificateConfig;
  className?: string;
  scale?: number;
}) {
  const accent = config.accentColor || "#06C755";
  const ink = "#0F1613";

  const isMinimal = config.layout === "MINIMAL";
  const showRibbons = config.layout !== "MINIMAL";

  return (
    <div
      className={cn("w-full", className)}
      style={{ transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}
    >
      <article
        id="frivvo-certificate"
        className="relative aspect-[1.414/1] w-full overflow-hidden bg-white"
        // Every size below is expressed in cqw so the whole certificate scales
        // with its own width — the same document reads correctly in a small
        // preview card and at full page size.
        style={{ color: ink, containerType: "inline-size" }}
      >
        {/*
          Corner ribbons. Drawn as one SVG per corner rather than rotated
          boxes: a rotated square clipped by its parent fills the corner as a
          solid blob instead of reading as diagonal bands.
        */}
        {showRibbons && (
          <svg
            aria-hidden
            viewBox="0 0 1414 1000"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            {/* Top-left */}
            <polygon points="0,0 300,0 0,300" fill={ink} />
            <polygon points="120,0 200,0 0,200 0,120" fill={accent} />
            <polygon points="238,0 274,0 0,274 0,238" fill={accent} opacity="0.55" />

            {/* Bottom-right. Kept smaller than the top-left so it clears the
                date and second signature, which sit in the bottom row. */}
            <polygon points="1414,1000 1414,822 1236,1000" fill={ink} />
            <polygon points="1414,752 1414,802 1216,1000 1166,1000" fill={accent} />
            <polygon points="1414,712 1414,734 1148,1000 1126,1000" fill={accent} opacity="0.55" />
          </svg>
        )}

        {/* ---- Achievement ribbon ---- */}
        {showRibbons && (
          <div aria-hidden className="absolute top-0 right-[8%] w-[11%]">
            <svg viewBox="0 0 100 150" className="w-full">
              <polygon points="0,0 100,0 100,150 50,112 0,150" fill={ink} />
              <circle cx="50" cy="58" r="34" fill="none" stroke={accent} strokeWidth="4" />
              <circle cx="50" cy="58" r="27" fill={accent} opacity="0.16" />
              <text x="50" y="70" textAnchor="middle" fontSize="34" fill={accent}>
                ★
              </text>
            </svg>
          </div>
        )}

        {/* ---- Inner frame ---- */}
        {config.borderStyle !== "NONE" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[3.5%] rounded-[2px]"
            style={{
              border: config.borderStyle === "DOUBLE" ? `3px double ${accent}55` : `1px solid ${accent}40`,
            }}
          />
        )}

        {/* ---- Content ---- */}
        <div className={cn("relative flex h-full flex-col items-center justify-between text-center", isMinimal ? "px-[9%] py-[5%]" : "px-[9%] py-[4.5%]")}>
          {/* Platform mark */}
          <div className="flex items-center gap-[2.2%]">
            <LogoMark size={isMinimal ? 26 : 32} />
            <span className="text-[2.1cqw] font-extrabold tracking-[0.2em]" style={{ color: accent }}>
              FRIVVO
            </span>
          </div>

          {/* Award title */}
          <h1 className="mt-[2.5%] text-[5.6cqw] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase">
            {config.title}
          </h1>

          <div className="mt-[1.2%] flex w-full items-center justify-center gap-[3%]">
            <span className="h-px w-[12%]" style={{ backgroundColor: `${accent}80` }} />
            <p className="text-[2.05cqw] font-semibold tracking-[0.3em] uppercase" style={{ color: accent }}>
              {config.subtitle}
            </p>
            <span className="h-px w-[12%]" style={{ backgroundColor: `${accent}80` }} />
          </div>

          {/*
            The award statement owns the centre of the page. The issuer's logo
            used to sit in a left-hand column, which pushed the recipient's
            name off the centre line — the one thing a certificate should be
            symmetrical about. The logo now signs the document from the bottom
            right instead.
          */}
          <div className="flex w-full flex-1 flex-col items-center justify-center">
            <p className="text-[1.8cqw] tracking-[0.14em] text-[#59635E] uppercase">
              {config.achievementText}
            </p>

            <p className="mt-[2%] text-[5.6cqw] leading-none font-extrabold tracking-[-0.015em] uppercase">
              {data.recipientName}
            </p>
            <span className="mt-[1.6%] h-[2px] w-[46%]" style={{ backgroundColor: accent }} />

            <p className="mt-[2.4%] max-w-[78%] text-[1.95cqw] leading-[1.75] text-[#59635E]">
              for successfully completing the engagement{" "}
              <span className="font-bold" style={{ color: accent }}>
                “{data.projectTitle}”
              </span>
              <br />
              as <span className="font-bold" style={{ color: ink }}>{data.roleTitle}</span> with{" "}
              <span className="font-bold" style={{ color: accent }}>{data.issuerName}</span>
              {data.durationText ? `, over ${data.durationText}.` : "."}
            </p>

            {data.skills.length > 0 && (
              <div className="mt-[2.4%] flex max-w-[86%] flex-nowrap items-center justify-center gap-[1.4%] overflow-hidden">
                {data.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full px-[1.6cqw] py-[0.5cqw] text-[1.55cqw] leading-none font-semibold whitespace-nowrap capitalize"
                    style={{ backgroundColor: `${accent}12`, color: accent, border: `1px solid ${accent}33` }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Signed on the left, sealed in the middle, issued on the right. */}
          <div className="grid w-full grid-cols-3 items-end gap-[5%]">
            <Signature
              name={data.signer1Name}
              title={data.signer1Title}
              imageUrl={config.signatureUrl}
              accent={accent}
            />

            <div className="flex flex-col items-center">
              <Wreath accent={accent}>
                <LogoMark size={isMinimal ? 22 : 26} />
              </Wreath>
              <p className="mt-[3%] font-mono text-[1.4cqw] tracking-wider text-[#868F8A]">
                {data.publicId}
              </p>
            </div>

            {data.signer2Name ? (
              <Signature
                name={data.signer2Name}
                title={data.signer2Title}
                imageUrl={config.signature2Url}
                accent={accent}
              />
            ) : (
              <IssuerMark
                name={data.issuerName}
                logoUrl={config.logoUrl}
                issuedAt={data.issuedAt}
                accent={accent}
              />
            )}
          </div>

          <p className="mt-[1.5%] text-[1.35cqw] text-[#868F8A]">
            {config.footerText} · verify at frivvo.com/verify/{data.publicId}
          </p>
        </div>
      </article>
    </div>
  );
}

/* ------------------------------------------------------------ signature --- */

/**
 * A signatory block. The uploaded signature image sits on the rule; without
 * one the rule is simply blank, which is how a printed certificate would be
 * signed by hand.
 */
function Signature({
  name,
  title,
  imageUrl,
  accent,
}: {
  name?: string;
  title?: string;
  imageUrl?: string;
  accent: string;
}) {
  if (!name) return <div />;

  return (
    <div className="flex flex-col items-center">
      <span className="relative block h-[4.5cqw] w-full">
        {imageUrl && (
          <Image src={imageUrl} alt={`${name} signature`} fill sizes="220px" className="object-contain" unoptimized />
        )}
      </span>
      <span className="h-px w-full" style={{ backgroundColor: accent }} />
      <p className="mt-[5%] text-[2cqw] font-bold">{name}</p>
      {title && <p className="text-[1.6cqw] text-[#868F8A]">{title}</p>}
    </div>
  );
}

/* --------------------------------------------------------- issuer mark --- */

/**
 * The issuing company signs the document from the bottom right: its logo, then
 * the completion date on the same rule the signatures use, so the row reads as
 * one line of attestations rather than three unrelated blocks.
 */
function IssuerMark({
  name,
  logoUrl,
  issuedAt,
  accent,
}: {
  name: string;
  logoUrl?: string;
  issuedAt: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="relative flex h-[4.5cqw] w-full items-center justify-center">
        {logoUrl ? (
          <Image src={logoUrl} alt={name} fill sizes="220px" className="object-contain" unoptimized />
        ) : (
          <span className="text-[1.9cqw] font-bold tracking-[0.04em] uppercase">{name}</span>
        )}
      </span>
      <span className="h-px w-full" style={{ backgroundColor: accent }} />
      <p className="mt-[5%] text-[2cqw] font-bold">{formatDate(issuedAt)}</p>
      <p className="text-[1.6cqw] text-[#868F8A]">Date of Completion</p>
    </div>
  );
}

/* --------------------------------------------------------------- wreath --- */

/**
 * A laurel wreath around the platform mark.
 *
 * Each leaf sits on a circle and is rotated to that circle's *tangent*. The
 * previous version rotated them by 90° off the tangent, which points every
 * leaf outward from the centre and reads as a starburst rather than laurel.
 *
 * For a point at angle t from the bottom, (x, y) = (cx + R·sin t, cy + R·cos t),
 * and the tangent there runs at −t degrees in screen coordinates — mirrored
 * for the left-hand branch.
 */
function Wreath({ accent, children }: { accent: string; children: React.ReactNode }) {
  const centre = 50;
  const radius = 36;
  // Degrees from the bottom of the circle. Stopping at 118° leaves the top
  // open, which is what makes a wreath rather than a ring.
  const steps = [12, 33, 54, 75, 96, 117];

  const point = (deg: number, r: number, side: 1 | -1) => {
    const t = (deg * Math.PI) / 180;
    return [centre + side * r * Math.sin(t), centre + r * Math.cos(t)] as const;
  };

  const branch = (side: 1 | -1) => {
    const stem = Array.from({ length: 24 }, (_, i) => {
      const deg = 6 + (i / 23) * 116;
      const [x, y] = point(deg, radius, side);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");

    return (
      <g key={side}>
        <polyline points={stem} fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        {steps.map((deg) => {
          // Leaves sit just outside the stem so the branch stays visible.
          const [x, y] = point(deg, radius + 3.4, side);
          const rotation = side === 1 ? -deg : deg;
          return (
            <ellipse
              key={deg}
              cx={x}
              cy={y}
              rx="6.6"
              ry="2.7"
              fill={accent}
              transform={`rotate(${rotation} ${x} ${y})`}
            />
          );
        })}
      </g>
    );
  };

  return (
    <span className="relative flex h-[13cqw] w-[13cqw] items-center justify-center">
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full">
        {branch(1)}
        {branch(-1)}
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}
