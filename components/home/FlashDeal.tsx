import { Zap } from "lucide-react";
import { ProductCard } from "@/components/commerce/ProductCard";
import { getFlashDeals } from "@/lib/storefront.server";
import { FlashCountdown } from "./FlashCountdown";
import { productGridClass, SectionEmpty } from "./HomeSection";

/** Flash Deal (Sundry Home design): iris panel, live countdown, real discounted products. */
export async function FlashDeal() {
  const { products, endsAt } = await getFlashDeals(10);
  return (
    <section id="flash-deal" aria-labelledby="flash-deal-title" className="mx-auto w-full max-w-[var(--container-max)] scroll-mt-40 px-[var(--container-pad)] pt-[clamp(28px,5vw,40px)]">
      <div className="rounded-xl bg-linear-120 from-iris-600 to-iris-800 p-[clamp(20px,3vw,32px)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-on-primary/15">
              <Zap aria-hidden className="size-6 fill-accent text-accent" strokeWidth={1.8} />
            </span>
            <div>
              <h2 id="flash-deal-title" className="font-display text-[clamp(1.5rem,2.5vw,2rem)] font-extrabold tracking-[-0.02em] text-on-primary">
                Flash Deal
              </h2>
              <p className="mt-0.5 text-sm text-iris-100">Limited stock. When it&apos;s gone, it&apos;s gone.</p>
            </div>
          </div>
          {products.length > 0 && <FlashCountdown endsAt={endsAt} />}
        </div>
        {products.length > 0 ? (
          <ul role="list" className={productGridClass}>
            {products.map((p) => (
              <li key={p.id} className="min-w-0">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        ) : (
          <SectionEmpty tone="dark" title="No flash deals right now" text="Discounted products from our sellers show up here. Check back soon." />
        )}
      </div>
    </section>
  );
}
