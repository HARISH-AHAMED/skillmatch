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
| SEC-001 | P0 | 1 | Not Started |
| SEC-002 | P0 | 1 | Not Started |
| SEC-003 | P0 | 1 | Not Started |
| SEC-004 | P0 | 2 | Not Started |
| SEC-005 | P0 | 2 | Not Started |
| SEC-006 | P0 | 2 | Not Started |
| SEC-007 | P0 | 2 | Not Started |
| SEC-008 | P0 | 1 | Not Started |
| SEC-009 | P3 | 8 | Not Started |
| SEC-010 | P1 | 1 | Not Started |
| SEC-011 | P1 | 2 | Not Started |
| SEC-012 | P1 | 2 | Not Started |
| SEC-013 | P2 | 2 | Not Started |
| SEC-014 | P2 | 2 | Not Started |
| SEC-015 | P2 | 2 (SVG) / Needs Decision (object storage) | Not Started |
| SEC-016 | P3 | 2 | Not Started |
| SEC-017 | P3 | 1 | Not Started |

### Compensation — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| COMP-001 | P0 | 3 | **Needs Decision** |
| COMP-002 | P1 | 3 | Not Started |
| COMP-003 | P2 | 3 | Not Started |
| COMP-004 | P2 | 3 | Not Started |
| COMP-005 | P2 | 3 | Not Started |
| COMP-006 | P1 | 3 | Not Started |
| COMP-007 | P2 | 3 | Not Started |
| COMP-008 | P2 | 3 | Not Started |
| COMP-009 | P3 | 3 | Not Started |
| COMP-010 | P0 | 3 | **Needs Plan** |
| COMP-011 | P1 | 3 | Not Started |
| COMP-012 | P1 | 3 | Not Started |
| COMP-013 | P2 | 3 | Not Started |
| COMP-014 | P2 | 3 | Not Started |
| COMP-015 | P2 | 3 | Not Started |
| COMP-016 | P3 | 3 | Not Started |
| COMP-017 | P2 | 3 | Not Started |
| COMP-018 | P1 | 3 | Not Started |

### Multi-freelancer — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| MF-001 | P0 | 4 | Not Started |
| MF-002 | P1 | 4 | Not Started |
| MF-003 | P1 | 4 | Not Started |
| MF-004 | P2 | 4 | Not Started |
| MF-005 | P2 | 4 | Not Started |
| MF-006 | P2 | 4 | Not Started |
| MF-007 | P2 | 4 | Not Started |

### Lifecycle — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| LIFE-001 | P0 | 4 | Not Started |
| LIFE-002 | P1 | 4 | Not Started |
| LIFE-003 | P1 | 4 | Not Started |
| LIFE-004 | P2 | 4 | Not Started |
| LIFE-005 | P2 | 4 | Not Started |
| LIFE-006 | P2 | 4 | Not Started |
| LIFE-007 | P2 | 4 | Not Started |

### Architecture / data / perf / test — session 1
| ID | Sev | Phase | Status |
|---|---|---|---|
| ARCH-001 | P0 | 3 | **Needs Plan** |
| ARCH-002 | P1 | 1 | Not Started |
| DATA-001 | — | — | **N/A — orphan reference.** Cited in audit §1 alongside ARCH-001 but never defined as its own finding. Treated as covered by ARCH-001; no separate work item. |
| DATA-002 | P1 | 3 | Not Started |
| DATA-003 | P1 | 3 | Not Started |
| DATA-004 | P1 | 3 | Not Started |
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
| ROLE-001 | P2 | 2 | Not Started |
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
| TIME-002 | P1 | 6 | Not Started |
| TIME-003 | P2 | 7 | Not Started |
| TIME-004 | P2 | 5 | **Needs Decision** |
| TIME-005 | P2 | 7 | Not Started |
| KANBAN-001 | P1 | 2 | Not Started |
| KANBAN-002 | P2 | 7 | Not Started |
| KANBAN-003 | P2 | 7 | Not Started |
| KANBAN-004 | P2 | 5 | **Needs Decision** |
| KANBAN-005 | P3 | 7 | Not Started |

### Workspace — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| WS-001 | P1 | 2 | Not Started |
| WS-002 | P1 | 2 | Not Started |
| WS-003 | P1 | 3 | **Needs Plan** (milestone consolidation) |
| WS-004 | P1 | 6 | Not Started (may close via Phase 3) |
| WS-005 | P2 | 7 | Not Started |
| WS-006 | P2 | 7 | Not Started |
| WS-007 | P2 | 7 | Not Started (expected to close via LIFE-001) |
| WS-008 | P2 | 7 | Not Started (retention policy flagged above) |
| WS-009 | P2 | 5 | **Needs Decision** |
| WS-010 | P3 | 7 | Not Started |

### Data consistency — session 2
| ID | Sev | Phase | Status |
|---|---|---|---|
| DATA-007 | P1 | 6 | Not Started |
| DATA-008 | P2 | 6 | Not Started |
| DATA-009 | P2 | 6 | Not Started |

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
| DEP-001 | P1 | 1 (non-breaking) / Needs Decision (`--force` set) | Not Started |

---

## Counts

| | Count |
|---|---|
| Actionable backlog IDs | 102 |
| Fixed & Tested | 1 (TEST-001) |
| Needs Decision / Needs Plan | 16 |
| Not Started | 85 |
| Withdrawn / N/A | 2 (LEG-001, DATA-001) |
| New findings logged this pass | 1 (DEP-001) |
