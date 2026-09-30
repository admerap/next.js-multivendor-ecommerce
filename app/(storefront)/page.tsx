import { ArrowRight, LayoutDashboard, Store, UserPlus } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { buttonClasses } from "@/components/ui/button-classes";
import { homeFor } from "@/lib/auth-routes";

/** Temporary landing until the `Sundry Home` design is built. Header comes from (storefront)/layout. */
export default async function HomePage() {
  const session = await auth();
  const user = session?.user;
  const home = user ? homeFor(user.role, user.vendorStatus) : null;

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-linear-180 from-card to-page px-[var(--container-pad)] py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--iris-50),transparent_60%)]"
      />
      <div className="relative flex max-w-[880px] flex-col items-center text-center">
        <span className="rounded-full bg-primary-subtle px-3 py-1 text-caption font-bold uppercase tracking-[0.08em] text-primary">
          Multi-vendor marketplace
        </span>
        <h1 className="mt-5 font-display text-[clamp(2rem,6vw,3.5rem)] leading-[1.1] font-extrabold tracking-[-0.02em] text-fg-strong">
          One storefront, one checkout, <span className="text-primary">thousands of sellers.</span>
        </h1>
        <p className="mt-5 max-w-[520px] text-base text-pretty text-fg-muted">
          Sundry brings independent sellers and beloved brands under one trusted checkout. Sign in to shop, or open a
          store and start selling today.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {home ? (
            <Link href={home} className={buttonClasses.primary}>
              <LayoutDashboard aria-hidden className="size-4" strokeWidth={2} />
              Go to dashboard
            </Link>
          ) : (
            <Link href="/register" className={buttonClasses.primary}>
              <UserPlus aria-hidden className="size-4" strokeWidth={2} />
              Start shopping
            </Link>
          )}
          <Link href="/vendor/login" className={buttonClasses.secondary}>
            <Store aria-hidden className="size-4" strokeWidth={2} />
            Sell on Sundry
            <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
          </Link>
        </div>

        {!user && (
          <p className="mt-6 text-caption text-fg-muted">
            Administrator?{" "}
            <Link href="/admin/login" className="font-semibold">
              Admin sign in
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
