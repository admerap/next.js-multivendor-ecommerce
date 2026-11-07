import { LifeBuoy } from "lucide-react";
import type { Metadata } from "next";
import { AccountCard } from "@/components/account/AccountCard";
import { NewTicketDialog } from "@/components/account/support/NewTicketDialog";
import { TicketList } from "@/components/account/support/TicketBits";
import { EmptyState } from "@/components/data/DashCard";
import { Pagination } from "@/components/data/Pagination";
import { requireArea } from "@/lib/auth-guard";
import { listTickets } from "@/lib/support.server";
import { TICKETS_PAGE_SIZE, ticketListSchema } from "@/lib/validations/support";

export const metadata: Metadata = { title: "Support Ticket" };

type Props = { searchParams: Promise<{ page?: string | string[] }> };

/** Support Ticket (supportticket design): the signed-in customer's own tickets, newest first, and "Add New Ticket". */
export default async function SupportPage({ searchParams }: Props) {
  const user = await requireArea("CUSTOMER");
  const raw = (await searchParams).page;
  const { page } = ticketListSchema.parse({ page: Array.isArray(raw) ? raw[0] : raw });
  const list = await listTickets(user.id, page);

  return (
    <AccountCard>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-h3 font-extrabold tracking-[-0.02em] text-fg-strong">
          Support Ticket <span className="text-fg-muted tabular-nums">({list.total})</span>
        </h1>
        {list.total > 0 && <NewTicketDialog />}
      </div>
      {list.total === 0 ? (
        <div className="rounded-lg border border-dashed border-line">
          <EmptyState
            bare
            icon={LifeBuoy}
            title="No Ticket Found!"
            description="Need help with an order or your account? Open a ticket and our support team will get back to you."
          >
            <NewTicketDialog />
          </EmptyState>
        </div>
      ) : (
        <>
          <TicketList rows={list.rows} />
          {list.pageCount > 1 && (
            <div className="mt-5">
              <Pagination page={list.page} pageCount={list.pageCount} total={list.total} pageSize={TICKETS_PAGE_SIZE} params={{}} noun="tickets" />
            </div>
          )}
        </>
      )}
    </AccountCard>
  );
}
