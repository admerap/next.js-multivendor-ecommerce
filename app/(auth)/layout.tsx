import type { ReactNode } from "react";
import { AuthHeader } from "@/components/auth/AuthHeader";

/** Customer sign-in / sign-up frame: minimal header, no storefront chrome or footer. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-linear-180 from-card to-page">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-[var(--container-pad)] py-[clamp(24px,5vw,56px)]">
        {children}
      </main>
    </div>
  );
}
