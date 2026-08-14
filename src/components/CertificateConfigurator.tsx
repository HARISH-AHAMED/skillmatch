"use client";

import React from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProjectBannerUpload } from "@/components/ProjectBannerUpload";
import { TalentraLogo } from "@/components/TalentraLogo";
import {
  CertificateConfig,
  CERTIFICATE_LAYOUTS,
  CERTIFICATE_BORDERS,
  defaultCertificateConfig,
} from "@/lib/workflowHelpers";

/** Values Talentra fills in itself. The company never types any of these. */
export interface CertificateDynamicData {
  freelancerName: string;
  projectName: string;
  role: string;
  skills: string[];
  completionDate: string;
  certificateId: string;
  companyName: string;
}

interface PreviewProps {
  config: CertificateConfig;
  data: CertificateDynamicData;
}

/** Fine line-work ribbon sweeping across the top-right corner. */
function LineWaves({ color }: { color: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 h-[46%] w-full"
      viewBox="0 0 1000 320"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {Array.from({ length: 26 }).map((_, i) => (
        <path
          key={i}
          d={`M-40 ${40 + i * 5} C 200 ${-40 + i * 7}, 380 ${210 + i * 4}, 640 ${120 + i * 5} S 940 ${10 + i * 6}, 1040 ${60 + i * 5}`}
          fill="none"
          stroke={color}
          strokeWidth="0.9"
          opacity={0.22}
        />
      ))}
    </svg>
  );
}

/** Layered solid waves anchoring the bottom-left corner. */
function SolidWaves({ color }: { color: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] w-full"
      viewBox="0 0 1000 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0 96 C 190 26, 330 168, 560 140 S 860 60, 1000 96 V200 H0 Z" fill={color} opacity="0.18" />
      <path d="M0 128 C 200 62, 340 190, 570 162 S 870 96, 1000 128 V200 H0 Z" fill={color} opacity="0.42" />
      <path d="M0 158 C 210 104, 350 206, 580 186 S 880 138, 1000 160 V200 H0 Z" fill={color} />
    </svg>
  );
}

/** One signature column: signature rule, name, designation. */
function Signatory({ name, designation, color }: { name: string; designation: string; color: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p
        className="truncate pb-1 text-[clamp(0.7rem,1.7vw,1.15rem)] italic leading-none text-[#1A1D29]"
        style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}
      >
        {name || " "}
      </p>
      <div className="mx-auto h-px w-full" style={{ backgroundColor: color }} />
      <p className="mt-1 truncate text-[clamp(0.5rem,0.95vw,0.75rem)] font-bold text-[#1A1D29]">
        {name || "—"}
      </p>
      <p className="truncate text-[clamp(0.42rem,0.8vw,0.62rem)] text-[#5B6272]">{designation || ""}</p>
    </div>
  );
}

/**
 * The Talentra default certificate: a print-quality, awards-style layout with
 * ribboned line-work, a strong two-tier heading, a script recipient line and a
 * dual-signatory footer. Deliberately fixed — the company adjusts content,
 * colour, alignment and layout, never the composition.
 */
