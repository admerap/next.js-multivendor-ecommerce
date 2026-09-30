import type { LucideIcon } from "lucide-react";
import { SignOutButton } from "./SignOutButton";

/**
 * Temporary landing for a protected area until its shell/dashboard is built from the design.
 * Proves the session reached the right place and offers sign-out.
 */
export function AreaPlaceholder({
  icon: Icon,
  area,
  name,
  email,
  detail,
}: {
  icon: LucideIcon;
  area: string;
  name?: string | null;
  email?: string | null;
  detail?: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-[var(--container-pad)] py-14">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-3 rounded-xl bg-card p-[clamp(24px,4vw,44px)] text-center shadow-md">
        <span className="grid size-14 place-items-center rounded-lg bg-primary shadow-primary">
          <Icon aria-hidden className="size-7 text-on-primary" strokeWidth={2} />
        </span>
        <span className="text-caption font-bold uppercase tracking-[0.08em] text-primary">{area}</span>
        <h1 className="font-display text-h4 font-extrabold text-fg-strong">Hello, {name ?? "there"}</h1>
        <p className="text-sm text-fg-muted">
          Signed in as <span className="font-semibold text-fg-strong">{email}</span>
          {detail && <> · {detail}</>}
        </p>
        <SignOutButton className="mt-2" />
      </div>
    </main>
  );
}
