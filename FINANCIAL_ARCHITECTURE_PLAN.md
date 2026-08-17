# Financial Architecture Plan

**Phase 2, Step 1 — proposal only. No schema change, no migration, no code written.**
Covers: ARCH-001, COMP-001 (scope), COMP-010, WS-003, DATA-002, DATA-003, DATA-004,
and the reconciliation debt in MF-001 / MF-006.

Awaiting approval before implementation.

---

## 0. What the live data actually looks like

I ran a **read-only** probe against the configured database before designing this,
because the backfill risk depends entirely on volume and shape. Nothing was written.

| Measure | Value |
|---|---|
| Projects | 15 (all 15 carry a metadata block) |
| Projects whose metadata failed to parse | **0** |
| Payment stages | 6 |
| Payment stages with **no** `applicationId` | **0** |
| Hourly work logs / hourly payments | 4 / 2 |
| Hourly logs with **no** `applicationId` | **0** |
| Stipend payments | 5 |
| Stages currently funded-but-not-released | **0** |
| Applications | 28 (2 digital contracts, 2 offer letters) |
| Applications whose metadata failed to parse | **0** |
| `ProjectUpdate` rows | 19 — **16 carry a `[Value: $X]` tag**, 3 do not |
| Projects with no `compensationType` | 6 of 15 (40%) |
| Projects with no `currency` | 1 |

**Three findings from this that materially de-risk the migration:**

1. **Nothing is mid-flight.** Zero stages are funded-but-unreleased, so no in-progress
   money can be stranded by the cutover. This is the safest possible moment to do it.
2. **Every financial record is already attributed to an application.** The audit warned
   that legacy unassigned stages (COMP-002, MF-003) would need manual resolution. There
   are none. `applicationId` can therefore be **required** in the new schema with no
   backfill ambiguity — which closes COMP-002 and MF-003 structurally rather than by a
   runtime check.
3. **The 6 projects with no `compensationType` have no financial records at all** —
   zero stages, zero logs, zero stipend payments, zero hires. So COMP-018's "what is the
   legacy default?" question has no financial consequence on real data. `FIXED` is safe
   and matches the `paymentCategory: "FIXED"` most of them already carry.

This is a demo/development dataset, not production scale. I have still written the
backfill to be idempotent, dry-runnable and non-destructive, because it will eventually
run somewhere that isn't this.

---

## 1. Proposed schema

Money as `Decimal @db.Decimal(18, 2)` — never `Float` (**DATA-004**). Postgres `numeric`
is exact; Prisma maps it to `Prisma.Decimal`. Integer minor units would also work, but
`Decimal` avoids a units-conversion layer at every boundary and is the conventional
choice for Postgres. 18 digits covers the weakest listed currency (IDR) at realistic
project values.

Every amount is accompanied by a `currency` column (**DATA-003**). No amount exists in
this schema without one.

