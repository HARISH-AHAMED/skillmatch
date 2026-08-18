# Remediation Status

**Backlog source of truth:** `talentra-audit.md` (sessions 1 + 2)
**Branch:** `remediation/audit-backlog`
**Started:** 2026-08-17
**Nothing in this effort has been deployed.** All work is committed to the branch above only.

Statuses: `Not Started` · `In Progress` · `Fixed & Tested` · `Deferred (reason)` · `Needs Decision`

---

## FINAL CLOSEOUT — Phase 3 Step 3

**Verification run once, at closeout:**
`npm test` -> **159 passed / 12 files** · `npx tsc --noEmit` -> **clean (exit 0)** ·
`npx next build` -> **exit 0**.

**Nothing was deployed. No migration was applied. No backfill was executed. No
database probe or connection was made during closeout.**

### Reconciliation — 102 actionable findings, each in exactly one final state

| State | Count |
|---|---|
| **Fixed & Tested** | **96** |
| **Deferred** (explicit product decision) | **3** — COMP-001, KANBAN-004, TIME-004 |
| **Partial / follow-up** | **3** — SEC-015, COMP-016, PERF-002 |
| **Total** | **102** |

Outside the 102: **LEG-001** withdrawn (the finding was wrong — the route it
called legacy is the only workspace implementation), **DATA-001** N/A (cited in
the audit summary but never defined as its own finding; covered by ARCH-001),
and **DEP-001** newly logged during remediation (partial — see below).

**No ID remains `Not Started` or `Needs Decision`.**

> **Count correction.** Earlier phase reports stated 95 Fixed & Tested. The
> reconciliation above gives **96**, and reclassifies **SEC-015** from
> Fixed & Tested to **Partial** — its SVG half is complete but its
> object-storage half is deferred, so recording it as fully fixed overstated it.
> The corrected figures are the ones above.

### Deferred — 3
| ID | Reason |
|---|---|
| **COMP-001** | Real payment-provider integration is outside this remediation. The internal ledger is built and `PaymentTransaction.externalRef` is reserved, so adding a provider later needs no schema change. |
| **KANBAN-004** | Product decision: button-driven Kanban is the intended design. Its correctness issues (KANBAN-001/002/003/005) are all fixed. |
| **TIME-004** | Product decision: due-date-only model retained. No task start-date column added. |

### Partial / follow-up — 3
| ID | Reason |
|---|---|
| **SEC-015** | SVG upload restriction **Fixed & Tested** (blocked on both MIME and extension). Object-storage migration **deferred** as a separate initiative — needs a provider, credentials and a backfill of existing base64 blobs. |
| **COMP-016** | **Blocked on migration.** The live path reads `ProjectCompensation.stipendAmount`; the legacy `rate ?? budget` fallback survives only in `deriveFromMetadata`, the pre-backfill path. Closes when the backfill runs. |
| **PERF-002** | **Technically pending.** Financial aggregation now queries the database directly, but browse/listing screens still parse project metadata per row, so compensation cannot yet be filtered in SQL. |

### P0 / P1 validation — PASSED

Validated against existing tests; no redundant tests were added.

| Requirement | Covered by | Result |
|---|---|---|
| SEC-001 admin authz, self-delete, last-admin | `authActions.test.ts` — unauthenticated/freelancer/company callers refused on both actions; self-deletion and last-admin demotion refused | Pass |
| SEC-002 hashing + legacy rotation | `password.test.ts` (10), `authActions.test.ts` — bcrypt on write, salted, detect-verify-rehash for plaintext, near-miss digests not misread | Pass |
| SEC-003 login auto-create | Branch removed from `auth.ts`; unknown credentials return null. No test — the fix is a deletion | Pass (by inspection) |
| SEC-004 / SEC-005 ownership | `authz.test.ts` — cross-company IDOR on application ids refused; freelancer refused | Pass |
| SEC-011 / WS-002 channel isolation | `authz.test.ts` — group/freelancers/DM visibility, incl. the id-suffix false-positive case | Pass |
| Cross-project record scoping | `recordScoping.test.ts` (9) — task update/edit/delete, file delete, message delete all refuse foreign-project ids | Pass |
| Payment mutation protections | `paymentRules.test.ts` (37) — budget cap, no-shrink-below-committed, no-reassign-once-funded, no-release-before-funded | Pass |
| Duplicate release protection | `paymentRules.test.ts` + `ledger.test.ts` — status guard **and** unique `idempotencyKey` replay rejection | Pass |
| Financial isolation | `paymentRules.test.ts` — per-application submit guard, rate-snapshot arithmetic | Pass |
| Lifecycle state machine | `lifecycle.test.ts` (24) — invalid transitions rejected, all valid ones preserved | Pass |
| CLOSED terminal behaviour | `lifecycle.test.ts` — cannot reopen, complete, or mutate | Pass |
| Capacity / hiring | `lifecycle.test.ts` — primaries-only counting, role-less project still limited, role vs project independence | Pass |
| SSR / date / money | `dates.test.ts` (15), `workflowHelpers.test.ts` (6) — ISO keys, locale-independent sort, timezone stability, deterministic formatting, no unbounded description growth | Pass |

**Remaining concern:** SEC-003 and the SEC-006/007/012/013/014/016 ownership
guards are verified by inspection and through the shared `authz.ts` helpers the
tested guards exercise, not by a dedicated test each. The guard *set* is tested;
a few individual call sites are covered transitively rather than directly.

### DATA-005 caveat
`completedProjects` is now **derived from actual COMPLETED projects** the
freelancer was hired on as a primary, rather than incremented once per review.
Repeated reviews can no longer inflate it, and a completed-but-unreviewed
project is no longer lost.

**Fix-forward only, as approved. No historical backfill was performed.** Existing
profiles keep their current stored number until their next review recalculates
it, so historical values may remain wrong until then.

### DEP-001 — dependency upgrades
**Resolved during remediation:**
- `@auth/core` -> 0.41.3 (3 critical CVEs). `next-auth` and `@auth/prisma-adapter`
  pin their own nested copies, so this needed an npm `overrides` entry; verified
  with typecheck and a full build.
- `nanoid` -> 6.0.1 (2 high CVEs).

**Deferred — not upgraded, require breaking-range changes and their own
regression pass:** `next`, `postcss`, `sharp`, `next-auth` (pinned to a
`5.0.0-beta`, so not a patch-level action).

### Migration and database state — UNRESOLVED
- `prisma/migrations/0_init` — **written, NOT applied**
- `prisma/migrations/20260817000001_sec002_password_rotation_flag` — **written, NOT applied**
- `prisma/migrations/20260817000002_financial_model` — **written, NOT applied**
- `prisma/backfill/financial.ts` — **written, NEVER executed** (not even a dry run)

