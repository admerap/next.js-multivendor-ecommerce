/**
 * Product descriptions are stored as a small, sanitized HTML subset (see rich-text.server.ts).
 * This helper is safe for both client and server: it only measures text, it never renders.
 */

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** Visible text of the description HTML, whitespace collapsed — used for length rules and previews. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/pre|\/blockquote)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}
