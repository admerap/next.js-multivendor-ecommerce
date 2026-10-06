"use client";

import { CircleCheck, CircleX, Info, X, type LucideIcon } from "lucide-react";
import { toast as hotToast, ToastBar, Toaster, type Toast } from "react-hot-toast";
import { useMediaQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const TONES: Record<Toast["type"], { icon?: LucideIcon; circle: string }> = {
  success: { icon: CircleCheck, circle: "bg-success-50 text-success-600" },
  error: { icon: CircleX, circle: "bg-error-50 text-error-600" },
  loading: { circle: "bg-iris-50 text-primary" },
  blank: { icon: Info, circle: "bg-iris-50 text-primary" },
  custom: { icon: Info, circle: "bg-iris-50 text-primary" },
};

/**
 * Notifications: light card (theme-aware tokens) with a tinted status icon and a dismiss button.
 * Top-right below the 68px top bar on desktop; top, full width on phones. Auto-hides after 3.5s (errors 5s).
 */
export function AppToaster() {
  const phone = useMediaQuery("(max-width: 720px)");

  return (
    <Toaster
      position={phone ? "top-center" : "top-right"}
      gutter={10}
      containerStyle={phone ? { top: 12, left: 16, right: 16 } : { top: 84, right: 24 }}
      toastOptions={{ duration: 3500, error: { duration: 5000 } }}
    >
      {(t) => (
        <ToastBar
          toast={t}
          // Strip the library's own card so ours is the only surface.
          style={{ padding: 0, background: "transparent", boxShadow: "none", maxWidth: "none", borderRadius: 0 }}
        >
          {({ message }) => {
            const tone = TONES[t.type];
            const Icon = tone.icon;
            return (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-line bg-card py-3 pr-2 pl-3 text-fg-strong shadow-xl",
                  phone ? "w-[calc(100vw-32px)]" : "w-[min(380px,calc(100vw-48px))]",
                )}
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", tone.circle)}>
                  {Icon ? (
                    <Icon aria-hidden className="size-5" strokeWidth={2} />
                  ) : (
                    <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  )}
                </span>
                <div className="min-w-0 flex-1 self-center text-sm font-semibold text-pretty [&>div]:!m-0 [&>div]:!justify-start [&>div]:text-left">
                  {message}
                </div>
                {t.type !== "loading" && (
                  <button
                    type="button"
                    onClick={() => hotToast.dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className="grid size-8 shrink-0 place-items-center rounded-md text-fg-muted transition-colors duration-(--dur-fast) hover:bg-hover hover:text-fg-strong focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <X aria-hidden className="size-4" strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          }}
        </ToastBar>
      )}
    </Toaster>
  );
}
