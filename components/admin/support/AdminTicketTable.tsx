import { Eye, MessageSquare } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PriorityBadge, StatusBadge } from "@/components/account/support/TicketBits";
import { cardLabelClass, iconActionClass } from "@/components/data/list-classes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminTicketRow } from "@/lib/admin-support.server";
import { orderDate } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { TICKET_TYPE_LABEL } from "@/lib/validations/support";

export const adminTicketHref = (number: number) => `/admin/support/${number}`;

const Subject = ({ t }: { t: AdminTicketRow }) => (
  <div className="min-w-0">
    <p className="line-clamp-2 text-sm font-semibold text-fg-strong">{t.subject}</p>
    <p className="text-caption text-fg-muted">{TICKET_TYPE_LABEL[t.type]}</p>
  </div>
);

const Customer = ({ t }: { t: AdminTicketRow }) => (
  <div className="min-w-0">
    <p className="truncate text-sm font-semibold text-fg-strong">{t.customer.name}</p>
    <p className="truncate text-caption text-fg-muted">{t.customer.email}</p>
  </div>
);

const Replies = ({ t }: { t: AdminTicketRow }) => (
  <span className="inline-flex items-center gap-1 text-sm text-fg tabular-nums" aria-label={`${t.replies} replies`}>
    <MessageSquare aria-hidden className="size-3.5 text-fg-muted" />
    {t.replies}
  </span>
);

const View = ({ t }: { t: AdminTicketRow }) => (
  <Link
    href={adminTicketHref(t.number)}
    aria-label={`View ticket #${t.number}`}
    title="View ticket"
    className={cn(iconActionClass, "border-line bg-success-50 !text-success-600 hover:bg-success-500 hover:!text-on-primary")}
  >
    <Eye aria-hidden className="size-4" strokeWidth={2} />
  </Link>
);

/** Support Tickets list: ID · Subject (type) · Customer · Priority · Replies · Date · Status · Action. Cards ≤1200px. */
export function AdminTicketTable({ rows }: { rows: AdminTicketRow[] }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-[10%]">Ticket ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[20%]">Customer</TableHead>
              <TableHead className="w-[9%]">Priority</TableHead>
              <TableHead className="w-[7%]">Replies</TableHead>
              <TableHead className="w-[11%]">Date</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-18 text-center">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.number}>
                <TableCell className="text-sm font-semibold whitespace-nowrap text-fg-strong tabular-nums">#{t.number}</TableCell>
                <TableCell>
                  <Subject t={t} />
                </TableCell>
                <TableCell>
                  <Customer t={t} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={t.priority} />
                </TableCell>
                <TableCell>
                  <Replies t={t} />
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-fg tabular-nums">{orderDate(t.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <View t={t} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Tickets" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((t) => (
          <li key={t.number} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <Subject t={t} />
              </div>
              <StatusBadge status={t.status} />
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {(
                [
                  ["Customer", <Customer key="c" t={t} />],
                  ["Priority", <PriorityBadge key="p" priority={t.priority} />],
                  [
                    "Date",
                    <span key="d" className="text-sm tabular-nums">
                      {orderDate(t.createdAt)}
                    </span>,
                  ],
                  [
                    "Ticket ID",
                    <span key="i" className="text-sm font-semibold tabular-nums">
                      #{t.number}
                    </span>,
                  ],
                ] as [string, ReactNode][]
              ).map(([label, v]) => (
                <div key={label} className="min-w-0">
                  <dt className={cn("mb-0.5", cardLabelClass)}>{label}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3.5">
              <Replies t={t} />
              <View t={t} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
