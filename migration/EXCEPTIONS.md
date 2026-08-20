# EXCEPTIONS

Cases where a control in the new frontend had **no backend equivalent at all**,
and could not be made to work by calling an existing function. Per the scope
rule, each was handled with the smallest possible content-level change — one
control disabled or repointed, never a page or section dropped.

Seven cases. Everything else in the design is wired to real backend calls.

---

## 1. Freelancer profile — "Indicative hourly rate" and its currency

**Where:** `src/app/freelancer/profile/ProfileClient.tsx` → Skills & availability tab
**Change:** both fields render exactly as designed but are `disabled` / `readOnly`,
with the help text changed to say where the number comes from.

**Why:** `Freelancer` has no rate column. The one action that persists a rate,
`updateFreelancerCalendarAndProfile`, writes it into the `experience` JSON column
as `{ hourlyRate, expectedBudget, … }` — the same column `updateFreelancerProfile`
uses for the freelancer's *experience entries*. The two actions overwrite each
other. Keeping the rate would mean losing the work-history list the design shows
prominently on the public profile, so the work history won.

The field is not empty: the adapter fills it from the `rateSnapshot` on the
freelancer's most recent work log, which is the rate they are actually engaged
at. It is real, just not editable here.

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
