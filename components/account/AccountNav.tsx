"use client";

import { Heart, Inbox, LogOut, MapPin, ShoppingBag, Truck, User, Headphones, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/** Account pages that exist in the route map (CLAUDE.md §5). */
const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Profile Info", icon: User },
  { href: "/account/orders", label: "My Order", icon: ShoppingBag },
  { href: "/account/wishlist", label: "Wish List", icon: Heart },
  { href: "/account/inbox", label: "Inbox", icon: Inbox },
  { href: "/account/addresses", label: "My Address", icon: MapPin },
  { href: "/account/support", label: "Support Ticket", icon: Headphones },
  { href: "/account/track-order", label: "Track Order", icon: Truck },
];

const item =
  "flex min-h-11 w-full items-center gap-3.5 rounded-md px-4 py-3 text-sm font-semibold transition-colors duration-(--dur-fast) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="rounded-lg bg-card p-3 shadow-sm">
      <ul className="flex flex-col">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(item, active ? "bg-iris-50 !text-primary" : "!text-fg hover:bg-hover")}
              >
                <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.8} />
                {label}
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
