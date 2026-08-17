/**
 * Date keys and formatting.
 *
 * TIME-001 / SSR-001 share one root cause: a *formatted display string* was
 * being reused as *data*. The timeline grouped tasks under a
 * `toLocaleDateString()` key and then fed that human-readable string back into
 * `new Date()` to sort and filter it. In English that happens to parse; in any
 * other locale the key is e.g. "lundi 17 août 2026", `new Date()` returns
 * Invalid Date, and the comparator receives NaN — so ordering became arbitrary
 * and the date filter matched nothing.
 *
 * The rule this module exists to enforce: group, sort and filter on a stable
 * ISO key; format only at the presentation boundary.
 */

/**
 * Stable `YYYY-MM-DD` key in the viewer's own calendar.
 *
 * Uses local date parts rather than `toISOString()`, which would shift the
 * calendar day for anyone west of UTC — the same class of bug as TIME-002.
 */
export function toDateKey(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Groups items under an ISO date key.
 * Items with no resolvable date are collected under "" and can be skipped by
 * the caller rather than silently vanishing.
 */
export function groupByDateKey<T>(items: T[], getDate: (item: T) => Date | string | number | null | undefined) {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const raw = getDate(item);
    const key = raw == null ? "" : toDateKey(raw);
    (groups[key] ??= []).push(item);
  }
  return groups;
}

/**
 * Sorts ISO date keys newest-first. Lexicographic comparison is exact for
 * `YYYY-MM-DD` and, unlike `new Date(displayString)`, is locale-independent.
 */
export function sortDateKeysDesc(keys: string[]): string[] {
  return keys.filter(Boolean).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

/** Filters ISO keys to a single day. An empty filter matches everything. */
export function filterDateKeys(keys: string[], selected?: string): string[] {
  if (!selected) return keys;
  return keys.filter((k) => k === selected);
}

/**
 * Formats an ISO date key for display.
 *
 * SSR-001 — `toLocaleDateString` with the runtime's locale produces different
 * text on the server (host locale/timezone) and on the client (the user's),
 * which is a hydration mismatch on every timestamp. Parsing the key into
 * explicit numeric parts and formatting from fixed tables keeps the output
 * identical on both sides.
 */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatDateKey(key: string, opts?: { weekday?: boolean }): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  // Constructed as UTC and read back as UTC, so the weekday cannot shift with
  // the runtime's timezone.
  const utc = new Date(Date.UTC(y, m - 1, d));
  const base = `${MONTHS[m - 1]} ${d}, ${y}`;
  return opts?.weekday ? `${DAYS[utc.getUTCDay()]}, ${base}` : base;
}

/** Short deterministic form, e.g. "17 Aug 2026". */
export function formatDateKeyShort(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}
