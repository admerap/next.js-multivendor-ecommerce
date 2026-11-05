import { Search } from "lucide-react";
import Form from "next/form";
import { Button } from "@/components/ui/button";

/**
 * Server-rendered list search (GET ?q=): the query lands in the URL — reloads, bookmarks and shares as
 * is, works without JavaScript — and `keep` carries the list's other filters. Shared by the Seller
 * Center reports and the admin order list.
 */
export function SearchForm({ action, q, placeholder, keep }: { action: string; q: string; placeholder: string; keep: Record<string, string | undefined> }) {
  return (
    <Form action={action} role="search" className="flex min-w-0 flex-[1_1_280px] gap-2">
      {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <label className="flex h-11.5 min-w-0 flex-1 items-center rounded-md border border-line bg-card focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-50)]">
        <Search aria-hidden className="ml-3.5 size-4.5 shrink-0 text-fg-muted" strokeWidth={1.9} />
        <span className="sr-only">{placeholder}</span>
        <input type="search" name="q" defaultValue={q} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm text-fg-strong outline-none placeholder:text-fg-subtle" />
      </label>
      <Button type="submit" variant="secondary">
        <Search aria-hidden />
        Search
      </Button>
    </Form>
  );
}
