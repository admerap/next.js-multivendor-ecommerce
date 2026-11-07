import { Eye } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { TicketRow } from "@/lib/support.server";
import {
  TICKET_PRIORITY_LABEL,
  TICKET_PRIORITY_TONE,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  TICKET_TYPE_LABEL,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/validations/support";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "12 Jul, 2026" (the design's format) */
export const ticketDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;

export const StatusBadge = ({ status }: { status: TicketStatus }) => <Badge tone={TICKET_STATUS_TONE[status]}>{TICKET_STATUS_LABEL[status]}</Badge>;
export const PriorityBadge = ({ priority }: { priority: TicketPriority }) => (
  <Badge tone={TICKET_PRIORITY_TONE[priority]}>{TICKET_PRIORITY_LABEL[priority]}</Badge>
);

const viewCls =
  "grid size-9 place-items-center rounded-md border border-line bg-card text-fg-muted transition-colors hover:border-primary hover:text-primary max-xl:size-11";

/**
 * Support Ticket list (supportticket design): Ticket ID · Subject + date · Type · Priority · Status · View.
 * A table above 1200px; one card per ticket below.
 */
export function TicketList({ rows }: { rows: TicketRow[] }) {
  return (
    <>
      <table className="w-full border-collapse text-sm max-xl:hidden">
        <thead>
          <tr className="bg-sunken text-left text-caption font-bold tracking-[0.06em] text-fg-muted uppercase">
            <th scope="col" className="rounded-l-md px-4 py-3 font-bold">
              Ticket ID
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              Subject
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              Type
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              Priority
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              Status
            </th>
            <th scope="col" className="rounded-r-md px-4 py-3 text-center font-bold">
              View
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.number} className="border-b border-line last:border-0">
              <td className="px-4 py-4 font-semibold text-fg-strong tabular-nums">#{t.number}</td>
              <td className="max-w-80 px-4 py-4">
                <span className="block truncate font-semibold text-fg-strong">{t.subject}</span>
                <time dateTime={t.createdAt.toISOString()} className="text-caption text-fg-muted">
                  {ticketDate(t.createdAt)}
                </time>
              </td>
              <td className="px-4 py-4 text-fg">{TICKET_TYPE_LABEL[t.type]}</td>
              <td className="px-4 py-4">
                <PriorityBadge priority={t.priority} />
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-4 py-4">
                <Link href={`/dashboard/support/${t.number}`} aria-label={`View ticket #${t.number}`} title="View" className={`${viewCls} mx-auto`}>
                  <Eye aria-hidden className="size-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul role="list" className="flex flex-col gap-3 xl:hidden">
        {rows.map((t) => (
          <li key={t.number} className="flex min-w-0 flex-col gap-3 rounded-lg border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-caption font-semibold text-fg-muted tabular-nums">#{t.number}</span>
                <p className="font-semibold wrap-break-word text-fg-strong">{t.subject}</p>
                <time dateTime={t.createdAt.toISOString()} className="text-caption text-fg-muted">
                  {ticketDate(t.createdAt)}
                </time>
              </div>
              <Link href={`/dashboard/support/${t.number}`} aria-label={`View ticket #${t.number}`} title="View" className={`${viewCls} shrink-0`}>
                <Eye aria-hidden className="size-4" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-fg">
              <span>{TICKET_TYPE_LABEL[t.type]}</span>
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
