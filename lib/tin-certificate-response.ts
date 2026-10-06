import "server-only";

import { readVendorDocument } from "@/lib/uploads";

/**
 * Streams a private TIN certificate to an already-authorized caller. Never cached by shared
 * caches, never content-sniffed by the browser. 404 when there is no readable file.
 */
export async function tinCertificateResponse(storedName: string | null | undefined, slug: string): Promise<Response> {
  const doc = await readVendorDocument(storedName);
  if (!doc) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(doc.bytes), {
    status: 200,
    headers: {
      "Content-Type": doc.contentType,
      "Content-Length": String(doc.bytes.byteLength),
      "Content-Disposition": `inline; filename="tin-certificate-${slug}.${doc.ext}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
