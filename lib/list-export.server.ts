import "server-only";

import { NextResponse } from "next/server";
import { isoDate, toCsv } from "@/lib/csv";
import { downloadResponse } from "@/lib/download";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { exportFormat, tableDownload } from "@/lib/xlsx.server";

/** One export column: what the spreadsheet gets (numbers stay numbers) and, optionally, how the PDF shows it. */
export type ExportColumn<T> = {
  label: string;
  value: (row: T) => string | number;
  pdf?: (row: T) => string;
  weight?: number;
  align?: "left" | "right";
};

type Page<T> = { success: boolean; error?: string; data?: { items: T[]; pageCount: number } };

/**
 * Every row of a list, page by page, through the list's own loader — so an export always has exactly the list's
 * permission check, store scope and filters (the loader re-checks them). null = the loader refused.
 */
export async function allPages<T>(load: (page: number) => Promise<Page<T>>, maxPages = 400): Promise<T[] | null> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await load(page);
    if (!res.success || !res.data) return page === 1 ? null : out;
    out.push(...res.data.items);
    if (page >= res.data.pageCount) break;
  }
  return out;
}

/**
 * A list export route's answer: ?format=xlsx | csv | pdf of `rows` with `columns`. The file is named
 * `sundry-<name>-YYYY-MM-DD`; the PDF gets a title, the store (or "Sundry HQ"), a subtitle (the filters) and a
 * small summary.
 */
export async function listExport<T>(
  req: Request,
  opts: { name: string; title: string; store: string; subtitle: string; summary?: [string, string][]; columns: ExportColumn<T>[]; rows: T[] },
): Promise<Response> {
  const format = exportFormat(new URL(req.url).searchParams.get("format"));
  const name = `sundry-${opts.name}-${isoDate(new Date())}`;
  try {
    if (format !== "pdf") {
      const csv = toCsv(
        opts.columns.map((c) => c.label),
        opts.rows.map((r) => opts.columns.map((c) => c.value(r))),
      );
      return tableDownload(csv, name, format);
    }
    const pdf = await renderReportPdf({
      title: opts.title,
      store: opts.store,
      subtitle: opts.subtitle,
      summary: [["Rows exported", String(opts.rows.length)], ...(opts.summary ?? [])],
      columns: opts.columns.map((c) => ({ label: c.label.replace(/ \(USD\)$/, ""), weight: c.weight ?? 1, align: c.align })),
      rows: opts.rows.map((r) => opts.columns.map((c) => (c.pdf ? c.pdf(r) : String(c.value(r))) || "—")),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error(`[export] ${opts.name} failed`, error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export this list right now. Please try again.", { status: 500 });
  }
}

/** Where a refused export goes: back to the sign-in page for that list. */
export const signInAgain = (req: Request, login: string, back: string) =>
  NextResponse.redirect(new URL(`${login}?callbackUrl=${encodeURIComponent(back)}`, req.url));
