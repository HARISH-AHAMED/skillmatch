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

  // Not yet backfilled — derive from the JSON so nothing regresses meanwhile.
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { description: true, budget: true },
  });
  if (!project) return null;

  return deriveFromMetadata(project.description, project.budget);
}

/**
 * Shared by the resolver above and by the backfill script, so both interpret
 * legacy metadata identically.
 */
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
    maxHours: null,
    stipendAmount:
      type === "STIPEND" ? new Prisma.Decimal(rate ?? budget ?? 0) : null,
    stipendFrequency: type === "STIPEND" ? normaliseFrequency(meta.stipendFrequency) ?? "MONTHLY" : null,
    stipendPeriods: null,
    legacy: true,
  };
}
