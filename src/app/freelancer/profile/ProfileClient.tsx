"use client";

import Image from "next/image";
import {
  Award,
  Briefcase,
  Camera,
  Eye,
  FileText,
  GraduationCap,
  Languages,
  Link2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UserCircle,
} from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Field, Input, RadioCard, Select, Textarea, Toggle } from "@/components/ui/Field";
import { Alert, EmptyState, Progress } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { DOMAINS, LANGUAGE_LEVELS, MAX_SIZES, SKILL_LIBRARY } from "@/lib/constants";
import { updateFreelancerProfile } from "@/actions/profileActions";
import { updateFreelancerCalendarAndProfile } from "@/actions/workflowActions";
import { setCertificateVisibility } from "@/actions/certificateActions";
import { uploadFile } from "@/lib/upload";
import type { AvailabilityStatus, Certificate, Freelancer } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const TABS = [
  { id: "basics", label: "Basics" },
  { id: "skills", label: "Skills & availability" },
  { id: "experience", label: "Education" },
  { id: "portfolio", label: "Portfolio" },
  { id: "certificates", label: "Certificates" },
];

const AVAILABILITY_OPTIONS: {
  value: AvailabilityStatus;
  title: string;
  description: string;
}[] = [
  {
    value: "AVAILABLE",
    title: "Available for work",
    description: "You appear first in company searches and can be invited to projects.",
  },
  {
    value: "BUSY",
    title: "Partly booked",
    description: "You still appear in searches, marked as having limited capacity.",
  },
  {
    value: "UNAVAILABLE",
    title: "Not taking work",
    description: "You are hidden from new searches. Existing engagements are unaffected.",
  },
];

