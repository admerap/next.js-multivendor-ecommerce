"use client";

import { Check, RotateCcw, Shuffle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  createProduct,
  updateProduct,
  getSubCategoryOptions,
  searchBrandOptions,
  getSubSubCategoryOptions,
  type ActionResult,
  type CatalogOption,
} from "@/app/vendor/(panel)/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { htmlToText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import {
  buildCombinations,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_LIMITS,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
  PRODUCT_UNITS,
  productFormSchema,
  UNIT_LABELS,
  type DiscountTypeValue,
  type ProductFormInput,
  type ProductTypeValue,
  type ProductUnitValue,
} from "@/lib/validations/product";
import { ariaFor, Field, FieldError, FormSection } from "@/components/forms/FormBits";
import { GalleryUpload, type GalleryItem } from "./GalleryUpload";
import { RichTextEditor } from "./RichTextEditor";
import { TagInput } from "./TagInput";
import { ThumbnailDrop } from "./ThumbnailDrop";
import { defaultVariationSku, VariationSetup, type OptionState, type RowState } from "./VariationSetup";

export type ProductFormValues = {
  name: string;
  shortDescription: string;
  description: string;
  productType: ProductTypeValue;
  categoryId: string;
  subCategoryId: string;
  subSubCategoryId: string;
  brandId: string;
  sku: string;
  unit: ProductUnitValue;
  tags: string[];
  price: string;
  minOrderQty: string;
  stock: string;
  discountType: DiscountTypeValue;
  discountValue: string;
  shippingCost: string;
  shippingPerUnit: boolean;
  hasVariations: boolean;
  videoUrl: string;
  metaTitle: string;
  metaDescription: string;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  shortDescription: "",
  description: "",
  productType: "PHYSICAL",
  categoryId: "",
  subCategoryId: "",
  subSubCategoryId: "",
  brandId: "",
  sku: "",
  unit: "PC",
  tags: [],
  price: "",
  minOrderQty: "1",
  stock: "0",
  discountType: "FLAT",
  discountValue: "0",
  shippingCost: "0.00",
  shippingPerUnit: false,
  hasVariations: false,
  videoUrl: "",
  metaTitle: "",
  metaDescription: "",
};

/** `parent` = the id these options were requested for; a reply for another parent is ignored. */
type Options = { status: "idle" | "loading" | "ready" | "error"; items: CatalogOption[]; parent?: string };
const NONE = "__none";
const IMG_HINT = "JPG, PNG or WEBP · max 1 MB · 4:3 ratio (800 × 600 px)";

