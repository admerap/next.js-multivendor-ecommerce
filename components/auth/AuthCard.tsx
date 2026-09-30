import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Centered auth card from `Login Page` / `Register Page` designs (breadcrumb → 520px card). */
export function AuthCard({
  crumb,
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  /** Breadcrumb label. Omit to hide the breadcrumb row (admin login). */
  crumb?: string;
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-14">
      {crumb && (
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-caption text-fg-muted">
          <Link href="/" className="!text-fg-muted hover:!text-primary">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span aria-current="page" className="font-semibold text-fg-strong">
            {crumb}
          </span>
        </nav>
      )}
      <div className="mx-auto max-w-[520px] rounded-xl bg-card p-[clamp(24px,4vw,44px)] shadow-md">
        <header className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid size-14 place-items-center rounded-lg bg-primary shadow-primary">
            <Icon aria-hidden className="size-7 text-on-primary" strokeWidth={2} />
          </span>
          {eyebrow && (
            <span className="mb-2 text-caption font-bold uppercase tracking-[0.08em] text-primary">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-[clamp(1.5rem,4vw,1.75rem)] leading-tight font-extrabold tracking-[-0.02em] text-fg-strong">
            {title}
          </h1>
          <p className="mt-2 max-w-[360px] text-sm text-pretty text-fg-muted">{subtitle}</p>
        </header>
        {children}
        {footer && <p className="mt-6 text-center text-sm text-fg-muted">{footer}</p>}
      </div>
    </section>
  );
}
