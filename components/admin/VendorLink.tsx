import { Store } from "lucide-react";
import Link from "next/link";

/** Vendor (store) name linking to its admin page — the marketplace rule: every item shows its seller. */
export function VendorLink({ vendor }: { vendor: { id: string; name: string } }) {
  return (
    <Link
      href={`/admin/vendors/${vendor.id}`}
      className="inline-flex max-w-full min-w-0 items-center gap-2 font-semibold !text-fg hover:!text-primary max-lg:min-h-11"
      title={vendor.name}
    >
      <Store aria-hidden className="size-4 shrink-0 text-fg-muted" strokeWidth={1.9} />
      <span className="truncate">{vendor.name}</span>
    </Link>
  );
}
