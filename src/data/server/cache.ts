import "server-only";
import { unstable_cache, updateTag } from "next/cache";

/* ============================================================================
   PUBLIC READ CACHE

   Every route in this app renders dynamically, because the root layout reads
   the viewer's session. That is correct — the navigation differs per viewer —
   but it also meant the marketing pages and the public directories re-ran
   their entire database workload on every single anonymous request.

   This caches the *public* half of that work: aggregate counts, the featured
   lists, the browse listings. Nothing here is viewer-specific, so nothing can
   leak between sessions:

     • Only functions whose result is identical for every visitor go through
       here. Anything derived from a session, a viewer id, or a match score
       computed for one freelancer stays uncached.
     • Entries are tagged, and the mutations that change the underlying rows
       call the matching invalidator, so a newly published listing still shows
       up immediately rather than after a timeout.
     • The time-based lifetime is a backstop for anything an invalidator
       misses, not the primary freshness mechanism.
   ========================================================================= */

export const CACHE_TAGS = {
  /** Listings and anything derived from them (featured rows, open counts). */
  projects: "public:projects",
  /** Company directory and profile cards. */
  companies: "public:companies",
  /** Freelancer directory, leaderboard, top-rated rows. */
  freelancers: "public:freelancers",
  /** Platform-wide counters shown on marketing pages. */
  stats: "public:stats",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/** Backstop lifetime, in seconds. Invalidation is what keeps data fresh. */
const DEFAULT_TTL = 300;

/**
 * Wrap a public, viewer-independent read.
 *
 * `keyParts` must capture every argument that changes the result — they become
 * the cache key. A function taking a viewer id does not belong here at all.
 */
export function publicCache<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  tags: CacheTag[],
  ttlSeconds: number = DEFAULT_TTL,
): (...args: Args) => Promise<Result> {
  return unstable_cache(fn, keyParts, { tags, revalidate: ttlSeconds });
}

/**
 * Drop the cached public reads that the given change could affect.
 *
 * Called from the mutations that already call `revalidatePath`. `updateTag`
 * expires the entry outright rather than serving it stale once more, so the
 * company that just published a listing sees it on the public pages
 * immediately — read-your-own-writes, not eventual consistency.
 */
export function invalidatePublic(...tags: CacheTag[]) {
  for (const tag of tags.length > 0 ? tags : Object.values(CACHE_TAGS)) {
    updateTag(tag);
  }
}
