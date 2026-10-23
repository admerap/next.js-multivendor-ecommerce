/** Helpers shared by the server-paginated list pages (search params in the URL). */

/** One option of a list filter (store, category…), as ListToolbar renders it. */
export type FilterOption = { id: string; label: string };

/** Next.js searchParams → one string per key (a repeated key keeps its first value), ready for a Zod list schema. */
export function firstParams(sp: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}
