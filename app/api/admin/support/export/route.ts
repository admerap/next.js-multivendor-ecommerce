import { NextResponse } from "next/server";
import { can } from "@/lib/access.server";
import { listAdminTickets } from "@/lib/admin-support.server";
import { isoDate, toCsv } from "@/lib/csv";
import { downloadResponse } from "@/lib/download";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { adminTicketListSchema, TICKET_STATUS_SLUGS } from "@/lib/validations/admin-support";
import { TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL, TICKET_TYPE_LABEL } from "@/lib/validations/support";
import { exportFormat, tableDownload } from "@/lib/xlsx.server";

/**
 * GET /api/admin/support/export?format=xlsx|csv|pdf&status=&q=&priority=&type= — Support Tickets › Export: every
 * ticket matching the list's current view (all pages). Needs Support Tickets › Read.
 */
export async function GET(req: Request) {
  if (!(await can("support"))) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent("/admin/support")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = exportFormat(sp.get("format"));
  const params = adminTicketListSchema.parse(Object.fromEntries(sp));
  try {
    const { rows, total, counts } = await listAdminTickets(params, { all: true });
    const name = `sundry-support-tickets-${params.status ?? "all"}-${isoDate(new Date())}`;

    if (format !== "pdf") {
      const csv = toCsv(
        ["Ticket ID", "Date", "Subject", "Type", "Priority", "Status", "Customer", "Email", "Replies"],
        rows.map((t) => [
          `#${t.number}`,
          isoDate(t.createdAt),
          t.subject,
          TICKET_TYPE_LABEL[t.type],
          TICKET_PRIORITY_LABEL[t.priority],
          TICKET_STATUS_LABEL[t.status],
          t.customer.name,
          t.customer.email,
          t.replies,
        ]),
      );
      return tableDownload(csv, name, format);
    }

    const pdf = await renderReportPdf({
      title: params.status ? `${TICKET_STATUS_LABEL[TICKET_STATUS_SLUGS[params.status]]} Support Tickets` : "Support Tickets",
      store: "Sundry HQ",
      subtitle:
        [params.priority && TICKET_PRIORITY_LABEL[params.priority], params.type && TICKET_TYPE_LABEL[params.type], params.q && `Search: ${params.q}`]
          .filter(Boolean)
          .join(" · ") || "All tickets",
      summary: [
        ["Tickets", String(total)],
        ["Open", String(counts.OPEN)],
        ["Pending", String(counts.PENDING)],
        ["Answered", String(counts.ANSWERED)],
        ["Resolved", String(counts.RESOLVED)],
        ["Closed", String(counts.CLOSED)],
      ],
      columns: [
        { label: "Ticket", weight: 0.8 },
        { label: "Date", weight: 0.9 },
        { label: "Subject", weight: 2.6 },
        { label: "Type", weight: 1.2 },
        { label: "Priority", weight: 0.8 },
        { label: "Customer", weight: 1.4 },
        { label: "Status", weight: 0.9 },
      ],
      rows: rows.map((t) => [
        `#${t.number}`,
        isoDate(t.createdAt),
        t.subject,
        TICKET_TYPE_LABEL[t.type],
        TICKET_PRIORITY_LABEL[t.priority],
        t.customer.name,
        TICKET_STATUS_LABEL[t.status],
      ]),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-support] export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export the tickets right now. Please try again.", { status: 500 });
  }
}
