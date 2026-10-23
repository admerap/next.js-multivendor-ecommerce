"use client";

import { ImagePlus, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRODUCT_IMAGE_ACCEPT, PRODUCT_LIMITS, type VariantAttribute } from "@/lib/validations/product";
import { ariaFor, FieldError, labelCls } from "@/components/forms/FormBits";
import { TagInput } from "./TagInput";

export type OptionState = { name: VariantAttribute; values: string[] };
/** Per-combination edits. Unset price follows the unit price; unset SKU follows the product SKU. */
export type RowState = { price?: string; stock?: string; sku?: string; removed?: boolean; file?: File | null; /** blob preview of `file` */ preview?: string; /** saved image (edit) */ url?: string | null };
export type Combination = { name: string; attributes: Record<string, string> };

const EXTRA: VariantAttribute[] = ["Size", "Storage", "Material"];

export const defaultVariationSku = (baseSku: string, c: Combination) =>
  [baseSku.trim() || "SKU", ...Object.values(c.attributes).map((v) => v.toUpperCase().replace(/[^A-Z0-9]+/g, ""))].join("-").slice(0, PRODUCT_LIMITS.sku);

function VariationImage({ name, row, onChange, error }: { name: string; row: RowState; onChange: (patch: RowState) => void; error?: string }) {
  const src = row.preview ?? row.url;
  return (
    <div className="flex items-center gap-1.5">
      <label
        className={cn(
          "relative grid size-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed bg-card text-primary hover:border-primary hover:bg-iris-50",
          error ? "border-error-500" : "border-line-default",
        )}
        title={src ? "Replace image" : "Add image"}
      >
        <input
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          aria-label={`${src ? "Replace" : "Add"} image for ${name}`}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              if (row.preview) URL.revokeObjectURL(row.preview);
              onChange({ file: f, preview: URL.createObjectURL(f) });
            }
            e.target.value = "";
          }}
        />
        {src ? <span aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${src}")` }} /> : <ImagePlus aria-hidden className="size-4" strokeWidth={2} />}
      </label>
      {src && (
        <button type="button" onClick={() => {
            if (row.preview) URL.revokeObjectURL(row.preview);
            onChange({ file: null, preview: undefined, url: null });
          }} aria-label={`Remove image for ${name}`} className="grid size-8 place-items-center rounded-md text-fg-muted hover:text-error-600 max-lg:size-11">
          <X aria-hidden className="size-4" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

/**
 * Product Variation Setup: Colors + extra attributes (Size / Storage / Material). Every combination
 * becomes a row with its own price, stock, SKU and optional image; rows can be removed and restored.
 */
export function VariationSetup({
  uid,
  options,
  onOptionsChange,
  rows,
  onRowsChange,
  combinations,
  unitPrice,
  baseSku,
  errors,
}: {
  uid: string;
  options: OptionState[];
  onOptionsChange: (o: OptionState[]) => void;
  rows: Record<string, RowState>;
  onRowsChange: (r: Record<string, RowState>) => void;
  combinations: Combination[];
  unitPrice: string;
  baseSku: string;
  /** keyed by "options", "<attribute>", "rows" or "<combination>.<field>" */
  errors: Record<string, string | undefined>;
}) {
  const color = options.find((o) => o.name === "Color");
  const extras = options.filter((o) => o.name !== "Color");
  const available = EXTRA.filter((a) => !extras.some((o) => o.name === a));
  const setValues = (name: VariantAttribute, values: string[]) => {
    const exists = options.some((o) => o.name === name);
    const next = exists ? options.map((o) => (o.name === name ? { ...o, values } : o)) : [...options, { name, values }];
    // Keep Color first so names read "Red / M".
    onOptionsChange(next.sort((a, b) => Number(b.name === "Color") - Number(a.name === "Color")));
  };
  const patch = (name: string, p: RowState) => onRowsChange({ ...rows, [name]: { ...rows[name], ...p } });
  const active = combinations.filter((c) => !rows[c.name]?.removed);
  const removed = combinations.length - active.length;
  const total = active.reduce((n, c) => n + (Number(rows[c.name]?.stock ?? "0") || 0), 0);

  return (
    <div className="mt-1 flex flex-col gap-5 border-t border-line pt-5">
      <div className="grid items-start gap-x-5 gap-y-4.5 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${uid}-opt-Color`} className={labelCls}>
            Colors
          </label>
          <TagInput
            id={`${uid}-opt-Color`}
            values={color?.values ?? []}
            onChange={(v) => setValues("Color", v)}
            placeholder="e.g. Midnight, Silver — press Enter"
            max={PRODUCT_LIMITS.values}
            maxLength={PRODUCT_LIMITS.value}
            invalid={!!errors.Color}
            describedBy={errors.Color ? `${uid}-opt-Color-error` : undefined}
          />
          <FieldError id={`${uid}-opt-Color`} error={errors.Color} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span id={`${uid}-attr-label`} className={labelCls}>
            Attributes
          </span>
          <Select value="" onValueChange={(v) => setValues(v as VariantAttribute, [])} disabled={available.length === 0 || options.length >= PRODUCT_LIMITS.attributes}>
            <SelectTrigger aria-labelledby={`${uid}-attr-label`} className="h-12">
              <SelectValue placeholder={available.length ? "Add an attribute (Size, Storage, Material)" : "All attributes added"} />
            </SelectTrigger>
            <SelectContent>
              {available.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={`${uid}-options`} error={errors.options} />
        </div>
        {extras.map((o) => (
          <div key={o.name} className="flex min-w-0 flex-col gap-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`${uid}-opt-${o.name}`} className={labelCls}>
                {o.name}
              </label>
              <button
                type="button"
                onClick={() => onOptionsChange(options.filter((x) => x.name !== o.name))}
                className="inline-flex items-center gap-1 text-caption font-semibold text-fg-muted hover:text-error-600 max-lg:min-h-11"
              >
                <Trash2 aria-hidden className="size-3.5" strokeWidth={2} />
                Remove {o.name.toLowerCase()}
              </button>
            </div>
            <TagInput
              id={`${uid}-opt-${o.name}`}
              values={o.values}
              onChange={(v) => setValues(o.name, v)}
              placeholder={o.name === "Size" ? "e.g. S, M, L — press Enter" : o.name === "Storage" ? "e.g. 128GB, 256GB — press Enter" : "e.g. Cotton, Linen — press Enter"}
              max={PRODUCT_LIMITS.values}
              maxLength={PRODUCT_LIMITS.value}
              invalid={!!errors[o.name]}
              describedBy={errors[o.name] ? `${uid}-opt-${o.name}-error` : undefined}
            />
            <FieldError id={`${uid}-opt-${o.name}`} error={errors[o.name]} />
          </div>
        ))}
      </div>

      {combinations.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-fg-strong">
              Variations <span className="text-fg-muted tabular-nums">({active.length})</span>
              <span className="ml-2 font-semibold text-fg-muted">· {total.toLocaleString("en-US")} in stock</span>
            </h3>
            {removed > 0 && (
              <button
                type="button"
                onClick={() => onRowsChange(Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { ...r, removed: false }])))}
                className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary max-lg:min-h-11"
              >
                <RotateCcw aria-hidden className="size-3.5" strokeWidth={2} />
                Restore {removed} removed
              </button>
            )}
          </div>
          {/* Header only where rows lay out as a grid */}
          <div aria-hidden className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_5.5rem_2.75rem] gap-3 rounded-md bg-sunken px-3 py-2.5 text-[0.7rem] font-bold tracking-[0.06em] text-fg-muted uppercase md:grid">
            <span>Variation</span>
            <span>Price ($)</span>
            <span>Stock</span>
            <span>SKU</span>
            <span>Image</span>
            <span />
          </div>
          <ul role="list" aria-label="Variations" className="flex flex-col gap-3 md:gap-0">
            {active.map((c) => {
              const r = rows[c.name] ?? {};
              const key = (f: string) => `${c.name}.${f}`;
              const fid = (f: string) => `${uid}-v-${c.name.replace(/[^\w]+/g, "_")}-${f}`;
              return (
                <li
                  key={c.name}
                  className="grid grid-cols-2 items-start gap-3 rounded-lg border border-line p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_5.5rem_2.75rem] md:items-center md:rounded-none md:border-0 md:border-b md:px-3 md:py-2.5"
                >
                  <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 md:col-span-1">
                    <span className="truncate text-sm font-bold text-fg-strong" title={c.name}>
                      {c.name}
                    </span>
                    {errors[key("name")] && <FieldError id={fid("name")} error={errors[key("name")]} />}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor={fid("price")} className="text-caption font-semibold text-fg-muted md:sr-only">
                      Price for {c.name} ($)
                    </label>
                    <Input
                      {...ariaFor(fid("price"), errors[key("price")])}
                      inputMode="decimal"
                      value={r.price ?? unitPrice}
                      onChange={(e) => patch(c.name, { price: e.target.value })}
                      placeholder={unitPrice || "0.00"}
                      className="h-11 tabular-nums"
                    />
                    <FieldError id={fid("price")} error={errors[key("price")]} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor={fid("stock")} className="text-caption font-semibold text-fg-muted md:sr-only">
                      Stock for {c.name}
                    </label>
                    <Input
                      {...ariaFor(fid("stock"), errors[key("stock")])}
                      inputMode="numeric"
                      value={r.stock ?? "0"}
                      onChange={(e) => patch(c.name, { stock: e.target.value })}
                      className="h-11 tabular-nums"
                    />
                    <FieldError id={fid("stock")} error={errors[key("stock")]} />
                  </div>
                  <div className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-1">
                    <label htmlFor={fid("sku")} className="text-caption font-semibold text-fg-muted md:sr-only">
                      SKU for {c.name}
                    </label>
                    <Input
                      {...ariaFor(fid("sku"), errors[key("sku")])}
                      value={r.sku ?? defaultVariationSku(baseSku, c)}
                      onChange={(e) => patch(c.name, { sku: e.target.value })}
                      maxLength={PRODUCT_LIMITS.sku}
                      className="h-11"
                    />
                    <FieldError id={fid("sku")} error={errors[key("sku")]} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-caption font-semibold text-fg-muted md:sr-only">Image</span>
                    <VariationImage name={c.name} row={r} onChange={(p) => patch(c.name, p)} error={errors[key("image")]} />
                    <FieldError id={fid("image")} error={errors[key("image")]} />
                  </div>
                  <div className="flex items-end justify-end self-stretch md:items-center">
                    <button
                      type="button"
                      onClick={() => patch(c.name, { removed: true })}
                      aria-label={`Remove ${c.name}`}
                      title="Don't sell this combination"
                      className="grid size-11 place-items-center rounded-md border border-line bg-error-50 text-error-600 transition-colors duration-(--dur-fast) hover:bg-error-500 hover:text-on-primary"
                    >
                      <Trash2 aria-hidden className="size-4" strokeWidth={2} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {active.length === 0 && (
            <p className="rounded-md bg-sunken px-4 py-3 text-sm text-fg-muted">
              All combinations are removed. Restore some, or turn variations off.
            </p>
          )}
          <FieldError id={`${uid}-rows`} error={errors.rows} />
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-md bg-sunken px-4 py-3 text-sm text-fg-muted">
          <Plus aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={2} />
          Add colors or attribute values — each combination becomes a variation with its own price and stock.
        </p>
      )}
    </div>
  );
}
