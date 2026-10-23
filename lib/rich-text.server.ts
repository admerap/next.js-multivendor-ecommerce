import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * The only HTML a product description may contain — exactly what the editor toolbar can produce.
 * Everything else (scripts, iframes, event handlers, inline styles other than text-align, images,
 * javascript:/data: links) is stripped. Run on every save and again before rendering.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "u", "s", "code", "h3", "ul", "ol", "li", "a"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    p: ["style"],
    h3: ["style"],
  },
  allowedStyles: {
    "*": { "text-align": [/^(left|center|right|justify)$/] },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  // Links always open in a new tab without giving the target page access to ours.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
    // Older/pasted markup: map to the allowed subset instead of dropping the text.
    b: "strong",
    i: "em",
    strike: "s",
    del: "s",
    h1: "h3",
    h2: "h3",
    h4: "h3",
  },
  disallowedTagsMode: "discard",
  // Drop empty paragraphs (the editor keeps one after a trailing list).
  exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length,
};

export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}
