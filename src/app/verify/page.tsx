import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VerifyForm } from "./VerifyForm";
import { FaqSection } from "@/components/marketing/Sections";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description:
    "Check any FRIVVO certificate against the platform record. Enter the certificate ID to see the recipient, issuer, project, role, skills and issue date — no account required.",
  alternates: { canonical: "/verify" },
};

const VERIFY_FAQ = [
  {
    q: "What does verification actually prove?",
    a: "That FRIVVO issued this certificate, to this person, for this project and role, on this date — and that the engagement reached a completed state with every payment obligation settled. The content shown is a snapshot taken at issue time, so it cannot be edited after the fact.",
  },
  {
    q: "Why does a certificate show a different name than the profile?",
    a: "Certificates are deliberately denormalised. Every factual value is copied onto the record at the moment of issue, so a certificate keeps saying what it said the day it was issued even if the person later changes their display name or the company rebrands.",
  },
  {
    q: "What happens if a certificate is revoked?",
    a: "The record is never deleted. The verification page shows the revoked state along with the reason given, and the certificate is removed from public listings while remaining auditable.",
  },
  {
    q: "I can't find a certificate that I know exists.",
    a: "Check the ID for the characters that look alike — the alphabet deliberately omits I, L, O and 0 to avoid this. If it still fails, the freelancer may have set the certificate to hidden on their profile, though direct verification by ID always works for a valid, unrevoked certificate.",
  },
];

export default async function VerifyIndexPage() {
  // A few real, unrevoked ids so the "try a sample" panel resolves.
  const samples = await db.certificate.findMany({
    where: { revokedAt: null },
    orderBy: { issuedAt: "desc" },
    take: 3,
    select: { publicId: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <VerifyForm samples={samples.map((c) => c.publicId)} />
        <FaqSection items={VERIFY_FAQ} eyebrow="Verification" title="How certificate verification works" />
      </main>
      <Footer />
    </div>
  );
}
