import { ArrowLeft, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Unknown, inactive or wrongly nested category path — same answer for all. */
export default function CategoryNotFound() {
  return (
    <main className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-6 pb-4">
      <div className="flex flex-col items-center gap-3.5 rounded-lg bg-card px-6 py-20 text-center shadow-sm">
        <span className="grid size-19 place-items-center rounded-full bg-iris-50">
          <LayoutGrid aria-hidden className="size-9 text-primary" strokeWidth={1.6} />
        </span>
        <h1 className="font-display text-h4 font-bold text-fg-strong">Category not found</h1>
        <p className="max-w-[380px] text-sm text-fg-muted">This category doesn&apos;t exist or isn&apos;t available right now. Browse the menu to find what you&apos;re looking for.</p>
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
