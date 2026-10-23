import { Store } from "lucide-react";
import { SellerCard } from "@/components/commerce/SellerCard";
import { LISTING_HREF } from "@/lib/storefront";
import { getTopSellers } from "@/lib/storefront.server";
import { HomeSection, SectionEmpty, SectionHeading } from "./HomeSection";

/** Top Sellers (proxy ranking until orders exist — see getTopSellers). */
export async function TopSellers() {
  const sellers = await getTopSellers(4);
  return (
    <HomeSection id="top-sellers">
      <SectionHeading id="top-sellers" eyebrow="Trusted shops" title="Top Sellers" href={LISTING_HREF.vendors} linkLabel="All vendors" />
      {sellers.length ? (
        <ul role="list" className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))]">
          {sellers.map((s) => (
            <li key={s.id} className="min-w-0">
              <SellerCard seller={s} />
            </li>
          ))}
        </ul>
      ) : (
        <SectionEmpty icon={Store} title="No sellers yet" text="Stores appear here once their first products are live." />
      )}
    </HomeSection>
  );
}
