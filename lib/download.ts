import "server-only";

const TYPES = {
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

/**
 * A generated file (export CSV / Excel, invoice / report PDF) as an attachment download: private, never cached
 * by shared caches, never content-sniffed. Shared by every export and invoice route.
 */
export function downloadResponse(body: string | Uint8Array, filename: string, kind: keyof typeof TYPES): Response {
  return new Response(typeof body === "string" ? body : new Uint8Array(body), {
    headers: {
      "Content-Type": TYPES[kind],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
