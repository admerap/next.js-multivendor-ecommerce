import { ArrowLeft, Check, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SundryLogo } from "@/components/auth/SundryLogo";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Application Status" };

/** Held here until an admin approves the store. Copy follows the "Application submitted" state in vendorregister. */
export default async function VendorPendingPage() {
  const user = await requireArea("VENDOR_PENDING");
  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    select: { storeName: true, status: true },
  });
  const suspended = vendor?.status === "SUSPENDED";

  return (
    <main className="flex min-h-dvh flex-col bg-linear-150 from-iris-50 to-page">
      <div className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-8">
        <SundryLogo eyebrow="Seller Center" />
      </div>
      <div className="flex flex-1 items-center justify-center px-[var(--container-pad)] py-14">
        <div className="flex w-full max-w-[520px] flex-col items-center gap-3.5 rounded-xl bg-card p-[clamp(24px,4vw,44px)] text-center shadow-md">
          <span
            className={cn(
              "grid size-18 place-items-center rounded-full",
              suspended ? "bg-error-50 text-error-600" : "bg-success-50 text-success-600",
            )}
          >
            {suspended ? (
              <ShieldAlert aria-hidden className="size-8" strokeWidth={2} />
            ) : (
              <Check aria-hidden className="size-8" strokeWidth={2.4} />
            )}
          </span>
          <span className="text-caption font-bold uppercase tracking-[0.08em] text-primary">
            {suspended ? "Store suspended" : "You’re almost there"}
          </span>
          <h1 className="font-display text-h4 font-extrabold text-fg-strong">
            {suspended ? "Your store is on hold" : "Application submitted"}
          </h1>
          <p className="max-w-[380px] text-sm text-fg-muted">
            {suspended ? (
              <>
                {vendor?.storeName ?? "Your store"} has been suspended by the Sundry team. Contact seller support to
                find out what&apos;s needed to reinstate it.
              </>
            ) : (
              <>
                Thanks, {vendor?.storeName ?? "there"}. Our team reviews new sellers within 1–2 business days.
                We&apos;ll email <span className="font-semibold text-fg-strong">{user.email}</span> as soon as your
                store is approved.
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <SignOutButton />
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold hover:bg-hover"
            >
              <ArrowLeft aria-hidden className="size-4" strokeWidth={2} />
              Back to store
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
