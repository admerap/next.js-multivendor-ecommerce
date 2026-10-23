import { Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { brandHref } from "@/lib/storefront";
import { getBrands } from "@/lib/storefront.server";
import { HomeSection, SectionEmpty, SectionHeading } from "./HomeSection";

/** Shop by Brand: every active brand (logo when uploaded, otherwise its name, as in the design). */
export async function ShopByBrand() {
  const brands = await getBrands();
  return (
    <HomeSection id="shop-by-brand">
      <SectionHeading id="shop-by-brand" eyebrow="Featured" title="Shop by Brand" />
      {brands.length ? (
        <ul role="list" className="grid gap-[clamp(10px,2vw,16px)] grid-cols-[repeat(auto-fill,minmax(min(150px,calc(50%_-_8px)),1fr))]">
          {brands.map((b) => (
            <li key={b.slug} className="min-w-0">
              <Link
                href={brandHref(b.slug)}
                title={`${b.name} · ${b.productCount} ${b.productCount === 1 ? "product" : "products"}`}
                className="group flex h-24 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-line bg-card px-4 transition-[border-color,box-shadow] duration-(--dur-fast) hover:border-primary hover:shadow-md"
              >
                {/* Brand images are free-form uploads (not always logos), so the name is always shown too. */}
                {b.image && (
                  <span className="relative h-10 w-full">
                    <Image src={b.image} alt="" fill sizes="160px" className="object-contain" />
                  </span>
                )}
                <span className="max-w-full truncate font-display text-[0.94rem] font-bold tracking-[-0.02em] text-fg-subtle group-hover:text-primary">{b.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <SectionEmpty icon={Tag} title="No brands yet" text="Brands appear here once our team adds them." />
      )}
    </HomeSection>
  );
}