```prisma
enum CompensationType { FIXED HOURLY MILESTONE STIPEND UNPAID }
enum StipendFrequency { ONE_TIME WEEKLY MONTHLY }

enum PaymentItemStatus {
  PENDING            // defined, no money committed
  FUNDED             // company has committed the amount
  SUBMITTED          // freelancer submitted for review
  CHANGES_REQUESTED  // sent back; distinct from never-submitted (COMP-004)
  APPROVED           // accepted, awaiting release
  RELEASED           // paid out
  CANCELLED          // withdrawn before any commitment
}

enum WorkLogStatus { PENDING APPROVED REJECTED }
enum LedgerEntryType { FUND RELEASE REFUND ADJUSTMENT }

/// DATA-002: the single source of truth for how a project pays.
/// Replaces compensationType / paymentCategory / stipendType / offerLetter.paymentCategory,
/// which were four independent, unsynchronised representations.
model ProjectCompensation {
  id             String            @id @default(cuid())
  projectId      String            @unique
  type           CompensationType
  currency       String            // ISO 4217, required
  totalBudget    Decimal           @db.Decimal(18, 2)
  budgetNegotiable Boolean         @default(false)

  hourlyRate       Decimal?        @db.Decimal(18, 2)
  estimatedHours   Int?            // COMP-006: now enforceable, not decorative
  maxHours         Int?

  stipendAmount    Decimal?        @db.Decimal(18, 2)
  stipendFrequency StipendFrequency?
  stipendPeriods   Int?            // COMP-013: bounds the payable period count

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

/// COMP-010 + WS-003: ONE table replacing all five milestone representations —
/// paymentStages, digitalContract.milestones, escrowMilestones (dead),
/// offerLetter.milestones, and the ProjectUpdate "[Value: $X]" title regex.
model PaymentItem {
  id            String            @id @default(cuid())   // ARCH-001: real ids, not `stage-${Date.now()}`
  projectId     String
  applicationId String                                    // REQUIRED — closes COMP-002 / MF-003
  title         String
  description   String?           @db.Text
  sortOrder     Int               @default(0)
  amount        Decimal           @db.Decimal(18, 2)
  currency      String
  status        PaymentItemStatus @default(PENDING)
  dueDate       DateTime?         @db.Date               // TIME-002: date-only

  fundedAmount   Decimal @default(0) @db.Decimal(18, 2)  // cached; ledger is authoritative
  releasedAmount Decimal @default(0) @db.Decimal(18, 2)

  submissionNote String?  @db.Text
  reviewNote     String?  @db.Text                        // COMP-004: rejection reason
  revisionCount  Int      @default(0)                     // COMP-004: enforce DELIVERABLE_REVISION_CAP
  submittedAt    DateTime?
  reviewedAt     DateTime?
  releasedAt     DateTime?

  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  application Application @relation(fields: [applicationId], references: [id], onDelete: Restrict)
  ledger      PaymentTransaction[]

  @@index([projectId])
  @@index([applicationId])
  @@index([projectId, status])
}

/// COMP-007: the rate is snapshotted at log time, so editing the project rate
/// no longer retroactively reprices work that was already approved.
model WorkLog {
  id            String        @id @default(cuid())
  projectId     String
  applicationId String
  workDate      DateTime      @db.Date                   // TIME-002: no UTC-midnight shift
  hours         Decimal       @db.Decimal(6, 2)
  description   String        @db.Text
  status        WorkLogStatus @default(PENDING)
  rateSnapshot  Decimal       @db.Decimal(18, 2)
  currency      String
  reviewedAt    DateTime?
  reviewedById  String?
  reviewNote    String?       @db.Text                   // COMP-008: reason on rejection

  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  application Application @relation(fields: [applicationId], references: [id], onDelete: Restrict)

  @@unique([applicationId, workDate, description])       // COMP-009: duplicate-date guard
  @@index([projectId])
  @@index([applicationId, status])
}

/// COMP-013 / COMP-015: periods are enumerable and bounded, and a period can be
/// paid exactly once — enforced by the database, not by an array scan.
model StipendPeriod {
  id            String            @id @default(cuid())
  projectId     String
  applicationId String
  periodIndex   Int
  periodStart   DateTime?         @db.Date
  periodEnd     DateTime?         @db.Date
  amount        Decimal           @db.Decimal(18, 2)
  currency      String
  status        PaymentItemStatus @default(PENDING)
  releasedAt    DateTime?

  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  application Application @relation(fields: [applicationId], references: [id], onDelete: Restrict)

  @@unique([applicationId, periodIndex])
  @@index([projectId])
}

/// ARCH-001: append-only ledger. Every movement of value is a row here.
/// Never updated, never deleted — a correction is a new compensating entry.
model PaymentTransaction {
  id              String          @id @default(cuid())
  projectId       String
  applicationId   String
  paymentItemId   String?
  workLogId       String?
  stipendPeriodId String?
  type            LedgerEntryType
  amount          Decimal         @db.Decimal(18, 2)     // signed: FUND +, RELEASE -, REFUND +
  currency        String
  actorUserId     String
  note            String?         @db.Text

  /// Replay protection. A retried or double-clicked mutation reuses the same key
  /// and is rejected by the unique index rather than creating a second movement.
  idempotencyKey  String          @unique

  /// Payment-provider reference. Null under Option A below; populated if and when
  /// COMP-001 is implemented, so adding a provider later needs no schema change.
  externalRef     String?

  createdAt       DateTime        @default(now())

  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  paymentItem PaymentItem? @relation(fields: [paymentItemId], references: [id])

  @@index([projectId])
  @@index([applicationId])
  @@index([paymentItemId])
}
```

