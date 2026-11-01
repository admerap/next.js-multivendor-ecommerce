import { Home, Search, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/commerce/ProductCard";
import { StoreLogo } from "@/components/commerce/StoreCard";
import { pageContainer } from "@/components/commerce/StorefrontBits";
import { LogoMark } from "@/components/shell/LogoMark";
import { GoBackButton, RequestedPath } from "@/components/states/NotFoundBits";
import { Skeleton } from "@/components/states/Skeleton";
import { Button } from "@/components/ui/button";
import { sellerHref, type ProductCardData, type SellerCardData } from "@/lib/storefront";
import { getLatestProducts, getTopSellers, getTrending } from "@/lib/storefront.server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/**
 * Global 404 (any URL that matches no route). Self-contained — it renders outside the storefront layout —
 * so it brings its own slim header: logomark + a way back. Every link on it goes somewhere that exists.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="border-b border-line bg-card">
        <div className={cn(pageContainer, "flex h-17 items-center justify-between gap-4")}>
          <Link href="/" aria-label="Sundry home" className="flex min-h-11 items-center gap-2.5">
            <LogoMark priority className="size-9.5" />
            <span className="font-display text-[1.5rem] font-extrabold tracking-[-0.02em] text-fg-strong">Sundry</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            <Link href="/" className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold !text-fg hover:bg-hover hover:!text-primary">
              Home
            </Link>
            <Link href="/vendors" className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold !text-fg hover:bg-hover hover:!text-primary">
              All Vendors
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section aria-labelledby="nf-title" className="relative overflow-hidden">
          {/* Decorative glow behind the 404 */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-[-20%] left-1/2 size-[min(900px,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--iris-100),transparent_62%)] opacity-70" />
            <div className="absolute right-[8%] bottom-[10%] size-60 rounded-full bg-[radial-gradient(circle,var(--saffron-100),transparent_65%)] opacity-70" />
          </div>

          <div className={cn(pageContainer, "relative flex flex-col items-center py-[clamp(40px,8vw,88px)] text-center")}>
            <p className="mb-4 rounded-full bg-iris-50 px-3 py-1 text-caption font-bold tracking-[0.08em] text-primary uppercase">Error 404</p>

            {/* "4 [logo] 4" — the logomark is the zero. */}
            <div aria-hidden className="flex items-center justify-center gap-[0.06em] font-display text-[clamp(5.5rem,20vw,11rem)] leading-none font-extrabold tracking-[-0.04em] select-none">
              <span className="bg-linear-to-b from-fg-strong to-iris-400 bg-clip-text text-transparent">4</span>
              <span className="relative grid size-[0.86em] place-items-center">
                <span className="absolute inset-[6%] rounded-[28%] bg-saffron-400/30 blur-2xl" />
                <LogoMark priority className="relative size-[0.78em] animate-[float_5s_ease-in-out_infinite] drop-shadow-xl" />
              </span>
              <span className="bg-linear-to-b from-fg-strong to-iris-400 bg-clip-text text-transparent">4</span>
            </div>

            <h1 id="nf-title" className="mt-6 font-display text-[clamp(1.6rem,4vw,2.25rem)] font-extrabold tracking-[-0.02em] text-balance text-fg-strong">
              This page wandered off the shelf
            </h1>
            <p className="mt-3 max-w-120 text-[0.97rem] leading-relaxed text-pretty text-fg-muted">
              The link may be broken, or the page may have moved. Let&apos;s get you back to the stores you love.
            </p>
            <div className="mt-4">
              <RequestedPath />
            </div>

            <form action="/vendors" role="search" className="mt-7 flex h-13 w-full max-w-115 items-center rounded-full bg-card px-1.5 shadow-md focus-within:outline-2 focus-within:outline-primary">
              <Search aria-hidden className="ml-3 size-4.5 shrink-0 text-fg-muted" strokeWidth={2} />
              <input type="search" name="q" placeholder="Search for a store…" aria-label="Search stores" maxLength={100} className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-fg-strong outline-none placeholder:text-fg-subtle" />
              <button type="submit" className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition-colors duration-(--dur-fast) hover:bg-primary-hover max-lg:h-11">
                <Search aria-hidden className="size-4 sm:hidden" strokeWidth={2} />
                <span className="max-sm:sr-only">Search</span>
              </button>
            </form>

            <div className="mt-6 flex w-full max-w-115 flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              <Button asChild size="lg">
                <Link href="/">
                  <Home aria-hidden />
                  Back to home
                </Link>
              </Button>
              <Button asChild variant="accent" size="lg">
                <Link href="/vendors">
                  <Store aria-hidden />
                  Browse all stores
                </Link>
              </Button>
              <GoBackButton />
            </div>
          </div>
        </section>

        <Suspense fallback={<SuggestionsSkeleton />}>
          <Suggestions />
        </Suspense>
      </main>

      <footer className="mt-12 border-t border-line bg-card">
        <p className={cn(pageContainer, "py-5 text-center text-caption text-fg-muted")}>© 2026 Sundry Marketplace. All rights reserved.</p>
      </footer>
    </div>
  );
}

/** Real things to go to instead: popular products and the top stores. A failing query just hides them. */
async function Suggestions() {
  let products: ProductCardData[];
  let stores: SellerCardData[];
  try {
    [products, stores] = await Promise.all([getTrending(4), getTopSellers(6)]);
    if (products.length < 4) {
      const have = new Set(products.map((p) => p.id));
      products = [...products, ...(await getLatestProducts(8)).filter((p) => !have.has(p.id))].slice(0, 4);
    }
  } catch (error) {
    console.error("[404] suggestions failed", error instanceof Error ? error.message : error);
    return null;
  }
  if (products.length === 0 && stores.length === 0) return null;

  return (
    <div className={cn(pageContainer, "flex flex-col gap-10")}>
      {stores.length > 0 && (
        <section aria-labelledby="nf-stores">
          <h2 id="nf-stores" className="mb-4 text-center text-[0.81rem] font-bold tracking-[0.08em] text-fg-muted uppercase">
            Popular stores
          </h2>
          <ul role="list" className="flex flex-wrap justify-center gap-3">
            {stores.map((s) => (
              <li key={s.id}>
                <Link
                  href={sellerHref(s.slug)}
                  className="group flex min-h-11 items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pr-4 pl-1.5 shadow-xs transition-[border-color,box-shadow,transform] duration-(--dur-fast) hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                >
                  <StoreLogo logo={s.logo} name={s.name} sizes="32px" className="size-8 text-sm" />
                  <span className="text-sm font-semibold text-fg-strong group-hover:text-primary">{s.name}</span>
                  <span className="text-caption text-fg-muted tabular-nums">{s.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {products.length > 0 && (
        <section aria-labelledby="nf-products">
          <h2 id="nf-products" className="mb-5 text-center font-display text-[clamp(1.3rem,3vw,1.6rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            Popular right now
          </h2>
          <ul role="list" className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,calc(50%_-_10px)),1fr))] gap-[clamp(12px,2vw,20px)]">
            {products.map((p) => (
              <li key={p.id} className="min-w-0">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SuggestionsSkeleton() {
  return (
    <div role="status" aria-label="Loading suggestions" className={cn(pageContainer, "flex flex-col items-center gap-6")}>
      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-36 rounded-full" />
        ))}
      </div>
      <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(min(220px,calc(50%_-_10px)),1fr))] gap-[clamp(12px,2vw,20px)]">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
