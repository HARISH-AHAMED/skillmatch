import type { Metadata } from "next";
import { ArrowRight, Lock, ScrollText, ShieldCheck, UserCheck, Wallet } from "lucide-react";
import { PageHero } from "@/components/marketing/PageHero";
import { ClosingBand, FaqSection } from "@/components/marketing/Sections";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Card";
import { Reveal } from "@/components/motion/Motion";
import { EDITORIAL } from "@/lib/media";

export const metadata: Metadata = {
  title: "Trust & safety",
  description:
    "How FRIVVO protects money, data and identity: an append-only ledger behind row locks, one authorization guard layer, strict upload allowlists and channel confidentiality.",
  alternates: { canonical: "/trust" },
};

const PILLARS = [
  {
    icon: <Wallet />,
    title: "Money cannot go missing",
    points: [
      "Every movement writes an append-only ledger entry — nothing is ever edited or deleted, and a correction is a new compensating entry.",
      "Each mutation carries an idempotency key, so a double-clicked release is rejected rather than paid twice.",
      "Financial mutations lock the row they touch and validate against the freshly locked state, never a stale read.",
      "Cached totals exist for speed but reconcile against the ledger. Where they disagree, the ledger wins.",
      "A project cannot be marked complete while any payment obligation is still open.",
    ],
  },
  {
    icon: <Lock />,
    title: "One authorization layer, not scattered checks",
    points: [
      "Every server action calls its own guard. A route-level guard is never treated as protection for the action behind it.",
      "Ownership is re-derived from the session on every mutation, never taken from a client-supplied id.",
      "Missing and forbidden return an identical message, so record ids cannot be probed by comparing responses.",
      "Every record mutation is scoped to the project the caller was actually granted access to.",
      "Status changes go through explicit transition tables — anything not listed is rejected.",
    ],
  },
  {
    icon: <UserCheck />,
    title: "Confidentiality between parties",
    points: [
      "Financial records are keyed to a single application, so one freelancer cannot see another's stages, work logs or payments.",
      "The freelancers-only channel is filtered out on read and refused on write for company accounts.",
      "Direct messages match on anchored prefixes and suffixes, so a user whose id is a suffix of another cannot read a conversation they are not in.",
      "The same visibility predicate is used by every read path, so they cannot drift apart.",
      "Messages are retained for seven days and then removed.",
    ],
  },
  {
    icon: <ScrollText />,
    title: "Files and uploads",
    points: [
      "MIME type and file extension must both match the same allowlist entry — either signal alone is not enough to admit a file.",
      "SVG is rejected by both signals independently, because rendered inline it can run script in our origin.",
      "The stored extension and content type come from the allowlist, never from the request.",
      "Size is checked against the real received byte length, not the size the client claims.",
      "Downloads resolve a file as a record rather than as a path, so traversal has nothing to act on.",
    ],
  },
];

const VERIFICATION = [
  {
    title: "Identity verified",
    body: "Government ID matched against the account holder. Shown on both freelancer and company profiles.",
  },
  {
    title: "Payment verified",
    body: "The company has confirmed a funding source. Freelancers see this before applying.",
  },
  {
    title: "Skills verified",
    body: "At least one completed engagement where the reviewing company confirmed the claimed skills.",
  },
  {
    title: "Top rated",
    body: "Sustained rating above 4.7 across at least ten completed engagements, recomputed continuously.",
  },
];

const TRUST_FAQ = [
  {
    q: "What happens if a company disappears mid-engagement?",
    a: "Money already funded on a stage is committed — it sits in the project's committed pool and cannot be withdrawn by the company. If work was delivered against a funded stage and the company stops responding, contact support and we can release the committed amount against the delivery record. Money that was never funded was never committed, which is precisely why we push companies to fund before work starts.",
  },
  {
    q: "What happens if a freelancer disappears mid-engagement?",
    a: "Committed but unreleased funds stay committed until you release or reverse them, so nothing is paid out for work that was not delivered. You can remove the freelancer once the outstanding stages are released or cancelled, which frees the role slot for someone else. The removal check refuses while money is still outstanding, which is intentional — it forces the financial state to be settled first.",
  },
  {
    q: "Do you read our project messages?",
    a: "No. Messages are stored to deliver them and are removed after seven days. Support does not read workspace conversations unless you explicitly share them as part of a dispute you raised.",
  },
  {
    q: "How do you handle a disputed deliverable?",
    a: "The revision cap of two forces the conversation to a conclusion rather than letting it run indefinitely. Past that, either the company approves the stage or both parties agree new terms. If neither happens, support can review the deliverable history, the review feedback and the ledger state — all of which are recorded — and adjudicate.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Freelancers can download every certificate they have earned and request a full export of their profile, applications and payment history. Companies on the enterprise tier get audit log export as standard. Certificates in particular are designed to be portable — the verification page works whether or not you still have an account.",
  },
  {
    q: "How do I report a security issue?",
    a: "Email security@frivvo.com. We aim to acknowledge within one hour. We do not currently run a paid bounty programme, but we credit reporters who ask to be credited and we will not pursue action against good-faith research.",
  },
];

