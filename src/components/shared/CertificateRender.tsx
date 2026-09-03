"use client";

import Image from "next/image";
import { LogoMark } from "@/components/brand/Logo";
import type { CertificateConfig } from "@/lib/types";
import type { CertificateData } from "@/lib/certificate";
import { cn, formatDate } from "@/lib/utils";

/* ============================================================================
   CERTIFICATE RENDER

   One landscape award design, built to the approved template: layered angular
   corners, the platform wordmark, the award statement, then a three-column
   attestation footer — the issuer's signature, the issuer's logo, and the
   completion date — under the Frivvo laurel and the verification line.

   Presentation comes from CertificateConfig (§17.1): accent colour, copy,
   the uploaded logo and the uploaded signature. Every *factual* value comes
   from the issued record and is never re-derived here, so a certificate keeps
   saying what it said when it was issued.

   Sizes are expressed in cqw against the article's own inline size, so the
   same document reads correctly in a small preview card and at full page.
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
  const ink = "#0B0F0D";
  const muted = "#5C6660";

  /*
   * The page ground is pure white on purpose.
   *
   * Signatures and company logos are uploaded as flat images, and most are
   * exported with an opaque white background rather than transparency. Against
   * an off-white ground each of those sat in a visible pale rectangle. Matching
   * the ground to the artwork is what makes an uploaded signature read as
   * having been signed onto the page.
   *
   * One constant feeds both the page and the hairline drawn through the corner
   * band, so the two can never drift to different whites.
   */
  const ground = "#FFFFFF";

  // MINIMAL drops the decorative corners; the document is otherwise identical,
  // so a certificate stays recognisable whichever layout issued it.
  const showCorners = config.layout !== "MINIMAL";

  /*
   * The template signs the document with the signatory's designation over the
   * issuing company, so that is what the block prints. A design that names a
   * signatory but gives them no designation still reads correctly: the name
   * takes the bold line rather than being dropped.
   */
  const signerLead = data.signer1Title || data.signer1Name;
  const signerSub = data.signer1Title ? data.issuerName : undefined;

  return (
    <div
      className={cn("w-full", className)}
      style={{ transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}
    >
      <article
        id="frivvo-certificate"
        className="relative aspect-[1.414/1] w-full overflow-hidden"
        style={{ color: ink, backgroundColor: ground, containerType: "inline-size" }}
      >
        <Ornament accent={accent} ink={ink} ground={ground} show={showCorners} />

        {/* ---- Inner frame ---- */}
        {config.borderStyle !== "NONE" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[2.6%] rounded-[6px]"
            style={{
              border:
                config.borderStyle === "DOUBLE"
                  ? `3px double ${accent}66`
                  : `1.5px solid ${accent}59`,
            }}
          />
        )}

        {/* ---- Content ---- */}
        <div className="relative flex h-full flex-col items-center px-[9%] pt-[4.1%] pb-[2.6%] text-center">
          {/* Platform mark */}
          <div className="flex items-center gap-[1.5%]">
            <LogoMark size={30} />
            <span
              className="text-[2.7cqw] leading-none font-extrabold tracking-[0.14em]"
              style={{ color: accent }}
            >
              FRIVVO
            </span>
          </div>

          {/* Award title */}
          <h1 className="mt-[1.9%] text-[7cqw] leading-[0.92] font-extrabold tracking-[0.01em] uppercase">
            {config.title}
          </h1>

          <div className="mt-[1%] flex w-full items-center justify-center gap-[2.4%]">
            <span className="h-[2px] w-[13%]" style={{ backgroundColor: accent }} />
            <p
              className="text-[2.35cqw] leading-none font-bold tracking-[0.26em] uppercase"
              style={{ color: accent }}
            >
              {config.subtitle}
            </p>
            <span className="h-[2px] w-[13%]" style={{ backgroundColor: accent }} />
          </div>

          <p
            className="mt-[1.9%] text-[1.68cqw] leading-none tracking-[0.19em] uppercase"
            style={{ color: muted }}
          >
            {config.achievementText}
          </p>

          {/* Recipient */}
          <p className="mt-[1.9%] text-[6cqw] leading-none font-extrabold tracking-[-0.005em] uppercase">
            {data.recipientName}
          </p>
          <span className="mt-[1.5%] h-[2.5px] w-[48%]" style={{ backgroundColor: accent }} />

          {/* Award statement */}
          <p className="mt-[1.9%] text-[2cqw] leading-[1.6]" style={{ color: "#2C3531" }}>
            for successfully completing the engagement
          </p>
          <p
            className="mt-[0.5%] text-[2.4cqw] leading-[1.3] font-bold"
            style={{ color: accent }}
          >
            “{data.projectTitle}”
          </p>
          <p className="mt-[0.7%] text-[2cqw] leading-[1.45]" style={{ color: "#2C3531" }}>
            as <span className="font-bold" style={{ color: ink }}>{data.roleTitle}</span> with{" "}
            <span className="font-bold" style={{ color: accent }}>{data.issuerName}</span>
            {data.durationText ? `, over ${data.durationText}.` : "."}
          </p>

          {/*
            The skills row was removed from the document deliberately: it
            competed with the engagement statement for the same band of the
            page and left the attestation footer cramped. The skills are still
            snapshotted on the certificate record and still credited on the
            freelancer's profile — they are simply not printed here.
          */}

          {/* ---- Attestation row: signature | issuer logo | date ---- */}
          <div className="mt-auto grid w-full grid-cols-[1fr_auto_1fr] items-end gap-[3.4%] pt-[2%]">
            <Attestation
              accent={accent}
              muted={muted}
              lead={signerLead}
              sub={signerSub}
              media={
                config.signatureUrl ? (
                  <Image
                    src={config.signatureUrl}
                    alt={`${signerLead ?? data.issuerName} signature`}
                    fill
                    sizes="260px"
                    className="object-contain object-bottom"
                    unoptimized
                  />
                ) : null
              }
            />

            {/* The issuing company's own mark, between the two attestations. */}
            <div className="flex h-full min-w-[20%] items-center justify-center px-[8%]">
              <span className="relative flex h-[6cqw] w-[15cqw] items-center justify-center">
                {config.logoUrl ? (
                  <Image
                    src={config.logoUrl}
                    alt={data.issuerName}
                    fill
                    sizes="320px"
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-[2.1cqw] leading-tight font-bold tracking-[0.02em] uppercase">
                    {data.issuerName}
                  </span>
                )}
              </span>
            </div>

            <Attestation
              accent={accent}
              muted={muted}
              lead={formatDate(data.issuedAt)}
              subLabel="Date of Completion"
              align="center"
            />
          </div>

          {/* ---- Platform seal ---- */}
          <div className="mt-[1.6%] flex flex-col items-center">
            <Laurel accent={accent}>
              <span
                className="text-[2.6cqw] leading-none font-extrabold tracking-[0.2em]"
                style={{ color: accent }}
              >
                FRIVVO
              </span>
            </Laurel>
            <p className="mt-[0.5%] text-[1.72cqw] leading-none" style={{ color: "#2C3531" }}>
              Build. Collaborate. Grow.
            </p>
          </div>

          {/* ---- Verification ---- */}
          <p
            className="mt-[1%] flex items-center justify-center gap-[0.7cqw] text-[1.32cqw] leading-none"
            style={{ color: muted }}
          >
            <Globe accent={accent} />
            <span>{config.footerText}</span>
            <span aria-hidden>•</span>
            <span>Verify at frivvo.com/verify/{data.publicId}</span>
          </p>
        </div>
      </article>
    </div>
  );
}

