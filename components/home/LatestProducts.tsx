import { ArrowRight, Eye, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { money } from "@/lib/money";
import { discountLabel, LISTING_HREF, productHref, sellerHref, type ProductCardData } from "@/lib/storefront";
import { getFlashDeals, getLatestProducts } from "@/lib/storefront.server";
import { HomeSection, SectionEmpty } from "./HomeSection";

/** "View product" veil over an image (hover on desktop; the image itself is the link on touch). */
function ViewVeil({ p }: { p: ProductCardData }) {
  return (
    <Link href={productHref(p.slug)} aria-label={`View ${p.name}`} className="absolute inset-0 z-10 flex items-center justify-center bg-inverse/45 opacity-0 transition-opacity duration-(--dur-med) group-hover:opacity-100 focus-visible:opacity-100 max-lg:bg-transparent max-lg:opacity-100">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-[0.81rem] font-bold text-fg-strong shadow-md max-lg:hidden">
        <Eye aria-hidden className="size-4" strokeWidth={2} />
        View product
      </span>
    </Link>
  );
}

function Pic({ p, sizes }: { p: ProductCardData; sizes: string }) {
  return p.image ? <Image src={p.image} alt="" fill sizes={sizes} className="object-cover" /> : <Package aria-hidden className="size-12 text-iris-400" strokeWidth={1.5} />;
}

/** Deal of the Day: the biggest live reduction (same pool as Flash Deal). */
function DealOfTheDay({ p }: { p: ProductCardData }) {
  return (
    <div className="min-w-0 flex-[1_1_280px] rounded-lg border border-iris-200 bg-iris-50 p-5">
      <h3 className="mb-4 text-center text-sm font-extrabold tracking-[0.08em] text-primary uppercase">Deal of the Day</h3>
      <div className="flex flex-col rounded-lg bg-card p-5 shadow-sm">
        <div className="group relative mb-4 grid aspect-square place-items-center overflow-hidden rounded-md bg-iris-50">
          {p.discountPercent !== null && (
            <span className="absolute top-3 left-3 z-20 rounded-sm bg-primary px-2 py-0.5 text-[0.72rem] font-bold text-on-primary tabular-nums">{discountLabel(p.discountPercent)}</span>
          )}
          <Pic p={p} sizes="(max-width: 720px) 90vw, 360px" />
          <ViewVeil p={p} />
        </div>
        <h4 className="mb-1 text-center text-base leading-[1.35] font-bold text-pretty">
          <Link href={productHref(p.slug)} className="!text-fg-strong hover:!text-primary max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
            {p.name}
          </Link>
        </h4>
        <Link href={sellerHref(p.seller.slug)} className="mb-2.5 self-center text-[0.75rem] font-semibold !text-primary hover:underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
          {p.seller.name}
        </Link>
        <div className="mb-4 flex items-baseline justify-center gap-2 tabular-nums">
          {p.compareAt !== null && <s className="text-sm text-fg-compare">{money(p.compareAt)}</s>}
          <span className="text-[1.25rem] font-extrabold text-fg-strong">{money(p.price)}</span>
        </div>
        <AddToCartButton product={p} variant="block" label="Grab This Deal" />
      </div>
    </div>
  );
}

/** Compact "latest" card from the design, plus the seller (marketplace rule). */
function LatestCard({ p }: { p: ProductCardData }) {
  return (
    <article className="flex h-full flex-col rounded-lg bg-card p-4 shadow-sm transition-[box-shadow,transform] duration-(--dur-med) ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="group relative mb-3.5 grid aspect-square place-items-center overflow-hidden rounded-md bg-iris-50">
        <Pic p={p} sizes="(max-width: 720px) 45vw, 200px" />
        <ViewVeil p={p} />
      </div>
      <h4 className="mb-1 text-center text-sm leading-[1.35] font-semibold text-pretty">
        <Link href={productHref(p.slug)} className="line-clamp-2 !text-fg-strong hover:!text-primary max-lg:min-h-11" title={p.name}>
          {p.name}
        </Link>
      </h4>
      <Link href={sellerHref(p.seller.slug)} className="mb-1.5 self-center truncate text-[0.69rem] font-semibold !text-primary hover:underline max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">
        {p.seller.name}
      </Link>
      <span className="mt-auto text-center text-[0.94rem] font-extrabold text-fg-strong tabular-nums">{money(p.price)}</span>
    </article>
  );
}

/** Deal of the Day (left) + Latest Products (right, scrollable) — Sundry Home design. */
export async function LatestProducts() {
  const [{ products: deals }, latest] = await Promise.all([getFlashDeals(1), getLatestProducts(12)]);
  const deal = deals[0];
  return (
    <HomeSection id="latest-products">
      <div className="flex flex-wrap gap-6">
        {deal && <DealOfTheDay p={deal} />}
        <div className="min-w-0 flex-[2_1_480px]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="latest-products-title" className="font-display text-[1.25rem] font-bold text-fg-strong">
              Latest Products
            </h2>
            {latest.length > 0 && (
              <Link href={LISTING_HREF.latest} className="group inline-flex items-center gap-1 text-sm font-semibold !text-fg-muted hover:!text-primary max-lg:min-h-11">
                View all
                <ArrowRight aria-hidden className="size-4 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5" strokeWidth={2} />
              </Link>
            )}
          </div>
          {latest.length ? (
            <ul
              role="list"
              tabIndex={0}
              aria-label="Latest products (scrollable)"
              className="grid max-h-140 gap-[clamp(10px,2vw,16px)] overflow-y-auto overscroll-contain pt-1 pr-2 pb-2 grid-cols-[repeat(auto-fill,minmax(min(170px,calc(50%_-_8px)),1fr))] focus-visible:outline-2 focus-visible:outline-primary"
            >
              {latest.map((p) => (
                <li key={p.id} className="min-w-0">
                  <LatestCard p={p} />
                </li>
              ))}
            </ul>
          ) : (
            <SectionEmpty title="No products yet" text="New products from our sellers will appear here." />
          )}
        </div>
      </div>
    </HomeSection>
  );
}
