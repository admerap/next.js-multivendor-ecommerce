import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type PillTab = { label: string; href: string; icon: LucideIcon };

/**
 * Pill tabs above a page's card (vendorProfile / vendorchangepassword designs; admin Profile): links, so the
 * chosen tab lives in the URL. `active` is the current tab's href. Equal widths on phones, natural from sm.
 */
export function PillTabs({ tabs, active, label }: { tabs: readonly PillTab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map(({ label: text, href, icon: Icon }) => {
        const on = href === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-(--dur-fast) sm:flex-none sm:px-5",
              on ? "bg-primary !text-on-primary shadow-primary" : "!text-fg-muted hover:bg-iris-50 hover:!text-primary",
            )}
          >
            <Icon aria-hidden className="size-4" strokeWidth={2} />
            {text}
          </Link>
        );
      })}
    </nav>
  );
}
