import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The white content card of a form page in the account area (Profile Info, Change Password…). */
export function AccountCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg bg-card p-[clamp(20px,3vw,36px)] shadow-sm", className)}>{children}</div>;
}
