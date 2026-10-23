import { BadgeCheck, Bot, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { sellerHref, type StoreSummary } from "@/lib/storefront";

/**
 * Seller card on the product page (Product Detail Page design, PRD FR-S17): logo, name + verified badge,
 * reviews and visible-product counts, Visit Store and Ask AI Support (Sundry AI Support replaces chat with
 * the vendor — CLAUDE.md §3). The store is always APPROVED here (VISIBLE requires it) → "Verified".
 */
export function ProductSeller({ store }: { store: StoreSummary }) {
  return (
    <section aria-label="Seller" className="rounded-lg bg-card p-5 shadow-sm">
      <div className="mb-4.5 flex items-center gap-3">
        <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-primary shadow-primary">
          {store.logo ? (
            <Image src={store.logo} alt="" fill sizes="48px" className="bg-card object-cover" />
          ) : (
            <Store aria-hidden className="size-5.5 text-on-primary" strokeWidth={1.9} />
          )}
        </span>
        <div className="min-w-0">
          <Link href={sellerHref(store.slug)} className="flex items-center gap-1.5 font-display text-[1.06rem] font-extrabold !text-fg-strong hover:!text-primary max-lg:min-h-11">
            <span className="truncate">{store.name}</span>
            <BadgeCheck aria-label="Verified seller" className="size-4.5 shrink-0 text-primary" strokeWidth={2} />
          </Link>
          <p className="text-caption text-fg-muted">Seller info · Verified</p>
        </div>
      </div>
      <div className="mb-4 flex gap-3">
        {[
          { value: store.reviewCount, label: store.reviewCount === 1 ? "Review" : "Reviews" },
          { value: store.productCount, label: store.productCount === 1 ? "Product" : "Products" },
        ].map((s) => (
          <p key={s.label} className="flex-1 rounded-md bg-sunken p-3 text-center font-display text-lg font-extrabold text-fg-strong tabular-nums">
            {s.value} <span className="font-sans text-caption font-semibold text-fg-muted">{s.label}</span>
          </p>
        ))}
      </div>
      <Button asChild className="w-full">
        <Link href={sellerHref(store.slug)}>
          <Store aria-hidden />
          Visit Store
        </Link>
      </Button>
      <Button asChild variant="secondary" className="mt-2.5 w-full">
        <Link href="/account/inbox">
          <Bot aria-hidden />
          Ask AI Support
        </Link>
      </Button>
    </section>
  );
}
