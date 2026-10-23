import { ArrowUpRight, Store } from "lucide-react";
import Link from "next/link";
import { StoreAvatar } from "@/components/admin/vendors/StoreAvatar";
import { DetailCard } from "@/components/products/detail/ProductDetailSections";

/** "Vendor" card on the admin details pages: logo, store name, a count line and a link to the vendor. */
export function VendorCard({ vendor, countLabel }: { vendor: { id: string; storeName: string; logo: string | null }; countLabel: string }) {
  return (
    <DetailCard title="Vendor" icon={Store}>
      <div className="flex min-w-0 flex-wrap items-center gap-3.5">
        <StoreAvatar name={vendor.storeName} src={vendor.logo} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-fg-strong">{vendor.storeName}</p>
          <p className="text-caption text-fg-muted tabular-nums">{countLabel}</p>
        </div>
        <Link
          href={`/admin/vendors/${vendor.id}`}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-line px-3.5 text-sm font-semibold !text-fg-strong transition-colors duration-(--dur-fast) hover:border-primary hover:!text-primary"
        >
          <ArrowUpRight aria-hidden className="size-4" strokeWidth={2} />
          View vendor
        </Link>
      </div>
    </DetailCard>
  );
}

/** "12 products", "1 coupon". */
export const countOf = (n: number, noun: string) => `${n.toLocaleString("en-US")} ${noun}${n === 1 ? "" : "s"}`;