/* ---------------------------------------------------------- attestation --- */

/**
 * One footer column: the thing being attested (a signature image, or the
 * completion date), the rule it sits on, and its label.
 *
 * A vertical hairline separates it from the issuer's mark, which is what makes
 * the three blocks read as one row of attestations rather than three unrelated
 * items.
 */
function Attestation({
  accent,
  muted,
  lead,
  sub,
  subLabel,
  media,
  align = "center",
}: {
  accent: string;
  muted: string;
  lead?: string;
  sub?: string;
  subLabel?: string;
  media?: React.ReactNode;
  align?: "center";
}) {
  return (
    <div className={cn("flex flex-col", align === "center" && "items-center")}>
      {/* The signature sits on the rule; a date column simply prints above it. */}
      {media !== undefined ? (
        <span className="relative block h-[4.6cqw] w-[74%]">{media}</span>
      ) : (
        <span className="flex h-[4.6cqw] w-[74%] items-end justify-center pb-[3%]">
          <span className="text-[2.35cqw] leading-none font-bold">{lead}</span>
        </span>
      )}

      <span className="h-[1.5px] w-[74%]" style={{ backgroundColor: accent }} />

      {media !== undefined ? (
        <>
          {lead && (
            <p className="mt-[4%] text-[1.72cqw] leading-none font-bold tracking-[0.06em] uppercase">
              {lead}
            </p>
          )}
          {sub && (
            <p className="mt-[2.5%] text-[1.6cqw] leading-none" style={{ color: muted }}>
              {sub}
            </p>
          )}
        </>
      ) : (
        <p className="mt-[4%] text-[1.72cqw] leading-none font-bold tracking-[0.06em] uppercase">
          {subLabel}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- globe --- */

function Globe({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[1.5cqw] w-[1.5cqw] shrink-0">
      <circle cx="12" cy="12" r="9.5" fill="none" stroke={accent} strokeWidth="1.8" />
      <ellipse cx="12" cy="12" rx="4.2" ry="9.5" fill="none" stroke={accent} strokeWidth="1.6" />
      <path d="M2.5 12h19M4 7h16M4 17h16" fill="none" stroke={accent} strokeWidth="1.6" />
    </svg>
  );
}

/* ------------------------------------------------------------ ornament --- */

/**
 * The layered corners.
 *
 * Every band is the region between two parallel lines `x + y = a` and
 * `x + y = b`, clipped to the corner — which is a trapezoid, and is why these
 * are polygons rather than rotated boxes. A rotated square clipped by its
 * parent fills the corner as a solid blob instead of reading as diagonal
 * bands. The rounded green sweep is the one shape that needs real round caps,
 * so it alone is a rotated rounded rect.
 */
function Ornament({
  accent,
  ink,
  ground,
  show,
}: {
  accent: string;
  ink: string;
  ground: string;
  show: boolean;
}) {
  if (!show) return null;

  // Bands are described at the top-left corner and mirrored into the
  // bottom-right by the group transform, so the two corners cannot drift.
  const band = (a: number, b: number) => `${a},0 ${b},0 0,${b} 0,${a}`;

  return (
    <svg
      aria-hidden
      viewBox="0 0 1414 1000"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {/* Faint contour lines, top-right and bottom-left. */}
      <g fill="none" stroke={accent} strokeWidth="1.6" opacity="0.16">
        {[0, 26, 52, 78].map((d) => (
          <path key={d} d={`M ${1150 + d} 0 C ${1210 + d} 70, ${1350 + d} 60, ${1414 + d} 165`} />
        ))}
        {[0, 26, 52, 78].map((d) => (
          <path key={`b${d}`} d={`M ${-14 - d} 835 C ${50 - d} 940, ${190 - d} 930, ${250 - d} 1000`} />
        ))}
      </g>

      {/* Dot fields, mirroring the contour corners. */}
      <g fill={accent} opacity="0.22">
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 9 }).map((__, c) => (
            <circle key={`tr${r}-${c}`} cx={1252 + c * 17} cy={86 + r * 17} r="2.4" />
          ))
        )}
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 9 }).map((__, c) => (
            <circle key={`bl${r}-${c}`} cx={44 + c * 17} cy={862 + r * 17} r="2.4" />
          ))
        )}
      </g>

      {/* Top-left corner */}
      <g>
        <polygon points={band(0, 322)} fill={ink} />
        {/* The hairline that splits the dark band, in the page ground. */}
        <polygon points={band(243, 262)} fill={ground} />
        {/* Rounded green sweep, riding just outside the dark band. */}
        <g transform="translate(108 250) rotate(-45)">
          <rect x="-236" y="-27" width="472" height="54" rx="27" fill={accent} />
        </g>
      </g>

      {/* Bottom-right corner, the same construction mirrored through the centre. */}
      <g transform="translate(1414 1000) rotate(180)">
        <polygon points={band(0, 300)} fill={ink} />
        <polygon points={band(226, 244)} fill={ground} />
        <g transform="translate(100 232) rotate(-45)">
          <rect x="-218" y="-26" width="436" height="52" rx="26" fill={accent} />
        </g>
      </g>
    </svg>
  );
}

