import { Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SundryLogo } from "@/components/auth/SundryLogo";
import { VendorLoginForm } from "@/components/auth/VendorLoginForm";

export const metadata: Metadata = { title: "Vendor Sign In" };

export default async function VendorLoginPage({ searchParams }: PageProps<"/vendor/login">) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-wrap content-start bg-card md:content-stretch">
      {/* Brand panel */}
      <div className="relative flex min-w-0 flex-[1_1_480px] flex-col justify-center overflow-hidden bg-linear-150 from-iris-50 to-page px-5 py-6 md:min-h-dvh md:p-[clamp(32px,6vw,96px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,var(--iris-100),transparent_55%)]"
        />
        <div className="relative max-w-[560px]">
          <SundryLogo eyebrow="Seller Center" />
          <h1 className="mt-3.5 font-display text-[1.65rem] leading-[1.05] font-extrabold tracking-[-0.02em] text-fg-strong md:mt-10 md:text-[clamp(2.1rem,4.6vw,3.5rem)]">
            Make Your Business <span className="text-primary">Profitable…</span>
          </h1>
          <div className="hidden md:block">
            <p className="mt-4 mb-8 max-w-[460px] text-base leading-relaxed text-fg-muted">
              Manage products, orders and payouts for your store — all in one place.
            </p>
            <div className="relative grid aspect-[4/3] w-full max-w-[520px] place-items-center overflow-hidden rounded-2xl bg-card shadow-md">
              <span className="grid size-24 place-items-center rounded-full bg-iris-50">
                <Store aria-hidden className="size-11 text-iris-400" strokeWidth={1.6} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-w-0 flex-[1_1_440px] items-center justify-center px-5 pt-8 pb-12 md:px-[clamp(20px,5vw,80px)] md:py-[clamp(32px,6vw,96px)]">
        <div className="w-full max-w-[520px]">
          <h2 className="font-display text-h2 font-extrabold tracking-[-0.02em] text-fg-strong">Sign in</h2>
          <p className="mt-1.5 mb-7 text-base font-semibold text-fg">Welcome back to Vendor Login</p>
          <VendorLoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />
          <p className="mt-7 text-center text-caption text-fg-muted">
            Shopping instead?{" "}
            <Link href="/login" className="font-semibold">
              Customer sign in
            </Link>{" "}
            ·{" "}
            <Link href="/" className="font-semibold">
              Back to store
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
