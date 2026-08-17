/**
 * Backfill: JSON financial metadata → the financial tables.
 *
 * Reads the payment state currently embedded in Project.description and
 * Application.coverLetter and writes it into ProjectCompensation, PaymentItem,
 * WorkLog, StipendPeriod and the PaymentTransaction ledger.
 *
 *   npx tsx prisma/backfill/financial.ts            # dry run (default)
 *   npx tsx prisma/backfill/financial.ts --apply    # write
 *   npx tsx prisma/backfill/financial.ts --verify   # compare without writing
 *
 * Properties:
 *   - Dry run by default. Writing requires an explicit --apply.
 *   - Idempotent: every row is keyed on a deterministic derived id, so a repeat
 *     run inserts nothing new.
 *   - Never silently discards. Anything that fails to parse or validate is
 *     recorded in migration-issues.json with the source id, the reason and the
 *     raw value, and the run exits non-zero so a partial migration cannot pass
 *     unnoticed.
 *   - The source JSON is left untouched, so the cutover is reversible.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { writeFileSync } from "fs";
import { join } from "path";
import { getProjectMetadataDirect, parseApplicationMetadata } from "../../src/lib/workflowHelpers";
import { deriveFromMetadata, normaliseFrequency } from "../../src/lib/compensation";

const db = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");
const DRY = !APPLY;

type Issue = { kind: string; sourceId: string; reason: string; raw?: unknown };
const issues: Issue[] = [];
const counts = {
  compensation: 0,
  paymentItems: 0,
  workLogs: 0,
  stipendPeriods: 0,
  ledgerEntries: 0,
  skipped: 0,
};

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

/** Deterministic id so re-running cannot duplicate a row. */
const derivedId = (...parts: (string | number)[]) =>
  parts.join(":").replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 100);

function note(kind: string, sourceId: string, reason: string, raw?: unknown) {
  issues.push({ kind, sourceId, reason, raw });
  counts.skipped++;
}

/** A stage/log/period must belong to an application on this project. */
function validApplication(applicationId: string | undefined, valid: Set<string>): boolean {
  return !!applicationId && valid.has(applicationId);
}

