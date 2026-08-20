"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Clock,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { PageHero } from "@/components/marketing/PageHero";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeading } from "@/components/ui/Card";
import { Field, Input, RadioCard, Textarea, Checkbox } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Reveal } from "@/components/motion/Motion";
import { EDITORIAL, GALLERY } from "@/lib/media";

const TOPICS = [
  {
    value: "HIRING",
    title: "I want to hire",
    description: "Posting projects, team structure, or getting an engagement set up.",
    icon: <Building2 />,
  },
  {
    value: "TALENT",
    title: "I'm looking for work",
    description: "Profiles, applications, payments or certificates.",
    icon: <Users />,
  },
  {
    value: "ENTERPRISE",
    title: "Enterprise or partnership",
    description: "Volume hiring, procurement, security review or an integration.",
    icon: <ShieldCheck />,
  },
  {
    value: "SUPPORT",
    title: "Something is broken",
    description: "A bug, a payment question, or a dispute on an engagement.",
    icon: <LifeBuoy />,
  },
];

const OFFICES = [
  {
    city: "Amsterdam",
    country: "Netherlands",
    detail: "Product & engineering",
    image: GALLERY[0],
  },
  { city: "Singapore", country: "Singapore", detail: "APAC operations", image: GALLERY[3] },
  { city: "Nairobi", country: "Kenya", detail: "Talent partnerships", image: GALLERY[5] },
];

