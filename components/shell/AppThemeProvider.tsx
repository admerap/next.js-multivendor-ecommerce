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
    >
      {children}
    </ThemeProvider>
  );
}
