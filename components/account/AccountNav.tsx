"use client";

import { Heart, Inbox, KeyRound, LogOut, MapPin, ShoppingBag, Truck, User, Headphones, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatPolling } from "@/components/chat/useChatPolling";
import { signOutAction } from "@/lib/actions/auth";
import { unreadTotalAction } from "@/lib/actions/chat";
import { CHAT_UNREAD_EVENT, LIST_POLL_MS } from "@/lib/chat";
import { cn } from "@/lib/utils";

/** Account pages from the route map (CLAUDE.md §5), plus Change Password. */
const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Profile Info", icon: User },
  { href: "/dashboard/change-password", label: "Change Password", icon: KeyRound },
  { href: "/dashboard/orders", label: "My Order", icon: ShoppingBag },
  { href: "/dashboard/wishlist", label: "Wish List", icon: Heart },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/addresses", label: "My Address", icon: MapPin },
  { href: "/dashboard/support", label: "Support Ticket", icon: Headphones },
  { href: "/dashboard/track-order", label: "Track Order", icon: Truck },
];

const item =
  "flex min-h-11 w-full items-center gap-3.5 rounded-md px-4 py-3 text-sm font-semibold transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

/** `inboxUnread`: unread messages from stores (layout, then kept fresh by polling + the chat's read events). */
export function AccountNav({ inboxUnread = 0 }: { inboxUnread?: number }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(inboxUnread);
  const refresh = async () => {
    const r = await unreadTotalAction();
    if (r.ok) setUnread(r.data);
  };
  useChatPolling(refresh, LIST_POLL_MS);
  useEffect(() => {
    const on = () => void refresh();
    window.addEventListener(CHAT_UNREAD_EVENT, on);
    return () => window.removeEventListener(CHAT_UNREAD_EVENT, on);
  }, []);

  return (
    <nav aria-label="Account" className="rounded-lg bg-card p-3 shadow-sm">
      <ul className="flex flex-col">
        {NAV.map(({ href, label, icon: Icon }) => {
          // /dashboard (Profile Info) is the parent of every other page here — it's active only on itself.
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(item, active ? "bg-iris-50 !text-primary" : "!text-fg hover:bg-hover")}
              >
                <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.8} />
                <span className="flex-1">{label}</span>
                {href === "/dashboard/inbox" && unread > 0 && (
                  <span className="grid h-5.5 min-w-5.5 place-items-center rounded-full bg-primary px-1.5 text-[0.7rem] font-bold !text-on-primary tabular-nums">
                    {unread > 99 ? "99+" : unread}
                    <span className="sr-only"> unread messages</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li className="mt-1 border-t border-line pt-1">
          <form action={signOutAction}>
            <button type="submit" className={cn(item, "cursor-pointer text-fg hover:bg-hover hover:text-error-600")}>
              <LogOut aria-hidden className="size-5 shrink-0" strokeWidth={1.8} />
              Log out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
