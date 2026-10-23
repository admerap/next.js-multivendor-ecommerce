/**
 * Storefront shapes + pure helpers (client-safe). Queries live in lib/storefront.server.ts.
 * Money is integer cents everywhere (CLAUDE.md §6); format with money().
 */

/** Free-shipping threshold (header promo, MiniCart progress bar, trust badges): $75. */
export const FREE_SHIPPING_CENTS = 75_00;

/** What every product card needs — nothing more. */
export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  /** cents — what the shopper pays (after the product's own discount) */
  price: number;
  /** cents — crossed-out "was" price, or null when there's no reduction */
  compareAt: number | null;
  /** whole percent off (rounded), or null */
  discountPercent: number | null;
  /** Marketplace rule: every card shows its seller. */
  seller: { id: string; name: string; slug: string };
  /** TODO(reviews): real average + count once the Review model exists; 0 / 0 renders "no reviews yet". */
  rating: number;
  reviewCount: number;
  inStock: boolean;
  /** Units available (the cart's max quantity); null = no limit (digital). With variations it's the total. */
  stock: number | null;
  /** Has variations → the card opens quick view to pick one instead of adding directly. */
  hasVariations: boolean;
};

export type CategoryCardData = { name: string; slug: string; image: string | null; productCount: number };
export type BrandCardData = { name: string; slug: string; image: string | null; productCount: number };
export type SellerCardData = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  cover: string | null;
  productCount: number;
  /** TODO(reviews): store rating once reviews exist. */
  rating: number;
};

/** price / compareAt in cents, after the product's own discount (same rules as the card). */
export type QuickViewVariation = { id: string; name: string; attributes: Record<string, string>; price: number; compareAt: number | null; stock: number; image: string | null };
export type QuickViewProduct = ProductCardData & {
  images: string[];
  shortDescription: string | null;
  categoryPath: { name: string; href: string }[];
  brand: string | null;
  sku: string;
  /** DIGITAL products have no stock count (always available). */
  digital: boolean;
  minOrderQty: number;
  /** [{ name: "Color", values: ["Red", "Blue"] }] — drives the variant pickers */
  options: { name: string; values: string[] }[];
  variations: QuickViewVariation[];
};

/** Product details page (/product/[slug]): the quick-view data plus the long-form content and SEO. */
export type ProductPageData = QuickViewProduct & {
  /** Sanitized rich-text HTML (lib/rich-text.server) — safe to render. */
  descriptionHtml: string;
  unit: "PC" | "KG" | "G" | "BOX" | "PAIR";
  videoUrl: string | null;
  tags: string[];
  /** <title> / meta description / og:image, with fallbacks (name, short description, description text). */
  meta: { title: string; description: string; image: string | null };
  /** Where it sits in the catalog — drives Similar Products (most specific level first). */
  catalog: { categoryId: string; subCategoryId: string | null; subSubCategoryId: string | null };
};

/** Seller card on the product page. The store is always APPROVED here (VISIBLE requires it) → "Verified". */
export type StoreSummary = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  /** Products this store currently shows on the storefront (VISIBLE only). */
  productCount: number;
  /** TODO(reviews): store rating / review count once the Review model exists. */
  rating: number;
  reviewCount: number;
};

export type ProductReview = { id: string; author: string; avatar: string | null; rating: number; createdAt: string; body: string; photos: string[] };
/** Reviews tab: average (0–5), total, count per star (5 → 1) and the reviews themselves. */
export type ReviewSummary = { average: number; count: number; distribution: { stars: number; count: number }[]; reviews: ProductReview[] };

type PriceInput ={ price: number; compareAtPrice: number | null; discountType: "FLAT" | "PERCENT"; discountValue: number };

/**
 * Shopper-facing price of a product (integer math only):
 * - a product discount (FLAT cents / PERCENT) lowers `price`, and `price` becomes the crossed-out value;
 * - otherwise a vendor compare-at price above `price` is shown crossed out.
 */
export function productPricing(p: PriceInput): { price: number; compareAt: number | null; discountPercent: number | null } {
  const off = p.discountType === "PERCENT" ? Math.round((p.price * p.discountValue) / 100) : p.discountValue;
  if (off > 0) {
    const final = Math.max(0, p.price - off);
    return { price: final, compareAt: p.price, discountPercent: p.price > 0 ? Math.round((off * 100) / p.price) : null };
  }
  if (p.compareAtPrice && p.compareAtPrice > p.price) {
    return { price: p.price, compareAt: p.compareAtPrice, discountPercent: Math.round(((p.compareAtPrice - p.price) * 100) / p.compareAtPrice) };
  }
  return { price: p.price, compareAt: null, discountPercent: null };
}

/** "−35%" with a true minus (CLAUDE.md §6). */
export const discountLabel = (percent: number) => `−${percent}%`;

/** Product details link (CLAUDE.md §5 `/product/[slug]`). */
export const productHref = (slug: string) => `/product/${slug}`;
/** Seller store link (CLAUDE.md §5 `/vendors/[slug]`). */
export const sellerHref = (slug: string) => `/vendors/${slug}`;
/** Brand filter link (listing built later). */
export const brandHref = (slug: string) => `/search?brand=${slug}`;

/** "View all" targets of the home sections — one search/listing page, built later (links only for now). */
export const LISTING_HREF = {
  featured: "/search?featured=true",
  deals: "/search?deals=true",
  latest: "/search?sort=newest",
  newArrivals: "/search?new=true",
  bestSelling: "/search?sort=best-selling",
  topRated: "/search?sort=top-rated",
  vendors: "/vendors",
} as const;
