import { RotateCcw, ShieldCheck, ShoppingBag, Truck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const PERKS: { icon: LucideIcon; text: string }[] = [
  { icon: Truck, text: "Free shipping on orders over $75" },
  { icon: ShieldCheck, text: "Secure Stripe checkout & buyer protection" },
  { icon: RotateCcw, text: "7-day hassle-free returns" },
];

/**
 * Two-column auth card: Iris brand panel (logo, promise, perks) + form column.
 * The brand panel hides below 901px so the form comes first on phones.
 */
export function AuthSplit({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid w-full max-w-[1120px] overflow-hidden rounded-xl bg-card shadow-md md:grid-cols-2">
      <aside className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden bg-linear-135 from-iris-700 to-iris-900 p-[clamp(32px,4vw,48px)] text-on-primary md:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,var(--iris-400),transparent_55%)] opacity-35" />
        <div className="relative">
          <span className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-md bg-on-primary/15">
              <ShoppingBag aria-hidden className="size-5" strokeWidth={2} />
            </span>
            <span className="font-display text-[1.6rem] font-extrabold tracking-[-0.02em]">Sundry</span>
          </span>
          <p className="mt-5 max-w-[340px] text-[0.95rem] leading-relaxed text-on-primary/80">
            One storefront, one checkout, thousands of independent sellers and brands.
          </p>
        </div>
        <ul className="relative flex flex-col gap-4">
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm font-semibold">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-on-primary/15">
                <Icon aria-hidden className="size-4.5" strokeWidth={2} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex flex-col justify-center p-[clamp(24px,4vw,56px)]">
        <h1 className="font-display text-[clamp(1.6rem,3.5vw,2rem)] leading-tight font-extrabold tracking-[-0.02em] text-fg-strong">
          {title}
        </h1>
        <p className="mt-2 mb-7 text-[0.95rem] text-fg-muted">{subtitle}</p>
        {children}
        {footer && <p className="mt-6 text-center text-sm text-fg-muted">{footer}</p>}
      </div>
    </div>
  );
}
