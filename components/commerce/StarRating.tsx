import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** DESIGN_SYSTEM StarRating: 5 stars in --color-rating (filled up to the rounded value) + "(count)". Sizes 14px / 18px. */
export function StarRating({ value, count, size = "sm", className }: { value: number; count?: number; size?: "sm" | "lg"; className?: string }) {
  const filled = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-label={count ? `Rated ${value.toFixed(1)} out of 5 from ${count} reviews` : "No reviews yet"}>
      <span aria-hidden className="inline-flex gap-px">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={cn(size === "lg" ? "size-4.5" : "size-3.5", "text-rating", i <= filled ? "fill-current" : "opacity-40")} strokeWidth={1.5} />
        ))}
      </span>
      {count !== undefined && <span aria-hidden className="text-[0.69rem] text-fg-muted tabular-nums">({count})</span>}
    </span>
  );
}
