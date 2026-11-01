import { BookOpen, Building2, CircleHelp, MessageSquare, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Page container (same width/padding as every storefront section). */
export const pageContainer = "mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)]";

/** Storefront breadcrumb: linked trail + the current page (Home / … / Current). */
export function Breadcrumb({ trail, current }: { trail: { name: string; href: string }[]; current: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn(pageContainer, "pt-6")}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.81rem] text-fg-muted">
        {trail.map((c) => (
          <li key={c.href} className="flex items-center gap-2">
            <Link href={c.href} className="!text-fg-muted hover:!text-primary max-lg:inline-flex max-lg:min-h-11 max-lg:min-w-11 max-lg:items-center max-lg:justify-center">
              {c.name}
            </Link>
            <span aria-hidden>/</span>
          </li>
        ))}
        <li aria-current="page" className="min-w-0 truncate font-semibold text-fg-strong">
          {current}
        </li>
      </ol>
    </nav>
  );
}

// All four go to the support centre, as in the design (no About / FAQ / Blog pages yet).
// TODO(content): point About us / FAQ / Blog at their own pages once they exist.
const HELP: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Building2, title: "About us", text: "Know about our company more." },
  { icon: MessageSquare, title: "Contact Us", text: "We are Here to Help" },
  { icon: CircleHelp, title: "FAQ", text: "Get all Answers" },
  { icon: BookOpen, title: "Blog", text: "Check Latest Blogs" },
];

/** Help quad under the page (Product Detail Page design). */
export function HelpCards({ className = "pt-8" }: { className?: string }) {
  return (
    <section aria-label="Help" className={cn(pageContainer, className)}>
      <ul role="list" className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
        {HELP.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <Link
              href="/account/support"
              className="flex h-full flex-col items-center gap-2 rounded-lg bg-card px-5 py-8 text-center shadow-sm transition-[box-shadow,transform] duration-(--dur-med) ease-out hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="mb-1 grid size-14 place-items-center rounded-full bg-iris-50">
                <Icon aria-hidden className="size-6 text-primary" strokeWidth={1.8} />
              </span>
              <span className="font-display text-[1.06rem] font-bold text-fg-strong">{title}</span>
              <span className="text-[0.81rem] text-fg-muted">{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

