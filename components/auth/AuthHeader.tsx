import { Store } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { SundryLogo } from "./SundryLogo";

/** Minimal header for customer sign-in / sign-up (no search, cart or footer). */
export function AuthHeader() {
  return (
    <header className="border-b border-line bg-card/85 backdrop-blur">
      <div className="mx-auto flex h-18 w-full max-w-[var(--container-max)] items-center justify-between gap-3 px-[var(--container-pad)]">
        <div className="flex items-center gap-8">
          <SundryLogo />
          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
            <Link href="/" className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold !text-fg hover:bg-hover hover:!text-primary">
              Home
            </Link>
            <Link href="/vendor/login" className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold !text-fg hover:bg-hover hover:!text-primary">
              Sell on Sundry
            </Link>
          </nav>
        </div>
        <Link href="/vendor/login" className={buttonClasses.primary}>
          <Store aria-hidden className="size-4" strokeWidth={2} />
          Start selling
        </Link>
      </div>
    </header>
  );
}
