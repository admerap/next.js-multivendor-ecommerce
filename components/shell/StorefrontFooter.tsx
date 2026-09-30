import { MapPin, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

const QUICK_LINKS = [
  { label: "Profile Info", href: "/dashboard" },
  { label: "Flash Deals", href: "/offers" },
  { label: "Featured Products", href: "/category/featured" },
  { label: "Best Selling", href: "/category/best-selling" },
  { label: "Latest Products", href: "/category/latest" },
  { label: "Track Order", href: "/account/track-order" },
];

const OTHER_LINKS = [
  { label: "About Us", href: "#" },
  { label: "Terms & Conditions", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Refund Policy", href: "/account/support" },
  { label: "Return Policy", href: "/account/support" },
  { label: "Cancellation Policy", href: "/account/support" },
];

const link = "text-sm !text-fg-subtle transition-colors duration-(--dur-fast) hover:!text-on-primary";

/** Storefront footer (brand · Quick Links · Other · Newsletter · legal row). Always dark: inverse surface. */
export function StorefrontFooter() {
  return (
    <footer className="mt-14 bg-inverse text-fg-subtle">
      <div className="mx-auto grid max-w-[var(--container-max)] grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-8 px-[var(--container-pad)] py-14">
        <div className="min-w-0">
          <Link href="/" className="mb-4 flex items-center gap-2.5">
            <span className="grid size-8.5 place-items-center rounded-md bg-primary">
              <ShoppingBag aria-hidden className="size-4.5 text-on-primary" strokeWidth={2} />
            </span>
            <span className="font-display text-[1.25rem] font-extrabold text-on-primary">Sundry</span>
          </Link>
          <p className="text-sm leading-relaxed">
            One marketplace for thousands of independent sellers. Curated, verified, delivered.
          </p>
        </div>
        <nav aria-label="Quick links">
          <h4 className="mb-4 text-sm font-bold text-on-primary">Quick Links</h4>
          <ul className="flex flex-col gap-2.5">
            {QUICK_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={link}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Other">
          <h4 className="mb-4 text-sm font-bold text-on-primary">Other</h4>
          <ul className="flex flex-col gap-2.5">
            {OTHER_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={link}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <h4 className="mb-4 text-sm font-bold text-on-primary">Newsletter</h4>
          <p className="mb-3 text-sm">Subscribe to get the latest updates and deals.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-on-primary/8">
        <div className="mx-auto flex max-w-[var(--container-max)] flex-wrap items-center justify-between gap-3 px-[var(--container-pad)] py-5 text-caption text-fg-subtle">
          <span>© 2026 Sundry Marketplace. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <MapPin aria-hidden className="size-3.5" strokeWidth={2} />
            Kingston, New York 12401, United States
          </span>
        </div>
      </div>
    </footer>
  );
}
