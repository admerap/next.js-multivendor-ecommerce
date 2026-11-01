import { PackageSearch, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Unknown order number, or someone else's order — same answer for both. */
export default function OrderNotFound() {
  return (
    <main className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-8 pb-4">
      <div className="flex flex-col items-center gap-3.5 rounded-lg bg-card px-6 py-20 text-center shadow-sm">
        <span className="grid size-19 place-items-center rounded-full bg-iris-50">
          <PackageSearch aria-hidden className="size-9 text-primary" strokeWidth={1.6} />
        </span>
        <h1 className="font-display text-h4 font-bold text-fg-strong">Order not found</h1>
        <p className="max-w-[400px] text-sm text-fg-muted">We couldn&apos;t find this order in your account. Check the order number, or sign in with the account you used to place it.</p>
        <Button asChild className="mt-1.5">
          <Link href="/">
            <ShoppingBag aria-hidden />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </main>
  );
}
