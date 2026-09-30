import { ArrowRight, Inbox, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { toneClasses, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

/** Tinted square icon tile used across dashboard cards. */
export function IconTile({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: Tone; size?: "sm" | "md" | "lg" }) {
  const t = toneClasses[tone];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        t.bg,
        t.fg,
        size === "sm" && "size-7 rounded-sm",
        size === "md" && "size-8.5 rounded-md",
        size === "lg" && "size-11 rounded-md",
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-4" : "size-5"} strokeWidth={1.9} />
    </span>
  );
}

/** Top-level dashboard section card (radius lg, shadow-sm, 24px padding). */
export function DashCard({
  title,
  icon,
  tone = "iris",
  actions,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  tone?: Tone;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-lg bg-card p-4 shadow-sm sm:p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-[-0.01em] text-fg-strong sm:text-h4">
          <IconTile icon={icon} tone={tone} />
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Bordered sub-panel inside a DashCard, with "View all" and a built-in empty state. */
export function SubCard({
  title,
  icon,
  tone,
  href,
  empty,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone: Tone;
  href: string;
  /** Shown instead of children when set. */
  empty?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5 rounded-lg border border-line p-3.5 sm:p-4.5">
      <div className="flex items-center justify-between gap-2.5">
        <h3 className="flex items-center gap-2.5 text-[0.9rem] font-bold text-fg-strong">
          <IconTile icon={icon} tone={tone} size="sm" />
          {title}
        </h3>
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-caption font-semibold whitespace-nowrap">
          View all
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
        </Link>
      </div>
      {empty ? (
        <div className="flex flex-col items-center gap-2 rounded-md bg-sunken px-4 py-8 text-center">
          <Inbox aria-hidden className="size-6 text-fg-subtle" strokeWidth={1.7} />
          <p className="max-w-[300px] text-caption text-fg-muted">{empty}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/** Segmented pill control (DESIGN_SYSTEM §5 Tabs, segmented style). */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex max-w-full gap-0.5 rounded-md border border-line bg-sunken p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "h-9 min-w-0 flex-1 rounded-sm px-2.5 text-caption font-semibold whitespace-nowrap transition-colors duration-(--dur-fast) sm:px-3.5",
            value === o.key ? "bg-card text-fg-strong shadow-xs" : "text-fg-muted hover:text-fg-strong",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** DESIGN_SYSTEM §5 EmptyState. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  bare = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
  /** Render without its own card (when already inside one). */
  bare?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3.5 px-6 text-center", bare ? "py-14" : "rounded-lg bg-card py-20 shadow-sm")}>
      <span className="grid size-21 place-items-center rounded-full bg-iris-50">
        <Icon aria-hidden className="size-10 text-iris-400" strokeWidth={1.6} />
      </span>
      <h3 className="font-display text-h4 font-extrabold text-fg-strong">{title}</h3>
      <p className="max-w-[420px] text-sm text-fg-muted">{description}</p>
      {children && <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">{children}</div>}
    </div>
  );
}
