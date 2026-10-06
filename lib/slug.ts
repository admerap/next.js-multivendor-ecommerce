/** "Hanover Électronics & Co." → "hanover-electronics-and-co" (lowercase, hyphenated, ASCII). */
export function slugify(value: string, fallback = "item") {
  const slug = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

/** First free slug among `base`, `base-2`, `base-3`… given the slugs already taken. */
export function nextFreeSlug(base: string, taken: Iterable<string>) {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