export function CertificatePreview({ config: c, data }: PreviewProps) {
  const accent = c.accentColor;
  const align =
    c.textAlign === "LEFT" ? "text-left items-start" : c.textAlign === "RIGHT" ? "text-right items-end" : "text-center items-center";
  const brandJustify =
    c.logoPosition === "LEFT" ? "justify-start" : c.logoPosition === "RIGHT" ? "justify-end" : "justify-center";

  return (
    <div
      id="certificate-preview"
      className="certificate-sheet relative mx-auto w-full max-w-4xl overflow-hidden bg-white shadow-lg print:shadow-none"
      style={{ aspectRatio: "1.414 / 1" }}
    >
      {c.layout !== "MINIMAL" && <LineWaves color={accent} />}
      <SolidWaves color={accent} />

      {/* Optional framing rule, kept inside the decorative art */}
      {c.borderStyle !== "NONE" && (
        <div
          className="pointer-events-none absolute inset-[2.5%]"
          style={{
            borderStyle: c.borderStyle === "DOUBLE" ? "double" : "solid",
            borderWidth: c.borderStyle === "DOUBLE" ? 5 : 1.5,
            borderColor: `${accent}66`,
          }}
        />
      )}

      <div className={`relative flex h-full w-full flex-col justify-between px-[8%] py-[5.5%] ${align}`}>
        {/* Company branding */}
        <div className={`flex w-full ${brandJustify} items-center gap-2`}>
          {c.logoUrl && (
            <img
              src={c.logoUrl}
              alt=""
              className="h-[clamp(1.4rem,3.6vw,2.6rem)] w-auto max-w-[28%] object-contain"
            />
          )}
          <span
            className="truncate text-[clamp(0.62rem,1.6vw,1.15rem)] font-bold uppercase tracking-[0.08em]"
            style={{ color: accent }}
          >
            {data.companyName}
          </span>
        </div>

        {/* Heading */}
        <div className="w-full">
          <h1
            className="text-[clamp(1.5rem,5.6vw,3.6rem)] font-bold uppercase leading-[0.95] tracking-[0.02em]"
            style={{ color: accent }}
          >
            {c.title}
          </h1>
          <p
            className="text-[clamp(0.6rem,1.9vw,1.25rem)] font-semibold uppercase tracking-[0.42em] text-[#5B6272]"
            style={{ marginLeft: c.textAlign === "CENTER" ? "0.42em" : 0 }}
          >
            {c.subtitle}
          </p>
        </div>

        {/* Recipient */}
        <div className="w-full space-y-[1.5%]">
          <p className="text-[clamp(0.55rem,1.35vw,0.95rem)] text-[#5B6272]">{c.achievementText}</p>

          <p
            className="truncate text-[clamp(1.35rem,5vw,3.1rem)] italic leading-tight"
            style={{ color: accent, fontFamily: "'Brush Script MT', 'Segoe Script', cursive" }}
          >
            {data.freelancerName}
          </p>
          <div
            className={`h-px w-[78%] ${c.textAlign === "CENTER" ? "mx-auto" : c.textAlign === "RIGHT" ? "ml-auto" : ""}`}
            style={{ backgroundColor: `${accent}88` }}
          />

          <p className="text-[clamp(0.55rem,1.35vw,0.95rem)] leading-snug text-[#5B6272]">
            for successfully completing <strong>{data.projectName}</strong> as {data.role}
            <br />
            on {data.completionDate}
          </p>

          {data.skills.length > 0 && (
            <p className="text-[clamp(0.45rem,1vw,0.7rem)] text-[#5B6272]">
              Skills: {data.skills.join(" • ")}
            </p>
          )}
        </div>

        {/* Signatories with award seal between them */}
        <div className="flex w-full items-end justify-center gap-[6%]">
          <Signatory name={c.signatoryName} designation={c.signatoryDesignation} color={accent} />

          <svg className="h-[clamp(1.8rem,5vw,3.4rem)] w-auto shrink-0" viewBox="0 0 64 88" aria-hidden="true">
            <path d="M22 52l-10 30 12-6 8 10 8-32z" fill={accent} opacity="0.75" />
            <path d="M42 52l10 30-12-6-8 10-8-32z" fill={accent} />
            <circle cx="32" cy="30" r="24" fill="#F9E8A2" />
            <circle cx="32" cy="30" r="18" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.85" />
            <circle cx="32" cy="30" r="11" fill="#F9E8A2" />
          </svg>

          <Signatory
            name={c.signatory2Name || ""}
            designation={c.signatory2Designation || ""}
            color={accent}
          />
        </div>

        {/* Footer: verification data + Talentra branding */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-[clamp(0.4rem,0.8vw,0.6rem)] text-[#5B6272]">
          <span className="truncate">{c.footerText}</span>
          <span className="font-mono font-semibold tracking-wider">ID: {data.certificateId}</span>
          <span className="inline-flex items-center gap-1">
            <span className="hidden sm:inline">Issued via</span>
            <TalentraLogo size={14} color={accent} />
          </span>
        </div>
      </div>
    </div>
  );
}

interface DesignerProps {
  value: CertificateConfig | null;
  onChange: (config: CertificateConfig) => void;
  disabled?: boolean;
}

/** Controlled customization panel. Pairs with CertificatePreview. */
export function CertificateControls({ value, onChange, disabled }: DesignerProps) {
  const cfg = value ?? defaultCertificateConfig();
  const set = <K extends keyof CertificateConfig>(key: K, v: CertificateConfig[K]) =>
    onChange({ ...cfg, [key]: v });

  return (
    <div className="space-y-4">
      <ProjectBannerUpload
        value={cfg.logoUrl}
        onChange={(url) => set("logoUrl", url)}
        label="Company Logo (Optional)"
      />

      <Input label="Certificate Title" value={cfg.title} onChange={(e) => set("title", e.target.value)} disabled={disabled} />
      <Input label="Subtitle" value={cfg.subtitle} onChange={(e) => set("subtitle", e.target.value)} disabled={disabled} />
      <Input
        label="Achievement / Completion Description"
        value={cfg.achievementText}
        onChange={(e) => set("achievementText", e.target.value)}
        disabled={disabled}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Signatory 1 Name"
          value={cfg.signatoryName}
          onChange={(e) => set("signatoryName", e.target.value)}
          disabled={disabled}
        />
        <Input
          label="Signatory 1 Designation"
          value={cfg.signatoryDesignation}
          onChange={(e) => set("signatoryDesignation", e.target.value)}
          disabled={disabled}
        />
        <Input
          label="Signatory 2 Name (Optional)"
          value={cfg.signatory2Name || ""}
          onChange={(e) => set("signatory2Name", e.target.value)}
          disabled={disabled}
        />
        <Input
          label="Signatory 2 Designation (Optional)"
          value={cfg.signatory2Designation || ""}
          onChange={(e) => set("signatory2Designation", e.target.value)}
          disabled={disabled}
        />
      </div>

      <Input label="Footer Text" value={cfg.footerText} onChange={(e) => set("footerText", e.target.value)} disabled={disabled} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Layout"
          options={CERTIFICATE_LAYOUTS.map((l) => ({ value: l.value, label: l.label }))}
          value={cfg.layout}
          onChange={(e) => set("layout", e.target.value as CertificateConfig["layout"])}
          disabled={disabled}
        />
        <Select
          label="Logo Position"
          options={[
            { value: "LEFT", label: "Left" },
            { value: "CENTER", label: "Center" },
            { value: "RIGHT", label: "Right" },
          ]}
          value={cfg.logoPosition}
          onChange={(e) => set("logoPosition", e.target.value as CertificateConfig["logoPosition"])}
          disabled={disabled}
        />
        <Select
          label="Text Alignment"
          options={[
            { value: "LEFT", label: "Left" },
            { value: "CENTER", label: "Center" },
            { value: "RIGHT", label: "Right" },
          ]}
          value={cfg.textAlign}
          onChange={(e) => set("textAlign", e.target.value as CertificateConfig["textAlign"])}
          disabled={disabled}
        />
        <Select
          label="Border Style"
          options={CERTIFICATE_BORDERS.map((b) => ({ value: b.value, label: b.label }))}
          value={cfg.borderStyle}
          onChange={(e) => set("borderStyle", e.target.value as CertificateConfig["borderStyle"])}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[#5B6272]">Accent Color</label>
        <input
          type="color"
          value={cfg.accentColor}
          onChange={(e) => set("accentColor", e.target.value)}
          disabled={disabled}
          className="h-9 w-full cursor-pointer rounded-md border border-[#E3E5EA] bg-white p-1"
        />
      </div>
    </div>
  );
}
