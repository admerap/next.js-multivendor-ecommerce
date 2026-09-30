import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/** Clears the session and returns to the signed-in role's login page. */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-md border border-line bg-card px-4 text-sm font-semibold text-fg-strong transition-colors duration-(--dur-fast) hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          className,
        )}
      >
        <LogOut aria-hidden className="size-4" strokeWidth={2} />
        Log out
      </button>
    </form>
  );
}
