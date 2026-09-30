import { Building2, CircleHelp, MessageSquare, Newspaper, type LucideIcon } from "lucide-react";
import Link from "next/link";

const CARDS: { title: string; sub: string; icon: LucideIcon; href: string }[] = [
  { title: "About us", sub: "Know more about our company", icon: Building2, href: "#" },
  { title: "Contact Us", sub: "We're here to help", icon: MessageSquare, href: "/account/support" },
  { title: "FAQ", sub: "Get all answers", icon: CircleHelp, href: "#" },
  { title: "Blog", sub: "Check latest blogs", icon: Newspaper, href: "#" },
];

/** "Help quad" under the account pages (user.dashboard design). */
export function HelpCards() {
  return (
    <section
      aria-label="Help"
      className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-14"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-5">
        {CARDS.map(({ title, sub, icon: Icon, href }) => (
          <Link
            key={title}
            href={href}
            className="flex flex-col items-center gap-2 rounded-lg bg-card px-5 py-8 text-center shadow-sm transition-[box-shadow,transform] duration-(--dur-med) ease-out hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="mb-1 grid size-14 place-items-center rounded-full bg-iris-50">
              <Icon aria-hidden className="size-6.5 text-primary" strokeWidth={1.7} />
            </span>
            <span className="font-display text-base font-bold text-fg-strong">{title}</span>
            <span className="text-caption text-fg-muted">{sub}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
