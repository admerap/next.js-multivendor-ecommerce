import { User } from "lucide-react";
import type { ReactNode } from "react";
import { AccountNav } from "@/components/account/AccountNav";
import { HelpCards } from "@/components/account/HelpCards";
import { StorefrontFooter } from "@/components/shell/StorefrontFooter";
import { StorefrontHeader } from "@/components/shell/StorefrontHeader";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

const memberSince = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

/** Account shell (user.dashboard design): storefront header → profile card + nav → page → help cards. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  // Server-side role check; proxy.ts does the same optimistically.
  const sessionUser = await requireArea("CUSTOMER");
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, createdAt: true },
  });

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <StorefrontHeader />
      <div className="mx-auto grid w-full max-w-[var(--container-max)] items-start gap-6 px-[var(--container-pad)] pt-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-card px-5 py-5.5 text-center shadow-sm">
            <span className="grid size-19 place-items-center rounded-full bg-iris-50">
              <User aria-hidden className="size-10 text-primary" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-extrabold tracking-[-0.01em] text-fg-strong">
                {user?.name ?? sessionUser.name}
              </p>
              <p className="mt-0.5 truncate text-caption text-fg-muted">{user?.email ?? sessionUser.email}</p>
              {user && (
                <p className="mt-0.5 text-caption text-fg-subtle">Member since {memberSince.format(user.createdAt)}</p>
              )}
            </div>
          </div>
          <AccountNav />
        </aside>
        <main className="min-w-0 rounded-lg bg-card p-[clamp(20px,3vw,36px)] shadow-sm">{children}</main>
      </div>
      <HelpCards />
      <StorefrontFooter />
    </div>
  );
}