**On `onDelete: Restrict`.** `Application` currently cascades. Financial rows must not
vanish because an application row was removed — that is precisely how MF-006 stranded
funds invisibly. `Restrict` forces removal to be handled explicitly (see §5).

**Cached aggregates.** `PaymentItem.fundedAmount` / `releasedAmount` are caches over the
ledger, written in the same transaction as the ledger entry. The ledger is authoritative;
I'll add a reconciliation test asserting `SUM(ledger) == cached` for every item, so drift
fails a test rather than silently becoming the new truth.

---

## 2. Migration & backfill plan

Four steps, each independently revertible. Steps 1–2 change no behaviour.

**Step 1 — additive migration.** Create the tables above. Touch nothing existing. The
JSON keys in `Project.description` / `Application.coverLetter` stay exactly where they
are. At this point the app still reads JSON and is unaffected.

**Step 2 — backfill script** (`prisma/backfill/financial.ts`), with three modes:
`--dry-run` (default, writes nothing, prints the full report), `--apply`, and
`--verify` (re-runs the comparison without writing). Idempotent: every insert is keyed
on a deterministic derived id, so re-running produces no duplicates.

Mapping:

| Source (JSON) | Destination |
|---|---|
| `compensationType` ?? `paymentCategory` ?? `FIXED` | `ProjectCompensation.type` |
| `currency` ?? `"USD"` | `ProjectCompensation.currency` |
| `paymentRate`, `estimatedHours`, `stipendFrequency` | matching `ProjectCompensation` columns |
| `paymentStages[]` | `PaymentItem` (+ `FUND`/`RELEASE` ledger entries reconstructing `funded`/`released`) |
| `hourlyLogs[]` | `WorkLog`, `rateSnapshot` = project rate at migration time |
| `hourlyPayments[]` | `PaymentTransaction` type `RELEASE` |
| `stipendPayments[]` | `StipendPeriod` + `RELEASE` ledger entry |
| `digitalContract.milestones[]` | `PaymentItem` scoped to that application |
| `escrowMilestones[]` | *nothing — dead field, never written or read (DATA-006)* |
| `ProjectUpdate` `[Value: $X]` titles | **decision required — see §6.2** |

**Unparseable rows are never dropped.** Anything that fails to parse, or that parses but
fails validation (negative amount, missing application, currency mismatch), is written to
a `migration-issues.json` report with the row id, the reason, and the raw source string,
and is **skipped rather than guessed**. The run prints a summary and exits non-zero if
the report is non-empty, so a partial migration cannot pass silently. On current data
this report is expected to be empty — every row parses — but the mechanism has to exist
before it runs anywhere else.

**Step 3 — cut reads over.** Rewrite the four action files and four UI consumers
(`paymentStageActions`, `hourlyLogActions`, `stipendPaymentActions`, `workflowActions`;
`WorkspaceFunding`, `ApplicantDetailView`, `FreelancerApplicationCard`,
`FreelancerApplicationDetailView`) to read and write the new tables. Business rules are
carried across **unchanged** — this is a storage migration, not a rules rewrite. The rules
that are already correct and must survive verbatim: budget caps, no-shrink-below-committed,
no-reassignment-once-funded, no-delete-once-funded, no-release-before-fully-funded,
no-double-release, per-application isolation.

**Step 4 — retire the JSON keys.** Stop *writing* the financial keys. Leave existing ones
in place, unread, as a rollback path. Delete them in a later, separate change once the new
tables have been running — not in this pass.

---

## 3. Transaction & locking strategy

Replaces the current read-JSON → mutate-in-memory → write-whole-column pattern, where two
concurrent operations both read the same JSON and the second write silently discards the
first (ARCH-001).

Every financial mutation follows one shape:

```ts
await db.$transaction(async (tx) => {
  // 1. Row lock. Blocks a concurrent mutation on the same item until commit.
  const [item] = await tx.$queryRaw`
    SELECT * FROM "PaymentItem" WHERE id = ${itemId} AND "projectId" = ${projectId}
    FOR UPDATE`;
  if (!item) throw new Error("Not found");

  // 2. Validate against freshly-locked state, never against a stale read.
  assertTransition(item.status, next);
  assertWithinBudget(...);

  // 3. Append to the ledger. The unique idempotencyKey is the replay guard.
  await tx.paymentTransaction.create({ data: { idempotencyKey, ... } });

  // 4. Update the cached aggregate in the same transaction.
  await tx.paymentItem.update({ where: { id: itemId }, data: { ... } });
}, { isolationLevel: "ReadCommitted", timeout: 10_000 });
```

- **`SELECT … FOR UPDATE`** is preferred over `Serializable` here: it is surgical, needs no
  retry loop, and the contended set is a single row.
- **`idempotencyKey`** is derived from `(itemId, operation, targetStatus)` for
  state-transition operations, so a double-clicked "Release" produces the same key twice
  and the second is rejected by the unique index. This closes the double-release race that
  a status check alone cannot, because the check reads state the other transaction is
  concurrently changing.
- The one existing correct precedent in the codebase — `saveProjectRoles`
  (`roleActions.ts:79`) — already uses `db.$transaction`; this generalises that.

Tests will include a genuine concurrency test: two simultaneous funds and two simultaneous
releases against the same item, asserting exactly one succeeds and the ledger sums correctly.

---

## 4. How this consolidates COMP-010

| Today | After |
|---|---|
| `paymentStages` (JSON, FIXED only, has real guards) | `PaymentItem` |
| `digitalContract.milestones` (JSON, per-application, hardcoded 30/40/30) | `PaymentItem` |
| `escrowMilestones` (JSON, declared, never read or written) | deleted — dead code |
| `offerLetter.milestones` (JSON, per-offer) | `PaymentItem`, created on offer acceptance |
| `ProjectUpdate` `[Value: $X]` title regex (WS-003) | **see §6.2** |

One table, one status vocabulary, one funding/release path. COMP-011's fabricated 30/40/30
split is removed: contract milestones are created from what the company configured, not
from a hardcoded ratio. COMP-012's missing precondition and bounds check are already fixed
(Phase 1); against the new schema they become a status-machine assertion under a row lock.

WS-004 (milestone amounts corrupting to 1/1000th under non-English locales, because
`toLocaleString()` output was re-parsed with a comma-assuming regex) **disappears entirely**
— the amount becomes a `Decimal` column and is never round-tripped through a display string.

---

## 5. How this resolves MF-001 and MF-006

**MF-001 — one freelancer's final payment completing the whole project.** Today the
completion side-effect lives inside `releaseMilestonePayment`, which operates on
per-application contract milestones. After this change, releasing a `PaymentItem` writes a
ledger entry and nothing else. Completion becomes a project-level query — "does every hired
application have zero outstanding obligations?" — evaluated only by `completeProject`.
Per-application payment can no longer complete a project for anyone, because it no longer
writes `ProjectStatus` at all. (The guard itself lands in Phase 2 Step 3 under LIFE-001.)

**MF-006 — funds stranded when a freelancer is removed.** Today `removeFreelancer` flips
the application to `REJECTED`; stages keyed to that `applicationId` become invisible to a
readiness check that filters on currently-`HIRED` applications, so a project can complete
with money unaccounted for. After this change:

- `onDelete: Restrict` means financial rows cannot be orphaned by row removal.
- Removal runs a pre-check: outstanding `fundedAmount > releasedAmount` on any
  `PaymentItem`, or approved-but-unpaid `WorkLog` hours, for that application.
- If outstanding value exists, removal is refused with the amount stated, and the company
  must first release it or record an explicit `REFUND` ledger entry.
- Because the ledger is queryable by `applicationId` independent of application *status*,
  stranded value is now detectable by a query rather than being structurally invisible.

---

## 6. Decisions I need from you

Everything else in this plan I can justify from the probe data and proceed on. These two
I should not decide alone.