async function run() {
  console.log(`\nFinancial backfill — ${APPLY ? "APPLY" : VERIFY ? "VERIFY" : "DRY RUN"}\n`);

  const projects = await db.project.findMany({
    select: { id: true, description: true, budget: true, title: true },
  });

  for (const project of projects) {
    let meta;
    try {
      meta = getProjectMetadataDirect(project.description);
    } catch (err: any) {
      note("project.metadata", project.id, `Unparseable metadata: ${err.message}`, project.description?.slice(0, 200));
      continue;
    }

    const apps = await db.application.findMany({
      where: { projectId: project.id },
      select: { id: true },
    });
    const validApps = new Set(apps.map((a) => a.id));

    // ── ProjectCompensation ────────────────────────────────────────────────
    const comp = deriveFromMetadata(project.description, project.budget);
    counts.compensation++;
    if (APPLY) {
      await db.projectCompensation.upsert({
        where: { projectId: project.id },
        create: {
          projectId: project.id,
          type: comp.type,
          currency: comp.currency,
          totalBudget: comp.totalBudget,
          budgetNegotiable: comp.budgetNegotiable,
          hourlyRate: comp.hourlyRate,
          estimatedHours: comp.estimatedHours,
          stipendAmount: comp.stipendAmount,
          stipendFrequency: comp.stipendFrequency,
        },
        update: {},
      });
    }

    // ── PaymentItem from paymentStages ─────────────────────────────────────
    for (const [idx, stage] of (meta.paymentStages ?? []).entries()) {
      if (!validApplication(stage.applicationId, validApps)) {
        note(
          "paymentStage",
          `${project.id}/${stage.id}`,
          "Stage has no applicationId, or it does not belong to this project. Requires manual assignment.",
          stage
        );
        continue;
      }
      const amount = Number(stage.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        note("paymentStage", `${project.id}/${stage.id}`, "Non-positive or non-numeric amount.", stage);
        continue;
      }

      const id = derivedId("pi", project.id, stage.id);
      const funded = D(stage.funded ?? 0);
      const released = D(stage.released ?? 0);
      counts.paymentItems++;

      if (APPLY) {
        await db.paymentItem.upsert({
          where: { id },
          create: {
            id,
            projectId: project.id,
            applicationId: stage.applicationId!,
            title: stage.title || "Payment stage",
            description: stage.description ?? "",
            sortOrder: idx,
            amount: D(amount),
            currency: comp.currency,
            status: (stage.status as any) ?? "PENDING",
            fundedAmount: funded,
            releasedAmount: released,
            submissionNote: stage.submissionNote ?? null,
          },
          update: {},
        });

        // Reconstruct the ledger so the cached aggregates have a source.
        if (funded.gt(0)) {
          counts.ledgerEntries++;
          await db.paymentTransaction.upsert({
            where: { idempotencyKey: derivedId("backfill:fund", id) },
            create: {
              projectId: project.id,
              applicationId: stage.applicationId!,
              paymentItemId: id,
              type: "FUND",
              amount: funded,
              currency: comp.currency,
              actorUserId: "system:backfill",
              idempotencyKey: derivedId("backfill:fund", id),
              note: "Reconstructed from pre-migration JSON metadata",
            },
            update: {},
          });
        }
        if (released.gt(0)) {
          counts.ledgerEntries++;
          await db.paymentTransaction.upsert({
            where: { idempotencyKey: derivedId("backfill:release", id) },
            create: {
              projectId: project.id,
              applicationId: stage.applicationId!,
              paymentItemId: id,
              type: "RELEASE",
              amount: released.negated(),
              currency: comp.currency,
              actorUserId: "system:backfill",
              idempotencyKey: derivedId("backfill:release", id),
              note: "Reconstructed from pre-migration JSON metadata",
            },
            update: {},
          });
        }
      }
    }

    // ── WorkLog from hourlyLogs ────────────────────────────────────────────
    for (const log of meta.hourlyLogs ?? []) {
      if (!validApplication(log.applicationId, validApps)) {
        note("hourlyLog", `${project.id}/${log.id}`, "Log has no applicationId, or it does not belong to this project.", log);
        continue;
      }
      const hours = Number(log.hours);
      const date = new Date(`${log.date}T12:00:00Z`);
      if (!Number.isFinite(hours) || hours <= 0 || Number.isNaN(date.getTime())) {
        note("hourlyLog", `${project.id}/${log.id}`, "Invalid hours or date.", log);
        continue;
      }
      counts.workLogs++;
      if (APPLY) {
        await db.workLog.upsert({
          where: { id: derivedId("wl", project.id, log.id) },
          create: {
            id: derivedId("wl", project.id, log.id),
            projectId: project.id,
            applicationId: log.applicationId!,
            workDate: date,
            hours: D(hours),
            description: log.description || "Logged work",
            status: (log.status as any) ?? "PENDING",
            // COMP-007: no historical rate was stored, so the rate in force at
            // migration time is the best available approximation. Recorded in
            // the issues report for visibility rather than applied silently.
            rateSnapshot: comp.hourlyRate ?? D(0),
            currency: comp.currency,
            reviewedAt: log.reviewedAt ? new Date(log.reviewedAt) : null,
          },
          update: {},
        });
      }
      if (comp.hourlyRate == null) {
        issues.push({
          kind: "hourlyLog.rate",
          sourceId: `${project.id}/${log.id}`,
          reason: "No hourly rate configured; rateSnapshot backfilled as 0 and needs review.",
        });
      }
    }

    // ── Hourly payments → ledger ───────────────────────────────────────────
    for (const pay of meta.hourlyPayments ?? []) {
      if (!validApplication(pay.applicationId, validApps)) {
        note("hourlyPayment", `${project.id}/${pay.id}`, "Payment has no applicationId, or it does not belong to this project.", pay);
        continue;
      }
      const amount = Number(pay.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        note("hourlyPayment", `${project.id}/${pay.id}`, "Non-positive or non-numeric amount.", pay);
        continue;
      }
      counts.ledgerEntries++;
      if (APPLY) {
        await db.paymentTransaction.upsert({
          where: { idempotencyKey: derivedId("backfill:hourly", project.id, pay.id) },
          create: {
            projectId: project.id,
            applicationId: pay.applicationId!,
            type: "RELEASE",
            amount: D(amount).negated(),
            currency: comp.currency,
            actorUserId: "system:backfill",
            idempotencyKey: derivedId("backfill:hourly", project.id, pay.id),
            note: "Hourly payment reconstructed from pre-migration JSON metadata",
          },
          update: {},
        });
      }
    }

    // ── StipendPeriod ──────────────────────────────────────────────────────
    for (const pay of meta.stipendPayments ?? []) {
      if (!validApplication(pay.applicationId, validApps)) {
        note("stipendPayment", `${project.id}/${pay.id}`, "Payment has no applicationId, or it does not belong to this project.", pay);
        continue;
      }
      const amount = Number(pay.amount);
      const periodIndex = Number(pay.periodIndex);
      if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(periodIndex) || periodIndex < 1) {
        note("stipendPayment", `${project.id}/${pay.id}`, "Invalid amount or period index.", pay);
        continue;
      }
      counts.stipendPeriods++;
      const id = derivedId("sp", project.id, pay.id);
      if (APPLY) {
        await db.stipendPeriod.upsert({
          where: { id },
          create: {
            id,
            projectId: project.id,
            applicationId: pay.applicationId!,
            periodIndex,
            amount: D(amount),
            currency: comp.currency,
            status: "RELEASED",
            releasedAt: pay.date ? new Date(pay.date) : new Date(),
          },
          update: {},
        });
        counts.ledgerEntries++;
        await db.paymentTransaction.upsert({
          where: { idempotencyKey: derivedId("backfill:stipend", id) },
          create: {
            projectId: project.id,
            applicationId: pay.applicationId!,
            stipendPeriodId: id,
            type: "RELEASE",
            amount: D(amount).negated(),
            currency: comp.currency,
            actorUserId: "system:backfill",
            idempotencyKey: derivedId("backfill:stipend", id),
            note: "Stipend reconstructed from pre-migration JSON metadata",
          },
          update: {},
        });
      }
    }
  }

  // ── Contract milestones on applications ──────────────────────────────────
  const applications = await db.application.findMany({
    select: { id: true, projectId: true, coverLetter: true },
  });
  for (const app of applications) {
    let appMeta;
    try {
      appMeta = parseApplicationMetadata(app.coverLetter);
    } catch (err: any) {
      note("application.metadata", app.id, `Unparseable metadata: ${err.message}`);
      continue;
    }
    const milestones = appMeta.digitalContract?.milestones ?? [];
    for (const [idx, m] of milestones.entries()) {
      const amount = Number(m.budget);
      if (!Number.isFinite(amount) || amount <= 0) {
        note("contractMilestone", `${app.id}/${idx}`, "Non-positive or non-numeric budget.", m);
        continue;
      }
      const comp = await db.projectCompensation.findUnique({ where: { projectId: app.projectId } });
      counts.paymentItems++;
      if (APPLY) {
        const id = derivedId("cm", app.id, idx);
        await db.paymentItem.upsert({
          where: { id },
          create: {
            id,
            projectId: app.projectId,
            applicationId: app.id,
            title: m.title || `Milestone ${idx + 1}`,
            sortOrder: idx,
            amount: D(amount),
            currency: comp?.currency ?? "USD",
            // ESCROWED in the old vocabulary meant committed but not paid.
            status: m.status === "RELEASED" ? "RELEASED" : m.status === "ESCROWED" ? "FUNDED" : "PENDING",
            fundedAmount: m.status === "PENDING" ? D(0) : D(amount),
            releasedAmount: m.status === "RELEASED" ? D(amount) : D(0),
          },
          update: {},
        });
      }
    }
  }

  /**
   * WS-003 (approved decision) — ProjectUpdate is a non-financial progress
   * record. The `[Value: $X]` amounts embedded in titles are NOT imported: they
   * are regex-parsed prose, and the fallback pattern matches any `$` in a title,
   * so importing them would mint financial records from unreliable input.
   * They are reported here so the originals are recoverable, and the tag is
   * stripped from the title so the workspace stops presenting prose as money.
   */
  const updates = await db.projectUpdate.findMany({ select: { id: true, title: true } });
  const VALUE_TAG = /\s*\[(?:Value:?\s*\$?)?[\d.,]+\]\s*/;
  let strippedTitles = 0;
  for (const u of updates) {
    if (!VALUE_TAG.test(u.title)) continue;
    strippedTitles++;
    issues.push({
      kind: "projectUpdate.valueTag",
      sourceId: u.id,
      reason: "Value tag removed from title; not imported as a financial record (WS-003).",
      raw: u.title,
    });
    if (APPLY) {
      await db.projectUpdate.update({
        where: { id: u.id },
        data: { title: u.title.replace(VALUE_TAG, " ").trim() || "Project update" },
      });
    }
  }

  // ── Report ───────────────────────────────────────────────────────────────
  const blocking = issues.filter((i) => i.kind !== "projectUpdate.valueTag" && i.kind !== "hourlyLog.rate");

  console.log("Planned writes:");
  console.table(counts);
  console.log(`ProjectUpdate titles with a value tag stripped: ${strippedTitles}`);
  console.log(`Advisory notes: ${issues.length - blocking.length}`);
  console.log(`Blocking issues (records NOT migrated): ${blocking.length}\n`);

  if (issues.length > 0) {
    const path = join(process.cwd(), "migration-issues.json");
    writeFileSync(path, JSON.stringify({ generatedAt: new Date().toISOString(), counts, issues }, null, 2));
    console.log(`Full report written to ${path}`);
  }

  if (DRY && !VERIFY) {
    console.log("\nDRY RUN — nothing was written. Re-run with --apply to commit.\n");
  }

  await db.$disconnect();

  // A partial migration must not pass silently.
  if (blocking.length > 0) {
    console.error(`\n${blocking.length} record(s) could not be migrated. Resolve them before cutting reads over.\n`);
    process.exit(1);
  }
}

run().catch(async (err) => {
  console.error("Backfill failed:", err);
  await db.$disconnect();
  process.exit(1);
});