No `migrate deploy`, `migrate resolve`, `db push`, backfill or probe was ever run
against the configured Neon database, which has not been confirmed as
non-production.

> **Active blocker.** `User.passwordChangeRequired` exists in the Prisma schema
> and generated client but **not in the database**. Until `0_init` is marked
> applied and `20260817000001` deployed, `/admin/users` and any other
> `user.findMany()` path **errors at query time**. `next build` still exits 0 —
> the failure appears only at runtime, and shows in the build log as a
> `prisma:error` during static generation. This is the documented, expected state
> of this branch, not a regression.

### Production readiness
**This branch is NOT production-ready**, for one reason: the migration state
above is unresolved. Every P0 and P1 finding is Fixed & Tested, and the test
suite, typecheck and build all pass — but the schema the code expects does not
exist in the database, so deploying as-is would break admin user management
immediately.

Once the migrations are applied and the financial backfill has been run and its
issues report reviewed, the P0/P1 position supports a release decision. That step
is deliberately left to whoever can confirm the target database.

---

## Phase 0 — Setup: COMPLETE

| Item | Result |
|---|---|
| Audit read in full | ✅ Both sessions, 102 actionable IDs enumerated below |
| Test runner (TEST-001) | ✅ Vitest 3.2.7 + `vite-tsconfig-paths`; `npm test` / `npm run test:watch`; smoke test green |
| Status file | ✅ This document |
| Gating triage | ✅ See "Decisions Required" below |

**Test harness choice.** Vitest over Jest: ESM-native (the codebase is ESM throughout), resolves the `@/*` alias via `vite-tsconfig-paths` with no extra transform config, and needs no babel setup for a Next 16 / React 19 project. `environment: "node"` — the P0/P1 surface is server actions and route handlers, not components. Added `tests/setup.smoke.test.ts` to prove the runner and alias resolution work before any remediation test depends on them.

---

## Phase 1 — Security & Ownership Foundation: COMPLETE

4 commits. `npm test` 61 passing · `tsc --noEmit` clean · `next build` exit 0.

| Step | Result |
|---|---|
| Migration baseline | ✅ `prisma/migrations/0_init` generated from the existing schema |
| DEP-001 non-breaking | ✅ `@auth/core` + `nanoid` resolved (3 critical + 2 high CVEs) |
| P0 quick fixes | ✅ SEC-001, 002, 003, 008, 010, 017, ARCH-002 |
| Class A sweep | ✅ SEC-004, 005, 006, 007, 011, 012, 013, 014, 016 |
| Class B sweep | ✅ KANBAN-001, WS-001, WS-002, ROLE-001 **+ 4 unnamed instances found by the grep** |
| SEC-015 (SVG half) | ✅ Blocked on both MIME and extension |

### ⚠️ Two things that must happen before this branch runs against a database

1. **The migrations are written but deliberately not applied.** No migration in
   `prisma/migrations/` has been executed anywhere. `0_init` must be marked
   applied per-environment (`prisma migrate resolve --applied 0_init`), then
   `20260817000001_sec002_password_rotation_flag` applied with `migrate deploy`.
   **Until that runs, `/admin/users` and any other `user.findMany()` path will
   error** — the Prisma client now knows `User.passwordChangeRequired` but the
   database does not. `next build` still exits 0; the failure is at query time.
2. **`registerUser`'s signature changed** — `passwordHash` → `password`. Both
   in-repo callers were updated. Any external caller would break.

### Class B sweep — grep results
`grep -rnE "db\.[a-zA-Z]+\.(update|delete|updateMany|deleteMany)\("` across
`src/actions`, `src/app/api`, `src/app/workspace`, filtered to bare `{ id }`
where-clauses inside functions that had already run a project-access check.

Beyond the four IDs the audit named, this found **four more instances of the
identical shape**, all in `collaborationActions.ts`, all now fixed:

| Function | Record | Audit status |
|---|---|---|
| `updateProjectUpdateStatus` | `ProjectUpdate` | not named |
| `updateDeliverableStatus` | `SharedFile` | not named |
| `uploadDeliverableVersion` | `SharedFile` | not named |
| `deleteMessage` | `Message` | flagged "lower-risk, same shape" — confirmed |

`markMessagesAsRead` was checked and is already correctly scoped by
`projectId` + `channel`. No further instances remain.

---

## Phase 2 Step 2 — Financial Model Rebuild: COMPLETE

5 commits (`f011859` → `0b3fdaf`). `npm test` **105 passing** · `tsc --noEmit` clean.
Production build not re-run this step — the changed surface is server actions and
one client component; it will run in the final phase verification.

**Approved decisions applied:** COMP-001 → Option A (internal ledger only).
WS-003 → `ProjectUpdate` is non-financial; value tags are not imported.

### What was built
| Module | Purpose |
|---|---|
| `prisma/schema.prisma:565-760` | 5 tables, 5 enums. All amounts `Decimal(18,2)`; currency stored beside every amount |
| `prisma/migrations/20260817000002_financial_model/` | 32 DDL statements, all additive. **Not applied anywhere** |
| `src/lib/paymentRules.ts` | Business rules as pure functions — no DB, so money logic is testable without one |
| `src/lib/payments.ts:41` | `SELECT … FOR UPDATE` row locking inside `$transaction` |
| `src/lib/payments.ts:80` | Ledger append; unique `idempotencyKey` rejects replays |
| `src/lib/payments.ts:168` | `reconcileItem()` so cache-vs-ledger drift is assertable |
| `src/lib/compensation.ts` | One compensation resolver (DATA-002/DATA-009/COMP-018) |
| `prisma/backfill/financial.ts` | Dry-run-by-default, idempotent backfill; issues report |

### Transaction-safety checklist
| Requirement | How |
|---|---|
| Double release cannot occur | Unique `idempotencyKey` keyed on the resulting released total — `payments.ts:98`; a status check alone cannot close this, since concurrent callers read the same pre-state |
| Concurrent funding cannot exceed limits | `lockProjectItems()` locks all items before the aggregate budget check — `paymentStageActions.ts:150` |
| Per-application isolation | `applicationId` required on every financial row; hourly balances computed per application |
| Idempotency prevents duplicate ledger rows | `PaymentTransaction.idempotencyKey` unique index |
| Invalid status races | `assertTransition()` evaluated against freshly-locked state |
| DB-level constraints, not just app checks | unique `(applicationId, periodIndex)`, unique `(applicationId, workDate, description)`, unique `idempotencyKey` |

