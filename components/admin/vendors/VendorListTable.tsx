import { Eye } from "lucide-react";
import Link from "next/link";
import type { VendorRow } from "@/app/admin/(panel)/vendors/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StoreAvatar } from "./StoreAvatar";
import { VendorStatusBadge } from "./VendorStatusBadge";

function ViewLink({ v, size }: { v: VendorRow; size: "size-9" | "size-11" }) {
  return (
    <Link
      href={`/admin/vendors/${v.id}`}
      aria-label={`View ${v.storeName}`}
      title="View store"
      className={`grid shrink-0 place-items-center rounded-md border border-line bg-card !text-primary transition-colors duration-(--dur-fast) hover:border-primary hover:bg-primary hover:!text-on-primary ${size}`}
    >
      <Eye aria-hidden className="size-4" strokeWidth={2} />
    </Link>
  );
}

/**
 * All vendors (adminvendorlist design): SL · Shop · Vendor · Contact info · Status · Products · Orders · Action.
 * Full table ≥1201px, labelled cards below (CLAUDE.md §3.6).
 */
export function VendorListTable({ items, offset }: { items: VendorRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        {/* Fixed layout with proportional columns so the actions never get clipped at 1201–1440px. */}
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-14">SL</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead className="w-[14%]">Vendor</TableHead>
              <TableHead className="w-[22%]">Contact info</TableHead>
              <TableHead className="w-[12%]">Status</TableHead>
              <TableHead className="w-[10%] text-right">Products</TableHead>
              <TableHead className="w-[9%] text-right">Orders</TableHead>
              <TableHead className="w-20 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((v, i) => (
              <TableRow key={v.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <StoreAvatar name={v.storeName} src={v.logo} />
                    <Link href={`/admin/vendors/${v.id}`} title={v.storeName} className="min-w-0 truncate font-bold !text-fg-strong hover:!text-primary">
                      {v.storeName}
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="truncate text-fg" title={v.ownerName}>{v.ownerName}</TableCell>
                <TableCell>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-fg" title={v.email}>{v.email}</span>
                    <span className="truncate text-caption text-fg-muted tabular-nums">{v.phone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <VendorStatusBadge status={v.status} />
                </TableCell>
                <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{v.productsCount}</TableCell>
                <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{v.ordersCount}</TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <ViewLink v={v} size="size-9" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Vendors" className="flex flex-col gap-3 px-4 pb-4 sm:px-6 xl:hidden">
        {items.map((v, i) => (
          <li key={v.id} className="rounded-lg border border-line p-4">
            <div className="flex items-center gap-3.5">
              <StoreAvatar name={v.storeName} src={v.logo} />
              <div className="min-w-0 flex-1">
                <Link href={`/admin/vendors/${v.id}`} className="block truncate leading-11 font-bold !text-fg-strong">
                  {v.storeName}
                </Link>
                <p className="truncate text-caption text-fg-muted">{v.ownerName}</p>
              </div>
              <span className="self-start text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-caption">
              <dt className="text-fg-muted">Email</dt>
              <dd className="truncate text-right font-semibold text-fg-strong">{v.email}</dd>
              <dt className="text-fg-muted">Phone</dt>
              <dd className="truncate text-right font-semibold text-fg-strong tabular-nums">{v.phone}</dd>
              <dt className="text-fg-muted">Products</dt>
              <dd className="text-right font-semibold text-fg-strong tabular-nums">{v.productsCount}</dd>
              <dt className="text-fg-muted">Orders</dt>
              <dd className="text-right font-semibold text-fg-strong tabular-nums">{v.ordersCount}</dd>
              <dt className="self-center text-fg-muted">Status</dt>
              <dd className="flex justify-end">
                <VendorStatusBadge status={v.status} />
              </dd>
            </dl>
            <div className="mt-3 flex justify-end border-t border-line pt-3">
              <ViewLink v={v} size="size-11" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
