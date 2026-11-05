import { ArrowRight, ShieldOff } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { MODULE_HOME, PERMISSION_MODULES, type PermissionModule } from "@/lib/permissions";

/**
 * "Your role can't open this": the No access page, and the Dashboard for a role without Dashboard › Read. Lists
 * the modules the role *can* open as shortcuts, or says to ask a Super Admin when there are none.
 */
export function NoAccess({ title, readable }: { title: string; readable: PermissionModule[] }) {
  const modules = PERMISSION_MODULES.filter((m) => m.key !== "dashboard" && readable.includes(m.key));
  return (
    <section className="rounded-lg bg-card shadow-sm">
      <EmptyState
        bare
        icon={ShieldOff}
        title={title}
        description={
          modules.length > 0
            ? "Your role doesn't include this. Here is what you can open:"
            : "Your role doesn't give access to any module yet. Ask a Super Admin to set your role's permissions."
        }
      >
        {modules.map((m) => (
          <Link
            key={m.key}
            href={MODULE_HOME[m.key]}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-card px-4 text-sm font-semibold !text-fg-strong transition-colors duration-(--dur-fast) hover:border-primary hover:!text-primary"
          >
            {m.label}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        ))}
      </EmptyState>
    </section>
  );
}