/** Short store prefix + random code, e.g. "HAN-7K2Q9B" (design: Generate code). */
function generateSku(storeName: string) {
  const prefix = storeName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "SKU";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${prefix}-${[...bytes].map((b) => chars[b % chars.length]).join("")}`;
}

const inputCls = "h-12 focus-visible:shadow-[0_0_0_3px_var(--iris-100)]";

/** Edit mode: the saved product's images, variations and the option lists of its category path. */
export type ProductEditState = {
  id: string;
  thumbnailUrl: string | null;
  gallery: string[];
  options: OptionState[];
  rows: Record<string, RowState>;
  subs: CatalogOption[];
  subSubs: CatalogOption[];
};

/**
 * Add / Edit Product form (vendoraddproduct + vendoreditproduct designs, English only — no language
 * tabs). The same Zod schema runs here for instant feedback and again in the server action.
 * Category → sub → sub-sub options are fetched from the server as each parent is chosen.
 */
export function ProductForm({
  storeName,
  categories,
  brandLabel,
  initial = EMPTY_PRODUCT,
  edit,
}: {
  storeName: string;
  categories: CatalogOption[];
  /** edit form: name of the saved brand (brands are searched on the server, not preloaded) */
  brandLabel?: string;
  initial?: ProductFormValues;
  edit?: ProductEditState;
}) {
  const uid = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [v, setV] = useState<ProductFormValues>(initial);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  /** blob preview of the newly picked thumbnail */
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  /** edit form: the saved thumbnail was removed (a new one must be picked before saving) */
  const [savedThumbRemoved, setSavedThumbRemoved] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>(() => (edit?.gallery ?? []).map((url) => ({ key: url, url })));
  const [options, setOptions] = useState<OptionState[]>(edit?.options ?? []);
  const [rows, setRows] = useState<Record<string, RowState>>(edit?.rows ?? {});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [subs, setSubs] = useState<Options>(edit && initial.categoryId ? { status: "ready", items: edit.subs, parent: initial.categoryId } : { status: "idle", items: [] });
  const [subSubs, setSubSubs] = useState<Options>(edit && initial.subCategoryId ? { status: "ready", items: edit.subSubs, parent: initial.subCategoryId } : { status: "idle", items: [] });
  const busy = pending || done;
  const digital = v.productType === "DIGITAL";
  const descriptionLength = useMemo(() => htmlToText(v.description).length, [v.description]);

  const fid = (k: string) => `${uid}-${k}`;
  const set = <K extends keyof ProductFormValues>(k: K, value: ProductFormValues[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const combinations = useMemo(() => buildCombinations(options), [options]);
  const activeCombos = combinations.filter((c) => !rows[c.name]?.removed);

  // ── Dependent category dropdowns (server fetch per parent; stale replies are ignored) ──
  function load(parent: string, fetcher: (id: string) => Promise<ActionResult<CatalogOption[]>>, setter: typeof setSubs) {
    setter({ status: "loading", items: [], parent });
    const settle = (next: Options) => setter((cur) => (cur.parent === parent ? next : cur));
    fetcher(parent)
      .then((res) => settle(res.success && res.data ? { status: "ready", items: res.data, parent } : { status: "error", items: [], parent }))
      .catch(() => settle({ status: "error", items: [], parent }));
  }
  const loadSubs = (categoryId: string) => load(categoryId, getSubCategoryOptions, setSubs);
  const loadSubSubs = (subCategoryId: string) => load(subCategoryId, getSubSubCategoryOptions, setSubSubs);
  function chooseCategory(id: string) {
    if (id === v.categoryId) return;
    setV((x) => ({ ...x, categoryId: id, subCategoryId: "", subSubCategoryId: "" }));
    setErrors((e) => ({ ...e, categoryId: undefined, subCategoryId: undefined, subSubCategoryId: undefined }));
    setSubSubs({ status: "idle", items: [] });
    loadSubs(id);
  }
  function chooseSub(id: string) {
    const value = id === NONE ? "" : id;
    if (value === v.subCategoryId) return;
    setV((x) => ({ ...x, subCategoryId: value, subSubCategoryId: "" }));
    setErrors((e) => ({ ...e, subCategoryId: undefined, subSubCategoryId: undefined }));
    if (value) loadSubSubs(value);
    else setSubSubs({ status: "idle", items: [] });
  }

  // ── Build the payload exactly as the server expects it ──
  function payload(): ProductFormInput {
    return {
      ...v,
      variantOptions: v.hasVariations ? options.filter((o) => o.values.length > 0) : [],
      variations: v.hasVariations
        ? activeCombos.map((c) => {
            const r = rows[c.name] ?? {};
            return { name: c.name, attributes: c.attributes, price: r.price ?? v.price, stock: r.stock ?? "0", sku: r.sku ?? defaultVariationSku(v.sku, c), image: r.url ?? null };
          })
        : [],
    };
  }

  /** Schema paths → form keys ("variations.2.price" → "Red / M.price"). */
  function mapErrors(fieldErrors: Record<string, string>) {
    const out: Record<string, string> = {};
    const filled = options.filter((o) => o.values.length > 0);
    for (const [path, msg] of Object.entries(fieldErrors)) {
      const [head, i, field] = path.split(".");
      let key = head;
      if (head === "variations") key = i === undefined ? "rows" : `${activeCombos[Number(i)]?.name}.${field ?? "name"}`;
      else if (head === "variantOptions") key = i === undefined ? "options" : (filled[Number(i)]?.name ?? "options");
      out[key] ??= msg;
    }
    return out;
  }

  function fail(next: Record<string, string>, toastMsg?: string) {
    setErrors(next);
    toast.error(toastMsg ?? Object.values(next)[0] ?? "Please fix the highlighted fields");
    // Bring the first invalid control into view.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("form [aria-invalid=true]")?.focus());
  }

  function submit() {
    if (busy) return;
    const data = payload();
    const parsed = productFormSchema.safeParse(data);
    const issues: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) issues[i.path.join(".")] ??= i.message; // first message per field, form order
    const next = mapErrors(issues);
    // Images (also re-checked on the server).
    if (!thumbnail && (!edit?.thumbnailUrl || savedThumbRemoved)) next.thumbnail ??= "Upload a product thumbnail";
    else if (thumbnail && thumbnail.size > PRODUCT_IMAGE_MAX_BYTES) next.thumbnail ??= "Thumbnail must be 1 MB or smaller";
    if (gallery.some((g) => g.file && g.file.size > PRODUCT_IMAGE_MAX_BYTES)) next.gallery ??= "Each image must be 1 MB or smaller";
    const variationFiles = v.hasVariations ? activeCombos.flatMap((c) => (rows[c.name]?.file ? [[c.name, rows[c.name].file!] as const] : [])) : [];
    for (const [name, f] of variationFiles) if (f.size > PRODUCT_IMAGE_MAX_BYTES) next[`${name}.image`] ??= "Image must be 1 MB or smaller";
    const bytes = (thumbnail?.size ?? 0) + gallery.reduce((n, g) => n + (g.file?.size ?? 0), 0) + variationFiles.reduce((n, [, f]) => n + f.size, 0);
    if (Object.keys(next).length) return fail(next);
    if (bytes > PRODUCT_LIMITS.uploadBytes) return fail({ gallery: "These images are over 10 MB together. Upload fewer or smaller images." });

    const fd = new FormData();
    fd.set("data", JSON.stringify(data));
    if (thumbnail) fd.set("thumbnail", thumbnail);
    for (const g of gallery) if (g.file) fd.append("gallery", g.file);
    for (const [name, f] of variationFiles) fd.set(`variationImage:${name}`, f);
    if (edit) {
      fd.set("id", edit.id);
      fd.set("keepGallery", JSON.stringify(gallery.filter((g) => !g.file).map((g) => g.url)));
    }

    setErrors({});
    startTransition(async () => {
      let res: ActionResult<{ id: string; reReview?: boolean }>;
      try {
        res = edit ? await updateProduct(fd) : await createProduct(fd);
      } catch {
        toast.error("We couldn't reach the server. Please try again.");
        return;
      }
      if (!res.success) {
        const mapped = mapErrors(res.fieldErrors ?? {});
        delete mapped.form;
        return fail(mapped, res.error);
      }
      setDone(true);
      toast.success(!edit ? "Product submitted for approval" : res.data?.reReview ? "Product updated — sent back for approval" : "Product updated");
      router.push("/vendor/products");
    });
  }

  function reset() {
    setV(initial);
    setThumbnail(null);
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setThumbPreview(null);
    setSavedThumbRemoved(false);
    for (const g of gallery) if (g.file) URL.revokeObjectURL(g.url);
    for (const r of Object.values(rows)) if (r.preview) URL.revokeObjectURL(r.preview);
    setGallery([]);
    setOptions([]);
    setRows({});
    setErrors({});
    setSubs({ status: "idle", items: [] });
    setSubSubs({ status: "idle", items: [] });
    toast.success("Form reset");
  }

  const catSelect = (
    key: "categoryId" | "subCategoryId" | "subSubCategoryId" | "brandId",
    label: string,
    items: CatalogOption[],
    opts: {
      required?: boolean;
      onChange: (id: string) => void;
      state?: Options["status"];
      parentLabel?: string;
      onRetry?: () => void;
      /** server-side search (brands) instead of filtering `items` */
      load?: (q: string) => Promise<CatalogOption[]>;
      selectedLabel?: string;
    },
  ) => {
    const loading = opts.state === "loading";
    const waiting = opts.state === "idle";
    const noun = label.toLowerCase();
    const placeholder = waiting ? `Choose a ${opts.parentLabel} first` : opts.state === "error" ? "Couldn't load options" : opts.state === undefined || items.length ? `Select ${noun}` : `No ${noun} for this ${opts.parentLabel}`;
    // Optional pickers offer "None" to clear the choice.
    const none = !opts.required && v[key] ? [{ value: NONE, label: "None" }] : [];
    const toOptions = (list: CatalogOption[]) => [...none, ...list.map((o) => ({ value: o.id, label: o.name }))];
    return (
      <Field id={fid(key)} label={label} required={opts.required} error={errors[key]}>
        <SearchableSelect
          id={fid(key)}
          value={v[key]}
          onValueChange={opts.onChange}
          options={opts.load ? undefined : toOptions(items)}
          load={opts.load ? (q) => opts.load!(q).then(toOptions) : undefined}
          selectedLabel={opts.selectedLabel}
          placeholder={placeholder}
          searchPlaceholder={`Search ${noun}…`}
          emptyText={`No ${noun} matches`}
          ariaLabel={label}
          invalid={!!errors[key]}
          describedBy={errors[key] ? `${fid(key)}-error` : undefined}
          loading={loading}
          disabled={busy || waiting || (opts.state !== undefined && opts.state !== "loading" && items.length === 0)}
          className={inputCls}
        />
        {opts.state === "error" && opts.onRetry && (
          <button type="button" onClick={opts.onRetry} className="self-start text-caption font-semibold text-primary max-lg:min-h-11">
            Retry loading {label.toLowerCase()}
          </button>
        )}
      </Field>
    );
  };

  const money = (k: "price" | "shippingCost", label: string, info: string, placeholder: string) => (
    <Field id={fid(k)} label={label} required info={info} error={errors[k]}>
      <Input {...ariaFor(fid(k), errors[k])} inputMode="decimal" value={v[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className={cn(inputCls, "tabular-nums")} />
    </Field>
  );

  const variationStock = activeCombos.reduce((n, c) => n + (Number(rows[c.name]?.stock ?? "0") || 0), 0);

  return (
    <form
      noValidate
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-5"
    >
      {/* ── Basic Setup (English only) ── */}
      <FormSection title="Basic Setup" description="Set up the product information shown on your store page.">
        <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4.5">
            <Field id={fid("name")} label="Product Name" required error={errors.name}>
              <Input {...ariaFor(fid("name"), errors.name)} value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={PRODUCT_LIMITS.name} placeholder="e.g. Aura Studio Wireless Headphones" className={inputCls} />
            </Field>
            <Field
              id={fid("shortDescription")}
              label="Short Description"
              info="One or two sentences shoppers read first. Plain text."
              error={errors.shortDescription}
              hint={<span className="tabular-nums">{v.shortDescription.length}/{PRODUCT_LIMITS.shortDescription}</span>}
            >
              <textarea
                {...ariaFor(fid("shortDescription"), errors.shortDescription)}
                rows={3}
                value={v.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
                maxLength={PRODUCT_LIMITS.shortDescription}
                placeholder="e.g. Reference-grade wireless headphones with adaptive noise cancellation and a 38-hour battery."
                className="min-h-24 w-full resize-y rounded-md border border-line bg-card px-3.5 py-3 text-sm text-fg-strong outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-fg-subtle focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--iris-100)] aria-invalid:border-[1.5px] aria-invalid:border-error-500"
              />
            </Field>
            <Field
              id={fid("description")}
              label="Description"
              required
              error={errors.description}
              hint={<span className="tabular-nums">{descriptionLength.toLocaleString("en-US")}/{PRODUCT_LIMITS.description.toLocaleString("en-US")}</span>}
            >
              <RichTextEditor
                id={fid("description")}
                label="Description"
                value={v.description}
                onChange={(html) => set("description", html)}
                placeholder="Describe the product — materials, specs, what's in the box…"
                invalid={!!errors.description}
                describedBy={errors.description ? `${fid("description")}-error` : undefined}
                disabled={busy}
              />
            </Field>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <ThumbnailDrop
              label="Product Thumbnail"
              hint="Shown on product cards"
              src={thumbPreview ?? (savedThumbRemoved ? null : (edit?.thumbnailUrl ?? null))}
              fileName={thumbnail?.name}
              onPick={(f) => {
                // Preview URL made here (not in an effect) and released when replaced or removed.
                if (thumbPreview) URL.revokeObjectURL(thumbPreview);
                setThumbnail(f);
                setThumbPreview(URL.createObjectURL(f));
                setErrors((e) => ({ ...e, thumbnail: undefined }));
              }}
              onRemove={() => {
                if (thumbnail) {
                  // Drop the new pick; in the edit form the saved image shows again.
                  if (thumbPreview) URL.revokeObjectURL(thumbPreview);
                  setThumbnail(null);
                  setThumbPreview(null);
                } else {
                  setSavedThumbRemoved(true);
                }
              }}
              error={errors.thumbnail}
            />
            <p className="text-center text-caption text-fg-muted">{IMG_HINT}</p>
          </div>
        </div>
      </FormSection>

      {/* ── General Setup ── */}
      <FormSection title="General Setup" description="The foundational details buyers filter and search by.">
        <div className="grid items-start gap-x-5 gap-y-4.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field id={fid("productType")} label="Product Type" required error={errors.productType}>
            <Select value={v.productType} onValueChange={(x) => set("productType", x as ProductTypeValue)} disabled={busy}>
              <SelectTrigger {...ariaFor(fid("productType"), errors.productType)} className={inputCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PRODUCT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {catSelect("categoryId", "Category", categories, { required: true, onChange: chooseCategory })}
          {catSelect("subCategoryId", "Sub Category", subs.items, { onChange: chooseSub, state: subs.status, parentLabel: "category", onRetry: () => loadSubs(v.categoryId) })}
          {catSelect("subSubCategoryId", "Sub Sub Category", subSubs.items, {
            onChange: (x) => set("subSubCategoryId", x === NONE ? "" : x),
            state: subSubs.status,
            parentLabel: "sub category",
            onRetry: () => loadSubSubs(v.subCategoryId),
          })}
          {catSelect("brandId", "Brand", [], {
            onChange: (x) => set("brandId", x === NONE ? "" : x),
            load: (q) => searchBrandOptions(q).then((r) => (r.success && r.data ? r.data : Promise.reject(new Error(r.error)))),
            selectedLabel: brandLabel,
          })}
          <Field
            id={fid("sku")}
            label="Product SKU"
            required
            info="Your own stock-keeping code. Unique within your store."
            error={errors.sku}
            action={
              <button type="button" onClick={() => set("sku", generateSku(storeName))} className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:text-primary-hover max-lg:min-h-11">
                <Shuffle aria-hidden className="size-3.5" strokeWidth={2} />
                Generate code
              </button>
            }
          >
            <Input {...ariaFor(fid("sku"), errors.sku)} value={v.sku} onChange={(e) => set("sku", e.target.value)} maxLength={PRODUCT_LIMITS.sku} placeholder="e.g. HAN-10412" className={inputCls} />
          </Field>
          {/* Physical-only fields are hidden for digital products (vendoreditproduct design). */}
          {!digital && (
          <Field id={fid("unit")} label="Unit" required error={errors.unit}>
            <Select value={v.unit} onValueChange={(x) => set("unit", x as ProductUnitValue)} disabled={busy}>
              <SelectTrigger {...ariaFor(fid("unit"), errors.unit)} className={inputCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          )}
          <Field id={fid("tags")} label="Search Tags" info="Words buyers might search for. Press Enter after each tag." error={errors.tags} className="sm:col-span-2" hint={`${v.tags.length}/${PRODUCT_LIMITS.tags} tags`}>
            <TagInput id={fid("tags")} values={v.tags} onChange={(t) => set("tags", t)} placeholder="Type a tag and press Enter" max={PRODUCT_LIMITS.tags} maxLength={PRODUCT_LIMITS.tag} invalid={!!errors.tags} describedBy={errors.tags ? `${fid("tags")}-error` : undefined} />
          </Field>
        </div>
      </FormSection>

      {/* ── Pricing & Others ── */}
      <FormSection title="Pricing & Others" description={digital ? "Set the price for this digital product." : "Set price, stock and shipping for this product."}>
        <div className="grid items-start gap-x-5 gap-y-4.5 sm:grid-cols-2 lg:grid-cols-3">
          {money("price", "Unit Price ($)", "Price before discount, in US dollars.", "e.g. 189.00")}
          <Field id={fid("minOrderQty")} label="Minimum Order Qty" required info="The fewest units a buyer can order." error={errors.minOrderQty}>
            <Input {...ariaFor(fid("minOrderQty"), errors.minOrderQty)} inputMode="numeric" value={v.minOrderQty} onChange={(e) => set("minOrderQty", e.target.value)} className={cn(inputCls, "tabular-nums")} />
          </Field>
          {!digital && (
          <Field
            id={fid("stock")}
            label="Current Stock Qty"
            required
            info="Units you have ready to sell."
            error={errors.stock}
            hint={v.hasVariations ? `Set per variation below · ${variationStock.toLocaleString("en-US")} in total` : undefined}
          >
            <Input
              {...ariaFor(fid("stock"), errors.stock)}
              inputMode="numeric"
              value={v.hasVariations ? String(variationStock) : v.stock}
              readOnly={v.hasVariations}
              aria-readonly={v.hasVariations || undefined}
              onChange={(e) => set("stock", e.target.value)}
              className={cn(inputCls, "tabular-nums", v.hasVariations && "bg-sunken text-fg-muted")}
            />
          </Field>
          )}
          <Field id={fid("discountValue")} label="Discount Amount" info="Flat amount in dollars, or a whole percent." error={errors.discountValue}>
            <div className="relative">
              <Input
                {...ariaFor(fid("discountValue"), errors.discountValue)}
                inputMode="decimal"
                value={v.discountValue}
                onChange={(e) => set("discountValue", e.target.value)}
                className={cn(inputCls, "pr-27 tabular-nums")}
              />
              <div role="group" aria-label="Discount type" className="absolute top-1/2 right-1 flex -translate-y-1/2 gap-0.5 rounded-sm bg-sunken p-0.5">
                {(["FLAT", "PERCENT"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={v.discountType === t}
                    aria-label={t === "FLAT" ? "Flat amount ($)" : "Percent (%)"}
                    onClick={() => set("discountType", t)}
                    className={cn(
                      "h-9.5 min-w-9.5 rounded-sm px-2.5 text-[0.82rem] font-bold transition-colors duration-(--dur-fast) max-lg:h-11 max-lg:min-w-11",
                      v.discountType === t ? "bg-card text-primary shadow-xs" : "text-fg-muted hover:text-fg-strong",
                    )}
                  >
                    {t === "FLAT" ? "$" : "%"}
                  </button>
                ))}
              </div>
            </div>
          </Field>
          {!digital && money("shippingCost", "Shipping Cost ($)", "What you charge to ship one order of this product.", "0.00")}
          {!digital && (
          <div className="flex min-w-0 flex-col gap-2">
            <span id={fid("shipMul")} className="flex min-h-5 items-center gap-1.5 text-[0.82rem] font-semibold text-fg">
              Shipping Cost Multiply With Quantity
            </span>
            <div className="flex h-12 items-center justify-between rounded-md border border-line px-3.5">
              <span className="text-sm font-semibold text-fg-strong">{v.shippingPerUnit ? "On" : "Off"}</span>
              <Switch checked={v.shippingPerUnit} onCheckedChange={(x) => set("shippingPerUnit", x)} aria-labelledby={fid("shipMul")} disabled={busy} />
            </div>
          </div>
          )}
        </div>
      </FormSection>

      {/* ── Product Variation Setup ── */}
      <FormSection
        title="Product Variation Setup"
        description="Enable and manage colors, sizes and other options."
        aside={<Switch checked={v.hasVariations} onCheckedChange={(x) => set("hasVariations", x)} aria-label="Enable product variations" disabled={busy} />}
      >
        {v.hasVariations ? (
          <VariationSetup
            uid={uid}
            options={options}
            onOptionsChange={(o) => (setOptions(o), setErrors((e) => ({ ...e, options: undefined, rows: undefined })))}
            rows={rows}
            onRowsChange={setRows}
            combinations={combinations}
            unitPrice={v.price}
            baseSku={v.sku}
            errors={errors}
          />
        ) : (
          <p className="text-sm text-fg-muted">Off — this product is sold as one item with the stock above.</p>
        )}
      </FormSection>

      {/* ── Additional images ── */}
      <FormSection title="Product Additional Images" description={`Extra angles and details. JPG, PNG or WEBP · max 1 MB · 1:1 (500 × 500 px) · up to ${PRODUCT_LIMITS.gallery}.`}>
        <GalleryUpload id={fid("gallery")} items={gallery} onChange={(g) => (setGallery(g), setErrors((e) => ({ ...e, gallery: undefined })))} max={PRODUCT_LIMITS.gallery} error={errors.gallery} />
        <div className="mt-2">
          <FieldError id={fid("gallery")} error={errors.gallery} />
        </div>
      </FormSection>

      {/* ── Product Video ── */}
      <FormSection title="Product Video" description="Paste a YouTube embed link — direct links are not supported.">
        <Field id={fid("videoUrl")} label="YouTube Video Link (optional)" error={errors.videoUrl} hint="Use the embed link, not the watch link.">
          <Input {...ariaFor(fid("videoUrl"), errors.videoUrl)} type="url" value={v.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="e.g. https://www.youtube.com/embed/5R06LRdUCSE" className={inputCls} />
        </Field>
      </FormSection>

      {/* ── SEO (meta title + description only) ── */}
      <FormSection title="SEO Section" description="Meta title and description help buyers find this product on search engines.">
        <div className="flex flex-col gap-4.5">
          <Field
            id={fid("metaTitle")}
            label="Meta Title"
            info="Shown as the page title in search results."
            error={errors.metaTitle}
            hint={<span className="tabular-nums">{v.metaTitle.length}/{PRODUCT_LIMITS.metaTitle}</span>}
          >
            <Input {...ariaFor(fid("metaTitle"), errors.metaTitle)} value={v.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} maxLength={PRODUCT_LIMITS.metaTitle} placeholder="Meta title" className={inputCls} />
          </Field>
          <Field
            id={fid("metaDescription")}
            label="Meta Description"
            info="Shown under the title in search results."
            error={errors.metaDescription}
            hint={<span className="tabular-nums">{v.metaDescription.length}/{PRODUCT_LIMITS.metaDescription}</span>}
          >
            <textarea
              {...ariaFor(fid("metaDescription"), errors.metaDescription)}
              rows={3}
              value={v.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
              maxLength={PRODUCT_LIMITS.metaDescription}
              placeholder="Up to 160 characters"
              className="min-h-24 w-full resize-y rounded-md border border-line bg-card px-3.5 py-3 text-sm text-fg-strong outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-fg-subtle focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--iris-100)] aria-invalid:border-[1.5px] aria-invalid:border-error-500"
            />
          </Field>
        </div>
      </FormSection>

      {/* ── Sticky footer ── */}
      <div className="sticky bottom-0 z-20 -mx-1 flex flex-wrap justify-end gap-3 rounded-lg bg-card/90 px-4 py-3.5 shadow-lg backdrop-blur-sm max-sm:*:flex-1">
        {edit ? (
          <Button asChild variant="secondary" className="h-12">
            <Link href="/vendor/products" aria-disabled={busy || undefined}>
              <X aria-hidden />
              Cancel
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={reset} disabled={busy} className="h-12">
            <RotateCcw aria-hidden />
            Reset
          </Button>
        )}
        <Button type="submit" disabled={busy} aria-busy={busy} className="h-12 px-6">
          {busy ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-on-primary/35 border-t-on-primary" /> : <Check aria-hidden />}
          {busy ? "Saving…" : edit ? "Update" : "Submit"}
        </Button>
      </div>
    </form>
  );
}
