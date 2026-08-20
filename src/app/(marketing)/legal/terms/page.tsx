import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The rules of using FRIVVO: who can do what, how money moves, what completion requires, and what happens when an engagement goes wrong.",
  alternates: { canonical: "/legal/terms" },
};

const SECTIONS: LegalSection[] = [
  {
    id: "accounts",
    heading: "Accounts",
    paragraphs: [
      "You need an account to apply for work or publish a project. You can register as a freelancer or as a company; the administrator role cannot be self-assigned through registration under any circumstances.",
      "You are responsible for what happens under your account. Sign-in never creates an account implicitly — an unrecognised email fails rather than silently registering someone.",
    ],
  },
  {
    id: "what-we-are",
    heading: "What FRIVVO is, and is not",
    paragraphs: [
      "FRIVVO is a platform where companies and independent professionals find each other and run an engagement. The contract for the work itself is between those two parties. We are not the employer, we are not a party to the engagement, and we do not supervise the work.",
      "What we do provide is the record: the offer, the signed contract, the payment ledger, the deliverable history and the review. When a disagreement arises, that record is what everyone reasons from.",
    ],
  },
  {
    id: "money",
    heading: "How money works today",
    paragraphs: [
      "In the current phase, funding and releasing are ledger operations inside FRIVVO. Real money does not pass through a payment processor, and FRIVVO is not holding client funds in a regulated account. Companies settle with freelancers directly, and the ledger is the authoritative record of what was agreed, committed and released.",
      "This will change when we integrate a payment provider. We will publish the terms and any processing fee in advance of it applying, and it will not apply retroactively to an engagement already running.",
    ],
    list: [
      "Funding commits value to a stage. Committed money cannot be quietly withdrawn — it is released to the freelancer or reversed with a compensating ledger entry.",
      "Every amount on a project is denominated in that project's currency, and cross-currency amounts are refused rather than converted silently.",
      "A maximum of two revisions can be requested on any deliverable or payment stage.",
      "A project cannot be marked complete while any payment obligation remains open, and the specific outstanding obligation is always named.",
    ],
  },
  {
    id: "conduct",
    heading: "Acceptable use",
    paragraphs: [
      "Behave in a way you would be comfortable having read back to you from the record — because it is all recorded.",
    ],
    list: [
      "Do not misrepresent your identity, your experience or your completed work.",
      "Do not publish a listing you do not intend to fill, or apply to work you do not intend to do.",
      "Do not attempt to move an engagement off-platform specifically to avoid the payment record or the review.",
      "Do not upload content you do not have the rights to, and do not upload anything designed to execute in another user's browser.",
      "Do not use the platform to harass, discriminate against or misrepresent another user.",
    ],
  },
  {
    id: "ip",
    heading: "Intellectual property",
    paragraphs: [
      "Work product ownership is set by the contract between the company and the freelancer. The default contract terms transfer intellectual property on final release of payment — meaning if the work has not been paid for, it has not transferred.",
      "You keep ownership of your profile content, your portfolio and your certificates. Certificates in particular are designed to be portable: the verification page resolves whether or not you still hold an account with us.",
    ],
  },
  {
    id: "reviews",
    heading: "Reviews and reputation",
    paragraphs: [
      "A review requires a completed project and a genuine engagement between the two parties. One review per project, per direction. Ratings and sub-scores are bounded before they reach any aggregate.",
      "We do not remove a review because its subject dislikes it. We do remove reviews that contain personal data about uninvolved third parties, that are demonstrably fabricated, or that breach acceptable use. Removal preserves the record and logs the reason.",
    ],
  },
  {
    id: "termination",
    heading: "Suspension and termination",
    paragraphs: [
      "You can close your account at any time. We can suspend an account that breaches these terms, and we will say which term was breached rather than issuing a generic notice.",
      "Suspension does not erase financial obligations. Committed funds remain committed and outstanding approved work remains payable. Certificates already issued remain valid and verifiable.",
    ],
  },
  {
    id: "disputes",
    heading: "Disputes",
    paragraphs: [
      "Raise it in the project workspace first — most disputes are a misunderstanding about scope that a single message resolves. If that fails, contact support and we will review the deliverable history, the review feedback and the ledger state, all of which are recorded and timestamped.",
      "We can release committed funds against a delivery record, or reverse them where work was not delivered. We cannot adjudicate the quality of creative judgement, and we will say so rather than pretending to.",
    ],
  },
  {
    id: "liability",
    heading: "Liability",
    paragraphs: [
      "The platform is provided as it is. We do not warrant that a listing will be filled, that an applicant will be suitable, or that an engagement will succeed.",
      "We are not liable for the work product itself, for the conduct of either party outside the platform, or for indirect or consequential losses. Where liability cannot be excluded by law, it is limited to the fees you paid us in the preceding twelve months — which, in the current free phase, is zero.",
    ],
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    paragraphs: [
      "We will notify account holders by email before a material change takes effect. Continuing to use the platform after that point means you accept the revised terms. If you do not, close the account — engagements already running are unaffected by the change.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      summary="The rules of using FRIVVO, written to be read rather than skimmed past. Where something is not yet built — payment processing in particular — we say so instead of reserving rights over it."
      updatedAt="2026-07-14"
      sections={SECTIONS}
    />
  );
}
