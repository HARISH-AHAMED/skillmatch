"use client";

import Image from "next/image";
import {
  Building2,
  Camera,
  Eye,
  Globe,
  Heart,
  Image as ImageIcon,
  MapPin,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert, EmptyState, Progress } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { COMPANY_BENEFITS, COMPANY_SIZES, PROJECT_CATEGORIES } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { getCompanyByUserId } from "@/data/queries";
import { MAX_SIZES } from "@/lib/constants";

const TABS = [
  { id: "identity", label: "Identity" },
  { id: "culture", label: "Culture & benefits" },
  { id: "gallery", label: "Gallery" },
  { id: "team", label: "Team" },
];

export default function CompanyProfilePage() {
  const { session } = useSession();
  const toast = useToast();
  const company = session ? getCompanyByUserId(session.userId) : undefined;

  const [tab, setTab] = useState("identity");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const [form, setForm] = useState(() => ({
    companyName: company?.companyName ?? "",
    industry: company?.industry ?? PROJECT_CATEGORIES[0],
    description: company?.description ?? "",
    website: company?.website ?? "",
    email: company?.email ?? "",
    phone: company?.phone ?? "",
    location: company?.location ?? "",
    size: company?.companySize ?? COMPANY_SIZES[1],
    foundedYear: String(company?.foundedYear ?? 2020),
    linkedin: company?.linkedin ?? "",
    missionVision: company?.missionVision ?? "",
    workCulture: company?.workCulture ?? "",
    hiringPhilosophy: company?.hiringPhilosophy ?? "",
    avgResponseTime: company?.avgResponseTime ?? "Within 24 hours",
  }));

  const [benefits, setBenefits] = useState<string[]>(company?.benefits ?? []);
  const [offices, setOffices] = useState<string[]>(company?.officeLocations ?? []);
  const [gallery, setGallery] = useState<string[]>(company?.galleryPhotos ?? []);
  const [team, setTeam] = useState(company?.teamMembers ?? []);
  const [newOffice, setNewOffice] = useState("");
  const [newMember, setNewMember] = useState({ name: "", title: "" });

  const completeness = useMemo(() => {
    const checks = [
      Boolean(form.companyName),
      form.description.length > 120,
      Boolean(form.location),
      Boolean(form.website),
      form.missionVision.length > 60,
      form.workCulture.length > 60,
      form.hiringPhilosophy.length > 60,
      benefits.length >= 3,
      gallery.length >= 2,
      team.length >= 1,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, benefits, gallery, team]);

  if (!company) return null;

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
      toast.success("Profile saved", "Your public company page has been updated.");
    }, 600);
  };

  return (
    <div>
      <PageHeader
        title="Company profile"
        description="This is what freelancers read before deciding whether to apply to your listings."
        action={
          <>
            <Button
              href={`/companies/${company.id}`}
              variant="secondary"
              leftIcon={<Eye className="h-4 w-4" />}
            >
              View public page
            </Button>
            <Button onClick={save} loading={saving} disabled={!dirty} leftIcon={<Save className="h-4 w-4" />}>
              Save changes
            </Button>
          </>
        }
      />

      {dirty && (
        <Alert tone="info" className="mb-5" title="Unsaved changes">
          Your public company page updates as soon as you save.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
        <div className="min-w-0">
          <Tabs items={TABS} value={tab} onChange={setTab} className="mb-5" />

          {/* ================= IDENTITY ================= */}
          {tab === "identity" && (
            <div className="flex flex-col gap-5">
              <Card padding="none" className="overflow-hidden">
                <div className="relative h-32 bg-[var(--color-surface-sunken)] md:h-40">
                  <Image src={company.bannerUrl} alt="" fill sizes="100vw" className="object-cover" />
                  <button
                    type="button"
                    className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-text-primary)] backdrop-blur hover:bg-white"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Change banner
                  </button>
                </div>
                <div className="px-5 pb-5">
                  <div className="-mt-10 flex items-end gap-4">
                    <div className="relative">
                      <Avatar
                        src={company.logoUrl}
                        name={company.companyName}
                        size="2xl"
                        rounded="md"
                        ring
                      />
                      <button
                        type="button"
                        aria-label="Change logo"
                        className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand)] text-white ring-2 ring-white hover:bg-[var(--color-brand-hover)]"
                      >
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="pb-2 text-[12px] leading-[1.5] text-[var(--color-text-muted)]">
                      Square logo, PNG or WebP up to {MAX_SIZES.image} MB.
                      <br />
                      It appears on listings and certificates.
                    </p>
                  </div>
                </div>
              </Card>

              <Card padding="lg">
                <CardHeader title="Company details" icon={<Building2 />} />
                <div className="flex flex-col gap-4">
                  <Field label="Company name" required>
                    <Input
                      value={form.companyName}
                      onChange={(e) => update("companyName", e.target.value)}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Industry" required>
                      <Select
                        value={form.industry}
                        onChange={(e) => update("industry", e.target.value)}
                      >
                        {[
                          "Developer Tools",
                          "Health Technology",
                          "Design & Branding",
                          "Logistics Technology",
                          "Education",
                          "E-commerce",
                          "Financial Services",
                          "Other",
                        ].map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Company size" required>
                      <Select value={form.size} onChange={(e) => update("size", e.target.value)}>
                        {COMPANY_SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <Field
                    label="About your company"
                    required
                    help="Be concrete about what you build and how you work with freelancers."
                    hint={`${form.description.length} characters`}
                  >
                    <Textarea
                      rows={6}
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Headquarters" required>
                      <Input
                        value={form.location}
                        onChange={(e) => update("location", e.target.value)}
                        leftIcon={<MapPin />}
                      />
                    </Field>
                    <Field label="Founded">
                      <Input
                        type="number"
                        value={form.foundedYear}
                        onChange={(e) => update("foundedYear", e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Website">
                      <Input
                        type="url"
                        value={form.website}
                        onChange={(e) => update("website", e.target.value)}
                        leftIcon={<Globe />}
                      />
                    </Field>
                    <Field label="LinkedIn">
                      <Input
                        type="url"
                        value={form.linkedin}
                        onChange={(e) => update("linkedin", e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contact email">
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </Card>

              <Card padding="lg">
                <CardHeader
                  title="Office locations"
                  description="Where your team is based. Remote-first companies can leave this empty."
                  icon={<MapPin />}
                />
                {offices.length > 0 && (
                  <ul className="mb-3 flex flex-wrap gap-2">
                    {offices.map((o) => (
                      <li key={o}>
                        <Chip
                          onRemove={() => {
                            setOffices((p) => p.filter((x) => x !== o));
                            setDirty(true);
                          }}
                        >
                          {o}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newOffice}
                    onChange={(e) => setNewOffice(e.target.value)}
                    placeholder="Amsterdam, Netherlands"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newOffice.trim()) {
                        e.preventDefault();
                        setOffices((p) => [...p, newOffice.trim()]);
                        setNewOffice("");
                        setDirty(true);
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    disabled={!newOffice.trim()}
                    onClick={() => {
                      setOffices((p) => [...p, newOffice.trim()]);
                      setNewOffice("");
                      setDirty(true);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ================= CULTURE ================= */}
          {tab === "culture" && (
            <div className="flex flex-col gap-5">
              <Card padding="lg">
                <CardHeader title="Mission & vision" icon={<Sparkles />} />
                <Textarea
                  rows={4}
                  value={form.missionVision}
                  onChange={(e) => update("missionVision", e.target.value)}
                  placeholder="Make the infrastructure layer of AI products boring, predictable and observable…"
                />
              </Card>

              <Card padding="lg">
                <CardHeader
                  title="How you work"
                  description="Freelancers use this to judge whether they will fit before applying."
                  icon={<Users />}
                />
                <Textarea
                  rows={4}
                  value={form.workCulture}
                  onChange={(e) => update("workCulture", e.target.value)}
                  placeholder="Written-first, asynchronous by default, four-hour overlap window…"
                />
              </Card>

              <Card padding="lg">
                <CardHeader
                  title="Hiring philosophy"
                  description="Shown on every listing you publish."
                  icon={<Building2 />}
                />
                <Textarea
                  rows={4}
                  value={form.hiringPhilosophy}
                  onChange={(e) => update("hiringPhilosophy", e.target.value)}
                  placeholder="We hire for judgement over credentials. Every applicant gets a paid scoped task before an offer…"
                />
                <Field label="Typical response time" className="mt-4 sm:w-64">
                  <Select
                    value={form.avgResponseTime}
                    onChange={(e) => update("avgResponseTime", e.target.value)}
                  >
                    {["Within 4 hours", "Within 8 hours", "Within 12 hours", "Within 24 hours", "Within 48 hours"].map(
                      (r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ),
                    )}
                  </Select>
                </Field>
              </Card>

              <Card padding="lg">
                <CardHeader
                  title="Benefits"
                  description="What contributors get beyond the fee."
                  icon={<Heart />}
                />
                <div className="flex flex-wrap gap-2">
                  {COMPANY_BENEFITS.map((b) => (
                    <Chip
                      key={b}
                      active={benefits.includes(b)}
                      onClick={() => {
                        setBenefits((p) =>
                          p.includes(b) ? p.filter((x) => x !== b) : [...p, b],
                        );
                        setDirty(true);
                      }}
                    >
                      {b}
                    </Chip>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ================= GALLERY ================= */}
          {tab === "gallery" && (
            <Card padding="lg">
              <CardHeader
                title="Photo gallery"
                description="Photos of your workplace, team or product. Companies with a gallery receive noticeably more applications."
                icon={<ImageIcon />}
              />
              {gallery.length === 0 ? (
                <EmptyState
                  compact
                  icon={<ImageIcon />}
                  title="No photos yet"
                  description="Add two or three photos that show what working with you is actually like."
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {gallery.map((src, i) => (
                    <div
                      key={src}
                      className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"
                    >
                      <Image
                        src={src}
                        alt={`Gallery ${i + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 240px"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => {
                          setGallery((p) => p.filter((_, idx) => idx !== i));
                          setDirty(true);
                        }}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/92 text-[var(--color-error-fg)] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-emphasis)] bg-[var(--color-surface-alt)] p-6 text-center">
                <ImageIcon className="mx-auto h-6 w-6 text-[var(--color-text-muted)]" />
                <p className="mt-2.5 text-[13px] font-medium text-[var(--color-text-primary)]">
                  Add photos
                </p>
                <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                  PNG, JPEG or WebP up to {MAX_SIZES.image} MB each · SVG is not accepted
                </p>
              </div>
            </Card>
          )}

          {/* ================= TEAM ================= */}
          {tab === "team" && (
            <Card padding="lg">
              <CardHeader
                title="Who freelancers will work with"
                description="Named people make a listing feel like a real team rather than a faceless brand."
                icon={<Users />}
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => setAddingMember(true)}
                  >
                    Add person
                  </Button>
                }
              />
              {team.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Users />}
                  title="No team members listed"
                  description="Add the people who will actually review applications and run the engagement."
                  action={{ label: "Add the first person", onClick: () => setAddingMember(true) }}
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {team.map((m, i) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5"
                    >
                      <Avatar src={m.avatarUrl} name={m.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                          {m.name}
                        </p>
                        <p className="truncate text-[12.5px] text-[var(--color-text-secondary)]">
                          {m.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => {
                          setTeam((p) => p.filter((_, idx) => idx !== i));
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
          )}
        </div>

        {/* ================= SIDEBAR ================= */}
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[76px] lg:self-start">
          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              Profile completeness
            </h3>
            <Progress className="mt-3" value={completeness} />
            <p className="mt-2 text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
              {completeness}% complete
            </p>
            <p className="mt-1.5 text-[12px] leading-[1.55] text-[var(--color-text-muted)]">
              A complete profile roughly doubles applications per listing.
            </p>
          </Card>

          <Card padding="md">
            <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              Your reputation
            </h3>
            <dl className="mt-3 flex flex-col gap-3">
              {[
                ["Trust score", company.trustScore, "Communication, payment and clarity averaged"],
                ["Payment reliability", company.paymentReliability, "From the payment sub-score"],
                ["Completion rate", company.completionRate, "Engagements taken to completion"],
                ["Retention", company.retentionRate, "Freelancers who come back"],
              ].map(([label, value, help]) => (
                <div key={label as string}>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-[12.5px] text-[var(--color-text-secondary)]">{label}</dt>
                    <dd className="text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {Math.round(value as number)}
                    </dd>
                  </div>
                  <Progress value={value as number} size="sm" className="mt-1" />
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{help}</p>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-[var(--color-border-subtle)] pt-3 text-[11.5px] leading-[1.5] text-[var(--color-text-muted)]">
              These are computed from freelancer reviews and engagement history. They cannot be
              edited.
            </p>
          </Card>

          <Card padding="md">
            <h3 className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
              Verification
            </h3>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {company.verificationBadges.map((b) => (
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

      {/* ---- Add team member ---- */}
      <Modal
        open={addingMember}
        onClose={() => setAddingMember(false)}
        title="Add a team member"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddingMember(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newMember.name.trim()}
              onClick={() => {
                setTeam((p) => [
                  ...p,
                  {
                    id: `tm-${Date.now()}`,
                    name: newMember.name.trim(),
                    title: newMember.title.trim(),
                    avatarUrl: "",
                  },
                ]);
                setNewMember({ name: "", title: "" });
                setAddingMember(false);
                setDirty(true);
              }}
            >
              Add person
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <Input
              value={newMember.name}
              onChange={(e) => setNewMember((m) => ({ ...m, name: e.target.value }))}
              placeholder="Marta Kovač"
            />
          </Field>
          <Field label="Title">
            <Input
              value={newMember.title}
              onChange={(e) => setNewMember((m) => ({ ...m, title: e.target.value }))}
              placeholder="VP Engineering"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
