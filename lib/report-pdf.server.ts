import "server-only";

import { PDFDocument, PDFFont, PDFPage, StandardFonts } from "pdf-lib";
import { PDF_COLORS as C } from "@/lib/invoice.server";

export type PdfColumn = { label: string; /** share of the table width */ weight: number; align?: "left" | "right" };

/**
 * A Seller Center report as a PDF (Report Manage › Export › PDF): title, store, range and filters, the
 * summary figures, then the table — landscape US Letter, header row repeated on every page, page numbers.
 * Cells arrive already formatted (money(), dates), so this only lays them out.
 */
export async function renderReportPdf({
  title,
  store,
  subtitle,
  summary,
  columns,
  rows,
}: {
  title: string;
  store: string;
  /** e.g. "This month · Status: Ongoing" */
  subtitle: string;
  summary: [string, string][];
  columns: PdfColumn[];
  rows: string[][];
}): Promise<Uint8Array> {
  const W = 792, H = 612, M = 40, R = W - M;
  const doc = await PDFDocument.create();
  doc.setTitle(`${title} — ${store}`);
  doc.setAuthor("Sundry Marketplace");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Standard fonts only cover WinAnsi; anything else (−, •, emoji…) is swapped so drawing never throws.
  const charset = new Set(font.getCharacterSet());
  const safe = (s: string) => [...s.replace(/[−‐-‒]/g, "-").replace(/•/g, "*").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')].map((ch) => (charset.has(ch.codePointAt(0)!) ? ch : "?")).join("");
  const fit = (s: string, f: PDFFont, size: number, max: number) => {
    let t = safe(s);
    if (f.widthOfTextAtSize(t, size) <= max) return t;
    while (t.length > 1 && f.widthOfTextAtSize(`${t}...`, size) > max) t = t.slice(0, -1);
    return `${t.trimEnd()}...`;
  };

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const total = columns.reduce((n, c) => n + c.weight, 0);
  const xs: number[] = [];
  columns.reduce((x, c) => (xs.push(x), x + ((R - M) * c.weight) / total), M);
  const colW = (i: number) => ((R - M) * columns[i]!.weight) / total;
  const cell = (s: string, i: number, f: PDFFont, size: number, color = C.body) => {
    const t = fit(s, f, size, colW(i) - 10);
    const x = columns[i]!.align === "right" ? xs[i]! + colW(i) - 5 - f.widthOfTextAtSize(t, size) : xs[i]! + 5;
    page.drawText(t, { x, y, size, font: f, color });
  };
  const header = () => {
    page.drawRectangle({ x: M, y: y - 6, width: R - M, height: 20, color: C.sunken });
    columns.forEach((c, i) => cell(c.label.toUpperCase(), i, bold, 7.5, C.muted));
    y -= 22;
  };

  // ── Title block
  page.drawText("Sundry", { x: M, y, size: 18, font: bold, color: C.primary });
  const t = safe(title);
  page.drawText(t, { x: R - bold.widthOfTextAtSize(t, 16), y, size: 16, font: bold, color: C.strong });
  y -= 16;
  page.drawText(fit(`${store} · Seller Center`, font, 9, 360), { x: M, y, size: 9, font, color: C.muted });
  const sub = fit(subtitle, font, 9, 360);
  page.drawText(sub, { x: R - font.widthOfTextAtSize(sub, 9), y, size: 9, font, color: C.body });
  y -= 18;
  page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 0.8, color: C.line });
  y -= 22;

  // ── Summary figures, in one row
  const sw = (R - M) / Math.max(1, summary.length);
  summary.forEach(([label, value], i) => {
    page.drawText(fit(value, bold, 13, sw - 12), { x: M + i * sw, y, size: 13, font: bold, color: C.strong });
    page.drawText(fit(label, font, 8, sw - 12), { x: M + i * sw, y: y - 13, size: 8, font, color: C.muted });
  });
  y -= 38;

  // ── Table
  header();
  if (rows.length === 0) {
    page.drawText("No rows for these filters.", { x: M + 5, y, size: 9.5, font, color: C.muted });
  }
  for (const r of rows) {
    if (y < M + 30) {
      page = doc.addPage([W, H]);
      y = H - M;
      header();
    }
    r.forEach((v, i) => cell(v, i, i === 0 ? bold : font, 8.5, i === 0 ? C.strong : C.body));
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: R, y }, thickness: 0.5, color: C.line });
    y -= 11;
  }

  const pages = doc.getPages();
  const stamp = `Generated ${new Date().toISOString().slice(0, 10)}`;
  pages.forEach((p, i) => {
    p.drawText(stamp, { x: M, y: M - 18, size: 7.5, font, color: C.muted });
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, { x: R - font.widthOfTextAtSize(label, 7.5), y: M - 18, size: 7.5, font, color: C.muted });
  });
  return doc.save();
}
