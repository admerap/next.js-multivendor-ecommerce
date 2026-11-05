/** Helpers shared by the server-paginated list pages (search params in the URL). */

/** One option of a list filter (store, category…), as ListToolbar renders it. */
export type FilterOption = { id: string; label: string };

/**
 * URL of a filtered list after changing some params (storefront filter links, selects, pagination).
 * Empty values and defaults (sort=default, page=1) are dropped so URLs stay short; changing any filter
 * other than the page goes back to page 1. Pure — works on the server and the client.
 */
export function hrefWith(pathname: string, current: Record<string, string | number | undefined>, patch: Record<string, string | number | null | undefined>): string {
  const next: Record<string, string | number | undefined | null> = { ...current, ...patch };
  if (!("page" in patch)) delete next.page;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v === undefined || v === null || v === "" || (k === "sort" && v === "default") || (k === "page" && String(v) === "1")) continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/** `path` + the defined params as a query string (`withQuery("/x", { a: "1", b: undefined })` → "/x?a=1"). */
export function withQuery(path: string, params: Record<string, string | undefined>): string {
  const s = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();
  return s ? `${path}?${s}` : path;
}

/** Next.js searchParams → one string per key (a repeated key keeps its first value), ready for a Zod list schema. */
export function firstParams(sp: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}