### 6.1 — COMP-001 scope: does real money move in this pass?

This is the question your brief said not to assume an answer to.

**Option A — internal ledger only (my recommendation).**
Build everything above. `FUND` and `RELEASE` become durable, audited, idempotent,
concurrency-safe ledger entries. **No payment provider; no money actually moves.**
`externalRef` is left null so a provider can be added later without a schema change.

- Effort: contained within this remediation pass.
- Fixes: ARCH-001, COMP-002–018, DATA-002/003/004, MF-001/MF-006, WS-003/WS-004.
- **Consequence you should weigh:** the UI currently says "Escrow Wallet secured",
  "In Escrow", "Funds Released". Under Option A those words describe an internal bookkeeping
  state, not custody of money. Shipping that language unchanged would be a
  misrepresentation to both companies and freelancers. If you choose A, I'd relabel these
  surfaces honestly (e.g. "Committed" / "Approved for payment" / "Marked paid") as part of
  the same pass, and fold it into UX-001. **Tell me if you'd rather keep the current
  wording — I won't ship money language that isn't backed by money without you saying so.**

**Option B — real payment-provider integration (e.g. Stripe Connect).**
Everything in A, plus: Connect account onboarding and KYC for freelancers, `PaymentIntent`
capture from companies, held balances, transfers on release, webhook reconciliation,
refunds, disputes/chargebacks, payout scheduling, multi-currency settlement, and the tax
and compliance surface that comes with holding client funds.

- Effort: a project in its own right — multiple weeks, and it needs decisions about legal
  entity, licensing and which jurisdictions you'll settle in. It is not a bug fix.
- My read: this should be its own initiative *after* the data model is correct. Doing it
  on top of the current JSON-in-a-text-column storage would be actively unsafe.

**Recommendation: Option A now, Option B tracked separately.** But it is your call.

### 6.2 — WS-003: what happens to the 16 `ProjectUpdate` rows carrying `[Value: $X]`?

The workspace "Milestones" tab is backed by `ProjectUpdate`, with the money encoded in the
title string. 16 of 19 rows carry such a tag. Its amounts drive the Overview tab's
"escrowed / paid" tiles — which are computed from **prose**, and are unrelated to the real
`paymentStages` shown one tab away in the Funding panel (DATA-008).

- **Option 1 (my recommendation): `ProjectUpdate` becomes a purely non-financial progress
  note.** Strip the `[Value: …]` tag from the 16 titles during backfill (recording the
  original in the migration report). The Overview tiles then read `PaymentItem` — real
  money, one source of truth. Users lose a number that was never real; the Funding tab
  already shows the true figures. This is the only option that actually closes DATA-008.
- **Option 2: migrate the parsed amounts into `PaymentItem`.** Preserves the displayed
  numbers, but imports values produced by a regex over prose — including any mis-parses
  from the third fallback pattern, which matches *any* `$` in a title (a milestone named
  "Redesign the $99 pricing page" becomes a $99 milestone). It would mint real financial
  records from unreliable input.
- **Option 3: leave `ProjectUpdate` untouched.** Cheapest, but DATA-008 and UX-001 stay
  open and the workspace keeps showing two contradictory sets of financial totals.

I recommend **Option 1**. Option 2 is the one I'd argue against: it launders parsed prose
into the ledger.

---

## 7. What happens once you approve

In order, as separate commits:

1. Additive migration (tables only).
2. Backfill script + `--dry-run` report reviewed before any `--apply`.
3. Rewrite payment mutations against the new tables, rules carried over verbatim, each with
   its existing guard preserved and tested.
4. COMP-002 … COMP-018 fixed against the new schema (not patched twice).
5. Money-path tests: funding, partial states, release, duplicate-release prevention,
   concurrent-mutation safety, per-application isolation at 0/1/2/many freelancers,
   ledger-vs-cache reconciliation.

Then Phase 2 Step 3 (lifecycle & multi-freelancer), Step 4 (localization/SSR), Steps 5–6
(remaining P2s and P3s).

**Nothing in this plan has been implemented. No schema file has been modified. No migration
has been generated or applied.**
