import type { Metadata } from "next";
import { AccountCard } from "@/components/account/AccountCard";
import { WishlistView, type WishlistRow } from "@/components/account/WishlistView";
import { requireArea } from "@/lib/auth-guard";
import { getWishlist } from "@/lib/wishlist.server";

export const metadata: Metadata = { title: "Wishlist" };

/** Wish List (userwishlist design): the signed-in customer's own saved products — nobody else's. */
export default async function WishlistPage() {
  const user = await requireArea("CUSTOMER");
  const entries = await getWishlist(user.id);
  const rows: WishlistRow[] = entries.map((e) =>
    e.available ? { available: true, product: e.product, brand: e.brand } : { available: false, id: e.id, name: e.name, image: e.image, sellerName: e.sellerName },
  );
  return (
    <AccountCard>
      <WishlistView rows={rows} />
    </AccountCard>
  );
}