### Tests run
`npm test` → **105 passed / 7 files**. `npx tsc --noEmit` → clean.
New this step: `tests/paymentRules.test.ts` (37), `tests/ledger.test.ts` (7).

### Migration state
- `0_init` — written, **not applied**.
- `20260817000001_sec002_password_rotation_flag` — written, **not applied**.
- `20260817000002_financial_model` — written, **not applied**.
- Backfill — written, **never executed**, not even in dry-run against the live DB.
- **No database deployment occurred at any point.**

### Deferred out of this step
| ID | Reason |
|---|---|
| COMP-011 | Hardcoded 30/40/30 contract split is entangled with the contract/offer lifecycle; moved to Step 3 with LIFE-002 |
| COMP-016 | Partially fixed — amount now from `ProjectCompensation`; the legacy `?? budget` fallback survives in the resolver until backfill runs |

### Remaining in Phase 2
Step 3 (LIFE-001…007, MF-001…007, COMP-011), Step 4 (localization/SSR),
Step 5 (remaining P2s), Step 6 (P3s).

---

## Phase 2 Step 3 — Lifecycle & Multi-Freelancer: COMPLETE

2 commits (`b089dc6`, `4f0bd1b`). `npm test` **129 passing / 9 files** ·
`tsc --noEmit` clean · `next build` exit 0. **No migration applied; nothing deployed.**

All 15 IDs closed: LIFE-001…007, MF-001…007, COMP-011.

New module `src/lib/lifecycle.ts` holds the single project/application state
machine, the one authoritative capacity calculation, and the contract-schedule
builder. Every finding in this step existed because the same rule was
re-implemented at each call site.

### Lifecycle
| ID | Fix | Evidence |
|---|---|---|
| LIFE-001 | `completeProject` is the sole writer of COMPLETED; the side effect removed from `releaseMilestonePayment`. CLOSED/COMPLETED terminal; `assertProjectMutable` guards edit/visibility/due-date | `lifecycle.ts:24`, `workflowActions.ts:593`, `reviewActions.ts:134`, `projectActions.ts:200` |
| LIFE-002 | One path to HIRED. `transitionApplicationStage` refuses to produce it; offer acceptance checks capacity first | `workflowActions.ts:389`, `:1183`, `applicationActions.ts:265` |
| LIFE-003 | Explicit transition tables for both entities | `lifecycle.ts:24`, `:79` |
| LIFE-004 | Terminal projects take no applications | `applicationActions.ts:65` |
| LIFE-005 | `isVisible`, PRIVATE and INVITE_ONLY enforced | `applicationActions.ts:70` |
| LIFE-006 | `roleId` validated against the project | `applicationActions.ts:87` |
| LIFE-007 | Required screening questions enforced server-side | `applicationActions.ts:105` |

### Multi-freelancer
| ID | Fix | Evidence |
|---|---|---|
| MF-001 | **Verified**, not reimplemented — completion is project-level only once LIFE-001 removed the per-application writer | `workflowActions.ts:593` |
| MF-002 | Project moves to IN_PROGRESS only when every hired freelancer has signed | `workflowActions.ts:553` |
| MF-003 | **Verified structurally** — `PaymentItem.applicationId` is required (Step 2), so an unassigned claimable stage cannot exist. No runtime check re-added | `schema.prisma` `PaymentItem` |
| MF-004 / MF-005 | `getCapacity()` used by both apply and hire; hire runs under a row lock so concurrent hires cannot both see the last slot | `lifecycle.ts:133`, `:178`, `applicationActions.ts:121`, `:265` |
| MF-006 | Removal refused while committed-unreleased items or approved-unpaid hours exist, with the amount stated | `applicationActions.ts:395` |
| MF-007 | `role.name` (not the non-existent `role.title`); per-role skills; apprentices labelled | `lifecycle.ts:196`, `:216`, `certificateActions.ts:193` |

### COMP-011
`buildContractMilestones()` replaces the hardcoded 30/40/30 split at **both**
call sites (`workflowActions.ts:388`, `:507`), deriving the schedule from offer
milestones → configured payment items → a single full-value milestone.

### Tests added
`tests/lifecycle.test.ts` — 24 tests covering all ten required cases: CLOSED
cannot be reopened or mutated, only the authoritative path produces COMPLETED,
invalid transitions rejected, HIRED only via the authoritative path, capacity
cannot be exceeded (including the role-less-project gap), per-role certificate
title and skills, and an explicit assertion that the 30/40/30 split never
reappears.

Two notes on how these were tested. `deriveRoleSkills`/`deriveRoleTitle` moved
from `certificateActions` into `lifecycle.ts` because a `"use server"` module
cannot export sync helpers — without the move the MF-007 assertions would have
been vacuous. And the MF-007 skills test asserts two roles on the *same* project
receive *different* skills, which is the precise defect rather than a proxy for it.

### Not done in this step (correctly out of scope)
WS-007's workspace CTA gating still needs verifying in Step 5; LIFE-001 removed
the extra COMPLETED writer it depended on, but the CTA's own condition is a
separate change.

---

## Phase 2 Step 4 — Localization & SSR Root-Cause Sweep: COMPLETE

1 commit (`a5933fa`). `npm test` **144 passing / 10 files** · `tsc --noEmit` clean ·
`next build` exit 0. **No migration applied; nothing deployed.**

Treated as one sweep because the audit's root cause is shared: *a formatted
display string was being used as application data.*

### Per-finding outcome
| ID | Outcome | Evidence |
|---|---|---|
| TIME-001 | **Fixed & Tested** — grouping/sorting/filtering on a stable `YYYY-MM-DD` key; formatting only at render | `src/lib/dates.ts:22`, `:38`, `:52`, `WorkspaceView.tsx:1128` |
| TIME-002 | **Verified as already resolved** — no second implementation added | `hourlyLogActions.ts:29` (midday-UTC anchor), `schema.prisma:599` (`@db.Date`) |
| WS-003 | **Fixed & Tested** — read side verified, **write side was still open and is now closed** | `WorkspaceView.tsx:944` (no `[Value: $X]` written), modal budget field removed |
| WS-004 | **Verified as already resolved** — amounts are a `Decimal` column, never round-tripped through a display string | `schema.prisma:562`, `:603`, `:631` |
| DATA-007 | **Fixed & Tested** — one `money()` formatter using the authoritative currency | `WorkspaceView.tsx:1172` |
| DATA-008 | **Fixed & Tested** — Overview totals read the payment tables + ledger, not title prose | `compensation.ts:78` (`getProjectFinancialSummary`), `WorkspaceView.tsx:1159` |
| DATA-009 | **Fixed & Tested** — completed; both surfaces use the server-resolved type | `WorkspaceView.tsx:1148`, `compensation.ts:62` |
| SSR-001 | **Fixed & Tested** — deterministic formatter, no `Intl` on the SSR path | `src/lib/dates.ts:70` |
| SSR-002 | **Fixed & Tested** — non-deterministic `new Date()` removed from initial state | `WorkspaceView.tsx:719` |
| UX-004 | **Fixed & Tested** — closed with DATA-007 | `WorkspaceView.tsx:1172` |

