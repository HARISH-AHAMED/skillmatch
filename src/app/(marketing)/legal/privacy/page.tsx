import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What FRIVVO collects, why, how long we keep it and what you can ask us to delete — written in plain language.",
  alternates: { canonical: "/legal/privacy" },
};

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    heading: "What we collect",
    paragraphs: [
      "We collect what the product needs to function and very little else. There is no advertising business here, so there is no incentive to accumulate data beyond what an engagement actually requires.",
    ],
    list: [
      "Account details: your name, email address and, for companies, the registered legal name and contact details you enter during onboarding.",
      "Profile content: everything you choose to publish — headline, bio, skills, portfolio items, experience, education, languages and availability.",
      "Engagement records: applications, cover letters, screening answers, offers, contracts, tasks, deliverables and reviews.",
      "Financial records: payment stages, work logs, stipend periods and every ledger entry, each denominated in the project currency.",
      "Messages and files shared inside a project workspace.",
      "Technical data: the IP address recorded when you sign a contract, and standard server logs.",
    ],
  },
  {
    id: "why",
    heading: "Why we collect it",
    paragraphs: [
      "Each category has a specific purpose tied to how the platform works. Profile content and skills feed the match score, which is why the score is explainable — it is computed from data you entered and can see.",
      "Financial records exist because money movement must be auditable. A ledger that could be edited would not be a ledger. Contract signing captures an IP address because a signature without provenance is not evidence of anything.",
      "We do not sell personal data, we do not share it with advertisers, and we do not build behavioural profiles for targeting.",
    ],
  },
  {
    id: "retention",
    heading: "How long we keep things",
    paragraphs: [
      "Retention differs by category, and in two cases it is deliberately short or deliberately permanent.",
    ],
    list: [
      "Workspace messages are removed after seven days. This is a product decision as much as a privacy one — a workspace chat is for coordination, not as an archive.",
      "Certificates are permanent by design. Their content is snapshotted at issue time so the record keeps saying what it said on the day it was issued, which is the entire point of a verifiable credential.",
      "Ledger entries are permanent. They are append-only, and a correction is a new compensating entry rather than an edit.",
      "Profile content persists until you delete it or close your account.",
      "Applications, reviews and engagement history persist because they reference projects and certificates that must remain resolvable.",
    ],
  },
  {
    id: "visibility",
    heading: "Who can see what",
    paragraphs: [
      "Visibility is enforced by one shared predicate on every read path, not by separate checks that could drift apart.",
    ],
    list: [
      "Your public profile is visible to anyone, including people without an account. You control which certificates appear on it.",
      "Cover letters and screening answers are visible only to the company that owns the project you applied to.",
      "Financial records are keyed to a single application, so no freelancer can see another freelancer's stages, work logs or payments on the same project.",
      "The freelancers-only workspace channel is invisible to company accounts — filtered out on read and refused on write.",
      "Direct messages are visible only to the two participants.",
    ],
  },
  {
    id: "your-rights",
    heading: "Your rights",
    paragraphs: [
      "You can access, correct, export or delete your data. Most of it you can edit directly from your profile at any time.",
      "For export or deletion, email us and we will action it within thirty days. Two things survive account deletion, and we would rather be upfront about it: certificates already issued to you remain verifiable, because a credential that vanishes is worthless to the person who earned it; and ledger entries remain, because they are the record of money that genuinely moved. Both are stripped of everything beyond what the record requires.",
    ],
  },
  {
    id: "security",
    heading: "Security",
    paragraphs: [
      "Passwords are hashed, never stored in plain text. Every server action carries its own authorization guard, and ownership is re-derived from your session rather than trusted from a client-supplied identifier.",
      "Uploads must match a strict allowlist on both MIME type and file extension, and SVG is rejected outright because rendered inline it can execute script in our origin.",
      "We name our current limits publicly on the trust page rather than leaving them for you to discover, including the absence of rate limiting on server actions today.",
    ],
  },
  {
    id: "cookies",
    heading: "Cookies",
    paragraphs: [
      "We use a session cookie to keep you signed in and a small number of functional preferences such as whether your sidebar is collapsed. There are no advertising or cross-site tracking cookies, so there is no consent banner to dismiss.",
    ],
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    paragraphs: [
      "If we change something material — particularly when external payment processing goes live and a provider begins handling payment data — we will notify account holders by email before it takes effect, not after.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      summary="What we collect, why we collect it, how long we keep it and what you can ask us to remove. No advertising business means no incentive to hoard data."
      updatedAt="2026-07-14"
      sections={SECTIONS}
    />
  );
}
