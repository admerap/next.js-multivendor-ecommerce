import { Sparkles } from "lucide-react";
import { getFeaturedProducts } from "@/lib/storefront.server";
import { LISTING_HREF } from "@/lib/storefront";
import { HomeSection, ProductGrid, SectionEmpty, SectionHeading } from "./HomeSection";

/** Featured Products: what the admin checked as Featured (Product Manage › Featured Product). */
export async function FeaturedProducts() {
  const products = await getFeaturedProducts(10);
  return (
    <HomeSection id="featured-products">
      <SectionHeading id="featured-products" eyebrow="Handpicked" title="Featured Products" href={products.length ? LISTING_HREF.featured : undefined} />
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <SectionEmpty icon={Sparkles} title="No featured products yet" text="Products our team handpicks will appear here." />
      )}
    </HomeSection>
  );
}
