"use client";

import { Check, Copy, Eye, X } from "lucide-react";
import { useState } from "react";
import type { CouponRow } from "@/app/vendor/(panel)/coupons/actions";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { couponDate, couponValueLabel } from "@/lib/coupons";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { couponKindLabel } from "@/lib/validations/coupon";
import { CouponStatusBadge } from "@/components/coupons/CouponBits";

/** "View coupon" — the ticket from the vendorcoupon design (details + big value stub + Copy code). */
export function CouponViewButton({ coupon: c, className }: { coupon: CouponRow; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const free = c.type === "FREE_DELIVERY";
  const percent = !free && c.discountType === "PERCENTAGE";
  const big = free ? "Free" : couponValueLabel(c);
  const rows: [string, React.ReactNode][] = [
    ["Minimum purchase", c.minPurchase ? money(c.minPurchase) : "None"],
    ...(percent ? [["Maximum discount", c.maxDiscount ? money(c.maxDiscount) : "No cap"] as [string, string]] : []),
    ["Start date", couponDate(c.startsAt, true)],
    ["Expire date", couponDate(c.expiresAt, true)],
    ["Limit per user", c.limitPerUser ?? "No limit"],
    ["Total used", `${c.usedCount}${c.usageLimit ? ` of ${c.usageLimit.toLocaleString("en-US")}` : ""}`],
    ["Applies to", c.scope === "STORE_WIDE" ? "Entire store" : `${c.products.length} ${c.products.length === 1 ? "product" : "products"}`],
    ["Discount bearer", "Seller"],
    ["Status", <CouponStatusBadge key="s" status={c.status} />],
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (setCopied(false), setOpen(true))}
        aria-label={`View coupon ${c.code}`}
        title="View coupon"
        className={cn("grid size-9 shrink-0 place-items-center rounded-md border border-line bg-success-50 text-success-600 transition-colors duration-(--dur-fast) hover:bg-success-500 hover:text-on-primary max-lg:size-11", className)}
      >
        <Eye aria-hidden className="size-4" strokeWidth={2} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent hideClose className="overflow-hidden p-0 sm:w-[min(640px,calc(100vw-32px))] sm:p-0" aria-describedby={undefined}>
          <div className="grid max-h-[90vh] overflow-y-auto sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="min-w-0 p-6 sm:p-7">
              <p className="text-caption font-bold tracking-[0.06em] text-primary uppercase">{couponKindLabel(c)}</p>
              <DialogTitle className="mt-1.5 mb-3.5 font-display text-h4 font-extrabold tracking-[-0.01em] text-fg-strong">{c.title}</DialogTitle>
              <DialogDescription className="sr-only">Coupon details for {c.code}</DialogDescription>
              <button
                type="button"
                onClick={copy}
                aria-label={copied ? `Code ${c.code} copied` : `Copy code ${c.code}`}
                className="inline-flex h-10 items-center gap-2.5 rounded-md border-[1.5px] border-dashed border-iris-300 bg-iris-50 pr-2 pl-3.5 max-lg:h-11"
              >
                <span className="text-base font-extrabold tracking-[0.06em] text-primary tabular-nums">{c.code}</span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-card px-2.5 text-caption font-bold text-fg-strong">
                  {copied ? <Check aria-hidden className="size-3.5 text-success-600" strokeWidth={2.4} /> : <Copy aria-hidden className="size-3.5" strokeWidth={2.2} />}
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
              <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
                {rows.map(([k, val]) => (
                  <div key={k} className="contents">
                    <dt className="text-fg-muted">{k}</dt>
                    <dd className="min-w-0 font-bold text-fg-strong tabular-nums">{val}</dd>
                  </div>
                ))}
              </dl>
              {c.scope === "SPECIFIC_PRODUCTS" && c.products.length > 0 && (
                <ul role="list" aria-label="Products" className="mt-3 flex flex-wrap gap-1.5">
                  {c.products.map((n) => (
                    <li key={n} className="rounded-full bg-sunken px-2.5 py-1 text-caption font-semibold text-fg">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Ticket stub */}
            <div className="relative order-first grid place-items-center border-b-2 border-dashed border-on-primary/35 bg-[linear-gradient(150deg,var(--iris-600),var(--iris-800))] p-6 sm:order-none sm:border-b-0 sm:border-l-2 sm:p-7">
              <span aria-hidden className="absolute -top-3.5 -left-3.5 hidden size-7 rounded-full bg-inverse/55 sm:block" />
              <span aria-hidden className="absolute -bottom-3.5 -left-3.5 hidden size-7 rounded-full bg-inverse/55 sm:block" />
              <div className="flex size-30 flex-col items-center justify-center rounded-full bg-card text-center shadow-lg sm:size-37.5">
                <span className={cn("font-display leading-none font-extrabold tracking-[-0.02em] text-primary tabular-nums", big.length > 4 ? "text-h3 sm:text-h2" : "text-h2 sm:text-h1")}>{big}</span>
                <span className="mt-1.5 text-sm font-bold text-fg-muted">{free ? "Shipping" : "Off"}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-3.5 right-3.5 grid size-8.5 place-items-center rounded-full bg-card/90 text-fg shadow-sm hover:text-fg-strong max-lg:size-11"
          >
            <X aria-hidden className="size-4" strokeWidth={2.2} />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
