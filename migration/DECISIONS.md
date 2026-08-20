# DECISIONS

Non-obvious calls made while wiring the new frontend to the existing backend,
and the reasoning behind each. Conflicts that had no backend answer at all are in
[EXCEPTIONS.md](./EXCEPTIONS.md).

---

## Where the work landed

**The backend repository is the target.** The new frontend was copied into
`skillmatch-current` rather than the backend being copied out to it.

Only this direction makes the scope rule checkable: `git diff main` scoped to
`prisma/`, `src/actions/`, `src/app/api/`, `src/auth.ts`, `src/services/` and the
backend half of `src/lib/` must come back empty, and it does. It also keeps the
Prisma client, Auth.js configuration and the 219 existing tests running exactly
as they were.

Preserved verbatim: `prisma/`, `src/actions/`, `src/app/api/`, `src/auth.ts`,
`src/proxy.ts`, `src/services/`, `src/types/`, `tests/`, and the backend modules
in `src/lib/` (`authz`, `db`, `password`, `payments`, `paymentRules`, `lifecycle`,
`compensation`, `workflowHelpers`, `uploads`, `browseFilters`, `dates`,
`downloadCertificate`). `src/app/workspace/downloads/[fileName]/route.ts` is a
route handler that happens to live outside `api/`; it was restored after the
initial copy.

---

## The shape of the wiring

The new frontend was built against synchronous fixtures imported from
`@/data/queries`, consumed by 53 files, almost all of them client components. The
backend reads through Prisma in async server components. Three layers bridge that:

**`src/adapters/`** — Prisma rows → the domain types in `@/lib/types`. This is
where the real complexity sits, because much of what the design displays is not
in columns: it lives in the JSON metadata blocks the backend appends to
`Project.description`, `Freelancer.bio`, `Company.description` and
`Application.coverLetter`. The adapters read those with the backend's own parsers
(`getProjectMetadataDirect`, `parseApplicationMetadata`, …) rather than
re-implementing the format.

**`src/data/server/`** — `server-only` modules that query Prisma the way the
current app's pages already do and return domain types. Authorisation reuses
`src/lib/authz` (`requireApplicationParty`, `visibleChannelsFor`); no new
authorisation logic was written.

**`src/lib/domain.ts`** — the pure rules both sides need (capacity, financial
summaries, channel visibility, the browse and talent filters). It operates on
rows the server has already fetched and authorised, so it is safe in a client
bundle and the two sides cannot drift.

Each route then became a server component that fetches and renders the original
client component, moved to a sibling `*Client.tsx` with its JSX untouched. Only
the data-acquisition block at the top of each file changed.

---

## Reads

**Directory filtering stays on the client.** `/discover/projects` and
`/discover/talent` fetch the full public candidate set on the server and filter it
in the browser through `filterProjects` / `filterFreelancers`. The design's
filters are instant and unpaginated, and re-fetching per keystroke would change
how they feel. Both sets are public data, so nothing private crosses the wire.

**Everything scoped is filtered in SQL.** Dashboards, applicant pipelines and
workspaces query by owner. Counters are database aggregates (`groupBy`,
`aggregate`), not the length of a fetched list.

**Reviews are keyed by user id, not profile id.** The fixtures used profile ids;
`Review.revieweeId` is a `User` id. Every call site passes `viewer.userId` or
`freelancer.userId`.

**Freelancer location comes out of the headline.** `Freelancer` has no location
column, and the existing profile form writes it into `professionalHeadline` as
`"Senior Designer · Berlin, DE"`. The adapter splits it back out; the profile
editor recomposes it on save. Round-trips cleanly, and existing rows keep working.

**Match scores use the platform's own formula.** `computeScore` calls
`computeRecommendationScore` and the five pure component helpers in
`src/services/aiRecommendation.ts`, so the number the applicant panel explains is
the number the backend ranks on. `recommendationsForProject` reads the cached
`Recommendation` rows when they exist and falls back to scoring on demand for a
project that has never been recalculated.

**Screening rounds beyond `SCREENING_QUESTIONS` are marked `comingSoon`.** The
backend's `SUPPORTED_ROUND_TYPES` lists exactly one wired type; the others are
configurable but not collectable. The design already has a "coming soon"
treatment, so the adapter sets that flag rather than hiding the rounds.

**The interview is derived from the pipeline.** There is no interview table.
Scheduling writes the date and joining link onto the pipeline event that records
it, so the adapter reads the latest event carrying a `meetingLink` and treats a
later "Interview Cancelled" stage as superseding it — mirroring what
`updateInterviewAction` does when it edits that same event.

**Workspace unread counts exclude your own messages.** `Message.seen` is false on
a message the sender just posted; the fixtures counted those as unread for the
sender. The badge now filters on `senderId !== viewerUserId`.

---

## Writes

**Auth is Auth.js, unchanged.** `SessionProvider` receives the session resolved
by `getViewer()` in the root layout and holds no copy of its own — every mutation
ends in `router.refresh()`, which re-renders the provider with what Auth.js now
reports. Sign-in, Google sign-in and sign-out delegate to `next-auth/react`;
registration calls the existing `registerUser` action and then signs in.

**Route guards run on the server.** Each role layout calls `requireViewer`, which
redirects with the same rules the design's client-side guard used. The client
guard is kept as a companion so the shell reacts if a session ends mid-visit.

