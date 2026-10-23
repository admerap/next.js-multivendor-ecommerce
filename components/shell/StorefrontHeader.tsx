import { auth } from "@/auth";
import { homeFor } from "@/lib/auth-routes";
import { getCategoryTree } from "@/lib/catalog.server";
import { StorefrontHeaderBar } from "./StorefrontHeaderBar";

/** Storefront header (utility bar · search row · category nav) from the storefront designs; the menus get the real category tree. */
export async function StorefrontHeader() {
  const [session, categories] = await Promise.all([auth(), getCategoryTree()]);
  const u = session?.user;

  return (
    <StorefrontHeaderBar
      categories={categories}
      user={
        u
          ? {
              name: u.name ?? "",
              email: u.email ?? "",
              home: homeFor(u.role, u.vendorStatus),
              isCustomer: u.role === "CUSTOMER",
            }
          : null
      }
    />
  );
}
