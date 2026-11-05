import { CircleCheck, Clock3 } from "lucide-react";
import { EXPIRED_MESSAGE, type ExpiredReason } from "@/lib/session-policy";

/** Login page notice after an automatic sign-out (?expired=idle|max — IdleGuard / lib/session-policy). */
export function SessionExpiredNotice({ reason, passwordReset }: { reason?: ExpiredReason; passwordReset?: boolean }) {
  // ?reset=1 after choosing a new password (lib/actions/password-reset)
  if (passwordReset)
    return (
      <p role="status" className="mb-4 flex items-start gap-2.5 rounded-md bg-success-50 px-3.5 py-3 text-sm text-success-600">
        <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        Your password was updated. Sign in with your new password.
      </p>
    );
  if (!reason) return null;
  return (
    <p role="status" className="mb-4 flex items-start gap-2.5 rounded-md bg-info-50 px-3.5 py-3 text-sm text-info-600">
      <Clock3 aria-hidden className="mt-0.5 size-4 shrink-0" />
      {EXPIRED_MESSAGE[reason]}
    </p>
  );
}
