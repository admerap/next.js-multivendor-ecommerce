import { User } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { AccountNav } from "@/components/account/AccountNav";
import { QuickViewProvider } from "@/components/commerce/QuickView";
import { HelpCards } from "@/components/commerce/StorefrontBits";
import { StorefrontFooter } from "@/components/shell/StorefrontFooter";
import { StorefrontHeader } from "@/components/shell/StorefrontHeader";
import { requireArea } from "@/lib/auth-guard";
import { chatViewer, unreadTotal } from "@/lib/chat.server";
import { prisma } from "@/lib/db";

const memberSince = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

/** Account shell (user.dashboard design): storefront header → profile card + nav → page → help cards. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  // Server-side role check; proxy.ts does the same optimistically.
  const sessionUser = await requireArea("CUSTOMER");
  const viewer = await chatViewer();
  const [user, inboxUnread] = await Promise.all([
    prisma.user.findUnique({ where: { id: sessionUser.id }, select: { name: true, email: true, createdAt: true, image: true } }),
    viewer ? unreadTotal(viewer) : 0,
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <StorefrontHeader />
      <div className="mx-auto grid w-full max-w-[var(--container-max)] items-start gap-6 px-[var(--container-pad)] pt-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5">
          {/* Profile card: centred on desktop; a compact row when the sidebar stacks above the page (≤1024),
              so phones don't see the photo and name twice before the content. */}
          <div className="flex items-center gap-3.5 rounded-lg bg-card px-4 py-3.5 shadow-sm lg:flex-col lg:gap-3 lg:px-5 lg:py-5.5 lg:text-center">
            <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-iris-50 lg:size-19">
              {user?.image ? (
                <Image src={user.image} alt="" fill sizes="(min-width: 1024px) 76px, 48px" className="object-cover" />
              ) : (
                <User aria-hidden className="size-6 text-primary lg:size-10" strokeWidth={1.6} />
              )}
            </span>
            <div className="min-w-0 flex-1 lg:w-full">
              <p className="truncate font-display text-base font-extrabold tracking-[-0.01em] text-fg-strong lg:text-lg">
                {user?.name ?? sessionUser.name}
              </p>
              <p className="mt-0.5 truncate text-caption text-fg-muted">{user?.email ?? sessionUser.email}</p>
              {user && (
                <p className="mt-0.5 text-caption text-fg-subtle max-lg:hidden">Member since {memberSince.format(user.createdAt)}</p>
              )}
            </div>
          </div>
          <AccountNav inboxUnread={inboxUnread} />
        </aside>
        {/* Quick view here too, so "Choose options" on a saved product opens the modal (Wish List). */}
        <main className="min-w-0">
          <QuickViewProvider>{children}</QuickViewProvider>
        </main>
      </div>
      <HelpCards className="pt-14" />
      <StorefrontFooter />
    </div>
  );
}
