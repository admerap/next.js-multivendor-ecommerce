import { ArrowLeft, Headset, User } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountCard } from "@/components/account/AccountCard";
import { PriorityBadge, StatusBadge, ticketDate } from "@/components/account/support/TicketBits";
import { TicketReply } from "@/components/account/support/TicketReply";
import { requireArea } from "@/lib/auth-guard";
import { getTicket } from "@/lib/support.server";
import { cn } from "@/lib/utils";
import { isTicketDone, TICKET_TYPE_LABEL } from "@/lib/validations/support";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Ticket #${(await params).number}`, robots: { index: false } };
}

const at = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Ticket details: the signed-in customer's OWN ticket — any other number is a 404, the same answer as an unknown
 * one. The issue as submitted, then every reply (customer and Sundry Support) oldest first, and the reply box.
 */
export default async function TicketPage({ params }: Props) {
  const user = await requireArea("CUSTOMER");
  const raw = (await params).number;
  const number = /^\d{1,10}$/.test(raw) ? Number(raw) : NaN;
  const t = Number.isSafeInteger(number) ? await getTicket(user.id, number) : null;
  if (!t) notFound();

  const thread = [{ id: "opening", body: t.description, fromStaff: false, authorName: null, createdAt: t.createdAt }, ...t.messages];

  return (
    <AccountCard>
      <Link href="/dashboard/support" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-primary">
        <ArrowLeft aria-hidden className="size-4" />
        All tickets
      </Link>
      <div className="mb-6 border-b border-line pb-5">
        <span className="text-caption font-semibold text-fg-muted tabular-nums">Ticket #{t.number}</span>
        <h1 className="mt-1 font-display text-h4 font-extrabold tracking-[-0.01em] wrap-break-word text-fg-strong">{t.subject}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          <StatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
          <span>{TICKET_TYPE_LABEL[t.type]}</span>
          <span aria-hidden>·</span>
          <time dateTime={t.createdAt.toISOString()}>{ticketDate(t.createdAt)}</time>
        </div>
      </div>

      <ol className="mb-7 flex flex-col gap-4">
        {thread.map((m, i) => {
          const Icon = m.fromStaff ? Headset : User;
          return (
            <li key={m.id} className={cn("flex min-w-0 gap-3", m.fromStaff && "flex-row-reverse")}>
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", m.fromStaff ? "bg-iris-50 text-primary" : "bg-sunken text-fg-muted")}>
                <Icon aria-hidden className="size-4.5" />
              </span>
              <div className={cn("min-w-0 max-w-[min(100%,640px)] rounded-lg border p-4", m.fromStaff ? "border-iris-200 bg-iris-50/40" : "border-line")}>
                <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-caption">
                  <span className="font-bold text-fg-strong">{m.fromStaff ? "Sundry Support" : "You"}</span>
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

      {isTicketDone(t.status) ? (
        <p className="rounded-md bg-sunken px-4 py-3 text-sm text-fg-muted">
          This ticket is {t.status === "CLOSED" ? "closed" : "resolved"}. Need more help?{" "}
          <Link href="/dashboard/support" className="font-semibold text-primary hover:underline">
            Open a new ticket
          </Link>
          .
        </p>
      ) : (
        <TicketReply number={t.number} />
      )}
    </AccountCard>
  );
}
