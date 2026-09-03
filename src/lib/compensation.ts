import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { CompensationTypeEnum, StipendFrequencyEnum } from "@prisma/client";
import { getProjectMetadataDirect, DEFAULT_CURRENCY } from "@/lib/workflowHelpers";

/**
 * DATA-002 / DATA-009 / COMP-018 — one resolver for "how does this project pay".
 *
 * Previously four independent fields answered this (compensationType,
 * paymentCategory, stipendType, offerLetter.paymentCategory), and different
 * screens defaulted differently for legacy rows: reviewActions defaulted to
 * MILESTONE, formatCompensation fell through to a bare budget, and the type
 * docs said FIXED. Every caller now goes through this function.
 *
 * ProjectCompensation is authoritative. The JSON fallback exists only for rows
 * that have not been backfilled yet and is removed once the backfill has run
 * everywhere.
 */

export interface ResolvedCompensation {
  type: CompensationTypeEnum;
  currency: string;
  totalBudget: Prisma.Decimal;
  budgetNegotiable: boolean;
  hourlyRate: Prisma.Decimal | null;
  estimatedHours: number | null;
  maxHours: number | null;
  stipendAmount: Prisma.Decimal | null;
  stipendFrequency: StipendFrequencyEnum | null;
  stipendPeriods: number | null;
  /** True when this came from the legacy JSON rather than the table. */
  legacy: boolean;
}

/**
 * COMP-018 — legacy projects carry no compensationType. The probe established
 * that every such project has zero financial records, so this default has no
 * financial consequence; FIXED matches the paymentCategory most of them
 * already carry, and is now applied consistently everywhere rather than
 * differing per screen.
 */
const LEGACY_DEFAULT: CompensationTypeEnum = "FIXED";

const VALID_TYPES: CompensationTypeEnum[] = ["FIXED", "HOURLY", "MILESTONE", "STIPEND", "UNPAID"];
const VALID_FREQUENCIES: StipendFrequencyEnum[] = ["ONE_TIME", "WEEKLY", "MONTHLY"];

export function normaliseType(raw?: string | null): CompensationTypeEnum {
  if (raw && (VALID_TYPES as string[]).includes(raw)) return raw as CompensationTypeEnum;
  // The older `paymentCategory` vocabulary overlaps but is not identical.
  if (raw === "MONTHLY") return "STIPEND";
  if (raw === "NON_MONETARY") return "UNPAID";
  if (raw === "HYBRID") return "FIXED";
  return LEGACY_DEFAULT;
}

export function normaliseFrequency(raw?: string | null): StipendFrequencyEnum | null {
  return raw && (VALID_FREQUENCIES as string[]).includes(raw)
    ? (raw as StipendFrequencyEnum)
    : null;
}

export async function getProjectCompensation(projectId: string): Promise<ResolvedCompensation | null> {
  const row = await db.projectCompensation.findUnique({ where: { projectId } });
  if (row) {
    return {
      type: row.type,
      currency: row.currency,
      totalBudget: row.totalBudget,
      budgetNegotiable: row.budgetNegotiable,
      hourlyRate: row.hourlyRate,
      estimatedHours: row.estimatedHours,
      maxHours: row.maxHours,
      stipendAmount: row.stipendAmount,
      stipendFrequency: row.stipendFrequency,
      stipendPeriods: row.stipendPeriods,
      legacy: false,
    };
  }

  // COMP-016 — the pre-backfill JSON fallback is gone. Every project has a
  // ProjectCompensation row: the backfill created them for existing projects,
  // and createProject writes one atomically for every new project. A missing
  // row now means a missing project, not un-migrated data.
  return null;
}

/**
 * Shared by the resolver above and by the backfill script, so both interpret
 * legacy metadata identically.
 */
/**
 * WS-003 / DATA-008 — the authoritative financial summary for a project.
 *
 * The workspace Overview used to compute "escrowed" and "paid" by running a
 * regex over `ProjectUpdate` titles (`[Value: $X] …`), which meant those tiles
 * showed money derived from prose, unrelated to the real payment records shown
 * one tab away in the Funding panel. Both surfaces now read this.
 *
 * Committed = funded but not yet released. Paid = released. Both come from the
 * payment tables and the ledger, never from display text.
 */
export interface ProjectFinancialSummary {
  currency: string;
  type: CompensationTypeEnum;
  budget: number;
  committed: number;
  paid: number;
}

export async function getProjectFinancialSummary(
  projectId: string
): Promise<ProjectFinancialSummary> {
  const comp = await getProjectCompensation(projectId);
  const currency = comp?.currency ?? DEFAULT_CURRENCY;
  const type = comp?.type ?? "FIXED";
  const budget = comp ? Number(comp.totalBudget) : 0;

  const [items, releases] = await Promise.all([
    db.paymentItem.findMany({
      where: { projectId },
      select: { fundedAmount: true, releasedAmount: true },
    }),
    // Hourly and stipend payouts have no PaymentItem, so the ledger is the
    // only place they are visible. Both belong in this total — unlike the
    // hourly-balance queries, which must exclude stipend releases.
    db.paymentTransaction.findMany({
      where: { projectId, type: "RELEASE", paymentItemId: null },
      select: { amount: true },
    }),
  ]);

  const itemFunded = items.reduce((t, i) => t.plus(i.fundedAmount), new Prisma.Decimal(0));
  const itemReleased = items.reduce((t, i) => t.plus(i.releasedAmount), new Prisma.Decimal(0));
  const otherReleased = releases.reduce(
    (t, r) => t.plus(r.amount.abs()),
    new Prisma.Decimal(0)
  );

  return {
    currency,
    type,
    budget,
    // Committed but not yet paid out.
    committed: Number(itemFunded.minus(itemReleased)),
    paid: Number(itemReleased.plus(otherReleased)),
  };
}

export function deriveFromMetadata(description: string | null, budget: number): ResolvedCompensation {
  const meta = getProjectMetadataDirect(description);
  const type = normaliseType(meta.compensationType ?? meta.paymentCategory);
  const rate = meta.paymentRate;

  return {
    type,
    currency: meta.currency || DEFAULT_CURRENCY,
    totalBudget: new Prisma.Decimal(budget || 0),
    budgetNegotiable: !!meta.budgetNegotiable,
    hourlyRate: type === "HOURLY" && rate != null ? new Prisma.Decimal(rate) : null,
    estimatedHours: meta.estimatedHours ?? null,
    maxHours: type === "HOURLY" ? meta.maxHours ?? null : null,
    stipendAmount:
      type === "STIPEND" ? new Prisma.Decimal(rate ?? budget ?? 0) : null,
    stipendFrequency: type === "STIPEND" ? normaliseFrequency(meta.stipendFrequency) ?? "MONTHLY" : null,
    stipendPeriods: type === "STIPEND" ? stipendPeriodsFrom(meta, rate, budget) : null,
    legacy: true,
  };
}

/**
 * The number of payable stipend periods.
 *
 * Prefers the configured value. Projects created before `stipendPeriods`
 * existed in the metadata block carry no such value, so the count is recovered
 * from the arithmetic the wizard used to build the budget in the first place
 * (`amount × periods`) rather than silently defaulting every one of them to a
 * single period.
 */
function stipendPeriodsFrom(
  meta: { stipendPeriods?: number },
  rate: number | undefined,
  budget: number
): number | null {
  const configured = meta.stipendPeriods;
  if (configured != null && Number.isInteger(configured) && configured > 0) {
    return configured;
  }
  if (rate != null && rate > 0 && budget > 0) {
    const derived = Math.round(budget / rate);
    if (derived >= 1) return derived;
  }
  return null;
}