export default function TrustPage() {
  return (
    <>
      <PageHero
        eyebrow="Trust & safety"
        title="What actually protects your money and your data"
        highlight={["actually"]}
        description="Trust pages usually list adjectives. This one lists mechanisms, because a guarantee you cannot describe in a sentence is not a guarantee. Here is what is enforced, and where the current limits are."
        image={EDITORIAL.heroSecondary}
        dark
        actions={
          <>
            <Button href="/register" size="xl" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Get started
            </Button>
            <Button
              href="/contact"
              size="xl"
              variant="secondary"
              className="border-white/20 bg-white/[0.06] text-white hover:border-white/30 hover:bg-white/[0.12]"
            >
              Security enquiries
            </Button>
          </>
        }
      />

      {/* ---- Pillars ---- */}
      <section className="section-y bg-[var(--color-app)]">
        <div className="container-wide">
          <SectionHeading
            eyebrow="Mechanisms"
            title="Four guarantees, and how each one is enforced"
          />

          <div className="mt-11 grid gap-5 lg:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.07}>
                <article className="h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-active)] [&>svg]:h-5 [&>svg]:w-5">
                    {p.icon}
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
                    {p.title}
                  </h3>
                  <ul className="mt-4 flex flex-col gap-3">
                    {p.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
                        <span className="text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Verification badges ---- */}
      <section className="section-y bg-[var(--color-surface)]">
        <div className="container-wide">
          <SectionHeading
            align="center"
            eyebrow="Verification"
            title="What each badge means"
            description="Badges are granted, never self-assigned. Each one has a specific check behind it."
          />
          <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VERIFICATION.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.06}>
                <div className="h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5">
                  <ShieldCheck className="h-5 w-5 text-[var(--color-brand)]" />
                  <h3 className="mt-3 text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                    {v.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                    {v.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Known limits ---- */}
      <section className="section-y bg-[var(--color-app)]">
        <div className="container-app">
          <SectionHeading
            align="center"
            eyebrow="Being straight with you"
            title="Where the current limits are"
            description="Things we have not built yet, stated plainly rather than left for you to discover."
          />

          <ul className="mx-auto mt-10 flex max-w-3xl flex-col gap-3">
            {[
              [
                "No external payment provider",
                "Funding and releasing are ledger operations inside FRIVVO. Real money does not move through a processor yet, which means the platform is not holding client funds in a regulated account.",
              ],
              [
                "No rate limiting on actions or uploads",
                "There is no per-account throttle on server actions or the upload endpoint today. It has not been a problem at current volume, but it is a gap and we are naming it.",
              ],
              [
                "Message cleanup runs unauthenticated",
                "The retention job only deletes data already past its own seven-day TTL, so the blast radius is nil — but it should carry a shared secret before it is exposed publicly.",
              ],
              [
                "Twelve screening round types are configuration only",
                "You can add them to a project to describe your process, but only screening questions actually run inside the platform. The rest are labelled coming soon and cannot be newly selected.",
              ],
              [
                "No formal dispute workflow",
                "Disputes are handled by support reviewing the deliverable history, review feedback and ledger state. The schema anticipates a structured workflow; the interface for it does not exist yet.",
              ],
            ].map(([title, body]) => (
              <li
                key={title}
                className="rounded-[var(--radius-lg)] border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-5"
              >
                <h3 className="text-[14px] font-semibold text-[var(--color-warning-fg)]">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-[1.65] text-[var(--color-warning-fg)] opacity-90">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FaqSection items={TRUST_FAQ} eyebrow="Trust FAQ" title="What happens when things go wrong" />

      <ClosingBand />
    </>
  );
}
