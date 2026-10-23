import { BadgeCheck, BookOpen, Building2, CircleHelp, MessageSquare, RotateCcw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { richTextClasses } from "@/components/products/richTextClasses";
import { Skeleton } from "@/components/states/Skeleton";
import type { ProductPageData } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { ExpandableText } from "./ExpandableText";

/** Page container (same width/padding as every storefront section). */
export const pageContainer = "mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)]";

/** Home / Category / Sub / Sub-sub / Product — the real catalog path. */
export function ProductBreadcrumb({ product: p }: { product: ProductPageData }) {
  const crumbs = [{ name: "Home", href: "/" }, ...p.categoryPath];
  return (
    <nav aria-label="Breadcrumb" className={cn(pageContainer, "pt-6")}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.81rem] text-fg-muted">
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-2">
            <Link href={c.href} className="!text-fg-muted hover:!text-primary max-lg:inline-flex max-lg:min-h-11 max-lg:min-w-11 max-lg:items-center max-lg:justify-center">
              {c.name}
            </Link>
            <span aria-hidden>/</span>
          </li>
        ))}
        <li aria-current="page" className="min-w-0 truncate font-semibold text-fg-strong">
          {p.name}
        </li>
      </ol>
    </nav>
  );
}

const UNIT_LABEL: Record<ProductPageData["unit"], string> = { PC: "Piece", KG: "Kilogram", G: "Gram", BOX: "Box", PAIR: "Pair" };

/** Overview tab: "Detail Description" + the product's real details + its rich-text description. */
export function ProductOverview({ product: p }: { product: ProductPageData }) {
  const specs = [
    { label: "Brand", value: p.brand },
    { label: "SKU", value: p.sku },
    { label: "Category", value: p.categoryPath.map((c) => c.name).join(" › ") },
    { label: "Unit", value: UNIT_LABEL[p.unit] },
    { label: "Type", value: p.digital ? "Digital product" : null },
    { label: "Minimum order", value: p.minOrderQty > 1 ? `${p.minOrderQty} units` : null },
  ].filter((s): s is { label: string; value: string } => !!s.value);

  return (
    <>
      <h3 className="mb-3.5 font-display text-lg font-extrabold text-fg-strong">Detail Description</h3>
      <dl className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-x-6 gap-y-2.5 rounded-md bg-sunken p-4 text-sm">
        {specs.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="text-caption font-semibold text-fg-muted">{s.label}</dt>
            <dd className="truncate font-semibold text-fg-strong" title={s.value}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <ExpandableText>
        {/* descriptionHtml is sanitized server-side (lib/rich-text.server) on save and again on load. */}
        <div className={cn(richTextClasses, "text-[0.94rem] leading-[1.7]")} dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} />
      </ExpandableText>
      {p.tags.length > 0 && (
        <ul aria-label="Tags" className="mt-5 flex flex-wrap gap-2">
          {p.tags.map((t) => (
            <li key={t} className="rounded-full bg-iris-50 px-3 py-1 text-caption font-semibold text-primary">
              {t}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const TRUST: { icon: LucideIcon; text: string; tile: string }[] = [
  { icon: Truck, text: "Fast Delivery all across the country", tile: "bg-iris-50 text-primary" },
  { icon: ShieldCheck, text: "Safe Payment", tile: "bg-success-50 text-success-600" },
  { icon: RotateCcw, text: "7 Days Return Policy", tile: "bg-saffron-50 text-saffron-700" },
  { icon: BadgeCheck, text: "100% Authentic Products", tile: "bg-info-50 text-info-600" },
];

/** Right-rail trust card (PRD FR-S21). */
export function ProductTrust() {
  return (
    <ul role="list" aria-label="Why shop on Sundry" className="rounded-lg bg-card px-5 py-2 shadow-sm">
      {TRUST.map(({ icon: Icon, text, tile }) => (
        <li key={text} className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-b-0">
          <span className={cn("grid size-9.5 shrink-0 place-items-center rounded-md", tile)}>
            <Icon aria-hidden className="size-4.5" strokeWidth={1.9} />
          </span>
          <span className="text-sm font-semibold text-fg">{text}</span>
        </li>
      ))}
    </ul>
  );
}

// All four go to the support centre, as in the design (no About / FAQ / Blog pages yet).
// TODO(content): point About us / FAQ / Blog at their own pages once they exist.
const HELP: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Building2, title: "About us", text: "Know about our company more." },
  { icon: MessageSquare, title: "Contact Us", text: "We are Here to Help" },
  { icon: CircleHelp, title: "FAQ", text: "Get all Answers" },
  { icon: BookOpen, title: "Blog", text: "Check Latest Blogs" },
];

/** Help quad under the page (Product Detail Page design). */
export function HelpCards() {
  return (
    <section aria-label="Help" className={cn(pageContainer, "pt-8")}>
      <ul role="list" className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
        {HELP.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <Link
              href="/account/support"
              className="flex h-full flex-col items-center gap-2 rounded-lg bg-card px-5 py-8 text-center shadow-sm transition-[box-shadow,transform] duration-(--dur-med) ease-out hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="mb-1 grid size-14 place-items-center rounded-full bg-iris-50">
                <Icon aria-hidden className="size-6 text-primary" strokeWidth={1.8} />
              </span>
              <span className="font-display text-[1.06rem] font-bold text-fg-strong">{title}</span>
              <span className="text-[0.81rem] text-fg-muted">{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Loading state — mirrors the page: breadcrumb, product card (gallery + info), right rail. */
export function ProductPageSkeleton() {
  return (
    <main role="status" aria-label="Loading product" className="pb-4">
      <div className={cn(pageContainer, "pt-6")}>
        <Skeleton className="h-4 w-64 max-w-full rounded-sm" />
      </div>
      <div className={cn(pageContainer, "flex flex-wrap items-start gap-6 pt-5")}>
        <div className="flex min-w-0 flex-[3_1_640px] flex-wrap gap-8 rounded-lg bg-card p-5 shadow-sm sm:p-7">
          <Skeleton className="aspect-square min-w-0 flex-[1_1_320px] rounded-lg" />
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-7 w-[70%] rounded-md" />
            <Skeleton className="h-3.5 w-1/2 rounded-sm" />
            <Skeleton className="h-8 w-2/5 rounded-md" />
            <Skeleton className="mt-2 h-11 w-[90%] rounded-md" />
            <Skeleton className="mt-2 h-13 w-[70%] rounded-md" />
          </div>
        </div>
        <Skeleton className="h-70 min-w-0 flex-[1_1_280px] rounded-lg lg:max-w-85" />
      </div>
    </main>
  );
}
