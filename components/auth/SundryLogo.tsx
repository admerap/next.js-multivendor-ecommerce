import Link from "next/link";
import { LogoMark } from "@/components/shell/LogoMark";

/** Wordmark + logomark. `eyebrow` renders the small caps line under the name (e.g. "Seller Center"). */
export function SundryLogo({ eyebrow, href = "/" }: { eyebrow?: string; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 no-underline max-lg:min-h-11" aria-label="Sundry home">
      <LogoMark priority className="size-10" />
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
