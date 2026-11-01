import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Sundry logomark (public/images/logo/logo.svg — the brand's own asset). Size it with a `size-*`
 * class; the wordmark ("Sundry") is set next to it in text by each caller. Decorative: the link around
 * it carries the accessible name.
 */
export function LogoMark({ className, priority }: { className?: string; priority?: boolean }) {
  return <Image src="/images/logo/logo.svg" alt="" width={40} height={40} priority={priority} unoptimized className={cn("size-10 shrink-0 select-none", className)} />;
}
