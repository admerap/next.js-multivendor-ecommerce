import { Eye } from "lucide-react";
import Link from "next/link";
import type { VendorRow } from "@/app/admin/(panel)/vendors/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StoreAvatar } from "./StoreAvatar";
import { VendorStatusBadge } from "./VendorStatusBadge";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function DetailsLink({ v, size }: { v: VendorRow; size: "size-9" | "size-11" }) {
  return (
    <Link
      href={`/admin/vendors/${v.id}`}
      aria-label={`View details for ${v.storeName}`}
      title="View details"
      className={`grid shrink-0 place-items-center rounded-md border border-success-50 bg-success-50 !text-success-600 transition-colors duration-(--dur-fast) hover:border-success-500 ${size}`}
    >
      <Eye aria-hidden className="size-4" strokeWidth={2} />
    </Link>
  );
}

/** Pending applications: full table ≥1201px, labelled cards below (CLAUDE.md §3.6). */
export function VendorApprovalTable({ items, offset }: { items: VendorRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table>
          <TableHeader>
            <tr>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Store name</TableHead>
              <TableHead>Owner name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Details</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((v, i) => (
              <TableRow key={v.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <StoreAvatar name={v.storeName} src={v.logo} />
                    <Link href={`/admin/vendors/${v.id}`} className="font-bold !text-fg-strong hover:!text-primary">
                      {v.storeName}
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="text-fg">{v.ownerName}</TableCell>
                <TableCell className="text-fg-muted">{v.email}</TableCell>
                <TableCell className="text-fg-muted tabular-nums">{dateFmt.format(new Date(v.createdAt))}</TableCell>
                <TableCell>
                  <VendorStatusBadge status={v.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <DetailsLink v={v} size="size-9" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Pending vendors" className="flex flex-col gap-3 px-4 pb-4 sm:px-6 xl:hidden">
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
              <dt className="text-fg-muted">Registered</dt>
              <dd className="text-right font-semibold text-fg-strong tabular-nums">{dateFmt.format(new Date(v.createdAt))}</dd>
              <dt className="self-center text-fg-muted">Status</dt>
              <dd className="flex justify-end">
                <VendorStatusBadge status={v.status} />
              </dd>
            </dl>
            <div className="mt-3 flex justify-end border-t border-line pt-3">
              <DetailsLink v={v} size="size-11" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
