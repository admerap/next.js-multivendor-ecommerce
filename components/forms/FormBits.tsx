import { CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card section from vendoraddproduct: title + one-line description, optional control on the right. */
export function FormSection({ title, description, aside, children, className }: { title: string; description: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg bg-card p-4 shadow-sm sm:p-6", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[1.125rem] font-extrabold tracking-[-0.01em] text-fg-strong">{title}</h2>
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const labelCls = "flex min-h-5 items-center gap-1.5 text-[0.82rem] font-semibold text-fg";

/** Label row (required star, ⓘ hint, optional right-side action), the control, then the inline error. */
export function Field({
  id,
  label,
  required,
  info,
  action,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  info?: string;
  action?: ReactNode;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className={labelCls}>
          {label}
          {required && (
            <span aria-hidden className="text-error-500">
              *
            </span>
          )}
          {info && (
            <span title={info} className="inline-flex text-fg-muted">
              <Info aria-hidden className="size-3.75" strokeWidth={2} />
              <span className="sr-only">({info})</span>
            </span>
          )}
        </label>
        {action}
      </div>
      {children}
      {hint && !error && <span className="text-caption text-fg-muted">{hint}</span>}
      <FieldError id={id} error={error} />
    </div>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <span id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
      <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
      {error}
    </span>
  );
}

/** aria props for a control tied to <Field id error>. */
export const ariaFor = (id: string, error?: string) => ({
  id,
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : undefined,
});
