"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  GraduationCap,
  Info,
  ListChecks,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Chip, MatchScore } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Checkbox, Field, RadioCard, Select, Textarea, Input } from "@/components/ui/Field";
import { Alert, Progress } from "@/components/ui/Feedback";
import { Stepper } from "@/components/ui/Stepper";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/session";
import {
  acceptsApplications,
  applicationsForFreelancer,
  computeScore,
  getCapacity,
  getFreelancerByUserId,
  getProject,
} from "@/data/queries";
import { compensationLine } from "@/components/shared/Cards";

const STEPS = [
  { id: "cover", label: "Cover letter", description: "Why you, and which role" },
  { id: "screening", label: "Screening", description: "Answer the company's questions" },
  { id: "review", label: "Review & submit", description: "Check before it goes" },
];

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { session } = useSession();

  const project = getProject(id);
  const freelancer = session ? getFreelancerByUserId(session.userId) : undefined;

  const [step, setStep] = useState(0);
  const [coverLetter, setCoverLetter] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [isApprentice, setIsApprentice] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const round = useMemo(
    () => project?.rounds.find((r) => r.type === "SCREENING_QUESTIONS"),
    [project],
  );
  const questions = round?.questions ?? [];

  const matchScore = useMemo(
    () => (project && freelancer ? computeScore(project.id, freelancer.id) : null),
    [project, freelancer],
  );

  if (!project) notFound();

  const selectedRole = project.roles.find((r) => r.id === roleId);
  const capacity = getCapacity(project.id, roleId || undefined);
  const already = freelancer
    ? applicationsForFreelancer(freelancer.id).some((a) => a.projectId === project.id)
    : false;

  /* --------------------------------------------- validation ladder (§8.2) -- */

  function validateStep(target: number): string[] {
    const found: string[] = [];
    if (!project) return found;

    if (target >= 1) {
      if (!coverLetter.trim()) {
        found.push("Write a cover letter before continuing.");
      } else if (coverLetter.trim().length < 120) {
        found.push(
          "Your cover letter is very short. Companies rank on substance — aim for at least a few sentences about the specific work.",
        );
      }
      if (project.roles.length > 0 && !roleId) {
        found.push("Select the role you are applying for.");
      }
      if (isApprentice && selectedRole && !selectedRole.allowApprentice) {
        found.push("This role does not accept apprentices.");
      }
      if (!isApprentice && capacity.roleFull) {
        found.push(
          `All ${capacity.roleSlots} slot(s) for this role are already filled. Apply as an apprentice instead, if the role allows it.`,
        );
      }
      if (!isApprentice && capacity.projectFull) {
        found.push("This project has already reached its hiring limit.");
      }
    }

    if (target >= 2) {
      for (const q of questions) {
        if (q.required && !answers[q.id]?.trim()) {
          found.push(`Please answer the required question: "${q.question}"`);
        }
      }
    }

    return found;
  }

  const goNext = () => {
    const found = validateStep(step + 1);
    if (found.length) {
      setErrors(found);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setErrors([]);
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    const found = [...validateStep(1), ...validateStep(2)];
    if (!confirmed) found.push("Confirm the details are accurate before submitting.");
    if (found.length) {
      setErrors(found);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success(
        "Application submitted",
        `${project.company.companyName} has been notified with your ${matchScore?.aiScore ?? 0}% match score.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 700);
  };

  /* ---------------------------------------------------------- blocked states */

  if (already && !submitted) {
    return (
      <BlockedState
        title="You have already applied to this project"
        message="One application per project is allowed, so your history stays clean and the company sees a single record for you."
        primary={{ label: "Track your application", href: "/freelancer/applications" }}
        secondary={{ label: "Back to the listing", href: `/freelancer/projects/${project.id}` }}
      />
    );
  }

  if (!acceptsApplications(project.status) || project.visibility === "PRIVATE") {
    return (
      <BlockedState
        title="This project is no longer accepting applications"
        message={
          project.visibility === "PRIVATE"
            ? "This listing is private and does not accept applications."
            : "The company has closed this listing. Browse open engagements instead."
        }
        primary={{ label: "Browse open projects", href: "/freelancer/projects" }}
      />
    );
  }

  /* ------------------------------------------------------------- submitted -- */

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <Card padding="lg" className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success-bg)]">
            <CheckCircle2 className="h-7 w-7 text-[var(--color-success-fg)]" />
          </span>
          <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.018em] text-[var(--color-text-primary)]">
            Application submitted
          </h1>
          <p className="mx-auto mt-2.5 max-w-md text-[14px] leading-[1.65] text-[var(--color-text-secondary)]">
            {project.company.companyName} has been notified. Your application entered the pipeline
            at the <strong>Applied</strong> stage with a match score of{" "}
            <strong>{matchScore?.aiScore}%</strong>.
          </p>

          <div className="mx-auto mt-6 max-w-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 text-left">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
              What happens next
            </p>
            <ol className="mt-2.5 flex flex-col gap-2">
              {[
                "The company reviews your screening answers and match score.",
                "If shortlisted, you will be notified and may be invited to interview.",
                "An offer letter arrives here — you can accept, decline or counter it.",
              ].map((s, i) => (
                <li key={s} className="flex items-start gap-2.5">
                  <span className="mt-px flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[10px] font-bold text-[var(--color-brand-active)]">
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
                    {s}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button href="/freelancer/applications">Track applications</Button>
            <Button href="/freelancer/projects" variant="secondary">
              Find more work
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------- the wizard */

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => router.push(`/freelancer/projects/${project.id}`)}
        className="mb-4"
      >
        Back to listing
      </Button>

      {/* Project strip */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)]">
          <Image src={project.bannerUrl} alt="" fill sizes="64px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-semibold text-[var(--color-text-primary)]">
            Applying to {project.title}
          </h1>
          <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-text-secondary)]">
            {project.company.companyName} · {compensationLine(project)}
          </p>
        </div>
        {matchScore && <MatchScore score={matchScore.aiScore} size={48} showLabel />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
        <div className="min-w-0">
          <Card padding="lg">
            <Stepper steps={STEPS} current={step} onStepClick={setStep} className="mb-7" />

            {errors.length > 0 && (
              <Alert tone="error" title="Fix these before continuing" className="mb-5">
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* ---------------------------------------------- Step 1: cover -- */}
            {step === 0 && (
              <div className="flex flex-col gap-6">
                {project.roles.length > 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
                      <Users className="h-4 w-4 text-[var(--color-text-muted)]" />
                      Which role are you applying for?
                    </h2>
                    <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                      Each role has its own slot count. Apprentices shadow a role without taking a
                      slot.
                    </p>
                    <div className="mt-3.5 flex flex-col gap-2.5">
                      {project.roles.map((role) => (
                          <RadioCard
                            key={role.id}
                            checked={roleId === role.id}
                            onSelect={() => {
                              setRoleId(role.id);
                              if (!role.allowApprentice) setIsApprentice(false);
                            }}
                            title={role.name}
                            description={role.description}
                            icon={<Users />}
                          />
                      ))}
                    </div>

                    {selectedRole && (
                      <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                            {selectedRole.name}
                          </p>
                          <Badge
                            tone={
                              selectedRole.slots - selectedRole.hiredCount > 0
                                ? "success"
                                : "warning"
                            }
                            size="sm"
                          >
                            {selectedRole.slots - selectedRole.hiredCount} of {selectedRole.slots}{" "}
                            open
                          </Badge>
                        </div>
                        <Progress
                          className="mt-2.5"
                          value={selectedRole.hiredCount}
                          max={selectedRole.slots}
                          size="sm"
                        />

                        {selectedRole.allowApprentice && (
                          <div className="mt-3.5 border-t border-[var(--color-border-subtle)] pt-3.5">
                            <Checkbox
                              checked={isApprentice}
                              onChange={(e) => setIsApprentice(e.target.checked)}
                              label={
                                <span className="inline-flex items-center gap-1.5">
                                  <GraduationCap className="h-3.5 w-3.5 text-[var(--color-info-fg)]" />
                                  Apply as an apprentice on this role
                                </span>
                              }
                              description="Apprentices are mentored by the role's primary, occupy no slot, and receive their own certificate. You can apply as an apprentice even when the role is full."
                            />
                          </div>
                        )}

                        {!selectedRole.allowApprentice &&
                          selectedRole.slots - selectedRole.hiredCount === 0 && (
                            <Alert tone="warning" className="mt-3">
                              This role is full and does not accept apprentices. Pick another role
                              or check back if a slot reopens.
                            </Alert>
                          )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
                    <FileText className="h-4 w-4 text-[var(--color-text-muted)]" />
                    Cover letter
                  </h2>
                  <p className="mt-1 text-[13px] leading-[1.55] text-[var(--color-text-secondary)]">
                    Companies read this before the score. Be specific about the closest work you
                    have done and one decision you would make differently.
                  </p>
                  <Textarea
                    className="mt-3.5"
                    rows={11}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder={`I have run this exact migration twice — once on a 60-component library, once on a smaller console. Both times the hard part was sequencing the cutover so the in-house team never had two systems to reason about at once…`}
                    aria-label="Cover letter"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      {coverLetter.trim().split(/\s+/).filter(Boolean).length} words ·{" "}
                      {coverLetter.length} characters
                    </p>
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      Strong applications run 150–350 words
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------ Step 2: screening -- */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
                    <ListChecks className="h-4 w-4 text-[var(--color-text-muted)]" />
                    Screening questions
                  </h2>
                  <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                    Set by {project.company.companyName}. Required questions are enforced when you
                    submit, not just here.
                  </p>
                </div>

                {questions.length === 0 ? (
                  <Alert tone="info" title="No screening questions">
                    This company has not configured any. Continue to review your application.
                  </Alert>
                ) : (
                  questions.map((q, i) => (
                    <Field
                      key={q.id}
                      label={`${i + 1}. ${q.question}`}
                      required={q.required}
                      htmlFor={q.id}
                      help={
                        q.type === "PORTFOLIO"
                          ? "Paste a URL to relevant work."
                          : q.type === "VIDEO_INTRO"
                            ? "Paste a link to a short recorded intro."
                            : undefined
                      }
                    >
                      {q.type === "YES_NO" ? (
                        <div className="flex gap-2">
                          {["Yes", "No"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt }))}
                              className={`h-10 flex-1 rounded-[var(--radius-md)] border text-[14px] font-medium transition-colors ${
                                answers[q.id] === opt
                                  ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-active)]"
                                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : q.type === "MULTIPLE_CHOICE" && q.options ? (
                        <Select
                          id={q.id}
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        >
                          <option value="">Select an option…</option>
                          {q.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </Select>
                      ) : q.type === "PORTFOLIO" || q.type === "VIDEO_INTRO" ? (
                        <Input
                          id={q.id}
                          type="url"
                          placeholder="https://"
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        />
                      ) : (
                        <Textarea
                          id={q.id}
                          rows={5}
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                          placeholder="Your answer…"
                        />
                      )}
                    </Field>
                  ))
                )}
              </div>
            )}

            {/* --------------------------------------------- Step 3: review -- */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text-primary)]">
                    <Sparkles className="h-4 w-4 text-[var(--color-text-muted)]" />
                    Review your application
                  </h2>
                  <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                    This is exactly what {project.company.companyName} will see.
                  </p>
                </div>

                {/* Applicant summary */}
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={freelancer?.avatarUrl} name={freelancer?.name ?? "You"} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                        {freelancer?.name}
                      </p>
                      <p className="truncate text-[12.5px] text-[var(--color-text-secondary)]">
                        {freelancer?.professionalHeadline}
                      </p>
                    </div>
                    {matchScore && <MatchScore score={matchScore.aiScore} size={44} />}
                  </div>

                  {(roleId || isApprentice) && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--color-border-subtle)] pt-3">
                      {selectedRole && <Badge tone="brand">{selectedRole.name}</Badge>}
                      {isApprentice && (
                        <Badge tone="info" icon={<GraduationCap />}>
                          Applying as apprentice
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Cover letter */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Cover letter
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="text-[12.5px] font-medium text-[var(--color-link)] hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="whitespace-pre-line rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-4 text-[13.5px] leading-[1.7] text-[var(--color-text-secondary)]">
                    {coverLetter || "—"}
                  </p>
                </div>

                {/* Answers */}
                {questions.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                        Screening answers
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[12.5px] font-medium text-[var(--color-link)] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <ul className="flex flex-col gap-3">
                      {questions.map((q, i) => (
                        <li
                          key={q.id}
                          className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5"
                        >
                          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                            {i + 1}. {q.question}
                            {q.required && (
                              <span className="ml-1 text-[var(--color-error-fg)]">*</span>
                            )}
                          </p>
                          <p className="mt-1.5 whitespace-pre-line text-[13px] leading-[1.6] text-[var(--color-text-secondary)]">
                            {answers[q.id]?.trim() || (
                              <span className="italic text-[var(--color-text-muted)]">
                                Not answered
                              </span>
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                  <Checkbox
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    label="Everything here is accurate and mine"
                    description="Applications cannot be edited after submission, and you can only apply to a project once."
                  />
                </div>
              </div>
            )}

            {/* ---- Sticky footer actions (§19.13) ---- */}
            <div className="sticky bottom-0 -mx-5 mt-7 flex items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4 md:-mx-6 md:px-6">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={step === 0}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>

              <div className="flex items-center gap-2">
                <span className="hidden text-[12.5px] text-[var(--color-text-muted)] sm:block">
                  Step {step + 1} of {STEPS.length}
                </span>
                {step < STEPS.length - 1 ? (
                  <Button onClick={goNext} rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    onClick={submit}
                    loading={submitting}
                    leftIcon={<Send className="h-4 w-4" />}
                  >
                    Submit application
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="flex min-w-0 flex-col gap-4">
          {matchScore && (
            <Card padding="md">
              <CardHeader
                title="Your match score"
                description="How this listing scores you right now."
                divided={false}
                className="mb-4"
              />
              <div className="flex items-center gap-4">
                <MatchScore score={matchScore.aiScore} size={64} />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {matchScore.aiScore >= 85
                      ? "Strong match"
                      : matchScore.aiScore >= 65
                        ? "Reasonable match"
                        : "Stretch application"}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--color-text-secondary)]">
                    Companies sort applicants by this number, but they read the cover letter first.
                  </p>
                </div>
              </div>

              <dl className="mt-4 flex flex-col gap-2.5 border-t border-[var(--color-border-subtle)] pt-4">
                {[
                  ["Skill match", matchScore.breakdown.skillMatch, "50%"],
                  ["Experience", matchScore.breakdown.experienceMatch, "20%"],
                  ["Rating", matchScore.breakdown.ratingMatch, "15%"],
                  ["Completion rate", matchScore.breakdown.completionRateMatch, "10%"],
                  ["Project priority", matchScore.breakdown.priorityMatch, "5%"],
                ].map(([label, value, weight]) => (
                  <div key={label as string}>
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="text-[12px] text-[var(--color-text-secondary)]">
                        {label}{" "}
                        <span className="text-[var(--color-text-muted)]">({weight})</span>
                      </dt>
                      <dd className="text-[12px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {Math.round(value as number)}
                      </dd>
                    </div>
                    <Progress value={value as number} size="sm" className="mt-1" />
                  </div>
                ))}
              </dl>
            </Card>
          )}

          <Card padding="md">
            <CardHeader title="Engagement terms" divided={false} className="mb-3" />
            <dl className="flex flex-col gap-2.5">
              {[
                ["Compensation", compensationLine(project)],
                ["Duration", project.duration || "—"],
                ["Commitment", project.timingType],
                ["Working days", project.workingDays],
                [
                  "Hiring",
                  `${project.freelancersLimit} ${project.freelancersLimit === 1 ? "person" : "people"}`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <dt className="text-[12.5px] text-[var(--color-text-secondary)]">{label}</dt>
                  <dd className="text-right text-[12.5px] font-medium text-[var(--color-text-primary)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {project.compensation.type !== "UNPAID" && (
              <p className="mt-3.5 rounded-[var(--radius-sm)] bg-[var(--color-brand-softer)] p-2.5 text-[12px] leading-[1.5] text-[var(--color-brand-active)]">
                Payments run through funded stages on an auditable ledger. Money is committed before
                you start work on a stage.
              </p>
            )}
          </Card>

          <Card padding="md">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-primary)]">
              <Info className="h-4 w-4 text-[var(--color-text-muted)]" />
              Required skills
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {project.requiredSkills.map((s) => {
                const has = freelancer?.skills.includes(s);
                return (
                  <Chip key={s} size="sm" active={has} className="capitalize">
                    {has && <Check className="h-3 w-3" />}
                    {s}
                  </Chip>
                );
              })}
            </div>
            <p className="mt-2.5 text-[11.5px] leading-[1.5] text-[var(--color-text-muted)]">
              Highlighted skills are already on your profile. Skills you have but have not listed do
              not count toward the score.
            </p>
            <Link
              href="/freelancer/profile"
              className="mt-2 inline-block text-[12.5px] font-medium text-[var(--color-link)] hover:underline"
            >
              Update your skills
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function BlockedState({
  title,
  message,
  primary,
  secondary,
}: {
  title: string;
  message: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <div className="mx-auto max-w-lg py-12">
      <Card padding="lg" className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warning-bg)]">
          <Info className="h-5 w-5 text-[var(--color-warning-fg)]" />
        </span>
        <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.015em] text-[var(--color-text-primary)]">
          {title}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">
          {message}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button href={primary.href}>{primary.label}</Button>
          {secondary && (
            <Button href={secondary.href} variant="secondary">
              {secondary.label}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
