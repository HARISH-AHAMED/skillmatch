"use client";

import { Award } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import type { CertificateConfig } from "@/lib/types";
import type { CertificateData } from "@/lib/certificate";
import { cn, formatDate } from "@/lib/utils";

/* ============================================================================
   CERTIFICATE RENDER
   Presentation is driven entirely by CertificateConfig (§17.1). Every factual
   value comes from the issued certificate record and is never re-derived.
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

  const align =
    config.textAlign === "LEFT"
      ? "text-left items-start"
      : config.textAlign === "RIGHT"
        ? "text-right items-end"
        : "text-center items-center";

  const logoAlign =
    config.logoPosition === "LEFT"
      ? "justify-start"
      : config.logoPosition === "RIGHT"
        ? "justify-end"
        : "justify-center";

  const border =
    config.borderStyle === "NONE"
      ? "border-transparent"
      : config.borderStyle === "DOUBLE"
        ? "border-[3px] double"
        : "border";

  const isMinimal = config.layout === "MINIMAL";
  const isModern = config.layout === "MODERN";

  return (
    <div
      className={cn("w-full", className)}
      style={{ transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}
    >
      <article
        id="frivvo-certificate"
        className={cn(
          "relative aspect-[1.414/1] w-full overflow-hidden bg-white",
          isMinimal ? "p-8 md:p-12" : "p-6 md:p-10",
        )}
        style={{ color: "#0F1613" }}
      >
        {/* Decorative frame */}
        {config.borderStyle !== "NONE" && (
          <div
            className={cn("pointer-events-none absolute inset-3 md:inset-5", border)}
            style={{ borderColor: accent, borderStyle: config.borderStyle === "DOUBLE" ? "double" : "solid" }}
          />
        )}

        {/* Modern accent bar */}
        {isModern && (
          <div className="absolute left-0 top-0 h-full w-[10px]" style={{ backgroundColor: accent }} />
        )}

        {/* Corner flourish */}
        {!isMinimal && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.07]"
              style={{ backgroundColor: accent }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full opacity-[0.05]"
              style={{ backgroundColor: accent }}
            />
          </>
        )}

        <div
          className={cn(
            "relative flex h-full flex-col",
            isModern ? "pl-6 md:pl-8" : "",
            align,
          )}
        >
          {/* Header / logo */}
          <div className={cn("flex w-full items-center gap-3", logoAlign)}>
            <LogoMark size={isMinimal ? 30 : 38} />
            <span
              className="text-[13px] font-bold uppercase tracking-[0.18em] md:text-[15px]"
              style={{ color: accent }}
            >
              FRIVVO
            </span>
          </div>

          {/* Title */}
          <div className={cn("mt-5 flex w-full flex-col md:mt-7", align)}>
            <h1
              className={cn(
                "font-semibold leading-none tracking-[-0.02em]",
                isMinimal ? "text-[24px] md:text-[34px]" : "text-[26px] md:text-[40px]",
              )}
            >
              {config.title}
            </h1>
            <p
              className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.22em] md:text-[15px]"
              style={{ color: accent }}
            >
              {config.subtitle}
            </p>
          </div>

          {/* Recipient */}
          <div className={cn("mt-5 flex w-full flex-col md:mt-8", align)}>
            <p className="text-[11px] text-[#59635E] md:text-[13px]">{config.achievementText}</p>
            <p
              className={cn(
                "mt-2 font-semibold leading-tight tracking-[-0.015em]",
                isMinimal ? "text-[22px] md:text-[32px]" : "text-[24px] md:text-[36px]",
              )}
            >
              {data.recipientName}
            </p>
            <div
              className="mt-2.5 h-px w-full max-w-[280px]"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                alignSelf:
                  config.textAlign === "LEFT"
                    ? "flex-start"
                    : config.textAlign === "RIGHT"
                      ? "flex-end"
                      : "center",
              }}
            />
          </div>

          {/* Body */}
          <div className={cn("mt-4 flex w-full max-w-2xl flex-col md:mt-6", align)}>
            <p className="text-[11.5px] leading-[1.7] text-[#59635E] md:text-[14px]">
              for successfully completing the engagement{" "}
              <span className="font-semibold text-[#0F1613]">“{data.projectTitle}”</span> as{" "}
              <span className="font-semibold text-[#0F1613]">{data.roleTitle}</span> with{" "}
              <span className="font-semibold text-[#0F1613]">{data.issuerName}</span>
              {data.durationText ? `, over ${data.durationText}` : ""}.
            </p>

            {data.skills.length > 0 && (
              <div
                className={cn(
                  "mt-3 flex flex-wrap gap-1.5",
                  config.textAlign === "CENTER" && "justify-center",
                  config.textAlign === "RIGHT" && "justify-end",
                )}
              >
                {data.skills.slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="rounded-full px-2.5 py-0.5 text-[9.5px] font-medium capitalize md:text-[11px]"
                    style={{ backgroundColor: `${accent}14`, color: accent }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="mt-auto w-full pt-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              {data.signer1Name && (
                <div className="min-w-[130px] text-left">
                  <div className="h-8 border-b border-[#C6CCC9]" />
                  <p className="mt-1.5 text-[11px] font-semibold md:text-[12.5px]">
                    {data.signer1Name}
                  </p>
                  <p className="text-[9.5px] text-[#868F8A] md:text-[11px]">{data.signer1Title}</p>
                </div>
              )}

              {/* Seal */}
              <div className="flex flex-col items-center">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full md:h-14 md:w-14"
                  style={{ backgroundColor: `${accent}18`, border: `1.5px solid ${accent}` }}
                >
                  <Award className="h-5 w-5 md:h-6 md:w-6" style={{ color: accent }} />
                </div>
                <p className="mt-1.5 font-mono text-[9px] tracking-wider text-[#868F8A] md:text-[10.5px]">
                  {data.publicId}
                </p>
              </div>

              {data.signer2Name && (
                <div className="min-w-[130px] text-right">
                  <div className="h-8 border-b border-[#C6CCC9]" />
                  <p className="mt-1.5 text-[11px] font-semibold md:text-[12.5px]">
                    {data.signer2Name}
                  </p>
                  <p className="text-[9.5px] text-[#868F8A] md:text-[11px]">{data.signer2Title}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF0EE] pt-3">
              <p className="text-[9.5px] text-[#868F8A] md:text-[11px]">{config.footerText}</p>
              <p className="text-[9.5px] text-[#868F8A] md:text-[11px]">
                Issued {formatDate(data.issuedAt)} · verify at frivvo.com/verify/{data.publicId}
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