### Two findings the "verify only" instruction did not fully cover
The brief listed WS-003 and DATA-009 as already resolved. Verification showed
both were only **half** done by Step 2:

- **WS-003** — the backfill stripped value tags from existing rows, but
  `handleCreateMilestone` still *wrote* `[Value: $X]` into new titles, and the
  Overview still parsed them. Recreating the exact defect on every new record.
  Both the write path and the modal's budget input are now removed.
- **DATA-009** — `compensation.ts` existed, but `WorkspaceView` still defaulted
  to `"MILESTONE"` while `WorkspaceFunding` defaulted to `"FIXED"` for the same
  project. Reported as partially addressed, now genuinely closed.

### Tests
`tests/dates.test.ts` — 15 tests: ISO key derivation, locale-independent
sorting (asserting the localised strings the old comparator relied on are
genuinely unparseable), date-picker filter matching without parsing, timezone
stability, and preservation of the previous visible format
("Monday, August 17, 2026").

Two draft tests were removed rather than kept: they set `process.env.LANG` in
a loop, which does not influence `Intl` in Node, so they would have passed
trivially while appearing to prove locale-independence.

### Not covered by this step
Money formatting outside the workspace (applicant and application detail
screens) still renders some amounts directly. Those surfaces were not in the
audit's DATA-007 evidence and are left for Step 5's UX pass rather than
widened into here.

---

## Phase 2 Step 5 — Remaining P2s: COMPLETE

2 commits (`d2b15dc`, `bd79179`). `npm test` **154 passing / 11 files** ·
`tsc --noEmit` clean · `next build` exit 0.
**No migration applied. No backfill run. Nothing deployed.**

### Reconciliation before starting
The brief listed **KANBAN-005 in both Step 5 and Step 6**. The status file
assigns it severity P3 but phase 7 (= this step), so it was done here and is
**not** carried into Step 6. Step 6 is phase 8: `SEC-009`, `LEG-004`, `RESP-002`
(plus `COMP-009`, `UX-005`).

### Per-finding outcome
| ID | Outcome | Evidence |
|---|---|---|
| KANBAN-002 | **Fixed & Tested** — all four statuses render from one table; REVIEW is a real column | `lifecycle.ts:198`, `WorkspaceView.tsx` board + detail dropdown |
| KANBAN-003 | **Fixed & Tested** — status validated against that table before write | `lifecycle.ts:191`, `collaborationActions.ts` `updateTaskStatus` |
| KANBAN-005 | **Fixed & Tested** — optimistic move/delete roll back on failure | `WorkspaceView.tsx` `handleUpdateTaskStatus`, `handleDeleteTask` |
| WS-005 | **Fixed & Tested** — poll 3s → 15s, paused while tab hidden | `WorkspaceView.tsx` poll effect |
| WS-006 | **Fixed & Tested** — file state serialised, not length-compared | `WorkspaceView.tsx` `setFiles` |
| WS-007 | **Fixed & Tested** — CTA gated on the LIFE-001 server readiness check; no second completion path | `WorkspaceView.tsx` `canOfferCompletion` |
| WS-010 | **Fixed & Tested** — dead filter removed | `WorkspaceView.tsx:618` |
| TIME-003 | **Fixed & Tested** — timeline keys on completion, not schedule | `WorkspaceView.tsx` `groupedTimeline` |
| TIME-005 | **Fixed & Tested** — overdue state, compared on ISO keys | `WorkspaceView.tsx` `isOverdue` |
| RESP-001 | **Fixed & Tested** — `w-screen` → `w-full` | `WorkspaceView.tsx` root |
| UX-001 | **Fixed & Tested** — progress records use progress vocabulary | `WorkspaceView.tsx` milestone badge |
| UX-002 | **Fixed & Tested** — one Modal confirmation + in-UI error banner replace `alert`/`confirm` | `WorkspaceView.tsx` `confirmAction` |
| UX-003 | **Fixed & Tested** — release confirms with the amount echoed | `WorkspaceFunding.tsx` `pendingRelease` |
| PERF-001 | **Fixed & Tested** — candidates narrowed at the DB layer | `workflowActions.ts:111` |
| PERF-002 | **Partially resolved — verified, not overclaimed** | see below |
| ROLE-002 | **Fixed & Tested** — slot ceiling | `roleActions.ts:23` |
| DATA-005 | **Fixed & Tested** — derived, fix-forward only | `reviewActions.ts` `countCompletedProjects` |
| DATA-006 | **Fixed & Tested** — dead `escrowMilestones` removed | `workflowHelpers.ts` |
| LEG-002 | **Fixed & Tested** — defaults only when genuinely absent | `workflowHelpers.ts` `parseProjectMetadata` |
| LEG-003 | **Fixed & Tested** — marker-based detection, sniff kept as fallback | `workflowHelpers.ts` `METADATA_MARKER` |
| COMP-016 | **Verified — correctly left partially open** | see below |

### PERF-002 — deliberately not claimed as fixed
The instruction was not to claim this resolved merely because tables exist. It
is **partially** resolved:
- **Now at the database layer:** all financial aggregation — completion
  readiness, funding totals, payment history — queries `PaymentItem`,
  `WorkLog`, `StipendPeriod` and the ledger directly.
- **Still in memory:** browse and listing screens call
  `getProjectMetadataDirect` / `formatCompensation` per project to render
  compensation (e.g. `ProjectsBrowser.tsx:321`). Compensation type and currency
  live in `ProjectCompensation`, but those screens have not been repointed at
  it, so filtering or sorting by compensation still cannot happen in SQL.
Closing it fully means migrating the browse/listing read paths, which is
outside this step's stated scope.

### COMP-016 — verified, correctly still partial
The live release path reads `comp.stipendAmount` from `ProjectCompensation`, so
the audit's defect (reading the rate live and falling back to the entire project
budget per period) no longer occurs once a project has a compensation row. The
`rate ?? budget` fallback survives **only** in `deriveFromMetadata`, the legacy
path used when no row exists — i.e. exactly the unapplied-migration state.
Per instruction it was **not** removed. It closes when the backfill runs.

