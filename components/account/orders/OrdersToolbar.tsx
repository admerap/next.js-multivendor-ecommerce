"use client";

import { ArrowUpDown, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ORDER_STATUS_LABEL, statusSlug, type OrderStatusKey } from "@/lib/orders";
import { cn } from "@/lib/utils";

/** The pills in the design's order; FAILED only appears when the customer actually has one. */
const PILLS: OrderStatusKey[] = ["PENDING", "CONFIRMED", "PACKAGING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED", "RETURNED", "FAILED"];

/**
 * My Order controls (userOrder design): search, Sort by latest / oldest, and the status pills with
 * their counts. Everything lives in the URL (?q=&status=&sort=), so the server does the filtering and
 * links / back / refresh keep the view.
 */
export function OrdersToolbar({ counts, all }: { counts: Record<OrderStatusKey, number>; all: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "";
  const sort = sp.get("sort") === "oldest" ? "oldest" : "latest";
  const q = sp.get("q") ?? "";

  const href = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const s = next.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  const pill = (active: boolean) =>
    cn(
      "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-(--dur-fast)",
      active ? "border-primary bg-primary !text-on-primary" : "border-line bg-card !text-fg hover:border-primary hover:!text-primary",
    );
  const count = (n: number, active: boolean) =>
    n > 0 && <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold tabular-nums", active ? "bg-on-primary/20 text-on-primary" : "bg-iris-50 text-primary")}>{n}</span>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <form action={pathname} role="search" className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-card px-3.5 focus-within:border-primary sm:max-w-80">
          <Search aria-hidden className="size-4 shrink-0 text-fg-subtle" strokeWidth={2} />
          <label htmlFor="orders-q" className="sr-only">
            Search orders
          </label>
          <input id="orders-q" name="q" type="search" defaultValue={q} placeholder="Order # or product" className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg-strong outline-none placeholder:text-fg-subtle" />
          {status && <input type="hidden" name="status" value={status} />}
          {sort === "oldest" && <input type="hidden" name="sort" value="oldest" />}
        </form>
        <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-card px-3.5 text-sm font-semibold text-fg-strong focus-within:border-primary">
          <ArrowUpDown aria-hidden className="size-4 text-fg-subtle" strokeWidth={2} />
          <span className="sr-only">Sort orders</span>
          <select value={sort} onChange={(e) => router.push(href({ sort: e.target.value === "oldest" ? "oldest" : "" }))} className="h-full cursor-pointer bg-transparent outline-none">
            <option value="latest">Sort by latest</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      <nav aria-label="Filter by status" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex gap-2">
          <li>
            <Link href={href({ status: "" })} aria-current={!status ? "page" : undefined} className={pill(!status)}>
              All {count(all, !status)}
            </Link>
          </li>
          {PILLS.filter((s) => s !== "FAILED" || counts.FAILED > 0).map((s) => {
            const active = status === statusSlug(s);
            return (
              <li key={s}>
                <Link href={href({ status: statusSlug(s) })} aria-current={active ? "page" : undefined} className={pill(active)}>
                  {ORDER_STATUS_LABEL[s]} {count(counts[s], active)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