**Demo accounts point at the seed.** The design's preview panel listed
`@frivvo.talent` fixtures that do not exist. It now lists the three accounts
`prisma/seed.ts` creates, so the buttons actually sign you in.

**Hiring uses the dedicated actions, not the generic stage transition.**
`hireApplicant` runs its capacity check inside a transaction with the project's
application rows locked. The client-side capacity check is only there to explain a
full role before the request is made; the server decides.

**Bulk applicant moves are issued per applicant.** `bulkTransitionApplicants`
swallows individual failures. Issuing one call per applicant means a refusal — a
role that filled while the page was open — surfaces instead of disappearing.

**The project wizard writes through the description.** `createProject` and
`editProject` derive the canonical `ProjectCompensation` row from the metadata
block embedded in `description`. `src/adapters/projectForm.ts` builds that string
with the backend's own `serializeProjectMetadata`, so objectives, deliverables,
timing, rounds and the certificate template all persist. The edit screen merges
its handful of fields over `fromProject(project)`, so editing a listing never
drops metadata the edit form does not display.

**Profile save order no longer decides who wins the `experience` column.**
`updateFreelancerCalendarAndProfile` (education, languages, rate) still runs
first, but `updateFreelancerProfile` now passes the *same* settings object back
as its `experience` value rather than a competing work-history array. Both writes
agree, so the rate survives regardless of ordering. See "Resolving EXCEPTIONS #1"
below.

**FAQ replies address the entry by index.** `replyToDiscussionQuestion` takes a
`faqIndex` into the metadata array, so the adapter mints FAQ ids as `faq-{index}`
and the reply handler reads the index back out. Pre-application questions are
tagged `[Discussion Question by NAME]` in the same array; the adapter unpicks that
tag so the UI can tell a company FAQ from a freelancer's question.

**Counter-offers keep the offer's billing model.** `negotiateOfferAction` takes a
payment category, but the design's counter-offer modal only collects an amount and
a message. The existing offer's category is passed through — only the amount is
under negotiation.

**Manually issued certificates snapshot the project's required skills.**
`issueCertificate` needs a skills array and the modal has no skills field.
The listing's `requiredSkills` is what the certificate attests to.

**Uploads go through the existing route.** `src/lib/upload.ts` posts to
`POST /api/upload`, which does validation, the size limit and the storage
decision. The banner, avatar, logo, resume and gallery pickers — inert in the
design — are wired to it.

---

## Two changes to the design's own content

**Fabricated marketing multipliers removed.** The home and about pages rendered
`stats.freelancers * 84`, `stats.companies * 46`, `stats.projects * 72` and
`stats.certificates * 1067`. Those factors existed to make tiny fixtures look like
a populated platform. Against a real database they would state numbers the
platform cannot support, so they are gone and the real counts are shown.

**`matchScore` added to the `Freelancer` type.** The fixture version of
`searchFreelancers` returned `{ ...freelancer, matchScore }` from an inferred
type, and the talent cards read it. The field is now declared as optional on
`Freelancer`, matching the convention `Project` already used.

---

## Housekeeping

`framer-motion` and `lucide-react` were bumped to the versions the new frontend
was built against (`^13.1.0`, `^1.33.0`). `next` and `react` were left at the
backend's versions, which the new frontend compiles and builds against cleanly.
The seven fixture modules under `src/data/` were deleted once the last consumer
was converted.

---

## Resolving EXCEPTIONS #1 — rate over work history

The rate-vs-work-history conflict was decided in favour of an editable rate.
The judgment calls made while carrying that out:

**Order stopped mattering, rather than being flipped.** The obvious fix was to
reverse the two save calls so the rate-writing action runs last. That would have
worked for the rate but broken availability: the calendar action forces
`availabilityStatus = "AVAILABLE"` whenever it receives an `availabilityCalendar`
(and `[]` is truthy), so running it last would silently override a freelancer who
had chosen "Partly booked" or "Not taking work". Instead both writes now agree on
the column's contents, and the profile action keeps running last so the fields
only it can write — name, avatar, banner, availability, domain, response time —
still win.

**Currency rides in the same object.** `updateFreelancerProfile` types its
`experience` parameter as `any` and writes it verbatim, and nothing in the backend
reads that column back — the only two references to it are the two writers. So the
settings object carries `currency` next to `hourlyRate`. A rate without its
currency would have been ambiguous, and the alternative was leaving the currency
select disabled while the rate beside it was editable.

**Orphaned UI was deleted, not hidden.** The Work experience card, its
`AddExperienceModal` component and the `experience` / `addingExperience` state
came out of the profile editor entirely, along with the profile-completeness check
and checklist row that counted work history. The public profile's Experience card
went too — with the column now holding settings, it would have rendered a heading
above an empty list on every profile.

**The tabs that held it were relabelled, not removed.** Both the editor and the
public profile grouped Experience and Education under one "Experience" tab. The
Education half is still real and still populated, so the tab survives as
"Education" rather than the section disappearing.

**`ExperienceEntry` and `Freelancer.experience` were removed from the domain
types.** Keeping a field that is always `[]` and read by nothing would invite a
future change to repopulate it from a column that no longer holds entries — which
is precisely the collision this decision resolved.

**No data migration was attempted**, per the instruction accompanying the
decision. The overwrite caveat is recorded in EXCEPTIONS #1.