export function ProfileClient({
  freelancer,
  certificates,
}: {
  freelancer: Freelancer;
  certificates: Certificate[];
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState("basics");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() => ({
    name: freelancer.name ?? "",
    headline: freelancer.professionalHeadline ?? "",
    bio: freelancer.bio ?? "",
    location: freelancer.location ?? "",
    domain: freelancer.domain ?? "Software Engineering",
    experienceYears: String(freelancer.experienceYears ?? 0),
    hourlyRate: String(freelancer.hourlyRate ?? ""),
    currency: freelancer.currency ?? "USD",
    responseTime: freelancer.responseTime ?? "Within 24 hours",
    availability: (freelancer.availabilityStatus ?? "AVAILABLE") as AvailabilityStatus,
    portfolioUrl: freelancer.portfolioUrl ?? "",
    gender: freelancer.gender ?? "ANY",
  }));

  const [skills, setSkills] = useState<string[]>(freelancer.skills ?? []);
  const [skillQuery, setSkillQuery] = useState("");
  const [languages, setLanguages] = useState(freelancer.languages ?? []);
  const [education, setEducation] = useState(freelancer.education ?? []);
  const [portfolio, setPortfolio] = useState(freelancer.portfolioItems ?? []);
  const [hiddenCerts, setHiddenCerts] = useState<string[]>(() =>
    certificates.filter((c) => c.hidden).map((c) => c.id),
  );

  const [media, setMedia] = useState({
    avatarUrl: freelancer.avatarUrl,
    bannerUrl: freelancer.bannerUrl,
    resumeUrl: freelancer.resumeUrl ?? "",
  });
  const bannerInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);

  const [addingEducation, setAddingEducation] = useState(false);
  const [addingPortfolio, setAddingPortfolio] = useState(false);
  const [addingLanguage, setAddingLanguage] = useState(false);

  const completeness = useMemo(() => {
    const checks = [
      Boolean(form.name),
      Boolean(form.headline),
      form.bio.length > 120,
      Boolean(form.location),
      skills.length >= 4,
      education.length > 0,
      portfolio.length >= 2,
      languages.length > 0,
      Boolean(form.hourlyRate),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, skills, education, portfolio, languages]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  /**
   * Freelancer has no location column: the profile form composes it into the
   * headline, which is where the rest of the app reads it back from.
   */
  const composedHeadline = () =>
    form.location.trim() ? `${form.headline.trim()} · ${form.location.trim()}` : form.headline.trim();

  const save = async () => {
    setSaving(true);
    try {
      // Education and languages live in the profile metadata block, which only
      // this action writes. It is also the only action that stores a rate, in
      // the `experience` column. It runs first; the profile update below then
      // writes that same settings object back, so it cannot be clobbered.
      await updateFreelancerCalendarAndProfile({
        purpose: "To find a job",
        languages: languages.map((l) => `${l.name} (${l.level})`),
        education: education.map((e) => ({
          school: e.school,
          degree: e.degree,
          fieldOfStudy: e.field ?? "",
          startYear: e.startYear,
          endYear: e.endYear ?? "",
        })),
        availabilityCalendar: [],
        bioText: form.bio,
        professionalHeadline: composedHeadline(),
        experienceYears: Number(form.experienceYears) || 0,
        portfolioUrl: form.portfolioUrl,
        resumeUrl: media.resumeUrl,
        skills,
        gender: form.gender,
        hourlyRate: form.hourlyRate,
      });

      await updateFreelancerProfile({
        name: form.name,
        image: media.avatarUrl,
        bannerUrl: media.bannerUrl || null,
        bio: form.bio,
        skills,
        experienceYears: Number(form.experienceYears) || 0,
        portfolioUrl: form.portfolioUrl,
        resumeUrl: media.resumeUrl,
        professionalHeadline: composedHeadline(),
        // Mirrors what updateFreelancerCalendarAndProfile just wrote, so the
        // rate survives this second write. Currency rides along: nothing in
        // the backend reads this column, so its shape is ours to extend.
        experience: { hourlyRate: form.hourlyRate, currency: form.currency },
        portfolioItems: portfolio,
        responseTime: form.responseTime,
        availabilityStatus: form.availability,
        gender: form.gender,
        domain: form.domain,
      });

      setDirty(false);
      toast.success(
        "Profile saved",
        "Your match scores across every open project have been recalculated.",
      );
    } catch (error) {
      toast.toast({
        title: error instanceof Error ? error.message : "Could not save your profile",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const pickFile = async (
    file: File | undefined,
    key: "avatarUrl" | "bannerUrl" | "resumeUrl",
  ) => {
    if (!file) return;
    const result = await uploadFile(file);
    if ("error" in result) {
      toast.toast({ title: result.error, tone: "error" });
      return;
    }
    setMedia((m) => ({ ...m, [key]: result.url }));
    setDirty(true);
  };

  const filteredSkills = SKILL_LIBRARY.filter(
    (s) => s.includes(skillQuery.toLowerCase()) && !skills.includes(s),
  ).slice(0, 8);

  return (
    <div>
      <PageHeader
        title="My profile"
        description="This is what companies see, and what every match score is computed from."
        action={
          <>
            <Button href={`/freelancers/${freelancer.id}`} variant="secondary" leftIcon={<Eye className="h-4 w-4" />}>
              View public profile
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={!dirty} leftIcon={<Save className="h-4 w-4" />}>
              Save changes
            </Button>
          </>
        }
      />

      {dirty && (
        <Alert tone="info" className="mb-5" title="Unsaved changes">
          Saving recalculates your match score against every open project.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
        <div className="min-w-0">
          <Tabs items={TABS} value={tab} onChange={setTab} className="mb-5" />

          {/* ================= BASICS ================= */}
          {tab === "basics" && (
            <div className="flex flex-col gap-5">
              {/* Banner + avatar */}
              <Card padding="none" className="overflow-hidden">
                <div className="relative h-32 bg-[var(--color-surface-sunken)] md:h-40">
                  {media.bannerUrl && (
                    <Image src={media.bannerUrl} alt="" fill sizes="100vw" className="object-cover" />
                  )}
                  <input
                    ref={bannerInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => void pickFile(e.target.files?.[0], "bannerUrl")}
                  />
                  <button
                    type="button"
                    onClick={() => bannerInput.current?.click()}
                    className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-text-primary)] backdrop-blur transition-colors hover:bg-white"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Change banner
                  </button>
                </div>
                <div className="px-5 pb-5">
                  <div className="-mt-10 flex items-end gap-4">
                    <div className="relative">
                      <Avatar src={media.avatarUrl} name={freelancer.name} size="2xl" ring />
                      <input
                        ref={avatarInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => void pickFile(e.target.files?.[0], "avatarUrl")}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInput.current?.click()}
                        aria-label="Change photo"
                        className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand)] text-white ring-2 ring-white transition-colors hover:bg-[var(--color-brand-hover)]"
                      >
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="pb-2 text-[12px] leading-[1.5] text-[var(--color-text-muted)]">
                      JPG, PNG or WebP up to {MAX_SIZES.image} MB.
                      <br />
                      Square images work best.
                    </p>
                  </div>
                </div>
              </Card>

              <Card padding="lg">
                <CardHeader title="Who you are" icon={<UserCircle />} />
                <div className="flex flex-col gap-4">
                  <Field label="Full name" required>
                    <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
                  </Field>

                  <Field
                    label="Professional headline"
                    required
                    help="One line. This is the first thing a company reads about you."
                    hint={`${form.headline.length}/120`}
                  >
                    <Input
                      maxLength={120}
                      value={form.headline}
                      onChange={(e) => update("headline", e.target.value)}
                      placeholder="Senior product designer — design systems & complex B2B interfaces"
                    />
                  </Field>

                  <Field
                    label="About you"
                    required
                    help="Companies read this before they look at your score. Be specific about the work you do and how you do it."
                    hint={`${form.bio.length} characters`}
                  >
                    <Textarea
                      rows={8}
                      value={form.bio}
                      onChange={(e) => update("bio", e.target.value)}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Location" required>
                      <Input
                        value={form.location}
                        onChange={(e) => update("location", e.target.value)}
                        placeholder="Taipei, Taiwan"
                      />
                    </Field>
                    <Field label="Primary discipline" required>
                      <Select value={form.domain} onChange={(e) => update("domain", e.target.value)}>
                        {DOMAINS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <Field label="Personal site or portfolio">
                    <Input
                      type="url"
                      value={form.portfolioUrl}
                      onChange={(e) => update("portfolioUrl", e.target.value)}
                      placeholder="https://"
                      leftIcon={<Link2 />}
                    />
                  </Field>
                </div>
              </Card>

              <Card padding="lg">
                <CardHeader
                  title="Resume"
                  description="Optional. Some companies ask for it during screening."
                  icon={<FileText />}
                />
                <button
                  type="button"
                  onClick={() => resumeInput.current?.click()}
                  className="w-full rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-emphasis)] bg-[var(--color-surface-alt)] p-6 text-center"
                >
                  <input
                    ref={resumeInput}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => void pickFile(e.target.files?.[0], "resumeUrl")}
                  />
                  <Upload className="mx-auto h-6 w-6 text-[var(--color-text-muted)]" />
                  <p className="mt-2.5 text-[13px] font-medium text-[var(--color-text-primary)]">
                    {media.resumeUrl ? "Replace your resume" : "Upload your resume"}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                    PDF only, up to {MAX_SIZES.pdf} MB
                  </p>
                  {media.resumeUrl && (
                    <p className="mt-2 text-[12px] text-[var(--color-brand-active)]">
                      Current: {media.resumeUrl.split("/").pop()}
                    </p>
                  )}
                </button>
              </Card>
            </div>
          )}

          {/* ================= SKILLS ================= */}
          {tab === "skills" && (
            <div className="flex flex-col gap-5">
              <Card padding="lg">
                <CardHeader
                  title="Skills"
                  description="Skill match is 50% of every score you get. Use the exact terms listings ask for."
                  icon={<Sparkles />}
                />

                {skills.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <Chip
                        key={s}
                        active
                        className="capitalize"
                        onRemove={() => {
                          setSkills((prev) => prev.filter((x) => x !== s));
                          setDirty(true);
                        }}
                      >
                        {s}
                      </Chip>
                    ))}
                  </div>
                )}

                <Field label="Add a skill" help="Skills are stored lowercase so matching is exact.">
                  <Input
                    value={skillQuery}
                    onChange={(e) => setSkillQuery(e.target.value)}
                    placeholder="Start typing — react, figma, machine learning…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && skillQuery.trim()) {
                        e.preventDefault();
                        const v = skillQuery.trim().toLowerCase();
                        if (!skills.includes(v)) setSkills((p) => [...p, v]);
                        setSkillQuery("");
                        setDirty(true);
                      }
                    }}
                  />
                </Field>

                {filteredSkills.length > 0 && skillQuery && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {filteredSkills.map((s) => (
                      <Chip
                        key={s}
                        size="sm"
                        className="capitalize"
                        onClick={() => {
                          setSkills((p) => [...p, s]);
                          setSkillQuery("");
                          setDirty(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                        {s}
                      </Chip>
                    ))}
                  </div>
                )}

                {skills.length < 4 && (
                  <Alert tone="warning" className="mt-4">
                    Add at least four skills — profiles with fewer rank poorly in company searches.
                  </Alert>
                )}
              </Card>

              <Card padding="lg">
                <CardHeader title="Availability" icon={<Briefcase />} />
                <div className="flex flex-col gap-2.5">
                  {AVAILABILITY_OPTIONS.map((o) => (
                    <RadioCard
                      key={o.value}
                      checked={form.availability === o.value}
                      onSelect={() => update("availability", o.value)}
                      title={o.title}
                      description={o.description}
                    />
                  ))}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Years of experience" required>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={form.experienceYears}
                      onChange={(e) => update("experienceYears", e.target.value)}
                    />
                  </Field>
                  <Field label="Typical response time">
                    <Select
                      value={form.responseTime}
                      onChange={(e) => update("responseTime", e.target.value)}
                    >
                      {["Within 2 hours", "Within 8 hours", "Within 24 hours", "Within 48 hours"].map(
                        (r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ),
                      )}
                    </Select>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Indicative hourly rate" help="Shown as a 'from' price on your profile.">
                    <Input
                      type="number"
                      min={0}
                      value={form.hourlyRate}
                      onChange={(e) => update("hourlyRate", e.target.value)}
                    />
                  </Field>
                  <Field label="Currency">
                    <Select
                      value={form.currency}
                      onChange={(e) => update("currency", e.target.value)}
                    >
                      {["USD", "EUR", "GBP", "INR", "SGD", "AUD", "CAD"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </Card>

              <Card padding="lg">
                <CardHeader
                  title="Languages"
                  icon={<Languages />}
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setAddingLanguage(true)}>
                      Add language
                    </Button>
                  }
                />
                {languages.length === 0 ? (
                  <EmptyState compact icon={<Languages />} title="No languages listed" />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {languages.map((l, i) => (
                      <li
                        key={l.name}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
                      >
                        <span className="text-[13.5px] font-medium text-[var(--color-text-primary)]">
                          {l.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge tone="neutral" size="sm">
                            {l.level}
                          </Badge>
                          <button
                            type="button"
                            aria-label={`Remove ${l.name}`}
                            onClick={() => {
                              setLanguages((prev) => prev.filter((_, idx) => idx !== i));
                              setDirty(true);
                            }}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-error-fg)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}

          {/* ================= EXPERIENCE ================= */}
          {tab === "experience" && (
            <div className="flex flex-col gap-5">
              <Card padding="lg">
                <CardHeader
                  title="Education"
                  icon={<GraduationCap />}
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setAddingEducation(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                      Add
                    </Button>
                  }
                />
                {education.length === 0 ? (
                  <EmptyState compact icon={<GraduationCap />} title="No education added" />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {education.map((e, i) => (
                      <li
                        key={e.id}
                        className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-alt)]">
                          <GraduationCap className="h-4 w-4 text-[var(--color-text-secondary)]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                            {e.school}
                          </h4>
                          <p className="text-[13px] text-[var(--color-text-secondary)]">
                            {e.degree}
                            {e.field ? `, ${e.field}` : ""}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                            {e.startYear} — {e.endYear}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove"
                          onClick={() => {
                            setEducation((prev) => prev.filter((_, idx) => idx !== i));
                            setDirty(true);
                          }}
                          className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error-fg)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}

          {/* ================= PORTFOLIO ================= */}
          {tab === "portfolio" && (
            <Card padding="lg">
              <CardHeader
                title="Portfolio"
                description="Two or more pieces makes a measurable difference to how often you are shortlisted."
                icon={<Briefcase />}
                action={
                  <Button size="sm" variant="secondary" onClick={() => setAddingPortfolio(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                    Add item
                  </Button>
                }
              />
              {portfolio.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Briefcase />}
                  title="No portfolio items yet"
                  description="Add work you can show publicly, with a note on the decisions behind it."
                  action={{ label: "Add your first item", onClick: () => setAddingPortfolio(true) }}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {portfolio.map((item, i) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"
                    >
                      <div className="relative aspect-[16/10] bg-[var(--color-surface-sunken)]">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 320px"
                          className="object-cover"
                        />
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() => {
                            setPortfolio((prev) => prev.filter((_, idx) => idx !== i));
                            setDirty(true);
                          }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-[var(--color-error-fg)] backdrop-blur"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="p-3.5">
                        <h4 className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                          {item.title}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                          {item.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.tags.map((t) => (
                            <Chip key={t} size="sm" className="capitalize">
                              {t}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ================= CERTIFICATES ================= */}
          {tab === "certificates" && (
            <Card padding="lg">
              <CardHeader
                title="Earned certificates"
                description="Issued automatically at project completion. You choose which appear on your public profile."
                icon={<Award />}
              />
              {certificates.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Award />}
                  title="No certificates yet"
                  description="A certificate is issued for every engagement you complete."
                  action={{ label: "Browse projects", href: "/freelancer/projects" }}
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {certificates.map((c) => {
                    const hidden = hiddenCerts.includes(c.id);
                    return (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)]">
                          <Award className="h-5 w-5 text-[var(--color-brand-active)]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                            {c.projectTitle}
                          </h4>
                          <p className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">
                            {c.roleTitle} · {c.issuerName} · {formatDate(c.issuedAt)}
                          </p>
                          <p className="mt-1 font-mono text-[11.5px] text-[var(--color-text-muted)]">
                            {c.publicId}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <Toggle
                            size="sm"
                            checked={!hidden}
                            onChange={(v) => {
                              setHiddenCerts((prev) =>
                                v ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                              );
                              startTransition(async () => {
                                const result = await setCertificateVisibility(c.id, v);
                                if (result.success) {
                                  toast.toast({
                                    title: v ? "Shown on your profile" : "Hidden from your profile",
                                    description: "Direct verification by ID always works either way.",
                                    tone: "success",
                                  });
                                  return;
                                }
                                setHiddenCerts((prev) =>
                                  v ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                                );
                                toast.toast({
                                  title: result.error ?? "Could not update visibility",
                                  tone: "error",
                                });
                              });
                            }}
                            label="Public"
                          />
                          <Button href={`/verify/${c.publicId}`} size="xs" variant="secondary">
                            View
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
        </div>

        {/* ================= SIDEBAR ================= */}
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[76px] lg:self-start">
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              Profile strength
            </h3>
            <Progress className="mt-3" value={completeness} size="md" />
            <p className="mt-2 text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
              {completeness}% complete
            </p>

            <ul className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-4">
              {[
                { label: "Headline written", done: Boolean(form.headline) },
                { label: "Bio over 120 characters", done: form.bio.length > 120 },
                { label: "At least 4 skills", done: skills.length >= 4 },
                { label: "2+ portfolio items", done: portfolio.length >= 2 },
                { label: "Rate set", done: Boolean(form.hourlyRate) },
              ].map((c) => (
                <li key={c.label} className="flex items-center gap-2.5">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      c.done ? "bg-[var(--color-brand)]" : "bg-[var(--color-surface-sunken)]"
                    }`}
                  >
                    {c.done && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2 6.5L4.5 9L10 3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`text-[12.5px] ${
                      c.done
                        ? "text-[var(--color-text-secondary)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="md" className="bg-[var(--color-brand-softer)] border-[var(--color-brand-border)]">
            <Sparkles className="h-5 w-5 text-[var(--color-brand-active)]" />
            <h3 className="mt-2.5 text-[13.5px] font-semibold text-[var(--color-text-primary)]">
              How scoring works
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[var(--color-text-secondary)]">
              Skill match is 50% of every score, experience 20%, rating 15%, completion rate 10% and
              the project&apos;s own priority 5%. The first two are the only ones you can change
              today.
            </p>
          </Card>

          <Card padding="md">
            <h3 className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
              Verification
            </h3>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {freelancer.verificationBadges.map((b) => (
                <li key={b}>
                  <Badge tone="brand" size="sm">
                    {b}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      {/* ================= MODALS ================= */}
      <AddEducationModal
        open={addingEducation}
        onClose={() => setAddingEducation(false)}
        onAdd={(entry) => {
          setEducation((prev) => [entry, ...prev]);
          setDirty(true);
        }}
      />
      <AddPortfolioModal
        open={addingPortfolio}
        onClose={() => setAddingPortfolio(false)}
        onAdd={(entry) => {
          setPortfolio((prev) => [entry, ...prev]);
          setDirty(true);
        }}
      />
      <AddLanguageModal
        open={addingLanguage}
        onClose={() => setAddingLanguage(false)}
        onAdd={(entry) => {
          setLanguages((prev) => [...prev, entry]);
          setDirty(true);
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- modals -- */

function AddEducationModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (e: import("@/lib/types").EducationEntry) => void;
}) {
  const [f, setF] = useState({ school: "", degree: "", field: "", start: "", end: "" });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add education"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!f.school.trim()}
            onClick={() => {
              onAdd({
                id: `e-${Date.now()}`,
                school: f.school.trim(),
                degree: f.degree.trim(),
                field: f.field.trim(),
                startYear: f.start,
                endYear: f.end,
              });
              setF({ school: "", degree: "", field: "", start: "", end: "" });
              onClose();
            }}
          >
            Add education
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="School or institution" required>
          <Input value={f.school} onChange={(e) => setF((s) => ({ ...s, school: e.target.value }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Degree">
            <Input value={f.degree} onChange={(e) => setF((s) => ({ ...s, degree: e.target.value }))} placeholder="BSc" />
          </Field>
          <Field label="Field of study">
            <Input value={f.field} onChange={(e) => setF((s) => ({ ...s, field: e.target.value }))} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start year">
            <Input value={f.start} onChange={(e) => setF((s) => ({ ...s, start: e.target.value }))} placeholder="2016" />
          </Field>
          <Field label="End year">
            <Input value={f.end} onChange={(e) => setF((s) => ({ ...s, end: e.target.value }))} placeholder="2020" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function AddPortfolioModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (e: import("@/lib/types").PortfolioItem) => void;
}) {
  const [f, setF] = useState({ title: "", description: "", link: "", tags: "" });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a portfolio item"
      description="Show the work and, briefly, the reasoning behind it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!f.title.trim()}
            onClick={() => {
              onAdd({
                id: `p-${Date.now()}`,
                title: f.title.trim(),
                description: f.description.trim(),
                imageUrl:
                  "https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=800&q=80",
                link: f.link.trim(),
                tags: f.tags
                  .split(",")
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean),
              });
              setF({ title: "", description: "", link: "", tags: "" });
              onClose();
            }}
          >
            Add item
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Title" required>
          <Input value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value }))} />
        </Field>
        <Field label="What it was and what you decided">
          <Textarea
            rows={4}
            value={f.description}
            onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))}
          />
        </Field>
        <Field label="Link">
          <Input
            type="url"
            value={f.link}
            onChange={(e) => setF((s) => ({ ...s, link: e.target.value }))}
            placeholder="https://"
          />
        </Field>
        <Field label="Tags" help="Comma separated.">
          <Input
            value={f.tags}
            onChange={(e) => setF((s) => ({ ...s, tags: e.target.value }))}
            placeholder="react, design systems, accessibility"
          />
        </Field>
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-emphasis)] bg-[var(--color-surface-alt)] p-5 text-center">
          <Upload className="mx-auto h-5 w-5 text-[var(--color-text-muted)]" />
          <p className="mt-2 text-[12.5px] text-[var(--color-text-muted)]">
            Add a cover image — PNG, JPEG or WebP up to {MAX_SIZES.image} MB
          </p>
        </div>
      </div>
    </Modal>
  );
}

function AddLanguageModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (e: { name: string; level: string }) => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState(LANGUAGE_LEVELS[0]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a language"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              onAdd({ name: name.trim(), level });
              setName("");
              onClose();
            }}
          >
            Add language
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Language" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mandarin" />
        </Field>
        <Field label="Proficiency">
          <Select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LANGUAGE_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
