import { Search, ShoppingBag } from "lucide-react";
import Form from "next/form";
import { cn } from "@/lib/utils";

/**
 * Track Order search (usertrackorder design): a plain GET form → /dashboard/track-order?order=<n>, so it
 * works without JavaScript, can be bookmarked and reloads to the same order. The server does the
 * (customer-scoped) lookup.
 */
export function TrackOrderForm({ value, error }: { value: string; error?: string }) {
  return (
    <Form action="/dashboard/track-order" className="flex flex-col gap-1.5" role="search" aria-label="Track an order">
      <div className="flex gap-3 max-sm:flex-col">
        {/* flex-1 only in the row layout: in the stacked (phone) column it would collapse the field's height. */}
        <label className={cn("flex h-13 min-w-0 items-center gap-3 sm:flex-1 rounded-md border bg-sunken px-4 focus-within:border-primary focus-within:bg-card", error ? "border-error-500" : "border-line")}>
          <ShoppingBag aria-hidden className="size-4.5 shrink-0 text-fg-muted" strokeWidth={1.9} />
          <span className="sr-only">Order number</span>
          <input
            name="order"
            defaultValue={value}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Enter your order ID, e.g. 100002"
            aria-invalid={!!error}
            aria-describedby={error ? "track-order-error" : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-fg-strong tabular-nums outline-none placeholder:font-normal placeholder:text-fg-subtle"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-7 text-base font-semibold text-on-primary shadow-primary transition-colors duration-(--dur-fast) hover:bg-primary-hover"
        >
          <Search aria-hidden className="size-4.5" strokeWidth={2} />
          Track
        </button>
      </div>
      {error && (
        <p id="track-order-error" role="alert" className="text-caption font-semibold text-error-600">
          {error}
        </p>
      )}
    </Form>
  );
}
