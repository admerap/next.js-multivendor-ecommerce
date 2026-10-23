import { categoryHref } from "@/lib/catalog";
import { getProductsByCategory } from "@/lib/storefront.server";
import { HomeSection, ProductGrid, SectionEmpty, SectionHeading } from "./HomeSection";

/**
 * The 5 category rails of the home page, in order (matched by category SLUG, so renaming a category in
 * the admin keeps working). A slug that doesn't exist (or is inactive) simply renders no rail.
 * Note: the furniture category's slug is "forniture" in the data.
 */
const HOME_RAILS = ["fashion", "mobile", "electronics", "beauty", "forniture"] as const;

type Rail = NonNullable<Awaited<ReturnType<typeof getProductsByCategory>>>;

function CategoryRail({ rail }: { rail: Rail }) {
  const id = `rail-${rail.category.slug}`;
  return (
    <HomeSection id={id}>
      <SectionHeading id={id} eyebrow="Shop the category" title={rail.category.name} href={categoryHref(rail.category.slug)} />
      {rail.products.length ? (
        <ProductGrid products={rail.products} />
      ) : (
        <SectionEmpty title={`No ${rail.category.name} products yet`} text="Products from our sellers in this category will appear here soon." />
      )}
    </HomeSection>
  );
}

// One async component loads every rail in parallel; the rails themselves are plain components. Sibling
// async server components that may return null trip React DevTools' tree reconciliation (console error).
export async function CategoryRails() {
  const rails = (await Promise.all(HOME_RAILS.map((slug) => getProductsByCategory(slug, 10)))).filter((r): r is Rail => r !== null);
  return (
    <>
      {rails.map((rail) => (
        <CategoryRail key={rail.category.slug} rail={rail} />
      ))}
    </>
  );
}
