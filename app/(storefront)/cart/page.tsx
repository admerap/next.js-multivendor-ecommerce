import { permanentRedirect } from "next/navigation";

/** The cart is step 1 of checkout (/checkout) — old /cart links land there. */
export default function CartPage() {
  permanentRedirect("/checkout");
}
