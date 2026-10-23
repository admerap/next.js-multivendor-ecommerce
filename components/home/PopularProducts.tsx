import { getBestSelling, getTopRated, getTrending } from "@/lib/storefront.server";
import { HomeSection } from "./HomeSection";
import { PopularTabs } from "./PopularTabs";

/**
 * "Popular right now" (Sundry Home design): Best Selling · Top Rated · Trending tabs. Best Selling and
 * Top Rated use documented proxies until orders/reviews exist (see lib/storefront.server.ts).
 * Anchors: #best-selling (the section) and #top-rated (opens that tab).
 */
export async function PopularProducts() {
  const [best, rated, trend] = await Promise.all([getBestSelling(10), getTopRated(10), getTrending(10)]);
  return (
    <HomeSection id="best-selling">
      <span id="top-rated" className="block scroll-mt-40" aria-hidden />
      <PopularTabs
        tabs={[
          { key: "best", label: "Best Selling", products: best, empty: "Our best sellers will show up here." },
          { key: "rated", label: "Top Rated", products: rated, empty: "The highest-rated products will show up here." },
          { key: "trend", label: "Trending", products: trend, empty: "Products our team marks as popular will show up here." },
        ]}
      />
    </HomeSection>
  );
}
