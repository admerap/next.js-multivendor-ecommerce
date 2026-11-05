/** CSV helpers shared by the Seller Center exports (order list, reports). */

/** One CSV cell: quoted, inner quotes doubled, and a leading =+-@ defused so spreadsheets don't run it as a formula. */
export const csvCell = (v: string | number) => {
  const s = String(v);
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** Header + rows → CSV text, with a BOM so Excel opens it as UTF-8. */
export const toCsv = (head: string[], rows: (string | number)[][]) =>
  "﻿" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

/** Cents → "12.34" for a numeric CSV column (no currency sign, so it stays a number in a spreadsheet). */
export const csvDollars = (cents: number) => (cents / 100).toFixed(2);

/** A date as YYYY-MM-DD (UTC) for exports and file names. */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
