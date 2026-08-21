# EXCEPTIONS

Cases where a control in the new frontend had **no backend equivalent at all**,
and could not be made to work by calling an existing function. Per the scope
rule, each was handled with the smallest possible content-level change — one
control disabled or repointed, never a page or section dropped.

Seven cases, one of which is now **resolved** by a product decision (#1).
Everything else in the design is wired to real backend calls.

---

## 1. Freelancer profile — hourly rate vs. work history — ✅ RESOLVED

**Original conflict:** `Freelancer` has no rate column. The one action that
persists a rate, `updateFreelancerCalendarAndProfile`, writes it into the
`experience` JSON column as `{ hourlyRate, expectedBudget, … }` — the same column
`updateFreelancerProfile` uses for the freelancer's *work-history entries*. The
two actions overwrite each other, so the column can hold one or the other, never
both. The integration initially kept work history and disabled the rate field.

**Decision (taken after the integration):** flip it. The rate wins; work-history
capture is dropped.

**What changed**

- `src/app/freelancer/profile/ProfileClient.tsx` — the rate and currency fields
  are editable again. The rate is submitted through
  `updateFreelancerCalendarAndProfile` (`hourlyRate`), which is the existing
  rate-writing action. The subsequent `updateFreelancerProfile` call passes the
  same settings object as its `experience` value instead of a work-history array,
  so the second write cannot reset the column. `updateFreelancerProfile` types
  that parameter as `any` and no backend code reads the column back, so carrying
  `currency` alongside `hourlyRate` needed no backend change.
- The **Work experience** card, its "Add experience" modal and the state behind
  them are removed from the profile editor. The tab that held them keeps its
  Education card and is relabelled "Education".
- `src/components/shared/FreelancerProfileDetail.tsx` — the public profile's
  Experience card is removed for the same reason; its tab is relabelled
  "Education" and counts education entries.
- `src/adapters/profiles.ts` — `readProfileSettings()` parses the settings object
  out of `Freelancer.experience`. The freelancer's stated rate takes precedence;
  the `rateSnapshot` on their latest work log remains the fallback for anyone who
  has not saved a rate yet.
- `src/lib/types.ts` — `Freelancer.experience` and `ExperienceEntry` are removed.
  Nothing reads them, and leaving an always-empty field would invite someone to
  wire it back to a column that no longer holds entries.

### ⚠️ Data-overwrite caveat — expected, not a defect

**The first time an existing freelancer saves their profile, any work-history
entries already stored in their `experience` column are overwritten by the rate
settings object, and are not recoverable from the application.**

No migration or preservation was attempted; that was the explicit instruction
accompanying the decision. The column is a single JSON value with no versioning
and no second home, so the two shapes cannot coexist. Existing rows are not
touched until their owner saves — the overwrite happens on first save, per user,
not as a bulk operation. Until then, the adapter reads such a row as "no settings
stored" and falls back to the work-log rate.

If those entries matter, they must be exported from the database **before** users
start saving profiles. That is a database operation, outside this frontend-only
scope.

### Verified against the seeded database

The live verification pass confirmed this behaves exactly as written. Two seeded
freelancers carried legacy work-history arrays.

| freelancer | before | after one save | after a second save |
|---|---|---|---|
| `freelancer.sam@skillmatch.ai` (saved) | `ARRAY(1)` — "DevOps Architect, HashiCorp Systems" | `{"currency":"EUR","hourlyRate":"125"}` | `{"currency":"EUR","hourlyRate":"130"}` |
| `freelancer.alice@skillmatch.ai` (not saved) | `ARRAY(1)` | untouched | untouched |

The overwrite happened once, on that freelancer's own first save, and nothing
happened before it — Alice's entry is still intact because she has not saved.
The rate and currency round-trip back through the adapter into the form on
reload. **Sam's work-history entry was destroyed by this test and is not
recoverable**, which is the documented and accepted consequence.

---

## 2. Admin → Users → "Add user"

**Where:** `src/app/admin/users/UsersClient.tsx`
**Change:** the header action button and its modal are removed. The rest of the
page — the table, search, tabs, role change and delete — is unchanged.

**Why:** the modal collects name, email and role but no password, and offers
`ADMIN` as a choice. The only account-creating action, `registerUser`, requires a
password and deliberately refuses `ADMIN` (SEC-010, so an admin cannot be
self-provisioned). There is no backend path that creates an account from these
inputs. Role changes on existing accounts still work through `updateUserRole`,
which is the supported way to grant admin.

---

## 3. Admin → Reviews → "Hide from profiles"

**Where:** `src/app/admin/reviews/ReviewsClient.tsx`
**Change:** the button renders as designed but is `disabled`, with a title
explaining why. The moderation modal and the rest of the screen are untouched.

**Why:** `Review` has no moderation state — no `hidden`, no `revokedAt` — and no
action writes one. The platform's stated rule is that nothing is hard-deleted and
reviews stay on the record. Making this button work would have required a schema
column and a new action.

---

## 4. Admin → Settings → "Save"

**Where:** `src/app/admin/settings/page.tsx`
**Change:** the Save button is `disabled`; the page description now says the
values are the constants currently in force. Every control still shows its real
value.

**Why:** every setting on the page — `MESSAGE_TTL_DAYS`, `DELIVERABLE_REVISION_CAP`,
`MAX_DAILY_HOURS`, `MAX_ROLE_SLOTS`, and the five match-score weights — is a
compile-time constant in the deployed build (`src/lib/constants.ts`,
`src/services/aiRecommendation.ts`). There is no settings table and no action to
write one. The page is genuinely useful as a read-only reference, so it stays.

---

## 5. Project `viewCount`

**Where:** `src/adapters/projects.ts`
**Change:** always `0`.

**Why:** the schema has no view counter on `Project`, and nothing increments one.
Reporting zero is honest; inventing a number would not be. The neighbouring
`savedCount` **is** real — it comes from the `SavedProject` table.

---

## 6. Task labels

**Where:** `src/adapters/workspace.ts`
**Change:** `labels` is always `[]`, so the label chips on the task board render
empty.

**Why:** `Task` has no label column and no action sets one. The rest of the task
board — status, priority, assignee, due date — is real.

---

## 7. Company → freelancer detail → "Invite to a project"

**Where:** `src/app/company/freelancers/[id]/FreelancerDetailClient.tsx`
**Change:** the button now navigates to `/company/freelancers?invite={id}` instead
of firing an invitation directly.

**Why:** `inviteFreelancerToProject` requires a project id, and a role id when the
project uses roles. The detail page has no project or role picker; the search
screen does, and its invite modal is fully wired. Sending the recruiter one click
sideways to the working flow was preferable to disabling the button outright.
