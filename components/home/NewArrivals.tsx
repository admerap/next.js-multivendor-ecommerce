import { Sparkles } from "lucide-react";
import { LISTING_HREF } from "@/lib/storefront";
import { getNewArrivals } from "@/lib/storefront.server";
import { HomeSection, ProductGrid, SectionEmpty, SectionHeading } from "./HomeSection";

/** New Arrivals: products added in the last 30 days. */
export async function NewArrivals() {
  const products = await getNewArrivals(12);
  return (
    <HomeSection id="new-arrivals">
      <SectionHeading id="new-arrivals" eyebrow="Just landed" title="New Arrivals" href={products.length ? LISTING_HREF.newArrivals : undefined} />
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <SectionEmpty icon={Sparkles} title="Nothing new this month" text="Products added in the last 30 days show up here." />
      )}
    </HomeSection>
  );
}
