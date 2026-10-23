import { ArrowLeft, PackageSearch } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Unknown slug, or a product that isn't visible (pending, denied, hidden…) — same answer for both. */
export default function ProductNotFound() {
  return (
    <main className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-5 pb-4">
      <div className="flex flex-col items-center gap-3.5 rounded-lg bg-card px-6 py-20 text-center shadow-sm">
        <span className="grid size-19 place-items-center rounded-full bg-iris-50">
          <PackageSearch aria-hidden className="size-9 text-primary" strokeWidth={1.6} />
        </span>
        <h1 className="font-display text-h4 font-bold text-fg-strong">Product not found</h1>
        <p className="max-w-[380px] text-sm text-fg-muted">This product is no longer available or may have been removed by the seller.</p>
        <Button asChild className="mt-1.5">
          <Link href="/">
            <ArrowLeft aria-hidden />
            Continue shopping
          </Link>
        </Button>
      </div>
    </main>
  );
}
