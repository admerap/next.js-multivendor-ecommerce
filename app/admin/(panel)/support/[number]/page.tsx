import { ArrowLeft, Headset, LifeBuoy, MessageSquareReply, User, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriorityBadge, StatusBadge } from "@/components/account/support/TicketBits";
import { StaffReply } from "@/components/admin/support/StaffReply";
import { Facts, SideCard } from "@/components/orders/DetailCards";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { can, requirePermission } from "@/lib/access.server";
import { getAdminTicket } from "@/lib/admin-support.server";
import { orderDate } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { TICKET_TYPE_LABEL } from "@/lib/validations/support";

export const metadata: Metadata = { title: "Ticket Details" };

const at = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Admin › Support Tickets › Ticket details: the customer's issue and every reply (customer and staff), the reply
 * box + status switch (Support Tickets › Update), and the customer. Unknown number → 404.
 */
export default async function AdminTicketPage({ params }: PageProps<"/admin/support/[number]">) {
  await requirePermission("support");
  const raw = (await params).number;
  const number = /^\d{1,10}$/.test(raw) ? Number(raw) : NaN;
  const t = Number.isSafeInteger(number) ? await getAdminTicket(number) : null;
  if (!t) notFound();
  const canSeeCustomer = await can("customers");

  const thread = [{ id: "opening", body: t.description, fromStaff: false, authorName: t.customer.name, createdAt: t.createdAt }, ...t.messages];

  return (
    <>
      <SetBreadcrumbs
        items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Support Tickets", href: "/admin/support" }, { label: `Ticket #${t.number}` }]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex flex-wrap items-center gap-3 font-display text-[clamp(1.5rem,3vw,1.75rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
            <LifeBuoy aria-hidden className="size-5" strokeWidth={1.9} />
          </span>
          <span className="tabular-nums">Ticket #{t.number}</span>
          <StatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
        </h1>
        <Button asChild variant="secondary" className="max-sm:w-full">
          <Link href="/admin/support">
            <ArrowLeft aria-hidden />
            Back to tickets
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section aria-label="Conversation" className="min-w-0 rounded-lg bg-card p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-xl font-bold wrap-break-word text-fg-strong">{t.subject}</h2>
            <p className="mt-1 text-caption text-fg-muted">
              {TICKET_TYPE_LABEL[t.type]} · opened {orderDate(t.createdAt)}
            </p>
            <ol className="mt-5 flex flex-col gap-4">
              {thread.map((m, i) => {
                const Icon = m.fromStaff ? Headset : User;
                return (
                  <li key={m.id} className={cn("flex min-w-0 gap-3", m.fromStaff && "flex-row-reverse")}>
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full",
                        m.fromStaff ? "bg-iris-50 text-primary" : "bg-sunken text-fg-muted",
                      )}
                    >
                      <Icon aria-hidden className="size-4.5" />
                    </span>
                    <div className={cn("max-w-[min(100%,640px)] min-w-0 rounded-lg border p-4", m.fromStaff ? "border-iris-200 bg-iris-50/40" : "border-line")}>
                      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-caption">
                        <span className="font-bold text-fg-strong">
                          {m.fromStaff ? `${m.authorName ?? "Former staff"} · Sundry Support` : (m.authorName ?? t.customer.name)}
                        </span>
                        <time dateTime={m.createdAt.toISOString()} className="text-fg-muted">
                          {at.format(m.createdAt)}
                        </time>
                      </div>
                      <p className="text-sm wrap-break-word whitespace-pre-line text-fg">{m.body}</p>
                      {i === 0 && t.attachment && (
                        <a href={t.attachment} target="_blank" rel="noopener" className="mt-3 block w-fit overflow-hidden rounded-md border border-line">
                          <Image src={t.attachment} alt="Attachment" width={240} height={160} className="h-40 w-60 object-cover" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-label="Reply" className="min-w-0 rounded-lg bg-card p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 flex items-center gap-2.5 font-display text-base font-bold text-fg-strong">
              <span className="grid size-8 place-items-center rounded-md bg-iris-50 text-primary">
                <MessageSquareReply aria-hidden className="size-4" strokeWidth={2} />
              </span>
              Reply
            </h2>
            <StaffReply key={`${t.status}-${t.replies}`} number={t.number} status={t.status} />
          </section>
        </div>

        <SideCard icon={UserRound} title="Customer">
          <Facts
            rows={[
              [
                "Name",
                canSeeCustomer ? (
                  <Link key="n" href={`/admin/customers/${t.customer.id}`} className="inline-flex items-center !text-primary hover:underline max-lg:min-h-11">
                    {t.customer.name}
                  </Link>
                ) : (
                  t.customer.name
                ),
              ],
              [
                "Email",
                <span key="e" className="break-all">
                  {t.customer.email}
                </span>,
              ],
              ["Phone", t.customer.phone || "—"],
              ["Customer since", orderDate(t.customer.createdAt)],
              ["Last update", orderDate(t.updatedAt)],
            ]}
          />
        </SideCard>
      </div>
    </>
  );
}
