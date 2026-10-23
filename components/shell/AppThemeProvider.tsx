"use client";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * DESIGN_SYSTEM §3: only the admin panel may switch themes; every other area renders light
 * until its dark design is approved. Forcing per-route keeps one provider for the whole app.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const themeable = pathname.startsWith("/admin") && pathname !== "/admin/login";

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="sundry-admin-theme"
      forcedTheme={themeable ? undefined : "light"}
      // The no-flash script must run from the server HTML. When React re-creates it on the client
      // (HMR, error recovery) it never runs anyway, and React 19 warns about client-rendered scripts
      // unless they are a data block — so the client copy is inert text/plain. next-themes already
      // sets suppressHydrationWarning on it, so the differing type doesn't warn on hydration.
      scriptProps={{ type: typeof window === "undefined" ? "text/javascript" : "text/plain" }}
    >
      {children}
    </ThemeProvider>
  );
}
