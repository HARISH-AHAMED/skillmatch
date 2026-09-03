"use client";

import { useRef, useState } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { QUESTION_TYPES, ROUND_MODE_LABEL, ROUND_TYPE_CATALOG } from "@/lib/constants";
import type { ScreeningQuestion } from "@/lib/types";
import { uploadFile } from "@/lib/upload";

/* ============================================================================
   PROJECT EDITORS

   The posting wizard and the edit screen offer the same fields, so they share
   these rather than keeping two copies that drift — the multiple-choice
   options editor in particular, which the edit screen was missing entirely.
   ========================================================================= */

/* ------------------------------------------------------------- banner ----- */

export function BannerPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await uploadFile(file);
      if ("error" in result) {
        toast.error("That image could not be uploaded", result.error);
        return;
      }
      onChange(result.url);
    } finally {
      setBusy(false);
      // Let the same file be picked again after a failure.
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-[var(--color-text-secondary)]">
        Project banner
      </p>

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {value ? (
        <div className="relative h-36 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Project banner" className="h-full w-full object-cover" />
          <div className="absolute right-2 bottom-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
              Replace
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onChange(null)}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="flex h-36 w-full items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-emphasis)] bg-[var(--color-surface-alt)] transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-hover)] disabled:cursor-wait"
        >
          <div className="text-center">
            <Camera className="mx-auto h-6 w-6 text-[var(--color-text-muted)]" />
            <p className="mt-2 text-[13px] font-medium text-[var(--color-text-primary)]">
              {busy ? "Uploading…" : "Upload a banner"}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
              16:7 works best · PNG, JPEG or WebP up to 5 MB
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- rounds ----- */

export type RoundConfigMap = Record<string, { instructions?: string; deadline?: string }>;

export function RoundPicker({
  rounds,
  onRoundsChange,
  config,
  onConfigChange,
}: {
  rounds: string[];
  onRoundsChange: (next: string[]) => void;
  config: RoundConfigMap;
  onConfigChange: (next: RoundConfigMap) => void;
}) {
  const configurable = rounds.filter((type) => type !== "SCREENING_QUESTIONS");

  return (
    <>
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          Selection rounds
        </h3>
        <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--color-text-secondary)]">
          Every round you pick runs inside FRIVVO. Screening questions are answered during the
          application; the rest open for a candidate once you request them from the applicant page,
          and each one is reviewed and scored before the candidate moves on.
        </p>
        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
          {ROUND_TYPE_CATALOG.map((r) => {
            const selected = rounds.includes(r.type);
            return (
              <button
                key={r.type}
                type="button"
                onClick={() =>
                  onRoundsChange(
                    selected ? rounds.filter((x) => x !== r.type) : [...rounds, r.type],
                  )
                }
                className={`flex items-start gap-3 rounded-[var(--radius-md)] border p-3.5 text-left transition-colors ${
                  selected
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-softer)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-hover)]"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-medium text-[var(--color-text-primary)]">
                      {r.name}
                    </span>
                    <Badge tone="neutral" size="sm">
                      {ROUND_MODE_LABEL[r.mode]}
                    </Badge>
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-[1.5] text-[var(--color-text-secondary)]">
                    {r.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {configurable.length > 0 && (
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            Round instructions
          </h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">
            Shown to the candidate when you open the round. You can override both per candidate.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {configurable.map((type) => {
              const entry = ROUND_TYPE_CATALOG.find((r) => r.type === type);
              const current = config[type] ?? {};
              return (
                <li
                  key={type}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-medium text-[var(--color-text-primary)]">
                      {entry?.name ?? type}
                    </span>
                    {entry && (
                      <Badge tone="neutral" size="sm">
                        {ROUND_MODE_LABEL[entry.mode]}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
                    <Field label="Instructions for the candidate">
                      <Textarea
                        rows={2}
                        value={current.instructions ?? ""}
                        onChange={(e) =>
                          onConfigChange({
                            ...config,
                            [type]: { ...current, instructions: e.target.value },
                          })
                        }
                        placeholder={
                          entry?.mode === "LIVE_SESSION"
                            ? "What the session covers and how to prepare."
                            : "What you want submitted, and what good looks like."
                        }
                      />
                    </Field>
                    <Field label="Default deadline">
                      <Input
                        type="date"
                        value={current.deadline ?? ""}
                        onChange={(e) =>
                          onConfigChange({
                            ...config,
                            [type]: { ...current, deadline: e.target.value },
                          })
                        }
                      />
                    </Field>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------- questions ----- */

/**
 * A multiple-choice question is unanswerable without choices — the apply
 * wizard renders its dropdown straight from `options` — so selecting that type
 * seeds two empty ones, and any other type drops them rather than carrying
 * dead data into the listing.
 */
export function questionsWithTypeChange(
  questions: ScreeningQuestion[],
  id: string,
  type: ScreeningQuestion["type"],
): ScreeningQuestion[] {
  return questions.map((q) =>
    q.id === id
      ? {
          ...q,
          type,
          options:
            type === "MULTIPLE_CHOICE" ? (q.options?.length ? q.options : ["", ""]) : undefined,
        }
      : q,
  );
}

/** Questions whose choices are missing, for the caller's validation step. */
export function questionsMissingOptions(questions: ScreeningQuestion[]): ScreeningQuestion[] {
  return questions.filter(
    (q) =>
      q.type === "MULTIPLE_CHOICE" && (q.options ?? []).filter((o) => o.trim()).length < 2,
  );
}

export function QuestionEditor({
  questions,
  onChange,
}: {
  questions: ScreeningQuestion[];
  onChange: (next: ScreeningQuestion[]) => void;
}) {
  const patch = (id: string, changes: Partial<ScreeningQuestion>) =>
    onChange(questions.map((q) => (q.id === id ? { ...q, ...changes } : q)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            Screening questions
          </h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-text-secondary)]">
            Required answers are enforced when an application is submitted.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() =>
            onChange([
              ...questions,
              {
                id: `q${questions.length + 1}-${Date.now()}`,
                question: "",
                type: "PARAGRAPH",
                required: false,
              },
            ])
          }
        >
          Add question
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[11px] font-semibold text-[var(--color-text-secondary)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Textarea
                  rows={2}
                  value={q.question}
                  onChange={(e) => patch(q.id, { question: e.target.value })}
                  placeholder="What do you want to know before shortlisting?"
                />

                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <Select
                    inputSize="sm"
                    value={q.type}
                    onChange={(e) =>
                      onChange(
                        questionsWithTypeChange(
                          questions,
                          q.id,
                          e.target.value as ScreeningQuestion["type"],
                        ),
                      )
                    }
                    className="w-48"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                  <Checkbox
                    checked={q.required}
                    onChange={(e) => patch(q.id, { required: e.target.checked })}
                    label="Required"
                  />
                  <button
                    type="button"
                    onClick={() => onChange(questions.filter((x) => x.id !== q.id))}
                    className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-error-fg)]"
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {q.type === "MULTIPLE_CHOICE" && (
                  <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3">
                    <p className="text-[12px] font-medium text-[var(--color-text-secondary)]">
                      Answer options
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {(q.options ?? ["", ""]).map((option, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-4 shrink-0 text-[12px] text-[var(--color-text-muted)]">
                            {index + 1}
                          </span>
                          <Input
                            inputSize="sm"
                            value={option}
                            placeholder={`Option ${index + 1}`}
                            onChange={(e) =>
                              patch(q.id, {
                                options: (q.options ?? ["", ""]).map((o, oi) =>
                                  oi === index ? e.target.value : o,
                                ),
                              })
                            }
                          />
                          {(q.options ?? []).length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                patch(q.id, {
                                  options: (q.options ?? []).filter((_, oi) => oi !== index),
                                })
                              }
                              className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error-fg)]"
                              aria-label={`Remove option ${index + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      className="mt-2"
                      onClick={() => patch(q.id, { options: [...(q.options ?? ["", ""]), ""] })}
                    >
                      Add option
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------- string list ---- */

/** Objectives, deliverables, responsibilities, daily tasks — all the same shape. */
export function StringListEditor({
  label,
  help,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  help?: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const rows = items.length > 0 ? items : [""];

  return (
    <div>
      <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">{label}</p>
      {help && <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{help}</p>}

      <ul className="mt-2 flex flex-col gap-2">
        {rows.map((value, index) => (
          <li key={index} className="flex items-center gap-2">
            <Input
              inputSize="sm"
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(rows.map((v, i) => (i === index ? e.target.value : v)))}
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error-fg)]"
                aria-label={`Remove ${label} ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <Button
        size="sm"
        variant="ghost"
        leftIcon={<Plus className="h-3.5 w-3.5" />}
        className="mt-2"
        onClick={() => onChange([...rows, ""])}
      >
        Add
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------- faq ---- */

export function FaqEditor({
  items,
  onChange,
}: {
  items: { question: string; answer: string }[];
  onChange: (next: { question: string; answer: string }[]) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">
            Frequently asked questions
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
            Answered up front on the listing, so applicants do not have to ask.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => onChange([...items, { question: "", answer: "" }])}
        >
          Add question
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((entry, index) => (
          <li
            key={index}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  inputSize="sm"
                  value={entry.question}
                  placeholder="Question applicants keep asking"
                  onChange={(e) =>
                    onChange(
                      items.map((x, i) => (i === index ? { ...x, question: e.target.value } : x)),
                    )
                  }
                />
                <Textarea
                  rows={2}
                  value={entry.answer}
                  placeholder="Your answer"
                  onChange={(e) =>
                    onChange(
                      items.map((x, i) => (i === index ? { ...x, answer: e.target.value } : x)),
                    )
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="mt-1 shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error-fg)]"
                aria-label={`Remove question ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
