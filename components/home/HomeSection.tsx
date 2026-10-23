import { ArrowRight, PackageSearch, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/commerce/ProductCard";
import { Skeleton } from "@/components/states/Skeleton";
import type { ProductCardData } from "@/lib/storefront";
import { cn } from "@/lib/utils";

/** One home section: container + anchor id (header/footer links jump here) + the design's spacing. */
export function HomeSection({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("mx-auto w-full max-w-[var(--container-max)] scroll-mt-40 px-[var(--container-pad)] pt-[clamp(32px,6vw,56px)]", className)}>
      {children}
    </section>
  );
}

/** Eyebrow (13px iris caps) + H2 + "View all →" on the right (Sundry Home design). */
export function SectionHeading({ id, eyebrow, title, href, linkLabel = "View all" }: { id: string; eyebrow: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <span className="text-[0.81rem] font-bold tracking-[0.08em] text-primary uppercase">{eyebrow}</span>
        <h2 id={`${id}-title`} className="mt-1.5 font-display text-[clamp(22px,3.2vw,30px)] font-extrabold tracking-[-0.02em] text-fg-strong">
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href} className="group inline-flex items-center gap-1 text-sm font-semibold !text-fg-muted hover:!text-primary max-lg:min-h-11">
          {linkLabel}
          <ArrowRight aria-hidden className="size-4 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5" strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}

/** The design's card grid: ~200px columns, 2 per row on phones. auto-fill (not auto-fit) so a thin
 * section keeps normal-size cards instead of stretching one card across the row. */
export const productGridClass = "grid gap-[clamp(12px,2vw,20px)] grid-cols-[repeat(auto-fill,minmax(min(200px,calc(50%_-_10px)),1fr))]";

/** Product cards in the design's grid. */
export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul role="list" className={productGridClass}>
      {products.map((p) => (
        <li key={p.id} className="min-w-0">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

/** A section with nothing to show yet (thin catalog) — never an error. */
export function SectionEmpty({ icon: Icon = PackageSearch, title, text, tone = "light" }: { icon?: LucideIcon; title: string; text: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-lg px-6 py-10 text-center", tone === "dark" ? "bg-on-primary/10" : "bg-card shadow-xs")}>
      <Icon aria-hidden className={cn("size-8", tone === "dark" ? "text-iris-100" : "text-fg-subtle")} strokeWidth={1.6} />
      <p className={cn("text-sm font-bold", tone === "dark" ? "text-on-primary" : "text-fg-strong")}>{title}</p>
      <p className={cn("max-w-90 text-caption", tone === "dark" ? "text-iris-100" : "text-fg-muted")}>{text}</p>
    </div>
  );
}

/** Loading state of a product section (streamed with Suspense). */
export function ProductGridSkeleton({ count = 5, label }: { count?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-[clamp(32px,6vw,56px)]">
      <Skeleton className="mb-2 h-3.5 w-24 rounded-sm" />
      <Skeleton className="mb-6 h-8 w-64 rounded-md" />
      <div className={productGridClass}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-lg bg-card shadow-sm">
            <Skeleton className="aspect-square w-full" />
            <div className="flex flex-col gap-2 p-3.5">
              <Skeleton className="h-3 w-1/3 rounded-sm" />
              <Skeleton className="h-3.5 w-full rounded-sm" />
              <Skeleton className="h-3.5 w-2/3 rounded-sm" />
              <Skeleton className="mt-2 h-5 w-1/3 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
