"use client";

import { Toaster } from "react-hot-toast";

/** DESIGN_SYSTEM §5 Toast: inverse surface, white text, radius md, bottom-right, 3s. */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        className:
          "!bg-inverse !text-on-primary !rounded-md !shadow-xl !text-sm !font-semibold !max-w-[min(420px,calc(100vw-32px))]",
        error: { iconTheme: { primary: "var(--error-500)", secondary: "var(--neutral-0)" } },
        success: { iconTheme: { primary: "var(--success-500)", secondary: "var(--neutral-0)" } },
      }}
    />
  );
}
