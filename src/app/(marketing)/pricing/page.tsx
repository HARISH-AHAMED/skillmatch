import type { Metadata } from "next";
import { ArrowRight, Check, Minus } from "lucide-react";
import { PageHero } from "@/components/marketing/PageHero";
import { ClosingBand, FaqSection } from "@/components/marketing/Sections";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Card";
import { Reveal } from "@/components/motion/Motion";
import { EDITORIAL } from "@/lib/media";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free for freelancers, always. Companies publish and manage projects free during the current phase — see exactly what changes when payment processing goes live.",
  alternates: { canonical: "/pricing" },
};

const PLANS = [
  {
    name: "Talent",
    price: "Free",
    period: "always",
    description:
      "Everything a freelancer needs to find work, deliver it and prove they did — at no cost, permanently.",
    cta: { label: "Create a profile", href: "/register?role=FREELANCER" },
    variant: "secondary" as const,
    features: [
      "Unlimited applications",
      "Full profile with portfolio and certificates",
      "Project workspace on every engagement",
      "Payment stages, work logs and the ledger",
      "Verifiable certificates you keep forever",
      "Two-way reviews",
    ],
    excluded: [],
  },
  {
    name: "Company",
    price: "Free",
    period: "current phase",
    badge: "Most teams",
    highlight: true,
    description:
      "Publish, hire and run engagements end to end. Free while payment processing is an internal ledger construct.",
    cta: { label: "Post a project", href: "/register?role=COMPANY" },
    variant: "primary" as const,
    features: [
      "Unlimited project listings",
      "Named roles, slots and apprentices",
      "AI match scoring with the full breakdown",
      "Offer letters, negotiation and contracts",
      "Funded payment stages on the ledger",
      "Certificate designer and issuance",
      "Full seven-tab workspace per project",
    ],
    excluded: ["Dedicated support manager", "SSO and audit export"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "annual",
    description:
      "For teams running dozens of concurrent engagements, with procurement, security review and integration requirements.",
    cta: { label: "Talk to us", href: "/contact" },
    variant: "secondary" as const,
    features: [
      "Everything in Company",
      "Recruiter sub-accounts with scoped permissions",
      "SSO and SCIM provisioning",
      "Audit log export",
      "Dedicated support manager",
      "Security review and DPA",
      "Custom certificate branding",
    ],
    excluded: [],
  },
];

const COMPARISON = [
  { feature: "Project listings", talent: "—", company: "Unlimited", enterprise: "Unlimited" },
  { feature: "Applications", talent: "Unlimited", company: "—", enterprise: "—" },
  { feature: "Named roles & slots", talent: true, company: true, enterprise: true },
  { feature: "Apprentice placements", talent: true, company: true, enterprise: true },
  { feature: "Match score breakdown", talent: true, company: true, enterprise: true },
  { feature: "Project workspace", talent: true, company: true, enterprise: true },
  { feature: "Funded payment stages", talent: true, company: true, enterprise: true },
  { feature: "Transaction ledger", talent: "Own records", company: "Full project", enterprise: "Full project" },
  { feature: "Verifiable certificates", talent: true, company: true, enterprise: true },
  { feature: "Custom certificate branding", talent: false, company: false, enterprise: true },
  { feature: "Recruiter sub-accounts", talent: false, company: false, enterprise: true },
  { feature: "SSO & SCIM", talent: false, company: false, enterprise: true },
  { feature: "Audit log export", talent: false, company: false, enterprise: true },
  { feature: "Dedicated support manager", talent: false, company: false, enterprise: true },
];

const PRICING_FAQ = [
  {
    q: "Is it really free for freelancers?",
    a: "Yes, permanently. There is no commission taken from what you are paid, no fee to apply, and no paid tier that ranks you higher in search. Ranking is the match score, and the match score has no price input in it.",
  },
  {
    q: "What changes when payment processing goes live?",
    a: "Today funding and releasing are internal ledger operations — no money moves through a provider. When we integrate one, funding becomes a real charge or hold and releasing becomes a transfer, and there will be a processing fee on that movement. We will publish the fee before it applies and it will never be applied retroactively to an engagement already running.",
  },
  {
    q: "Do you take a percentage of the project budget?",
    a: "No. We are not a commission marketplace. The company pays the freelancer the agreed amount, and the whole amount reaches them. Our revenue model is a platform fee on companies, not a cut of anyone's earnings.",
  },
  {
    q: "What counts as an enterprise engagement?",
    a: "Usually one of three things: you need SSO because your security team requires it, you need recruiter sub-accounts because more than a handful of people touch hiring, or you have a procurement process that needs a DPA and a security review. If none of those apply, the free company tier is genuinely the right fit.",
  },
  {
    q: "Can I use FRIVVO for a single one-off project?",
    a: "Yes, and plenty of companies do. There is no minimum commitment, no seat count and nothing to cancel. Publish one project, run it to completion, issue the certificate and stop.",
  },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true)
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
        <Check className="h-3 w-3 text-[var(--color-brand-active)]" strokeWidth={3} />
      </span>
    );
  if (value === false)
    return <Minus className="h-4 w-4 text-[var(--color-text-disabled)]" aria-label="Not included" />;
  return <span className="text-[12.5px] text-[var(--color-text-secondary)]">{value}</span>;
}

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Free for talent. Free for companies, for now."
        highlight={["Free"]}
        description="We would rather tell you exactly what will change than pretend nothing will. Freelancers pay nothing, permanently. Companies pay nothing today, and there will be a processing fee once real money moves through a payment provider."
        image={EDITORIAL.payouts}
        actions={
          <>
            <Button href="/register?role=COMPANY" size="xl" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Post a project
            </Button>
            <Button href="/contact" size="xl" variant="secondary">
              Talk to sales
            </Button>
          </>
        }
      />

      {/* ---- Plans ---- */}
      <section className="section-y bg-[var(--color-app)]">
        <div className="container-wide">
          <div className="grid items-start gap-5 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.07}>
                <article
                  className={`relative flex h-full flex-col rounded-[var(--radius-xl)] border bg-[var(--color-surface)] p-6 md:p-7 ${
                    plan.highlight
                      ? "border-[var(--color-brand)] shadow-[var(--shadow-md)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-6">
                      <Badge tone="brand">{plan.badge}</Badge>
                    </span>
                  )}

                  <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
                    {plan.name}
                  </h2>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-[34px] font-semibold leading-none tracking-[-0.028em] text-[var(--color-text-primary)]">
                      {plan.price}
                    </span>
                    <span className="text-[13px] text-[var(--color-text-muted)]">
                      {plan.period}
                    </span>
                  </div>

                  <p className="mt-3.5 text-[13.5px] leading-[1.65] text-[var(--color-text-secondary)]">
                    {plan.description}
                  </p>

                  <Button
                    href={plan.cta.href}
                    size="lg"
                    block
                    variant={plan.variant}
                    className="mt-6"
                  >
                    {plan.cta.label}
                  </Button>

                  <ul className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-[var(--color-border-subtle)] pt-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                          <Check className="h-2.5 w-2.5 text-[var(--color-brand-active)]" strokeWidth={3} />
                        </span>
                        <span className="text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                          {f}
                        </span>
                      </li>
                    ))}
                    {plan.excluded.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-disabled)]" />
                        <span className="text-[13px] leading-[1.6] text-[var(--color-text-disabled)]">
                          {f}
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

      {/* ---- Comparison ---- */}
      <section className="section-y bg-[var(--color-surface)]">
        <div className="container-app">
          <SectionHeading
            align="center"
            eyebrow="Side by side"
            title="What each tier actually includes"
          />

          <div className="mt-11 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead className="bg-[var(--color-surface-alt)]">
                  <tr>
                    <th className="px-4 py-3.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
                      Feature
                    </th>
                    {["Talent", "Company", "Enterprise"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-center text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-muted)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-t border-[var(--color-border-subtle)]"
                      style={{ height: 52 }}
                    >
                      <td className="px-4 text-[13.5px] text-[var(--color-text-primary)]">
                        {row.feature}
                      </td>
                      <td className="px-4 text-center">
                        <span className="inline-flex justify-center">
                          <Cell value={row.talent} />
                        </span>
                      </td>
                      <td className="bg-[var(--color-brand-softer)] px-4 text-center">
                        <span className="inline-flex justify-center">
                          <Cell value={row.company} />
                        </span>
                      </td>
                      <td className="px-4 text-center">
                        <span className="inline-flex justify-center">
                          <Cell value={row.enterprise} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-5">
            <h3 className="text-[14px] font-semibold text-[var(--color-warning-fg)]">
              About the payment fee we have not charged yet
            </h3>
            <p className="mt-2 text-[13px] leading-[1.7] text-[var(--color-warning-fg)] opacity-90">
              Right now, funding and releasing are ledger operations inside FRIVVO — no money passes
              through a payment provider, so there is nothing to charge for. When we integrate one,
              a processing fee will apply to the movement of funds. We will publish it in advance,
              it will apply only to engagements started after it takes effect, and it will never be
              taken from what a freelancer is owed.
            </p>
          </div>
        </div>
      </section>

      <FaqSection items={PRICING_FAQ} eyebrow="Pricing FAQ" title="Straight answers about money" />

      <ClosingBand />
    </>
  );
}
