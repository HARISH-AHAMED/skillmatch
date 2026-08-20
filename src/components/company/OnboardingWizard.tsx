"use client";

import { Building2, CheckCircle2, MapPin, Receipt, Users } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Stepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { COMPANY_SIZES } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { submitCompanyOnboarding } from "@/actions/workflowActions";

const STEPS = [
  { id: "legal", label: "Legal entity", description: "Who you are on paper" },
  { id: "contact", label: "Contact", description: "How we reach you" },
  { id: "team", label: "Recruiter team", description: "Who hires with you" },
];

const RECRUITER_ROLES = ["Owner", "Admin", "Recruiter", "Finance", "Viewer"];

/**
 * Company onboarding (§6.2 step 6). Collects the details a listing and a
 * certificate need before the first project goes live.
 */
export function CompanyOnboardingWizard({
  open,
  onClose,
  companyName,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
}) {
  const toast = useToast();
  const { completeOnboarding } = useSession();
  const [step, setStep] = useState(0);
  const [saving, startSaving] = useTransition();

  const [form, setForm] = useState({
    legalName: companyName,
    registrationNumber: "",
    taxId: "",
    size: COMPANY_SIZES[1],
    headquarters: "",
    companyEmail: "",
    phone: "",
    website: "",
    description: "",
  });

  const [recruiters, setRecruiters] = useState([
    { name: "", email: "", role: "Recruiter" },
  ]);

  const finish = () => {
    startSaving(async () => {
      try {
        await submitCompanyOnboarding({
          legalBusinessName: form.legalName,
          registrationNumber: form.registrationNumber,
          gstNumber: form.taxId || undefined,
          headquarters: form.headquarters,
          companyEmail: form.companyEmail,
          businessPhone: form.phone,
          companyName: form.legalName,
          industry: "Other",
          website: form.website,
          location: form.headquarters,
          companySize: form.size,
          aboutText: form.description,
          teamMembers: recruiters
            .filter((r) => r.name.trim() && r.email.trim())
            .map((r) => ({
              name: r.name,
              email: r.email,
              role: r.role,
              designation: r.role,
            })),
          step: STEPS.length,
          completeOnboarding: true,
        });
      } catch (error) {
        toast.toast({
          title: error instanceof Error ? error.message : "Could not save your company details",
          tone: "error",
        });
        return;
      }

      completeOnboarding();
      onClose();
      setStep(0);
      toast.success(
        "Company profile set up",
        "You can post your first project now — the wizard autosaves as a draft.",
      );
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set up your company"
      description="Three short steps. This information appears on your listings and on the certificates you issue."
      size="lg"
      footer={
        <>
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Finish later
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={finish} loading={saving} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Complete setup
            </Button>
          )}
        </>
      }
    >
      <Stepper steps={STEPS} current={step} onStepClick={setStep} className="mb-6" />

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <Field
            label="Registered legal name"
            required
            help="Appears on contracts and certificates. It can differ from your trading name."
          >
            <Input
              value={form.legalName}
              onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              leftIcon={<Building2 />}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company registration number">
              <Input
                value={form.registrationNumber}
                onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                placeholder="NL 8123 4567 B01"
              />
            </Field>
            <Field label="Tax / VAT / GST number">
              <Input
                value={form.taxId}
                onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                leftIcon={<Receipt />}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company size" required>
              <Select
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
              >
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Headquarters" required>
              <Input
                value={form.headquarters}
                onChange={(e) => setForm((f) => ({ ...f, headquarters: e.target.value }))}
                placeholder="Amsterdam, Netherlands"
                leftIcon={<MapPin />}
              />
            </Field>
          </div>

          <Field
            label="What your company does"
            help="Freelancers read this before deciding whether to apply."
          >
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="We build developer infrastructure for teams shipping AI products…"
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <Field
            label="Company email"
            required
            help="Used for hiring notifications. Not shown publicly."
          >
            <Input
              type="email"
              value={form.companyEmail}
              onChange={(e) => setForm((f) => ({ ...f, companyEmail: e.target.value }))}
              placeholder="talent@yourcompany.com"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business phone">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+31 20 555 0142"
              />
            </Field>
            <Field label="Website">
              <Input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://"
              />
            </Field>
          </div>

          <div className="rounded-[var(--radius-md)] bg-[var(--color-brand-softer)] p-4">
            <p className="text-[12.5px] leading-[1.6] text-[var(--color-brand-active)]">
              Verification badges are granted once your registration number and company email domain
              are confirmed. Verified companies see roughly 40% more applications per listing.
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-[13.5px] leading-[1.6] text-[var(--color-text-secondary)]">
            Add colleagues who will review applicants or approve payments. Each one gets their own
            login, and every pipeline move records who made it.
          </p>

          <ul className="flex flex-col gap-3">
            {recruiters.map((r, i) => (
              <li
                key={i}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5"
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px]">
                  <Field label="Name">
                    <Input
                      value={r.name}
                      onChange={(e) =>
                        setRecruiters((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                        )
                      }
                      placeholder="Daniel Osei"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={r.email}
                      onChange={(e) =>
                        setRecruiters((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, email: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Access">
                    <Select
                      value={r.role}
                      onChange={(e) =>
                        setRecruiters((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, role: e.target.value } : x)),
                        )
                      }
                    >
                      {RECRUITER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                {recruiters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRecruiters((prev) => prev.filter((_, idx) => idx !== i))}
                    className="mt-2 text-[12.5px] font-medium text-[var(--color-error-fg)] hover:underline"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Users className="h-3.5 w-3.5" />}
            onClick={() =>
              setRecruiters((prev) => [...prev, { name: "", email: "", role: "Recruiter" }])
            }
            className="self-start"
          >
            Add another teammate
          </Button>
        </div>
      )}
    </Modal>
  );
}