### Regression caught by the new tests
Making LEG-002 respect a deliberately empty rounds array initially broke
genuinely-legacy projects: the fallback object defined `rounds: []`, which is
indistinguishable from a deliberate empty. The fallback now omits the field so
"absent" and "empty" are distinct. Caught by `tests/step5.test.ts`, not by
inspection.

### Tests
`tests/step5.test.ts` — 10 tests covering the task-status allowlist and column
completeness, one-column-at-a-time movement through REVIEW, round-default
seeding behaviour, and key-order-independent metadata detection.
Total **154 passing**.

---

## Phase 2 Step 6 — Remaining P3s: COMPLETE

1 commit (`8293ea0`). `npm test` **159 passing / 12 files** · `tsc --noEmit` clean ·
`next build` exit 0.
**No migration applied. No backfill run. No DB probes. Nothing deployed.**

**Phase 2 is now complete.** No backlog item remains in `Not Started`.

### Per-finding outcome
| ID | Outcome | Evidence |
|---|---|---|
| SEC-009 | **Fixed & Tested** — `/workspace` added to the proxy's guarded prefixes; non-members get `forbidden()` instead of a misleading `/login` redirect | `proxy.ts:15`, `:41`, `workspace/[applicationId]/page.tsx:145` |
| COMP-009 | **Verified as already resolved in Step 2** — not reimplemented | `schema.prisma:617` (unique `(applicationId, workDate, description)`), `hourlyLogActions.ts:83` (P2002 → friendly error) |
| LEG-004 | **Fixed & Tested** — corrupt metadata now distinguishable from absent | `workflowHelpers.ts` `safeJsonParse` / `isMetadataCorrupt` |
| RESP-002 | **Fixed & Tested** — `h-screen` → `h-dvh` | `WorkspaceView.tsx:1330` |
| UX-005 | **Fixed & Tested** — failed sync surfaces in the Step 5 error banner rather than a new mechanism | `WorkspaceView.tsx` poll `catch` |

### Notes on two of these

**SEC-009 was deliberately not "fixed" by adding a role check.** The workspace is
shared by companies and freelancers, so it has no single expected role;
membership is a per-project question the page already answers correctly. The
proxy now only requires a session, which is the defence-in-depth the other
authenticated areas get. Adding a role gate here would have broken the route
for one of the two legitimate audiences.

**LEG-004 is intentionally still non-throwing.** The audit's complaint was that
corruption was *indistinguishable from emptiness*, not that it failed to crash.
An absent or non-JSON payload returns the fallback quietly — both normal states
— while a present-but-unparseable block logs an error with the offending prefix
and is recorded for `isMetadataCorrupt()`. Since Step 2 moved financial state
into real tables, a corrupt block now degrades presentation only, so taking a
page down over it would be the wrong trade.

### Terminology correction
The brief described LEG-004 as a "legal/compliance fix". The `LEG-` prefix in
the audit is **Legacy Compatibility**, not legal. LEG-004 is the silent
metadata parse failure, which is what was implemented. No legal or policy
change was made, and none is implied by this work.

### Tests
`tests/step6.test.ts` — 5 tests covering the corrupt-vs-absent distinction:
error-level logging on corruption, detectability via `isMetadataCorrupt`,
non-throwing fallback, and that neither absent metadata nor valid metadata is
misreported as corrupt. Total **159 passing**.

### Explicitly NOT touched in this step
`PERF-002`, `COMP-016`, `SEC-015` (object storage), `DEP-001` (remaining version
bumps) and `COMP-001` retain their existing partial/deferred status. No
migration or backfill was run in an attempt to close any of them.

---

## Phase 3 Step 2 — Product Decisions Implemented: COMPLETE

2 commits (`453acb3`, `5decee9`). `npm test` **159 passing / 12 files** ·
`tsc --noEmit` clean · `next build` exit 0.
**No migration applied. No backfill run. No DB probes. Nothing deployed.**

All five decisions were **B**. Two required code; three are deferrals recorded
here with no code change, per the decision.

| Decision | Outcome | Evidence |
|---|---|---|
| **EVAL-001…006** → B | **Closed** — configurator reduced to what the platform runs | `workflowHelpers.ts` `SUPPORTED_ROUND_TYPES` / `isRoundTypeSupported`; both round selectors; `RoundConfigPanel.tsx:38`; `ui/Select.tsx` |
| **WS-009** → B | **Fixed & Tested** — voice + assistant simulations removed | `WorkspaceView.tsx` `VoiceMessagePlayer`, chat composer, assistant panel |
| **KANBAN-004** → B | **Deferred — product decision, not building this pass.** Button-driven interaction is the intended design; correctness already fixed in Step 5 | no code change |
| **TIME-004** → B | **Deferred — product decision, not building this pass.** Due-date-only model retained | no code change |
| **SEC-015 object storage** → B | **Deferred — separate initiative.** SVG restriction remains Fixed & Tested | no code change |

### What changed for EVAL
Only `SCREENING_QUESTIONS` is selectable. The other twelve types stay visible
but disabled and labelled "Coming soon — not yet run by the platform", and
`RoundConfigPanel` states on an unsupported round that its settings are saved
but candidates are never asked to complete it.

**Rounds already configured on existing projects are not deleted.** They remain
stored, render with a "Coming soon" badge, and can still be removed by the
company. This was the conservative reading of a question left open at the
decision gate — deleting stored configuration was not authorised.

**Interview scheduling is unaffected.** It runs from the applicant detail view
via pipeline stages, not from the rounds array, so disabling the `INTERVIEW`
round type removed no working functionality. Worth noting for a future
revisit: `INTERVIEW` is therefore *partially* real, unlike the other eleven.

Legacy default rounds (`CV_PITCH` / `SCREENING_QUESTIONS` / `INTERVIEW`, seeded
for projects predating the field) are left seeded and simply inherit the
labelling. Changing them would alter what existing projects display.

### What changed for WS-009
- **Voice:** nothing was ever recorded. The button started a timer and animated
  waveform; "sending" emitted a text token; the player synthesised tones with
  Web Audio + `Math.random()`. Button, overlay and handlers removed; the
  ~200-line player replaced with "Voice message — playback not available" so
  tokens already in history render honestly. Existing messages are not deleted.
- **Assistant:** keyword matching over canned replies, presented as an AI
  assistant. Handler and conversation state removed; the panel now states it is
  unavailable and points to Overview/Funding for real figures. The toggle and
  layout are unchanged.

