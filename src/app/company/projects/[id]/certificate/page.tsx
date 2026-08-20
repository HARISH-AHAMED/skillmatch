"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft, Award, Palette, Save, Send, Type } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Field, Input, RadioCard, Select, Textarea, Toggle } from "@/components/ui/Field";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { CertificateRender } from "@/components/shared/CertificateRender";
import { getProject, hiredApplications } from "@/data/queries";
import type { CertificateConfig } from "@/lib/types";

const ACCENTS = [
  { value: "#06C755", label: "FRIVVO green" },
  { value: "#152C55", label: "Navy" },
  { value: "#2E6BEA", label: "Blue" },
  { value: "#8B5CF6", label: "Violet" },
  { value: "#0F1613", label: "Ink" },
  { value: "#B45309", label: "Amber" },
];

export default function CertificateDesignerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const project = getProject(id);
  const [issueOpen, setIssueOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState<CertificateConfig>(
    () =>
      project?.certificate ?? {
        enabled: true,
        title: "Certificate",
        subtitle: "of Completion",
        achievementText: "This certificate is proudly presented to",
        signatoryName: "",
        signatoryDesignation: "",
        footerText: "Issued via FRIVVO",
        layout: "CLASSIC",
        logoPosition: "CENTER",
        textAlign: "CENTER",
        accentColor: "#06C755",
        borderStyle: "SOLID",
        certificateIdPrefix: "FRV-XXXXXX",
      },
  );

  if (!project) notFound();

  const hired = hiredApplications(project.id);

  const set = <K extends keyof CertificateConfig>(key: K, value: CertificateConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success(
        "Template saved",
        "This design is applied to every certificate issued for this project.",
      );
    }, 500);
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.push(`/company/projects/${project.id}`)}
        className="mb-4"
      >
        Back to project
      </Button>

      <PageHeader
        title="Certificate template"
        description={`Only presentation is configurable. Every factual value — recipient, role, skills, dates and the certificate ID — is filled from FRIVVO data when the certificate is issued.`}
        action={
          <>
            <Button variant="secondary" onClick={save} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
              Save template
            </Button>
            <Button
              onClick={() => setIssueOpen(true)}
              disabled={hired.length === 0}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Issue manually
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:gap-8">
        {/* ---- Controls ---- */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card padding="md">
            <Toggle
              checked={config.enabled}
              onChange={(v) => set("enabled", v)}
              label="Issue certificates for this project"
              description="Issued automatically to every hired freelancer when the project is marked complete."
            />
          </Card>

          <Card padding="md">
            <CardHeader title="Wording" icon={<Type />} divided={false} className="mb-4" />
            <div className="flex flex-col gap-3.5">
              <Field label="Title">
                <Input value={config.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="Subtitle">
                <Input value={config.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
              </Field>
              <Field label="Presentation line">
                <Textarea
                  rows={2}
                  value={config.achievementText}
                  onChange={(e) => set("achievementText", e.target.value)}
                />
              </Field>
              <Field label="Footer text">
                <Input
                  value={config.footerText}
                  onChange={(e) => set("footerText", e.target.value)}
                />
              </Field>
              <Field label="Certificate ID prefix" help="Shown before the generated public ID.">
                <Input
                  value={config.certificateIdPrefix}
                  onChange={(e) => set("certificateIdPrefix", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card padding="md">
            <CardHeader title="Layout" icon={<Palette />} divided={false} className="mb-4" />
            <div className="flex flex-col gap-3.5">
              <div>
                <p className="mb-2 text-[13px] font-medium text-[var(--color-text-secondary)]">
                  Style
                </p>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      ["CLASSIC", "Classic", "Centred, framed, formal."],
                      ["MODERN", "Modern", "Accent bar down the left edge."],
                      ["MINIMAL", "Minimal", "Generous whitespace, no ornament."],
                    ] as const
                  ).map(([value, title, description]) => (
                    <RadioCard
                      key={value}
                      checked={config.layout === value}
                      onSelect={() => set("layout", value)}
                      title={title}
                      description={description}
                    />
                  ))}
                </div>
              </div>

              <Field label="Logo position">
                <Select
                  value={config.logoPosition}
                  onChange={(e) =>
                    set("logoPosition", e.target.value as CertificateConfig["logoPosition"])
                  }
                >
                  <option value="LEFT">Left</option>
                  <option value="CENTER">Centre</option>
                  <option value="RIGHT">Right</option>
                </Select>
              </Field>

              <Field label="Text alignment">
                <Select
                  value={config.textAlign}
                  onChange={(e) =>
                    set("textAlign", e.target.value as CertificateConfig["textAlign"])
                  }
                >
                  <option value="LEFT">Left</option>
                  <option value="CENTER">Centre</option>
                  <option value="RIGHT">Right</option>
                </Select>
              </Field>

              <Field label="Border">
                <Select
                  value={config.borderStyle}
                  onChange={(e) =>
                    set("borderStyle", e.target.value as CertificateConfig["borderStyle"])
                  }
                >
                  <option value="SOLID">Solid</option>
                  <option value="DOUBLE">Double</option>
                  <option value="NONE">None</option>
                </Select>
              </Field>

              <div>
                <p className="mb-2 text-[13px] font-medium text-[var(--color-text-secondary)]">
                  Accent colour
                </p>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => set("accentColor", a.value)}
                      aria-label={a.label}
                      title={a.label}
                      className={`h-9 w-9 rounded-full border-2 transition-transform ${
                        config.accentColor === a.value
                          ? "scale-110 border-[var(--color-text-primary)]"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: a.value }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <CardHeader title="Signatories" divided={false} className="mb-4" />
            <div className="flex flex-col gap-3.5">
              <Field label="First signatory name">
                <Input
                  value={config.signatoryName}
                  onChange={(e) => set("signatoryName", e.target.value)}
                  placeholder="Marta Kovač"
                />
              </Field>
              <Field label="First signatory title">
                <Input
                  value={config.signatoryDesignation}
                  onChange={(e) => set("signatoryDesignation", e.target.value)}
                  placeholder="VP Engineering"
                />
              </Field>
              <Field label="Second signatory name">
                <Input
                  value={config.signatory2Name ?? ""}
                  onChange={(e) => set("signatory2Name", e.target.value)}
                />
              </Field>
              <Field label="Second signatory title">
                <Input
                  value={config.signatory2Designation ?? ""}
                  onChange={(e) => set("signatory2Designation", e.target.value)}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* ---- Live preview ---- */}
        <div className="min-w-0">
          <div className="lg:sticky lg:top-[76px]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                Live preview
              </h2>
              <Badge tone="neutral" size="sm">
                Sample data
              </Badge>
            </div>

            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-md)]">
              <CertificateRender
                config={config}
                data={{
                  recipientName: hired[0]?.freelancer.name ?? "Mei Chen",
                  projectTitle: project.title,
                  issuerName: project.company.companyName,
                  roleTitle: hired[0]?.roleName ?? "Project Contributor",
                  skills: project.requiredSkills.slice(0, 6),
                  durationText: project.duration || "4 months",
                  issuedAt: new Date().toISOString(),
                  publicId: "XXXXX-XXXXX",
                  signer1Name: config.signatoryName || "Signatory name",
                  signer1Title: config.signatoryDesignation || "Title",
                  signer2Name: config.signatory2Name,
                  signer2Title: config.signatory2Designation,
                }}
              />
            </div>

            <Alert tone="info" className="mt-4" title="What is fixed and what is yours">
              You control wording, layout, colour and signatories. The recipient name, role title,
              skills, duration, issue date and certificate ID are always filled from the engagement
              record — so a certificate cannot claim something the project did not.
            </Alert>

            {hired.length > 0 && (
              <Card padding="md" className="mt-4">
                <CardHeader
                  title="Who will receive one"
                  description="Issued automatically when the project completes."
                  icon={<Award />}
                  divided={false}
                  className="mb-3"
                />
                <ul className="flex flex-col gap-2">
                  {hired.map((h) => (
                    <li key={h.id} className="flex items-center gap-2.5">
                      <Avatar src={h.freelancer.avatarUrl} name={h.freelancer.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-text-primary)]">
                        {h.freelancer.name}
                      </span>
                      <span className="text-[12px] text-[var(--color-text-muted)]">
                        {h.roleName ?? "Contributor"}
                        {h.isApprentice ? " (Apprentice)" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {hired.length === 0 && (
              <EmptyState
                className="mt-4"
                compact
                icon={<Award />}
                title="Nobody hired yet"
                description="Certificates are issued to hired freelancers when the project completes."
              />
            )}
          </div>
        </div>
      </div>

      {/* ---- Manual issue ---- */}
      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Issue a certificate now"
        description="Normally certificates issue automatically at completion. Manual issue is idempotent — re-issuing returns the existing certificate rather than creating a second one."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIssueOpen(false);
                toast.success(
                  "Certificate issued",
                  "The recipient has been notified and it is publicly verifiable immediately.",
                );
              }}
            >
              Issue certificate
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Recipient" required>
            <Select>
              {hired.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.freelancer.name} — {h.roleName ?? "Contributor"}
                  {h.isApprentice ? " (Apprentice)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Role title on the certificate" help="Defaults to their role name.">
            <Input defaultValue={hired[0]?.roleName ?? "Project Contributor"} />
          </Field>
          <Field label="Duration">
            <Input defaultValue={project.duration} placeholder="4 months" />
          </Field>
          <Field
            label="Summary of what they delivered"
            help="Appears on the verification page. Optional but strongly recommended."
          >
            <Textarea
              rows={4}
              placeholder="Delivered the observability console front-end rebuild across four funded stages, cutting p95 interaction latency from 340ms to 168ms."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
