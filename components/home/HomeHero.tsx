import { ArrowRight, Sparkles, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { CategoryNode } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { HeroCategoryMenu } from "./HeroCategoryMenu";

/**
 * Hero banner art: the design's image slot has no campaign photo yet, so it shows a mosaic of the
 * real category images (TODO(hero): replace with a managed hero banner image when one exists).
 */
function HeroArt({ tree }: { tree: CategoryNode[] }) {
  const pics = tree.filter((c) => c.image).slice(0, 4);
  if (pics.length === 0) return null;
  return (
    <div
      aria-hidden
      className={cn(
        "grid gap-2 overflow-hidden rounded-lg shadow-lg",
        "relative mx-[clamp(20px,4vw,32px)] mt-[clamp(20px,4vw,32px)] h-[clamp(180px,32vw,260px)]",
        "xl:absolute xl:inset-y-8 xl:right-8 xl:m-0 xl:h-auto xl:w-[42%] xl:min-w-70",
        pics.length > 1 && "grid-cols-2",
      )}
    >
      {pics.map((c) => (
        <div key={c.slug} className="relative min-h-0 bg-iris-800">
          <Image src={c.image!} alt="" fill sizes="(max-width: 1200px) 50vw, 300px" className="object-cover" />
        </div>
      ))}
    </div>
  );
}

/** Home hero (Sundry Home design): category menu + banner with the campaign copy and CTAs. */
export function HomeHero({ tree }: { tree: CategoryNode[] }) {
  return (
    <section className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-7">
      <HeroCategoryMenu tree={tree}>
        <div className="relative flex h-full min-h-110 flex-col overflow-hidden rounded-xl bg-linear-120 from-iris-700 to-iris-900">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,var(--iris-400),transparent_55%)] opacity-30" />
          <HeroArt tree={tree} />
          <div className="relative flex flex-1 flex-col justify-center gap-5 p-[clamp(24px,5vw,56px)] xl:max-w-130">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--saffron-100)] px-2.5 py-1 text-[0.72rem] font-bold text-saffron-700">
              <Sparkles aria-hidden className="size-3.5" strokeWidth={2.2} />
              New season drop
            </span>
            <h1 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-on-primary">
              One marketplace.
              <br />
              Every seller you love.
            </h1>
            <p className="text-[1.06rem] leading-relaxed text-iris-100">
              Thousands of independent shops, one confident checkout. Discover curated finds from makers worldwide.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <Link href="/#new-arrivals" className={cn(buttonVariants({ variant: "accent", size: "lg" }))}>
                <ArrowRight aria-hidden />
                Shop new arrivals
              </Link>
              <Link
                href="/vendors"
                className="inline-flex h-13 items-center gap-2 rounded-md border border-on-primary/35 px-7 text-base font-semibold !text-on-primary transition-colors duration-(--dur-fast) hover:bg-on-primary/10"
              >
                <Store aria-hidden className="size-4" strokeWidth={2} />
                Explore sellers
              </Link>
            </div>
          </div>
        </div>
      </HeroCategoryMenu>
    </section>
  );
}
