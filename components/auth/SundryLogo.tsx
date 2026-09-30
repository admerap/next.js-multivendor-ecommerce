import { ShoppingBag } from "lucide-react";
import Link from "next/link";

/** Wordmark + Iris logomark. `eyebrow` renders the small caps line under the name (e.g. "Seller Center"). */
export function SundryLogo({ eyebrow, href = "/" }: { eyebrow?: string; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 no-underline" aria-label="Sundry home">
      <span className="grid size-10 place-items-center rounded-md bg-primary shadow-primary">
        <ShoppingBag aria-hidden className="size-[22px] text-on-primary" strokeWidth={2} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.625rem] font-extrabold tracking-[-0.02em] text-fg-strong">
          Sundry
        </span>
        {eyebrow && (
          <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-primary">
            {eyebrow}
          </span>
        )}
      </span>
    </Link>
  );
}
