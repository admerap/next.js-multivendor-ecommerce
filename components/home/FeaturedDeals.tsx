import { Package, TicketPercent } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/states/Skeleton";
import { money } from "@/lib/money";
import { discountLabel, LISTING_HREF, productHref, sellerHref, type ProductCardData } from "@/lib/storefront";
import { getFeaturedDeals } from "@/lib/storefront.server";
import { HomeSection, SectionEmpty, SectionHeading } from "./HomeSection";

const gridClass = "grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))]";

/** Compact horizontal deal card (Sundry Home "Featured Deals"): image · −% · title · seller · price. */
function DealCard({ p }: { p: ProductCardData }) {
  return (
    <article className="relative flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm transition-[box-shadow,transform] duration-(--dur-med) ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-md bg-iris-50">
        {p.image ? <Image src={p.image} alt="" fill sizes="80px" className="object-cover" /> : <Package aria-hidden className="size-8 text-iris-400" strokeWidth={1.5} />}
      </span>
      <div className="min-w-0 flex-1">
        {p.discountPercent !== null && (
          <span className="mb-1.5 inline-flex rounded-full bg-error-50 px-2 py-0.5 text-[0.72rem] font-bold text-error-600 tabular-nums">{discountLabel(p.discountPercent)}</span>
        )}
        <h3 className="truncate text-sm leading-[1.3] font-semibold" title={p.name}>
          {/* Stretched link: the whole card opens the product; the seller link sits above it. */}
          <Link href={productHref(p.slug)} className="!text-fg-strong after:absolute after:inset-0 after:content-[''] hover:!text-primary max-lg:flex max-lg:min-h-11 max-lg:items-center">
            <span className="truncate">{p.name}</span>
          </Link>
        </h3>
        <Link href={sellerHref(p.seller.slug)} className="relative z-10 mt-0.5 mb-1.5 inline-flex max-w-full truncate text-[0.69rem] !text-primary hover:underline max-lg:min-h-11 max-lg:items-center">
          {p.seller.name}
        </Link>
        <div className="flex items-baseline gap-2 tabular-nums">
          <span className="font-extrabold text-fg-strong">{money(p.price)}</span>
          {p.compareAt !== null && <s className="text-caption text-fg-compare">{money(p.compareAt)}</s>}
        </div>
      </div>
    </article>
  );
}

/** Featured Deals: products the admin featured that are also discounted. */
export async function FeaturedDeals() {
  const deals = await getFeaturedDeals(8);
  return (
    <HomeSection id="featured-deals">
      <SectionHeading id="featured-deals" eyebrow="Bundle & save" title="Featured Deals" href={deals.length ? LISTING_HREF.deals : undefined} />
      {deals.length ? (
        <ul role="list" className={gridClass}>
          {deals.map((p) => (
            <li key={p.id} className="min-w-0">
              <DealCard p={p} />
            </li>
          ))}
        </ul>
      ) : (
        <SectionEmpty icon={TicketPercent} title="No featured deals right now" text="Featured products that go on sale show up here." />
      )}
    </HomeSection>
  );
}

export function FeaturedDealsSkeleton() {
  return (
    <div role="status" aria-label="Loading featured deals" className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-[clamp(32px,6vw,56px)]">
      <Skeleton className="mb-2 h-3.5 w-24 rounded-sm" />
      <Skeleton className="mb-6 h-8 w-52 rounded-md" />
      <div className={gridClass}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm">
            <Skeleton className="size-20 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-3.5 w-full rounded-sm" />
              <Skeleton className="h-4 w-1/3 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