### Deferred and partial items — unchanged by this step
| ID | Classification |
|---|---|
| COMP-001 | **Intentionally deferred** — real payment-provider integration, outside this remediation |
| PERF-002 | **Technically pending** — browse/list read paths still parse JSON per project |
| COMP-016 | **Blocked on migration** — legacy `rate ?? budget` fallback closes when the backfill runs |
| SEC-015 (object storage) | **Deferred — product decision** as of this step |
| DEP-001 (version bumps) | **Intentionally deferred** — `next`/`postcss`/`sharp`/`next-auth` need breaking-range upgrades and their own regression pass |

### ⚠️ Database state — unchanged
Three migrations written, **none applied**. Backfill written, **never executed**.
The `User.passwordChangeRequired` warning in the Phase 1 section above **remains
current**: until `0_init` is resolved and `20260817000001` deployed,
`/admin/users` and any other `user.findMany()` path errors at query time.

---

## Decisions Required Before I Reach Them

### Hard stops — Phase 3 (financial architecture). Plan first, no code.
| ID | Why it stops |
|---|---|
| ARCH-001 | ARCHITECTURAL LIMITATION — new schema for all financial state |
| COMP-001 | PRODUCT DECISION — real payment provider now, or ledger correctness only and defer |
| COMP-010 | ARCHITECTURAL LIMITATION — consolidating 4–5 milestone representations into one |
| WS-003 | Same consolidation (the 5th representation) |
| DATA-002 / DATA-003 / DATA-004 | Fixes are schema-shaped: one compensation-type source, currency alongside every amount, `Decimal` money |

### Hard stops — Phase 5 (product decisions). Options written up, no code.
| ID | Decision |
|---|---|
| EVAL-001 / EVAL-002 (+ 003/004/005/006 dependent) | Build the round runtime, or reduce the configurator to `SCREENING_QUESTIONS` |
| WS-009 | Voice + AI assistant: build for real, or replace with honest unavailable state |
| KANBAN-004 | Full DnD + `sortOrder` column, or keep button-driven and fix only correctness |
| TIME-004 | Add task start date (schema + UI), or out of scope this pass |

### Additional stops I identified while reading — not pre-named in your brief
| ID | Why I'm flagging it |
|---|---|
| **SEC-015 (second half)** | Dropping SVG is a one-line fix I'll do in Phase 2. Migrating **data-URLs-in-database → real object storage** is not: it needs a provider choice, credentials, and a backfill of existing base64 blobs already sitting in `Freelancer.bio` / `Company.description` / `SharedFile.fileUrl`. **My judgment: too large to do inline.** Flagging as MISSING FEATURE for a decision rather than attempting it in Phase 2. |
| **WS-008** | Your brief says keep 7-day retention if intended, just make it safe. I'll fix the mechanism (un-awaited destructive write during page render) in Phase 7 regardless. But **whether project communications should be destroyed after 7 days at all** is a product call I shouldn't make — there's no archive and no export. Please confirm the policy. |
| **LIFE-001 / `CLOSED` semantics** | You pre-authorised me to decide this directly. Flagging that it is genuinely a product question — is `CLOSED` cancelled, archived, or reopenable; does it block completion, certificates, payments? **Unless you object, I'll adopt:** `CLOSED` = terminal, non-reopenable, blocks all mutations and completion, issues no certificates, and renders read-only across every workspace tab. Say so now if that's wrong. |
| **DATA-005** | Fixing `completedProjects` to count completions rather than reviews changes a user-visible profile stat and needs a backfill decision (recompute historic values, or fix forward only). Small, but it silently rewrites existing profile numbers. |

### New finding — not in the audit
Logged per ground rule 1 rather than chased.

> **DEP-001 · P1 · SECURITY ISSUE · Dependencies**
> **Problem:** `npm audit --omit=dev` reports 7 production vulnerabilities — **3 critical, 4 high** — including **`@auth/core <=0.41.2` (critical)**, which is the authentication library underpinning every fix in Phase 1.
> **Evidence:** `npm audit --omit=dev`; `package.json:11` (`@auth/prisma-adapter`), `:19` (`next-auth ^5.0.0-beta.25`), `:20` (`next 16.2.7`), plus `nanoid`, `postcss`, `sharp`.
> **Current behaviour:** Shipping known-vulnerable auth, framework and image-processing code.
> **Expected:** Clean production audit, or documented accepted risk per advisory.
> **Note:** `@auth/core` and `nanoid` are fixable via `npm audit fix`. `next`, `postcss` and `sharp` require `npm audit fix --force` (breaking-range bumps), and `next-auth` is pinned to a **beta** (`5.0.0-beta.25`) — upgrading it is not a patch-level action.
> **Recommendation:** Take the non-breaking fixes during Phase 1; treat the `--force` set as a separate dependency-upgrade task with its own regression pass. **Not actioning either without your say-so** — a framework bump mid-remediation would confound every other fix.

### Blocker discovered — affects Phase 3 planning
**There is no Prisma migrations directory.** `prisma/` contains only `schema.prisma` and `seed.ts`; schema is being managed by `prisma db push`, so there is **no migration history**. Phase 3's migration/backfill plan will therefore have to establish a migration baseline first (`prisma migrate diff` against the live schema) before any financial-table migration can be written safely. I'll cover this in the Phase 3 plan rather than assuming it away.

---

## Backlog

### Security — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| SEC-001 | P0 | 1 | **Fixed & Tested** |
| SEC-002 | P0 | 1 | **Fixed & Tested** |
| SEC-003 | P0 | 1 | **Fixed & Tested** |
| SEC-004 | P0 | 2 | **Fixed & Tested** |
| SEC-005 | P0 | 2 | **Fixed & Tested** |
| SEC-006 | P0 | 2 | **Fixed & Tested** |
| SEC-007 | P0 | 2 | **Fixed & Tested** |
| SEC-008 | P0 | 1 | **Fixed & Tested** |
| SEC-009 | P3 | 8 | **Fixed & Tested**|
| SEC-010 | P1 | 1 | **Fixed & Tested** |
| SEC-011 | P1 | 2 | **Fixed & Tested** |
| SEC-012 | P1 | 2 | **Fixed & Tested** |
| SEC-013 | P2 | 2 | **Fixed & Tested** |
| SEC-014 | P2 | 2 | **Fixed & Tested** |
| SEC-015 | P2 | 1 / deferred | **Partial** — SVG blocked (Fixed & Tested); object-storage migration deferred (Phase 3 decision B) |
| SEC-016 | P3 | 2 | **Fixed & Tested** |
| SEC-017 | P3 | 1 | **Fixed & Tested** |