export function ContactClient() {
  const [topic, setTopic] = useState("HIRING");
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
    consent: false,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found: string[] = [];
    if (!form.name.trim()) found.push("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      found.push("Enter a valid email address.");
    if (form.message.trim().length < 20)
      found.push("Tell us a bit more — at least a sentence or two.");
    if (!form.consent) found.push("Please agree to us replying to your message.");

    if (found.length) {
      setErrors(found);
      return;
    }

    setErrors([]);
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 700);
  };

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Tell us what you are trying to do"
        highlight={["trying"]}
        description="We read every message and reply within one working day. If it is urgent and you are mid-engagement, use the chat inside your project workspace instead — it reaches the same people faster."
        image={EDITORIAL.craft}
      />

      <section className="section-y bg-[var(--color-app)]">
        <div className="container-wide">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-12">
            {/* ---- Form ---- */}
            <div className="min-w-0">
              {sent ? (
                <Card padding="lg" className="text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success-bg)]">
                    <CheckCircle2 className="h-7 w-7 text-[var(--color-success-fg)]" />
                  </span>
                  <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.018em] text-[var(--color-text-primary)]">
                    Message sent
                  </h2>
                  <p className="mx-auto mt-2.5 max-w-md text-[14px] leading-[1.65] text-[var(--color-text-secondary)]">
                    Thanks {form.name.split(" ")[0]}. We have your message and will reply to{" "}
                    <strong className="text-[var(--color-text-primary)]">{form.email}</strong>{" "}
                    within one working day.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button href="/discover/projects">Browse projects</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSent(false);
                        setForm({ name: "", email: "", company: "", message: "", consent: false });
                      }}
                    >
                      Send another message
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card padding="lg">
                  <SectionHeading
                    title="Send us a message"
                    description="Pick the closest topic so it reaches the right person first time."
                  />

                  <form onSubmit={submit} className="mt-7 flex flex-col gap-6" noValidate>
                    {errors.length > 0 && (
                      <Alert tone="error" title="Check the form">
                        <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
                          {errors.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      </Alert>
                    )}

                    <div>
                      <p className="mb-2.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
                        What is this about?
                      </p>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {TOPICS.map((t) => (
                          <RadioCard
                            key={t.value}
                            checked={topic === t.value}
                            onSelect={() => setTopic(t.value)}
                            title={t.title}
                            description={t.description}
                            icon={t.icon}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Your name" required>
                        <Input
                          inputSize="lg"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Alex Morgan"
                        />
                      </Field>
                      <Field label="Email" required>
                        <Input
                          type="email"
                          inputSize="lg"
                          value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="you@company.com"
                          leftIcon={<Mail />}
                        />
                      </Field>
                    </div>

                    <Field
                      label="Company"
                      help="Optional — helpful if you are asking about enterprise or volume hiring."
                    >
                      <Input
                        inputSize="lg"
                        value={form.company}
                        onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                        placeholder="Northwind Labs"
                        leftIcon={<Building2 />}
                      />
                    </Field>

                    <Field
                      label="Message"
                      required
                      help="The more specific you are about what you are trying to do, the more useful our first reply will be."
                      hint={`${form.message.length} characters`}
                    >
                      <Textarea
                        rows={7}
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        placeholder="We are hiring three people onto one project and want to understand how role slots and apprentices work before we publish…"
                      />
                    </Field>

                    <Checkbox
                      checked={form.consent}
                      onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                      label="You can reply to this message by email"
                      description="We use your details only to answer you. See our privacy policy for what we keep and for how long."
                    />

                    <Button
                      type="submit"
                      size="xl"
                      loading={sending}
                      leftIcon={<Send className="h-4 w-4" />}
                      className="self-start"
                    >
                      Send message
                    </Button>
                  </form>
                </Card>
              )}
            </div>

            {/* ---- Sidebar ---- */}
            <aside className="flex min-w-0 flex-col gap-4">
              <Card padding="md">
                <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  Faster routes
                </h3>
                <ul className="mt-3.5 flex flex-col gap-3">
                  {[
                    {
                      icon: <MessageSquare className="h-4 w-4" />,
                      title: "Mid-engagement question",
                      body: "Use the chat in your project workspace — it reaches the same team with full context attached.",
                      href: "/login",
                      cta: "Open your workspace",
                    },
                    {
                      icon: <ShieldCheck className="h-4 w-4" />,
                      title: "Verifying a certificate",
                      body: "You do not need us. Enter the certificate ID and the record resolves instantly.",
                      href: "/verify",
                      cta: "Verify a certificate",
                    },
                    {
                      icon: <LifeBuoy className="h-4 w-4" />,
                      title: "How something works",
                      body: "The help centre covers roles, apprentices, funding and completion in detail.",
                      href: "/help",
                      cta: "Read the help centre",
                    },
                  ].map((item) => (
                    <li
                      key={item.title}
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5"
                    >
                      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                        <span className="text-[var(--color-brand-active)]">{item.icon}</span>
                        {item.title}
                      </p>
                      <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[var(--color-text-secondary)]">
                        {item.body}
                      </p>
                      <Link
                        href={item.href}
                        className="mt-2 inline-block text-[12.5px] font-medium text-[var(--color-link)] hover:underline"
                      >
                        {item.cta} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card padding="md">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
                  <Clock className="h-4 w-4 text-[var(--color-text-muted)]" />
                  Response times
                </h3>
                <dl className="mt-3 flex flex-col gap-2.5">
                  {[
                    ["General enquiries", "Within 1 working day"],
                    ["Enterprise & procurement", "Within 4 hours"],
                    ["Payment or dispute issues", "Within 2 hours"],
                    ["Security disclosures", "Within 1 hour"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <dt className="text-[12.5px] text-[var(--color-text-secondary)]">{label}</dt>
                      <dd className="text-right text-[12.5px] font-medium text-[var(--color-text-primary)]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>

              <Card padding="md">
                <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  Direct email
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {[
                    ["General", "hello@frivvo.com"],
                    ["Support", "support@frivvo.com"],
                    ["Enterprise", "enterprise@frivvo.com"],
                    ["Security", "security@frivvo.com"],
                  ].map(([label, email]) => (
                    <li key={email} className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                        {label}
                      </span>
                      <a
                        href={`mailto:${email}`}
                        className="text-[12.5px] font-medium text-[var(--color-link)] hover:underline"
                      >
                        {email}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        </div>
      </section>

      {/* ---- Offices ---- */}
      <section className="section-y bg-[var(--color-surface)]">
        <div className="container-wide">
          <SectionHeading
            align="center"
            eyebrow="Where we are"
            title="Three offices, one overlap window"
            description="We are distributed on purpose, with a four-hour window every working day where everyone is online at once."
          />
          <div className="mt-11 grid gap-5 md:grid-cols-3">
            {OFFICES.map((o, i) => (
              <Reveal key={o.city} delay={i * 0.08}>
                <article className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                  <div className="relative aspect-[16/10]">
                    <Image
                      src={o.image}
                      alt={`${o.city} office`}
                      fill
                      sizes="(max-width: 768px) 100vw, 380px"
                      className="object-cover"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,17,0.6)] to-transparent" />
                    <span className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[13px] font-semibold text-white">
                      <MapPin className="h-3.5 w-3.5" />
                      {o.city}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[13.5px] font-medium text-[var(--color-text-primary)]">
                      {o.country}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">
                      {o.detail}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
