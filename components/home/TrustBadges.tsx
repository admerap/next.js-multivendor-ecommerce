import { BadgeCheck, RotateCcw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import { money } from "@/lib/money";
import { FREE_SHIPPING_CENTS } from "@/lib/storefront";
import { cn } from "@/lib/utils";

const BADGES: { icon: LucideIcon; title: string; text: string; tile: string }[] = [
  // Same threshold as the header promo and the MiniCart progress bar.
  { icon: Truck, title: "Free nationwide delivery", text: `On orders over ${money(FREE_SHIPPING_CENTS).replace(/\.00$/, "")}`, tile: "bg-iris-50 text-primary" },
  { icon: ShieldCheck, title: "Secure payment", text: "Encrypted checkout", tile: "bg-success-50 text-success-600" },
  { icon: RotateCcw, title: "7-day returns", text: "Hassle-free refunds", tile: "bg-saffron-50 text-saffron-700" },
  { icon: BadgeCheck, title: "100% authentic", text: "Verified sellers only", tile: "bg-info-50 text-info-600" },
];

/** Trust badges strip above the footer (Sundry Home design). */
export function TrustBadges() {
  return (
    <section aria-label="Why shop on Sundry" className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-16">
      <ul role="list" className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))]">
        {BADGES.map(({ icon: Icon, title, text, tile }) => (
          <li key={title} className="flex items-center gap-4 rounded-lg bg-card p-6 shadow-sm">
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-md", tile)}>
              <Icon aria-hidden className="size-5.5" strokeWidth={1.9} />
            </span>
            <div>
              <p className="text-sm font-bold text-fg-strong">{title}</p>
              <p className="mt-0.5 text-caption text-fg-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
