import { CircleAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormAlert({
  message,
  variant = "storefront",
}: {
  message: string;
  /** storefront = triangle glyph, 13px; seller = circle glyph, 14px (vendor login design). */
  variant?: "storefront" | "seller";
}) {
  const Icon = variant === "seller" ? CircleAlert : TriangleAlert;
  return (
    <div
      role="alert"
      className={cn(
        "mb-4 flex items-center gap-2.5 rounded-md bg-error-50 px-3.5 py-3 font-semibold text-error-600",
        variant === "seller" ? "text-sm" : "text-caption",
      )}
    >
      <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={2} />
      {message}
    </div>
  );
}