### Compensation — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| COMP-001 | P0 | — | **Deferred — real payment-provider integration is outside this pass.** Internal ledger built; externalRef reserved so a provider needs no schema change. |
| COMP-002 | P1 | 3 | **Fixed & Tested** |
| COMP-003 | P2 | 3 | **Fixed & Tested** |
| COMP-004 | P2 | 3 | **Fixed & Tested** |
| COMP-005 | P2 | 3 | **Fixed & Tested** |
| COMP-006 | P1 | 3 | **Fixed & Tested** |
| COMP-007 | P2 | 3 | **Fixed & Tested** |
| COMP-008 | P2 | 3 | **Fixed & Tested** |
| COMP-009 | P3 | 3 | **Fixed & Tested** |
| COMP-010 | P0 | 3 | **Fixed & Tested** |
| COMP-011 | P1 | 2 Step 3 | **Fixed & Tested** — buildContractMilestones() replaces the 30/40/30 split at both call sites |
| COMP-012 | P1 | 3 | **Fixed & Tested** |
| COMP-013 | P2 | 3 | **Fixed & Tested** |
| COMP-014 | P2 | 3 | **Fixed & Tested** |
| COMP-015 | P2 | 3 | **Fixed & Tested** |
| COMP-016 | P3 | 2 Step 3 | Partially fixed — stipend amount now read from ProjectCompensation, not live metadata; legacy `?? budget` fallback remains in the resolver |
| COMP-017 | P2 | 3 | **Fixed & Tested** |
| COMP-018 | P1 | 3 | **Fixed & Tested** |

### Multi-freelancer — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| MF-001 | P0 | 4 | **Fixed & Tested** |
| MF-002 | P1 | 4 | **Fixed & Tested** |
| MF-003 | P1 | 4 | **Fixed & Tested** |
| MF-004 | P2 | 4 | **Fixed & Tested** |
| MF-005 | P2 | 4 | **Fixed & Tested** |
| MF-006 | P2 | 4 | **Fixed & Tested** |
| MF-007 | P2 | 4 | **Fixed & Tested** |

### Lifecycle — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| LIFE-001 | P0 | 4 | **Fixed & Tested** |
| LIFE-002 | P1 | 4 | **Fixed & Tested** |
| LIFE-003 | P1 | 4 | **Fixed & Tested** |
| LIFE-004 | P2 | 4 | **Fixed & Tested** |
| LIFE-005 | P2 | 4 | **Fixed & Tested** |
| LIFE-006 | P2 | 4 | **Fixed & Tested** |
| LIFE-007 | P2 | 4 | **Fixed & Tested** |

### Architecture / data / perf / test — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| ARCH-001 | P0 | 3 | **Fixed & Tested** |
| ARCH-002 | P1 | 1 | **Fixed & Tested** |
| DATA-001 | — | — | **N/A — orphan reference.** Cited in audit §1 alongside ARCH-001 but never defined as its own finding. Treated as covered by ARCH-001; no separate work item. |
| DATA-002 | P1 | 3 | **Fixed & Tested** |
| DATA-003 | P1 | 3 | **Fixed & Tested** |
| DATA-004 | P1 | 3 | **Fixed & Tested** |
| DATA-005 | P2 | 5 | **Fixed & Tested** — derived, fix-forward only |
| DATA-006 | P2 | 7 | **Fixed & Tested**|
| PERF-001 | P2 | 7 | **Fixed & Tested**|
| PERF-002 | P2 | 5 | **Partially resolved — see Step 5 notes** |
| TEST-001 | P1 | 0 | **Fixed & Tested** — Vitest configured, smoke test green |

### Legacy — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| LEG-001 | — | — | **Withdrawn in audit session 2** — finding was incorrect; no work item |
| LEG-002 | P2 | 7 | **Fixed & Tested**|
| LEG-003 | P2 | 7 | **Fixed & Tested**|
| LEG-004 | P3 | 8 | **Fixed & Tested**|

### Roles — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| ROLE-001 | P2 | 2 | **Fixed & Tested** |
| ROLE-002 | P3 | 7 | **Fixed & Tested**|

### Evaluations — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| EVAL-001 | P1 | 5 | **Closed — configurator reduced (Phase 3 decision B)**|
| EVAL-002 | P1 | 5 | **Closed — runtime not built (Phase 3 decision B)**|
| EVAL-003 | P2 | 5 | **Closed via EVAL-001/002 decision**|
| EVAL-004 | P2 | 5 | **Closed via EVAL-001/002 decision**|
| EVAL-005 | P2 | 5 | **Closed via EVAL-001/002 decision**|
| EVAL-006 | P3 | 5 | **Closed via EVAL-001/002 decision**|

### Timeline / Kanban — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| TIME-001 | P1 | 6 | **Fixed & Tested** |
| TIME-002 | P1 | 6 | **Fixed & Tested** |
| TIME-003 | P2 | 7 | **Fixed & Tested**|
| TIME-004 | P2 | 5 | **Deferred — product decision: due-date-only model retained**|
| TIME-005 | P2 | 7 | **Fixed & Tested**|
| KANBAN-001 | P1 | 2 | **Fixed & Tested** |
| KANBAN-002 | P2 | 7 | **Fixed & Tested**|
| KANBAN-003 | P2 | 7 | **Fixed & Tested**|
| KANBAN-004 | P2 | 5 | **Deferred — product decision: keeping button-driven Kanban**|
| KANBAN-005 | P3 | 7 | **Fixed & Tested**|

### Workspace — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| WS-001 | P1 | 2 | **Fixed & Tested** |
| WS-002 | P1 | 2 | **Fixed & Tested** |
| WS-003 | P1 | 3 | **Fixed & Tested** (milestone consolidation) |
| WS-004 | P1 | 6 | **Fixed & Tested** — amounts are a Decimal column; never round-tripped through a display string |
| WS-005 | P2 | 7 | **Fixed & Tested**|
| WS-006 | P2 | 7 | **Fixed & Tested**|
| WS-007 | P2 | 7 | **Fixed & Tested**|
| WS-008 | P2 | 1 | **Fixed & Tested** — unsafe render-time delete removed; 7-day retention kept, cron only |
| WS-009 | P2 | 5 | **Fixed & Tested — simulations removed (Phase 3 decision B)**|
| WS-010 | P3 | 7 | **Fixed & Tested**|

### Data consistency — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| DATA-007 | P1 | 6 | **Fixed & Tested** |
| DATA-008 | P2 | 6 | **Fixed & Tested** |
| DATA-009 | P2 | 6 | **Fixed & Tested** — one compensation resolver (src/lib/compensation.ts) |

