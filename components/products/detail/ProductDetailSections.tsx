import { FileText, Layers, Package, SearchCheck, Tag, Video } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/data/DashCard";
import { Badge } from "@/components/ui/badge";
import { ApprovalBadge } from "@/components/products/ApprovalBadge";
import { richTextClasses } from "@/components/products/richTextClasses";
import { money } from "@/lib/money";
import type { ProductDetail } from "@/lib/product-detail.server";
import { htmlToText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { LOW_STOCK, PRODUCT_TYPE_LABELS, UNIT_LABELS, type ProductUnitValue } from "@/lib/validations/product";
import { ProductGallery } from "./ProductGallery";
import { VideoEmbed } from "./VideoEmbed";

// Read-only sections of a product's details page, shared by the vendor and admin details pages.

export const dateFmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
export const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function DetailCard({ title, icon: Icon, aside, children, className }: { title: string; icon: typeof Package; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-lg bg-card p-4 shadow-sm sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 font-display text-[1.125rem] font-extrabold tracking-[-0.01em] text-fg-strong">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
            <Icon className="size-4" strokeWidth={2} />
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function stockTone(p: Pick<ProductDetail, "productType" | "totalStock">) {
  if (p.productType === "DIGITAL") return { label: "Digital — no stock count", tone: "info" as const };
  if (p.totalStock === 0) return { label: "Out of stock", tone: "error" as const };
  if (p.totalStock < LOW_STOCK) return { label: "Low stock", tone: "warning" as const };
  return { label: "In stock", tone: "success" as const };
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-sunken px-3.5 py-3">
      <dt className="text-[0.7rem] font-bold tracking-[0.06em] text-fg-subtle uppercase">{label}</dt>
      <dd className="truncate text-sm font-semibold text-fg-strong">{children}</dd>
    </div>
  );
}

/** Gallery + name, statuses, pricing, key attributes and tags. */
export function ProductOverview({ p }: { p: ProductDetail }) {
  const stock = stockTone(p);
  const hasDiscount = p.discountCents > 0;
  return (
    <section className="grid gap-5 rounded-lg bg-card p-4 shadow-sm sm:p-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ProductGallery images={p.images} name={p.name} />
      <div className="flex min-w-0 flex-col gap-4">
        <nav aria-label="Category path" className="flex flex-wrap items-center gap-1.5 text-caption font-semibold text-fg-muted">
          {p.categoryPath.map((c, i) => (
            <span key={c} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>›</span>}
              {c}
            </span>
          ))}
        </nav>
        <h2 className="font-display text-h3 font-extrabold tracking-[-0.02em] text-fg-strong">{p.name}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ApprovalBadge status={p.approvalStatus} />
          <Badge tone={p.isActive ? "primary" : "neutral"}>{p.isActive ? "Active" : "Hidden"}</Badge>
          <Badge tone={stock.tone}>{stock.label}</Badge>
        </div>

        {/* Pricing */}
        <div className="rounded-lg border border-line p-4">
          <p className="text-caption font-bold tracking-[0.06em] text-fg-subtle uppercase">Pricing</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-h3 font-extrabold text-fg-strong tabular-nums">{money(p.finalPrice)}</span>
            {hasDiscount && (
              <>
                <s className="text-sm text-fg-muted tabular-nums">{money(p.price)}</s>
                <Badge tone="error">{p.discountType === "PERCENT" ? `−${p.discountValue}%` : `−${money(p.discountValue)}`}</Badge>
              </>
            )}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-caption text-fg-muted">Unit price</dt>
              <dd className="font-semibold text-fg-strong tabular-nums">{money(p.price)}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">Discount</dt>
              <dd className="font-semibold text-fg-strong tabular-nums">{hasDiscount ? (p.discountType === "PERCENT" ? `${p.discountValue}%` : money(p.discountValue)) : "None"}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">Compare-at</dt>
              <dd className="font-semibold text-fg-strong tabular-nums">{p.compareAtPrice ? money(p.compareAtPrice) : "—"}</dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">Tax</dt>
              <dd className="font-semibold text-fg-strong tabular-nums">{p.taxRate != null ? `${(p.taxRate / 100).toFixed(2)}%` : "—"}</dd>
            </div>
          </dl>
        </div>

        <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
          <Detail label="SKU">{p.sku}</Detail>
          <Detail label="Brand">{p.brand?.name ?? "—"}</Detail>
          <Detail label="Product type">{PRODUCT_TYPE_LABELS[p.productType]}</Detail>
          <Detail label="Stock">{p.productType === "DIGITAL" ? "—" : `${p.totalStock.toLocaleString("en-US")}${p.variations.length ? ` · ${p.variations.length} variations` : ""}`}</Detail>
          <Detail label="Min. order">{`${p.minOrderQty} ${UNIT_LABELS[p.unit as ProductUnitValue] ?? ""}`}</Detail>
          <Detail label="Shipping">{p.productType === "DIGITAL" ? "None (digital)" : `${money(p.shippingCost)}${p.shippingPerUnit ? " per unit" : " per order"}`}</Detail>
        </dl>

        {p.tags.length > 0 && (
          <ul role="list" aria-label="Search tags" className="flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <li key={t} className="inline-flex items-center gap-1 rounded-full bg-iris-50 px-3 py-1 text-caption font-semibold text-primary">
                <Tag aria-hidden className="size-3" strokeWidth={2.2} />
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function ProductVariations({ p }: { p: ProductDetail }) {
  const out = p.variations.filter((v) => v.stock === 0).length;
  return (
    <DetailCard
      title={`Variations (${p.variations.length})`}
      icon={Layers}
      aside={
        <p className="text-caption font-semibold text-fg-muted">
          {p.totalStock.toLocaleString("en-US")} in stock{out > 0 && <span className="text-error-600"> · {out} out of stock</span>}
        </p>
      }
    >
      <div aria-hidden className="hidden grid-cols-[3rem_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 rounded-md bg-sunken px-3 py-2.5 text-[0.7rem] font-bold tracking-[0.06em] text-fg-muted uppercase md:grid">
        <span>Image</span>
        <span>Variation</span>
        <span>SKU</span>
        <span>Price</span>
        <span>Stock</span>
      </div>
      <ul role="list" aria-label="Variations" className="flex flex-col gap-2.5 md:gap-0">
        {p.variations.map((v) => {
          const tone = v.stock === 0 ? "text-error-600" : v.stock < LOW_STOCK ? "text-warning-600" : "text-fg-strong";
          return (
            <li
              key={v.id}
              className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-lg border border-line p-3 md:grid-cols-[3rem_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:rounded-none md:border-0 md:border-b md:px-3 md:py-2.5"
            >
              <span className="relative row-span-3 size-12 overflow-hidden rounded-md border border-line bg-sunken md:row-span-1">
                {v.image ? <span role="img" aria-label={`${v.name} image`} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${v.image}")` }} /> : <Package aria-hidden className="absolute inset-0 m-auto size-5 text-fg-subtle" strokeWidth={1.7} />}
              </span>
              <span className="truncate text-sm font-bold text-fg-strong">{v.name}</span>
              <span className="truncate text-caption text-fg-muted md:text-sm">
                <span className="md:sr-only">SKU </span>
                {v.sku ?? "—"}
              </span>
              <span className="flex gap-3 md:contents">
                <span className="text-sm font-bold text-fg-strong tabular-nums">{money(v.price)}</span>
                <span className={cn("text-sm font-semibold tabular-nums", tone)}>
                  {v.stock === 0 ? "Out of stock" : `${v.stock.toLocaleString("en-US")}${v.stock < LOW_STOCK ? " · Low" : ""}`}
                  <span className="sr-only"> in stock</span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </DetailCard>
  );
}

export function ProductDescription({ p }: { p: ProductDetail }) {
  return (
    <DetailCard title="Description" icon={FileText}>
      {p.shortDescription && <p className="mb-3 text-sm font-semibold text-fg-strong">{p.shortDescription}</p>}
      {/* Sanitized HTML (lib/rich-text.server.ts) — only the editor's tags survive. */}
      <div className={richTextClasses} dangerouslySetInnerHTML={{ __html: p.description }} />
    </DetailCard>
  );
}

export function SeoPreview({ p }: { p: ProductDetail }) {
  const title = p.metaTitle || p.name;
  const text = p.metaDescription || htmlToText(p.description).slice(0, 160);
  return (
    <DetailCard title="SEO preview" icon={SearchCheck} aside={!p.metaTitle && !p.metaDescription ? <Badge tone="neutral">Using defaults</Badge> : undefined}>
      <div className="rounded-md border border-line p-4">
        <p className="truncate text-caption text-success-600">sundry.com › product › {p.slug}</p>
        <p className="mt-1 line-clamp-2 text-base font-semibold text-primary">{title}</p>
        <p className="mt-1 line-clamp-3 text-sm text-fg-muted">{text}</p>
      </div>
      <dl className="mt-3 grid gap-1 text-caption text-fg-muted">
        <div className="flex justify-between gap-3">
          <dt>Meta title</dt>
          <dd className="tabular-nums">{p.metaTitle ? `${p.metaTitle.length}/120` : "Not set — product name is used"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Meta description</dt>
          <dd className="tabular-nums">{p.metaDescription ? `${p.metaDescription.length}/160` : "Not set — description is used"}</dd>
        </div>
      </dl>
    </DetailCard>
  );
}

export function VideoCard({ url, emptyText }: { url: string | null; emptyText: string }) {
  return (
    <DetailCard title="Product video" icon={Video}>
      {url ? <VideoEmbed url={url} title="Product video" /> : <EmptyState bare icon={Video} title="No video added" description={emptyText} />}
    </DetailCard>
  );
}
