import { KeyRound, UserRound } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Basic Information", href: "/vendor/profile", icon: UserRound },
  { label: "Password", href: "/vendor/change-password", icon: KeyRound },
] as const;

/** Pill tabs under the page title (vendorProfile / vendorchangepassword designs). */
export function ProfileTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Profile sections" className="flex flex-wrap gap-2">
      {TABS.map(({ label, href, icon: Icon }) => {
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
