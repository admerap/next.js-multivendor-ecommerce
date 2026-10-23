import { BadgeCheck, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/commerce/StarRating";
import { sellerHref, type SellerCardData } from "@/lib/storefront";

/**
 * DESIGN_SYSTEM §5 SellerCard (design system SellerCard): logo tile · name + verified check ·
 * rating + product count · "Visit store". Only APPROVED stores reach the storefront, hence "verified".
 */
export function SellerCard({ seller: s }: { seller: SellerCardData }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-iris-50">
          {s.logo ? <Image src={s.logo} alt="" fill sizes="56px" className="object-cover" /> : <Store aria-hidden className="size-6.5 text-primary" strokeWidth={1.8} />}
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-sm font-bold text-fg-strong" title={s.name}>
            {s.name}
          </h3>
          <BadgeCheck aria-label="Verified seller" className="size-4 shrink-0 fill-primary text-on-primary" strokeWidth={2} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5 text-caption text-fg-muted">
        <StarRating value={s.rating} count={0} />
        <span>
          <b className="text-fg-strong tabular-nums">{s.productCount}</b> {s.productCount === 1 ? "product" : "products"}
        </span>
      </div>
      <Link
        href={sellerHref(s.slug)}
        className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-card text-caption font-semibold !text-fg-strong transition-colors duration-(--dur-fast) hover:border-primary hover:!text-primary max-lg:h-11"
      >
        <Store aria-hidden className="size-4" strokeWidth={2} />
        Visit store
        <span className="sr-only"> {s.name}</span>
      </Link>
    </article>
  );
}
