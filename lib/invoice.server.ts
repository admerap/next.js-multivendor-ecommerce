import "server-only";

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { SHIPPING_METHOD_INFO, taxLabel } from "@/lib/checkout";
import { money } from "@/lib/money";
import type { OrderView } from "@/lib/orders.server";
import { addressLines, canceledPartsTotal, orderAddress, orderDate, PAYMENT_METHOD_LABEL, paymentLabel } from "@/lib/orders";

/**
 * Invoice PDF for one order, split by seller (marketplace rule): header, bill-to / ship-to, then one
 * section per store with its lines and totals (coupon, shipping, tax), then the order totals and what's
 * due. US Letter, built with pdf-lib's standard fonts (no files to ship).
 *
 * A PDF can't read the CSS design tokens, so its palette repeats the brand values here — the only place
 * outside globals.css that does (Iris primary, text and line neutrals from DESIGN_SYSTEM §11). The
 * report PDFs (lib/report-pdf.server.ts) reuse it.
 */
export const PDF_COLORS = {
  primary: rgb(106 / 255, 47 / 255, 214 / 255),
  strong: rgb(26 / 255, 26 / 255, 35 / 255),
  body: rgb(64 / 255, 64 / 255, 80 / 255),
  muted: rgb(110 / 255, 110 / 255, 128 / 255),
  line: rgb(228 / 255, 228 / 255, 236 / 255),
  sunken: rgb(246 / 255, 246 / 255, 250 / 255),
  success: rgb(21 / 255, 146 / 255, 90 / 255),
};
const C = PDF_COLORS;
const PAGE = { w: 612, h: 792, m: 48 };

/**
 * `sellerCopy`: a vendor's invoice for its own part — the caller passes the order already trimmed to
 * that store (getVendorOrderView), and the wording says so.
 */