/* --------------------------------------------------------------- laurel --- */

/**
 * The laurel flanking the platform wordmark.
 *
 * The template sets two branches either side of the word rather than a wreath
 * encircling it, so each branch is drawn on its own and the viewBox crops to
 * just that side's arc — a full 100×100 circle scaled into a wide, short box
 * collapses into a ring around the text instead.
 *
 * Each leaf sits on the arc and is rotated to the circle's *tangent* there.
 * For a point at angle t from the bottom, (x, y) = (cx + R·sin t, cy + R·cos t),
 * and the tangent runs at −t degrees in screen coordinates, mirrored for the
 * left-hand branch.
 */
function LaurelBranch({ accent, side }: { accent: string; side: 1 | -1 }) {
  const centre = 50;
  const radius = 34;
  // The arc either side of the horizontal, which is the portion that reads as
  // a branch curving around the word.
  const steps = [42, 62, 82, 102, 122];

  const point = (deg: number, r: number) => {
    const t = (deg * Math.PI) / 180;
    return [centre + side * r * Math.sin(t), centre + r * Math.cos(t)] as const;
  };

  const stem = Array.from({ length: 20 }, (_, i) => {
    const deg = 34 + (i / 19) * 96;
    const [x, y] = point(deg, radius);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  // Crop to this branch's own arc: x spans centre±(R·sin) over the range, so
  // the right branch lives in x ∈ [~69, 84] and the left mirrors it.
  const viewBox = side === 1 ? "60 8 34 84" : "6 8 34 84";

  return (
    <svg
      viewBox={viewBox}
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
      className="h-full shrink-0"
      style={{ aspectRatio: "34 / 84" }}
    >
      <polyline
        points={stem}
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      {steps.map((deg) => {
        const [x, y] = point(deg, radius + 3.2);
        const rotation = side === 1 ? -deg : deg;
        return (
          <ellipse
            key={deg}
            cx={x}
            cy={y}
            rx="7.6"
            ry="3.2"
            fill={accent}
            transform={`rotate(${rotation} ${x} ${y})`}
          />
        );
      })}
    </svg>
  );
}

function Laurel({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <span className="flex h-[6.2cqw] items-center justify-center gap-[1.4cqw]">
      <LaurelBranch accent={accent} side={-1} />
      {children}
      <LaurelBranch accent={accent} side={1} />
    </span>
  );
}
