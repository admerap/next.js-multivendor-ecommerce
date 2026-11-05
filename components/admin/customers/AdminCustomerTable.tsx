import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardLabelClass, iconActionClass } from "@/components/data/list-classes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminCustomerRow } from "@/lib/admin-customers.server";
import { money } from "@/lib/money";
import { orderDate } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { CustomerBlockSwitch } from "./CustomerBlockSwitch";

export const adminCustomerHref = (id: string) => `/admin/customers/${id}`;
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** The customer's photo, or their initials on an iris tile. */
export function CustomerAvatar({ name, image, size = 36 }: { name: string; image: string | null; size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-iris-50 text-[0.72rem] font-bold text-primary" style={{ width: size, height: size }}>
      {image ? <Image src={image} alt="" fill sizes={`${size}px`} className="object-cover" /> : <span aria-hidden>{initials(name)}</span>}
    </span>
  );
}

function Customer({ c }: { c: AdminCustomerRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CustomerAvatar name={c.name} image={c.image} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg-strong" title={c.name}>
          {c.name}
        </p>
        {c.blockedAt && <span className="text-caption font-semibold text-error-600">Blocked</span>}
      </div>
    </div>
  );
}

const Contact = ({ c }: { c: AdminCustomerRow }) => (
  <div className="min-w-0">
    <p className="truncate text-sm text-fg" title={c.email}>
      {c.email}
    </p>
    <p className="truncate text-caption text-fg-muted tabular-nums">{c.phone || "No phone"}</p>
  </div>
);

const Orders = ({ c }: { c: AdminCustomerRow }) => (
  <div>
    <p className="text-sm font-bold text-fg-strong tabular-nums">{c.orders}</p>
    <p className="text-caption text-fg-muted tabular-nums">{money(c.spent)} spent</p>
  </div>
);

const View = ({ c }: { c: AdminCustomerRow }) => (
  <Link
    href={adminCustomerHref(c.id)}
    aria-label={`View ${c.name}`}
    title="View customer"
    className={cn(iconActionClass, "border-line bg-success-50 !text-success-600 hover:bg-success-500 hover:!text-on-primary")}
  >
    <Eye aria-hidden className="size-4" strokeWidth={2} />
  </Link>
);

/**
 * Customer List (admincustomerlist design): SL · Customer · Contact info · Joined · Orders (+ spent) ·
 * Block / Unblock · Action. Table from 1201px, labelled cards below.
 */
export function AdminCustomerTable({ rows, offset }: { rows: AdminCustomerRow[]; offset: number }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-12">SL</TableHead>
              <TableHead className="w-[22%]">Customer</TableHead>
              <TableHead>Contact info</TableHead>
              <TableHead className="w-[12%]">Joined</TableHead>
              <TableHead className="w-[12%] text-right">Orders</TableHead>
              <TableHead className="w-[15%]">Block / Unblock</TableHead>
              <TableHead className="w-18 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <Customer c={c} />
                </TableCell>
                <TableCell>
                  <Contact c={c} />
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap tabular-nums">{orderDate(c.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Orders c={c} />
                </TableCell>
                <TableCell>
                  <CustomerBlockSwitch key={String(!!c.blockedAt)} id={c.id} name={c.name} blocked={!!c.blockedAt} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <View c={c} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Customers" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((c, i) => (
          <li key={c.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <Customer c={c} />
              </div>
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3">
              {(
                [
                  ["Contact", <Contact key="c" c={c} />],
                  ["Joined", <span key="j" className="text-sm tabular-nums">{orderDate(c.createdAt)}</span>],
                  ["Orders", <Orders key="o" c={c} />],
                ] as [string, ReactNode][]
              ).map(([label, v]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line pt-2">
              <CustomerBlockSwitch key={String(!!c.blockedAt)} id={c.id} name={c.name} blocked={!!c.blockedAt} />
              <View c={c} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
