import { cn } from "@/lib/utils";
import { LOW_STOCK, type ProductTypeValue } from "@/lib/validations/product";

/** Stock cell from the designs: "—" for digital, "Out of stock" at 0, "7 · Low" under the threshold. */
export function StockText({ p }: { p: { productType: ProductTypeValue; stock: number; variationsCount: number } }) {
  if (p.productType === "DIGITAL") return <span className="font-semibold text-fg-subtle">—</span>;
  const tone = p.stock === 0 ? "text-error-600" : p.stock < LOW_STOCK ? "text-warning-600" : "text-fg-strong";
  return (
    <span className={cn("font-semibold tabular-nums", tone)} title={p.variationsCount ? `Total of ${p.variationsCount} variations` : undefined}>
      {p.stock === 0 ? "Out of stock" : p.stock < LOW_STOCK ? <span className="whitespace-nowrap">{p.stock} · Low</span> : p.stock}
    </span>
  );
}
