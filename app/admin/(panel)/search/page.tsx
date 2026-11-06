import { ArrowRight, ChevronRight, Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChatAvatar } from "@/components/chat/ChatAvatar";
import { EmptyState } from "@/components/data/DashCard";
import { SetBreadcrumbs } from "@/components/shell/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { getAccess } from "@/lib/access.server";
import { searchAdmin } from "@/lib/admin-search.server";
import { requireArea } from "@/lib/auth-guard";
import { firstParams } from "@/lib/list-params";

export const metadata: Metadata = { title: "Search" };

const TONE: Record<string, "success" | "warning" | "neutral" | "error" | "primary" | "info"> = {
  Approved: "success",
  Active: "success",
  Delivered: "success",
  Pending: "warning",
  Denied: "error",
  Suspended: "error",
  Blocked: "error",
  Canceled: "neutral",
  Inactive: "neutral",
};

/**
 * Admin › Search (the header box, Enter): matches grouped by module — only the modules the signed-in role can
 * read — each hit opening its record, each group with "View all" into its filtered list when there is one.
 */
export default async function AdminSearchPage({ searchParams }: PageProps<"/admin/search">) {
  await requireArea("ADMIN");
  const q = String(firstParams(await searchParams).q ?? "").trim();
  const access = (await getAccess())!; // requireArea passed: an admin
  const groups = await searchAdmin(q, access); // throws → error.tsx (Retry)
  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Search" }]} />
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold tracking-[-0.02em] text-fg-strong">
            {q.length >= 2 ? <>Results for “{q}”</> : "Search"}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {q.length < 2
              ? "Type at least 2 characters in the search box above — an order number, a product, a store, a customer…"
              : total > 0
                ? `${total} match${total === 1 ? "" : "es"} in ${groups.length} section${groups.length === 1 ? "" : "s"} you can open.`
                : "Nothing matched in the sections you can open."}
          </p>
        </div>

        {q.length < 2 ? (
          <section className="rounded-lg bg-card shadow-sm">
            <EmptyState
              bare
              icon={Search}
              title="Search the admin panel"
              description="Orders (#100003), products or SKUs, stores, customers, brands, coupons, users and pages."
            />
          </section>
        ) : groups.length === 0 ? (
          <section className="rounded-lg bg-card shadow-sm">
            <EmptyState
              bare
              icon={SearchX}
              title="No matches"
              description="Check the spelling, or try fewer words — a name, an email, an order number or a SKU."
            />
          </section>
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-2">
            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`search-${g.key}`} className="overflow-hidden rounded-lg bg-card shadow-sm">
                <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                  <h2 id={`search-${g.key}`} className="mr-auto flex items-center gap-2 font-display text-base font-bold text-fg-strong">
                    {g.label}
                    <span className="rounded-full bg-iris-50 px-2 py-0.5 font-sans text-caption font-bold text-primary tabular-nums">{g.hits.length}</span>
                  </h2>
                  {g.viewAll && (
                    <Link href={g.viewAll} className="inline-flex min-h-11 items-center gap-1 text-caption font-semibold !text-primary hover:underline">
                      View all
                      <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  )}
                </div>
                <ul role="list">
                  {g.hits.map((h) => (
                    <li key={h.id} className="border-b border-line last:border-b-0">
                      <Link href={h.href} className="flex min-h-15 items-center gap-3 px-5 py-2.5 transition-colors duration-(--dur-fast) hover:bg-hover">
                        <ChatAvatar name={h.title} image={h.image ?? null} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-fg-strong">{h.title}</span>
                          <span className="block truncate text-caption text-fg-muted">{h.subtitle}</span>
                        </span>
                        {h.badge && <Badge tone={TONE[h.badge] ?? "info"}>{h.badge}</Badge>}
                        <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
