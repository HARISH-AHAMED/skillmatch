# Remediation Status

**Backlog source of truth:** `talentra-audit.md` (sessions 1 + 2)
**Branch:** `remediation/audit-backlog`
**Started:** 2026-08-17
**Nothing in this effort has been deployed.** All work is committed to the branch above only.

Statuses: `Not Started` · `In Progress` · `Fixed & Tested` · `Deferred (reason)` · `Needs Decision`

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
| SEC-009 | P3 | 8 | Not Started |
| SEC-010 | P1 | 1 | **Fixed & Tested** |
| SEC-011 | P1 | 2 | **Fixed & Tested** |
| SEC-012 | P1 | 2 | **Fixed & Tested** |
| SEC-013 | P2 | 2 | **Fixed & Tested** |
| SEC-014 | P2 | 2 | **Fixed & Tested** |
| SEC-015 | P2 | 1 / 3 | **Fixed & Tested** (SVG blocked) · object storage → Needs Decision |
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
| DATA-005 | P2 | 7 | Not Started (backfill question flagged above) |
| DATA-006 | P2 | 7 | Not Started |
| PERF-001 | P2 | 7 | Not Started |
| PERF-002 | P2 | 7 | Not Started |
| TEST-001 | P1 | 0 | **Fixed & Tested** — Vitest configured, smoke test green |

### Legacy — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| LEG-001 | — | — | **Withdrawn in audit session 2** — finding was incorrect; no work item |
| LEG-002 | P2 | 7 | Not Started |
| LEG-003 | P2 | 7 | Not Started |
| LEG-004 | P3 | 8 | Not Started |

### Roles — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| ROLE-001 | P2 | 2 | **Fixed & Tested** |
| ROLE-002 | P3 | 7 | Not Started |

### Evaluations — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| EVAL-001 | P1 | 5 | **Needs Decision** |
| EVAL-002 | P1 | 5 | **Needs Decision** |
| EVAL-003 | P2 | 5 | Needs Decision (depends on 001/002) |
| EVAL-004 | P2 | 5 | Needs Decision (depends on 001/002) |
| EVAL-005 | P2 | 5 | Needs Decision (depends on 001/002) |
| EVAL-006 | P3 | 5 | Needs Decision (depends on 001/002) |

### Timeline / Kanban — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| TIME-001 | P1 | 6 | Not Started |
| TIME-002 | P1 | 6 | **Fixed & Tested** |
| TIME-003 | P2 | 7 | Not Started |
| TIME-004 | P2 | 5 | **Needs Decision** |
| TIME-005 | P2 | 7 | Not Started |
| KANBAN-001 | P1 | 2 | **Fixed & Tested** |
| KANBAN-002 | P2 | 7 | Not Started |
| KANBAN-003 | P2 | 7 | Not Started |
| KANBAN-004 | P2 | 5 | **Needs Decision** |
| KANBAN-005 | P3 | 7 | Not Started |

### Workspace — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| WS-001 | P1 | 2 | **Fixed & Tested** |
| WS-002 | P1 | 2 | **Fixed & Tested** |
| WS-003 | P1 | 3 | **Fixed & Tested** (milestone consolidation) |
| WS-004 | P1 | 6 | **Fixed & Tested** — amounts are a Decimal column; never round-tripped through a display string |
| WS-005 | P2 | 7 | Not Started |
| WS-006 | P2 | 7 | Not Started |
| WS-007 | P2 | 7 | Not Started — LIFE-001 removed the extra COMPLETED writer; the workspace CTA gating still needs verifying in Step 5 |
| WS-008 | P2 | 1 | **Fixed & Tested** — unsafe render-time delete removed; 7-day retention kept, cron only |
| WS-009 | P2 | 5 | **Needs Decision** |
| WS-010 | P3 | 7 | Not Started |

### Data consistency — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| DATA-007 | P1 | 6 | Not Started |
| DATA-008 | P2 | 6 | Not Started |
| DATA-009 | P2 | 6 | **Fixed & Tested** — one compensation resolver (src/lib/compensation.ts) |

### UX / responsive / SSR — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| UX-001 | P2 | 7 | Not Started |
| UX-002 | P2 | 7 | Not Started |
| UX-003 | P2 | 7 | Not Started |
| UX-004 | P3 | 6 | Not Started (closes with DATA-007) |
| UX-005 | P3 | 7 | Not Started |
| RESP-001 | P2 | 7 | Not Started |
| RESP-002 | P3 | 8 | Not Started |
| SSR-001 | P2 | 6 | Not Started |
| SSR-002 | P2 | 6 | Not Started |

### New — this remediation
| ID | Sev | Phase | Status |
|---|---|---|---|
| DEP-001 | P1 | 1 | **Partially Fixed** — @auth/core + nanoid resolved; next/postcss/sharp/next-auth deferred |

---

## Counts

| | Count |
|---|---|
| Actionable backlog IDs | 102 |
| Fixed & Tested | 58 |
| Partially fixed | 2 (SEC-015 SVG half, DEP-001 non-breaking half) |
| Deferred (explicit decision) | 1 (COMP-001) |
| Needs Decision | 9 |
| Not Started | 30 |
| Withdrawn / N/A | 2 (LEG-001, DATA-001) |
| New findings logged | 1 (DEP-001) |