export async function renderInvoice(order: OrderView, { sellerCopy = false }: { sellerCopy?: boolean } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Sundry invoice #${order.orderNumber}`);
  doc.setAuthor("Sundry Marketplace");
  doc.setCreationDate(order.createdAt);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Standard fonts only cover WinAnsi; anything else (−, emoji, CJK…) is swapped so drawing never throws.
  const charset = new Set(font.getCharacterSet());
  const safe = (s: string) => [...s.replace(/[−‐-‒]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')].map((ch) => (charset.has(ch.codePointAt(0)!) ? ch : "?")).join("");
  const fit = (s: string, f: PDFFont, size: number, max: number) => {
    let t = safe(s);
    if (f.widthOfTextAtSize(t, size) <= max) return t;
    while (t.length > 1 && f.widthOfTextAtSize(`${t}...`, size) > max) t = t.slice(0, -1);
    return `${t.trimEnd()}...`;
  };

  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - PAGE.m;
  const text = (s: string, x: number, size = 9.5, f = font, color = C.body) => page.drawText(safe(s), { x, y, size, font: f, color });
  const right = (s: string, xRight: number, size = 9.5, f = font, color = C.body) => page.drawText(safe(s), { x: xRight - f.widthOfTextAtSize(safe(s), size), y, size, font: f, color });
  const rule = (color = C.line) => page.drawLine({ start: { x: PAGE.m, y }, end: { x: PAGE.w - PAGE.m, y }, thickness: 0.8, color });
  const need = (h: number) => {
    if (y - h >= PAGE.m + 24) return;
    page = doc.addPage([PAGE.w, PAGE.h]);
    y = PAGE.h - PAGE.m;
  };
  const R = PAGE.w - PAGE.m;

  // ── Header
  text("Sundry", PAGE.m, 22, bold, C.primary);
  right("INVOICE", R, 20, bold, C.strong);
  y -= 16;
  text(sellerCopy ? `Seller copy - ${order.storeOrders[0]?.vendor.storeName ?? ""}'s part of this order` : "One marketplace. Every seller you love.", PAGE.m, 9, font, C.muted);
  right(`Invoice #${order.orderNumber}`, R, 10, bold, C.strong);
  y -= 13;
  right(`Date: ${orderDate(order.createdAt)}`, R, 9);
  y -= 12;
  const allCanceled = order.storeOrders.every((s) => s.status === "CANCELED");
  right(`Payment: ${PAYMENT_METHOD_LABEL[order.paymentMethod]} (${paymentLabel(order.paymentMethod, order.paymentStatus, allCanceled)})`, R, 9);
  y -= 18;
  rule();
  y -= 20;

  // ── Bill to / Ship to
  const col2 = PAGE.m + (PAGE.w - 2 * PAGE.m) / 2;
  const block = (title: string, x: number, a: ReturnType<typeof orderAddress>) => {
    const rows = [a.name, ...addressLines(a), a.phone, a.email].filter(Boolean);
    let yy = y;
    page.drawText(safe(title), { x, y: yy, size: 8, font: bold, color: C.muted });
    yy -= 14;
    rows.forEach((r, i) => {
      page.drawText(fit(r, i === 0 ? bold : font, 9.5, col2 - PAGE.m - 16), { x, y: yy, size: 9.5, font: i === 0 ? bold : font, color: i === 0 ? C.strong : C.body });
      yy -= 13;
    });
    return yy;
  };
  const yA = block("BILL TO", PAGE.m, orderAddress(order, "bill"));
  const yB = block("SHIP TO", col2, orderAddress(order, "ship"));
  y = Math.min(yA, yB) - 10;
  if (order.note) {
    need(30);
    text("Order note:", PAGE.m, 9, bold, C.muted);
    page.drawText(fit(order.note, font, 9, R - PAGE.m - 60), { x: PAGE.m + 58, y, size: 9, font, color: C.body });
    y -= 20;
  }

  // ── One section per store
  const cols = { item: PAGE.m + 8, qty: R - 190, unit: R - 110, total: R - 8 };
  for (const s of order.storeOrders) {
    need(90);
    page.drawRectangle({ x: PAGE.m, y: y - 6, width: R - PAGE.m, height: 22, color: C.sunken });
    text(`Sold by ${s.vendor.storeName}${s.status === "CANCELED" ? " - CANCELED" : ""}`, cols.item, 10.5, bold, C.strong);
    y -= 26;
    text("ITEM", cols.item, 7.5, bold, C.muted);
    right("QTY", cols.qty + 20, 7.5, bold, C.muted);
    right("UNIT PRICE", cols.unit + 40, 7.5, bold, C.muted);
    right("AMOUNT", cols.total, 7.5, bold, C.muted);
    y -= 8;
    rule();
    y -= 14;
    for (const it of s.items) {
      const sub = [it.variationName, it.sku && `SKU ${it.sku}`].filter(Boolean).join(" · ");
      need(sub ? 34 : 22);
      page.drawText(fit(it.productName, font, 9.5, cols.qty - cols.item - 30), { x: cols.item, y, size: 9.5, font, color: C.strong });
      right(String(it.qty), cols.qty + 20, 9.5);
      right(money(it.unitPrice), cols.unit + 40, 9.5);
      right(money(it.unitPrice * it.qty), cols.total, 9.5, font, C.strong);
      if (sub) {
        y -= 11;
        page.drawText(fit(sub, font, 8, cols.qty - cols.item - 30), { x: cols.item, y, size: 8, font, color: C.muted });
      }
      y -= 16;
    }
    rule();
    y -= 15;
    const sumRow = (label: string, value: string, strong = false) => {
      need(16);
      right(label, cols.unit + 40, 9, strong ? bold : font, strong ? C.strong : C.muted);
      right(value, cols.total, 9, strong ? bold : font, strong ? C.strong : C.body);
      y -= 13;
    };
    sumRow("Subtotal", money(s.subtotal));
    if (s.discount > 0) sumRow(`Discount${s.couponCode ? ` (${s.couponCode})` : ""}`, `-${money(s.discount)}`);
    else if (s.couponCode) sumRow(`Coupon ${s.couponCode}`, "Free delivery");
    sumRow("Shipping", s.shipping === 0 ? "Free" : money(s.shipping));
    sumRow(taxLabel(order.taxRegion, order.taxRate), money(s.tax));
    sumRow(`${s.vendor.storeName} total`, money(s.total), true);
    y -= 12;
  }

  // ── Order totals
  need(120);
  rule(C.strong);
  y -= 18;
  const total = (label: string, value: string, emphasis = false) => {
    right(label, cols.unit + 40, emphasis ? 11 : 9.5, emphasis ? bold : font, emphasis ? C.primary : C.muted);
    right(value, cols.total, emphasis ? 12 : 9.5, emphasis ? bold : font, emphasis ? C.primary : C.strong);
    y -= emphasis ? 18 : 14;
  };
  total("Subtotal", money(order.subtotal));
  total("Discount", `-${money(order.discount)}`);
  total(`Shipping (${SHIPPING_METHOD_INFO[order.shippingMethod].label})`, order.shipping === 0 ? "Free" : money(order.shipping));
  total(taxLabel(order.taxRegion, order.taxRate), money(order.tax));
  // Sellers canceled on their own come off what's due; the stored totals stay the placement snapshot.
  const canceled = canceledPartsTotal(order.storeOrders);
  if (canceled > 0) total("Canceled items", `-${money(canceled)}`);
  const grand = order.total - canceled;
  y -= 4;
  total(sellerCopy ? "Seller total" : "Order total", money(grand), true);
  y -= 6;
  const due =
    order.paymentStatus === "PAID"
      ? `Paid in full - ${money(grand)}`
      : order.paymentStatus === "REFUNDED"
        ? `Refunded to the card - ${money(order.total)}`
        : order.paymentMethod === "COD"
          ? `Amount due on delivery (cash): ${money(grand)}`
          : allCanceled
            ? "Not paid - order canceled, nothing was charged"
            : `Awaiting card payment: ${money(grand)}`;
  right(due, cols.total, 10, bold, order.paymentStatus === "PAID" ? C.success : C.strong);

  // ── Footer on every page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: PAGE.m, y: PAGE.m + 6 }, end: { x: R, y: PAGE.m + 6 }, thickness: 0.6, color: C.line });
    const note = sellerCopy ? "Only this seller's items and totals. Other sellers in the same order invoice their own part." : "Thank you for shopping on Sundry. Each seller ships their part of your order separately.";
    p.drawText(safe(note), { x: PAGE.m, y: PAGE.m - 8, size: 8, font, color: C.muted });
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, { x: R - font.widthOfTextAtSize(label, 8), y: PAGE.m - 8, size: 8, font, color: C.muted });
  });

  return doc.save();
}
