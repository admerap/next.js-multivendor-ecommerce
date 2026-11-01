import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/states/Skeleton";
import { sellerHref, type StoreCardData } from "@/lib/storefront";
import { cn } from "@/lib/utils";

/** Store logo, or its initial on iris when the store hasn't uploaded one (never a broken image). */
export function StoreLogo({ logo, name, sizes, className }: { logo: string | null; name: string; sizes: string; className?: string }) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary", className)}>
      {logo ? (
        <Image src={logo} alt="" fill sizes={sizes} className="bg-card object-cover" />
      ) : (
        <span aria-hidden className="font-display font-extrabold text-on-primary uppercase">
          {name.trim().charAt(0) || "S"}
        </span>
      )}
    </span>
  );
}

/** Store cover photo, or a token gradient banner when there's none. */
export function StoreCover({ cover, sizes, priority, className }: { cover: string | null; sizes: string; priority?: boolean; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-linear-120 from-iris-100 via-iris-50 to-card", className)}>
      {cover ? (
        <Image src={cover} alt="" fill priority={priority} sizes={sizes} className="object-cover" />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,var(--iris-200),transparent_55%)] opacity-60" />
      )}
    </div>
  );
}

/**
 * Store card of All Vendors (All Vendor Page design): cover banner, logo ring overlapping it, name,
 * rating + reviews, and the product count bar. The whole card opens the store (one link, one tab stop).
 */
export function StoreCard({ store: s }: { store: StoreCardData }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg bg-card shadow-sm transition-[box-shadow,transform] duration-(--dur-med) ease-out hover:-translate-y-1 hover:shadow-lg">
      <StoreCover cover={s.cover} sizes="(max-width: 720px) 92vw, 360px" className="h-23" />
      <div className="flex items-start gap-3.5 px-5 pb-4.5">
        <span className="relative z-10 -mt-7.5 grid size-18.5 shrink-0 place-items-center rounded-full bg-card shadow-sm">
          <StoreLogo logo={s.logo} name={s.name} sizes="56px" className="size-14 text-[1.4rem]" />
        </span>
        <div className="min-w-0 flex-1 pt-2.5">
          <h3 className="mb-1.5 truncate text-base font-bold text-fg-strong" title={s.name}>
            <Link href={sellerHref(s.slug)} className="!text-fg-strong after:absolute after:inset-0 after:z-20 group-hover:!text-primary focus-visible:outline-none">
              {s.name}
            </Link>
          </h3>
          <p className="flex flex-wrap items-center gap-1.5 text-[0.81rem] text-fg-muted">
            <b className="text-fg-strong tabular-nums">{s.rating.toFixed(1)}</b>
            <Star aria-hidden className="size-3.5 fill-current text-rating" strokeWidth={1.5} />
            Rating
            <span aria-hidden className="mx-0.5 h-3 w-px bg-line-default" />
            <b className="text-fg-strong tabular-nums">{s.reviewCount}</b> {s.reviewCount === 1 ? "Review" : "Reviews"}
          </p>
        </div>
      </div>
      {/* Action bar (visual only — the stretched link on the name opens the store): count + "Visit Store →". */}
      <div className="mt-auto flex min-h-12 items-center justify-between gap-3 bg-sunken px-5 py-3 text-sm transition-colors duration-(--dur-fast) group-hover:bg-primary group-has-[a:focus-visible]:bg-primary">
        <span className="text-fg-muted transition-colors duration-(--dur-fast) group-hover:text-on-primary group-has-[a:focus-visible]:text-on-primary">
          <b className="font-bold text-fg-strong tabular-nums transition-colors duration-(--dur-fast) group-hover:text-on-primary group-has-[a:focus-visible]:text-on-primary">{s.productCount}</b> {s.productCount === 1 ? "Product" : "Products"}
        </span>
        <span aria-hidden className="inline-flex items-center gap-1 font-semibold text-primary transition-colors duration-(--dur-fast) group-hover:text-on-primary group-has-[a:focus-visible]:text-on-primary">
          Visit Store
          <ArrowRight className="size-4 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5" strokeWidth={2.2} />
        </span>
      </div>
      {/* The stretched link above covers the card; show its focus ring on the whole card. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-lg group-has-[a:focus-visible]:outline-2 group-has-[a:focus-visible]:outline-offset-2 group-has-[a:focus-visible]:outline-primary" />
    </article>
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-sm">
      <Skeleton className="h-23 w-full rounded-none" />
      <div className="flex items-start gap-3.5 px-5 pb-4.5">
        <Skeleton className="relative -mt-7.5 size-18.5 shrink-0 rounded-full border-4 border-card" />
        <div className="flex flex-1 flex-col gap-2 pt-3">
          <Skeleton className="h-3.5 w-[70%] rounded-sm" />
          <Skeleton className="h-3 w-1/2 rounded-sm" />
        </div>
      </div>
      <div className="h-12 bg-sunken" />
    </div>
  );
}

/** The design's store grid: ~300px columns, one per row on phones. */
export const storeGridClass = "grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5";
