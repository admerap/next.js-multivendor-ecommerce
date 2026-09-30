import { auth } from "@/auth";
import { homeFor } from "@/lib/auth-routes";
import { StorefrontHeaderBar } from "./StorefrontHeaderBar";

/** Storefront header (utility bar · search row · category nav) from the storefront designs. */
export async function StorefrontHeader() {
  const session = await auth();
  const u = session?.user;

  return (
    <StorefrontHeaderBar
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
