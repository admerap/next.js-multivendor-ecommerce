import { CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live signal under a "Confirm password" field: green check when it matches the first password,
 * a cross while it doesn't. Hidden until something is typed. Announced politely to screen readers.
 */
export function PasswordMatchHint({ password, confirm, id }: { password: string; confirm: string; id?: string }) {
  if (!confirm) return null;
  const match = confirm === password;
  const Icon = match ? CircleCheck : CircleX;
  return (
    <span id={id} aria-live="polite" className={cn("flex items-center gap-1.5 text-caption font-semibold", match ? "text-success-600" : "text-error-600")}>
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
      {match ? "Passwords match" : "Passwords don't match"}
    </span>
  );
}
