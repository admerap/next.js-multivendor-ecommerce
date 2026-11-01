import { ArrowLeft, Store } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Unknown slug, or a store that isn't approved (pending / suspended) — same answer for both. */
export default function StoreNotFound() {
  return (
    <main className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-6 pb-4">
      <div className="flex flex-col items-center gap-3.5 rounded-lg bg-card px-6 py-20 text-center shadow-sm">
        <span className="grid size-19 place-items-center rounded-full bg-iris-50">
          <Store aria-hidden className="size-9 text-primary" strokeWidth={1.6} />
        </span>
        <h1 className="font-display text-h4 font-bold text-fg-strong">Store not found</h1>
        <p className="max-w-[380px] text-sm text-fg-muted">This store isn&apos;t available right now. It may have closed or the link may be wrong.</p>
        <Button asChild className="mt-1.5">
          <Link href="/vendors">
            <ArrowLeft aria-hidden />
            Browse all stores
          </Link>
        </Button>
      </div>
    </main>
  );
}
