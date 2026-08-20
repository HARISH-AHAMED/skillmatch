import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Building2, CalendarDays, CheckCircle2, ShieldCheck, User, XCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CertificateRender } from "@/components/shared/CertificateRender";
import { certificateFrom } from "@/lib/certificate";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CERTIFICATES, getCertificate, getCompany, getFreelancer } from "@/data/queries";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return CERTIFICATES.map((c) => ({ publicId: c.publicId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  const cert = getCertificate(publicId.toUpperCase());
  if (!cert) {
    return { title: `Certificate ${publicId} not found`, robots: { index: false, follow: true } };
  }
  return {
    title: `Certificate ${cert.publicId} — ${cert.recipientName}`,
    description: `Verified FRIVVO certificate issued to ${cert.recipientName} by ${cert.issuerName} for "${cert.projectTitle}" as ${cert.roleTitle}, on ${formatDate(cert.issuedAt)}.`,
    alternates: { canonical: `/verify/${cert.publicId}` },
  };
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const cert = getCertificate(publicId.toUpperCase());

  /* ---- Not found state ---- */
  if (!cert) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="container-app py-16 md:py-24">
            <div className="mx-auto max-w-lg text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-error-bg)]">
                <XCircle className="h-6 w-6 text-[var(--color-error-fg)]" />
              </span>
              <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                No certificate matches that ID
              </h1>
              <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                We could not find a certificate with the ID{" "}
                <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                  {publicId.toUpperCase()}
                </span>
                . Check the characters carefully — the ID alphabet deliberately omits I, L, O and 0
                so they cannot be confused with 1 and 0.
              </p>
              <Button href="/verify" className="mt-6" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Try another ID
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const company = getCompany(cert.companyId);
  const freelancer = getFreelancer(cert.freelancerId);
  const revoked = Boolean(cert.revokedAt);

  const schema = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    name: `${cert.config.title} ${cert.config.subtitle}`,
    credentialCategory: "certificate",
    identifier: cert.publicId,
    dateCreated: cert.issuedAt,
    recognizedBy: { "@type": "Organization", name: cert.issuerName },
    about: cert.projectTitle,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Navbar />
      <main className="flex-1 bg-[var(--color-app)]">
        {/* ---- Verification banner ---- */}
        <div
          className={
            revoked
              ? "border-b border-[var(--color-error-border)] bg-[var(--color-error-bg)]"
              : "border-b border-[var(--color-success-border)] bg-[var(--color-success-bg)]"
          }
        >
          <div className="container-app py-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  revoked ? "bg-[var(--color-error-fg)]" : "bg-[var(--color-success-fg)]"
                }`}
              >
                {revoked ? (
                  <AlertCircle className="h-5 w-5 text-white" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[16px] font-semibold ${
                    revoked ? "text-[var(--color-error-fg)]" : "text-[var(--color-success-fg)]"
                  }`}
                >
                  {revoked ? "This certificate has been revoked" : "Certificate verified"}
                </p>
                <p
                  className={`mt-0.5 text-[13px] leading-[1.5] ${
                    revoked ? "text-[var(--color-error-fg)]" : "text-[var(--color-success-fg)]"
                  } opacity-90`}
                >
                  {revoked
                    ? `Revoked on ${formatDate(cert.revokedAt!)}${cert.revokeReason ? ` — ${cert.revokeReason}` : ""}. The record is retained for auditability.`
                    : `Issued by ${cert.issuerName} on ${formatDate(cert.issuedAt)} and matched against the FRIVVO record.`}
                </p>
              </div>
              <Badge tone={revoked ? "error" : "success"} className="font-mono">
                {cert.publicId}
              </Badge>
            </div>
          </div>
        </div>

        <div className="container-app py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
            {/* ---- Certificate ---- */}
            <div className="min-w-0">
              <div
                className={`overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-md)] ${
                  revoked ? "opacity-60 grayscale" : ""
                }`}
              >
                <CertificateRender data={certificateFrom(cert)} config={cert.config} />
              </div>

              {revoked && (
                <p className="mt-3 text-center text-[13px] text-[var(--color-error-fg)]">
                  Shown for reference only. This credential is no longer valid.
                </p>
              )}
            </div>

            {/* ---- Record details ---- */}
            <aside className="flex min-w-0 flex-col gap-4">
              <Card padding="md">
                <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--color-brand)]" />
                  Verified record
                </h2>

                <dl className="flex flex-col gap-4">
                  <div>
                    <dt className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Issued to
                    </dt>
                    <dd className="mt-1.5 flex items-center gap-2.5">
                      <Avatar src={freelancer?.avatarUrl} name={cert.recipientName} size="sm" />
                      <div className="min-w-0">
                        {freelancer ? (
                          <Link
                            href={`/freelancers/${freelancer.id}`}
                            className="block truncate text-[14px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                          >
                            {cert.recipientName}
                          </Link>
                        ) : (
                          <span className="block truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                            {cert.recipientName}
                          </span>
                        )}
                        <span className="block text-[12px] text-[var(--color-text-muted)]">
                          {cert.roleTitle}
                        </span>
                      </div>
                    </dd>
                  </div>

                  <div className="border-t border-[var(--color-border-subtle)] pt-4">
                    <dt className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Issued by
                    </dt>
                    <dd className="mt-1.5 flex items-center gap-2.5">
                      <Avatar
                        src={company?.logoUrl}
                        name={cert.issuerName}
                        size="sm"
                        rounded="md"
                      />
                      <div className="min-w-0">
                        {company ? (
                          <Link
                            href={`/companies/${company.id}`}
                            className="block truncate text-[14px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand-active)]"
                          >
                            {cert.issuerName}
                          </Link>
                        ) : (
                          <span className="block truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                            {cert.issuerName}
                          </span>
                        )}
                        <span className="block text-[12px] text-[var(--color-text-muted)]">
                          {company?.industry}
                        </span>
                      </div>
                    </dd>
                  </div>

                  <div className="border-t border-[var(--color-border-subtle)] pt-4">
                    <dt className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Engagement
                    </dt>
                    <dd className="mt-1.5 text-[14px] font-medium leading-[1.5] text-[var(--color-text-primary)]">
                      {cert.projectTitle}
                    </dd>
                    {cert.durationText && (
                      <dd className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {cert.durationText}
                      </dd>
                    )}
                  </div>

                  {cert.skills.length > 0 && (
                    <div className="border-t border-[var(--color-border-subtle)] pt-4">
                      <dt className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                        Skills evidenced
                      </dt>
                      <dd className="mt-2 flex flex-wrap gap-1.5">
                        {cert.skills.map((s) => (
                          <Chip key={s} size="sm" className="capitalize">
                            {s}
                          </Chip>
                        ))}
                      </dd>
                    </div>
                  )}

                  <div className="border-t border-[var(--color-border-subtle)] pt-4">
                    <dt className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Issue date
                    </dt>
                    <dd className="mt-1 text-[14px] text-[var(--color-text-primary)]">
                      {formatDate(cert.issuedAt, "long")}
                    </dd>
                  </div>

                  {(cert.signer1Name || cert.signer2Name) && (
                    <div className="border-t border-[var(--color-border-subtle)] pt-4">
                      <dt className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                        Signatories
                      </dt>
                      <dd className="mt-1.5 flex flex-col gap-1.5">
                        {[
                          [cert.signer1Name, cert.signer1Title],
                          [cert.signer2Name, cert.signer2Title],
                        ]
                          .filter(([n]) => n)
                          .map(([name, title]) => (
                            <span key={name} className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                              <span className="text-[13px] text-[var(--color-text-primary)]">
                                {name}
                              </span>
                              <span className="text-[12px] text-[var(--color-text-muted)]">
                                {title}
                              </span>
                            </span>
                          ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>

              {cert.summary && (
                <Card padding="md">
                  <h3 className="mb-2 text-[14px] font-semibold text-[var(--color-text-primary)]">
                    What was delivered
                  </h3>
                  <p className="text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                    {cert.summary}
                  </p>
                </Card>
              )}

              <Card padding="md">
                <h3 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-[var(--color-text-primary)]">
                  <Building2 className="h-4 w-4 text-[var(--color-text-muted)]" />
                  Why this is trustworthy
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {[
                    "Issued automatically at project completion, never before.",
                    "Every factual value is snapshotted at issue time and cannot be edited after.",
                    "Completion required every payment obligation on the project to be settled.",
                    "Revocation preserves the record rather than deleting it.",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
                      <span className="text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Button href="/verify" variant="secondary" block leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Verify another certificate
              </Button>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