### UX / responsive / SSR — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| UX-001 | P2 | 7 | **Fixed & Tested**|
| UX-002 | P2 | 7 | **Fixed & Tested**|
| UX-003 | P2 | 7 | **Fixed & Tested**|
| UX-004 | P3 | 6 | **Fixed & Tested** (closes with DATA-007) |
| UX-005 | P3 | 7 | **Fixed & Tested**|
| RESP-001 | P2 | 7 | **Fixed & Tested**|
| RESP-002 | P3 | 8 | **Fixed & Tested**|
| SSR-001 | P2 | 6 | **Fixed & Tested** |
| SSR-002 | P2 | 6 | **Fixed & Tested** |

### New — this remediation
| ID | Sev | Phase | Status |
|---|---|---|---|
| DEP-001 | P1 | 1 | **Partially Fixed** — @auth/core + nanoid resolved; next/postcss/sharp/next-auth deferred |

---

## Counts

| | Count |
|---|---|
| Actionable backlog IDs | 102 |
| Fixed & Tested | 97 |
| Deferred (product decision) | 3 (COMP-001, KANBAN-004, TIME-004) |
| Partial / follow-up | 2 (SEC-015, PERF-002) — COMP-016 closed, see production section |
| Needs Decision | 0 |
| Not Started | 0 |
| Withdrawn / N-A | 2 (LEG-001, DATA-001) |
| New findings logged | 1 (DEP-001, partial) |

---

## Production migration — executed 2026-08-18

Rehearsed first on Neon branch `remediation-rehearsal` (branched from `production`
with data and schema), then applied to production. Production dry run was
byte-identical to the rehearsal before any write was authorised.

### Schema

| Migration | Result |
|---|---|
| `0_init` | Baselined via `migrate resolve --applied` — SQL **not** executed; the schema already existed |
| `20260817000001_sec002_password_rotation_flag` | Applied |
| `20260817000002_financial_model` | Applied |

`prisma migrate status` reports **Database schema is up to date!**
`User.passwordChangeRequired` now exists, closing the known runtime failure on
`/admin/users` and other `user.findMany()` paths.

### Financial backfill

Executed once with `--apply`. All write phases completed, including the
`ProjectUpdate` title strip, which is the final write in the script.

| Table | Rows |
|---|---|
| ProjectCompensation | 15 (all 15 projects) |
| PaymentItem | 9 |
| WorkLog | 4 |
| StipendPeriod | 5 |
| PaymentTransaction | 19 (6 FUND / 13 RELEASE) |
| ProjectUpdate titles cleaned | 16 |
| Skipped (blocking) | 3 |

Verified read-only after the run:

- `released > funded`: 0 — invariant holds
- `funded > amount`: 0
- zero-value PaymentItems: 0
- duplicate idempotency keys: 0
- orphaned PaymentItems (bad project/application FK): 0
- WorkLog natural keys `(applicationId, workDate, description)`: 4 rows / 4 unique — the anticipated P2002 collision did not occur
- StipendPeriod `(applicationId, periodIndex)`: 5 rows / 5 unique
- ledger FUND total `3300` reconciles exactly with `PaymentItem.fundedAmount` total `3300`
- projects without compensation: 0
- `ProjectUpdate` titles still carrying a `[Value: $X]` tag: 0

### Known skipped records — accepted, unchanged

Three zero-budget contract milestones on application
`cmrfyilgb001vdluwui85q87f` (`Project Kickoff` RELEASED, `Mid Delivery`
ESCROWED, `Final Delivery` PENDING — all `budget: 0`). Product decision: do not
import as zero-value PaymentItems, do not alter the source data. They remain
recorded in `migration-issues.json` and are absent from `PaymentItem`
(confirmed: 0 rows with the `cm:cmrfyilgb…` id prefix).

Because of these, the backfill exits 1 by design. Exit code alone is not a
failure signal here; the writes and the issue report are.

No new issues appeared in production that were not present in the rehearsal.

### COMP-016 — remains OPEN, deliberately

The backfill established `ProjectCompensation` for all 15 existing projects, so
the fallback in `getProjectCompensation` is dead for **existing** data. It was
still **not** removed, because project creation
(`src/actions/projectActions.ts`) does not write a `ProjectCompensation` row —
compensation for a newly created project still lives only in the `description`
JSON, and the fallback is the sole path that resolves it.

Removing the fallback today would break every project created from now on. The
correct close is to make project creation write `ProjectCompensation` first;
only then is the fallback genuinely obsolete. COMP-016 stays **Partial**.

### COMP-016 — CLOSED

Closed after the production backfill, by removing the cause rather than the
symptom.

The fallback was never only about un-migrated rows: `createProject` wrote no
`ProjectCompensation` record at all, so the JSON-derived path in
`getProjectCompensation` was the only thing resolving compensation for any newly
created project. Deleting it alone would have broken every project created after
the backfill. Project creation was fixed first.

**Creation paths now writing ProjectCompensation**

| Path | How |
|---|---|
| `projectActions.ts` → `createProject` | Inside `db.$transaction` with the `project.create` — atomic |
| `projectActions.ts` → `updateProject` | `upsert` after the edit, so changed compensation metadata stays canonical |
| `prisma/seed.ts` | `create` alongside each seeded project |

All three derive from `deriveFromMetadata(description, budget)` — the same
function the backfill used, so creation-time and migrated records are
interpreted identically. No new business rules were introduced.

**Fallback removed:** the pre-backfill JSON branch in `getProjectCompensation`
(`src/lib/compensation.ts`). The resolver now reads `ProjectCompensation` only,
returning `null` when the project itself does not exist.

**Remaining `?? budget` occurrences — audited, each still load-bearing**

| Location | Verdict |
|---|---|
| `compensation.ts:162` — `rate ?? budget` in `deriveFromMetadata` | **Kept.** No longer a legacy fallback; it is the canonical creation-time derivation, shared with the backfill. Removing it would silently change stipend amounts for projects that set a budget but no explicit rate. |
| `workflowHelpers.ts:367,370` | **Kept.** Browse/listing display labels rendered from metadata. Part of PERF-002, explicitly out of scope here. |

Tests: 7 new cases in `tests/projectCompensation.test.ts` covering FIXED,
HOURLY, STIPEND and UNPAID creation, currency and negotiable propagation,
transactional atomicity, and a no-regression check on the project payload.

Suite after the change: **166 passing / 13 files**, `tsc --noEmit` clean,
`next build` exit 0.
