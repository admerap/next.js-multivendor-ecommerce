"use client";

import { CircleAlert, Plus, Save, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { CategoryOption } from "@/app/admin/(panel)/categories/actions";
import { getSubCategoriesByCategory, type SubCategoryOption } from "@/app/admin/(panel)/categories/sub/actions";
import { createSubSubCategory, updateSubSubCategory, type SubSubCategoryRow } from "@/app/admin/(panel)/categories/sub-sub/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { subSubCategoryCreateSchema, subSubCategoryUpdateSchema, type CategoryStatus } from "@/lib/validations/category";
import { ParentSelect } from "./ParentSelect";

type Errors = Partial<Record<"name" | "categoryId" | "subCategoryId" | "status", string>>;

/**
 * One modal for Add and Edit. Two dependent dropdowns: choosing a Category fetches ONLY that
 * category's sub-categories from the server (getSubCategoriesByCategory) into the second one.
 */
export function SubSubCategoryFormDialog({
  categories,
  subSubCategory,
  defaults,
  open,
  onOpenChange,
}: {
  categories: CategoryOption[];
  subSubCategory?: Pick<SubSubCategoryRow, "id" | "name" | "status" | "categoryId" | "subCategoryId">;
  /** Pre-selection from the list filters when adding. */
  defaults?: { categoryId?: string; subCategoryId?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = !!subSubCategory;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initialCategory = subSubCategory?.categoryId ?? defaults?.categoryId ?? "";
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [subCategoryId, setSubCategoryId] = useState(subSubCategory?.subCategoryId ?? (defaults?.categoryId ? (defaults.subCategoryId ?? "") : ""));
  const [subOptions, setSubOptions] = useState<SubCategoryOption[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(!!initialCategory);
  const [subsError, setSubsError] = useState("");
  const [name, setName] = useState(subSubCategory?.name ?? "");
  const [status, setStatus] = useState<CategoryStatus>(subSubCategory?.status ?? "ACTIVE");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const ids = { name: useId(), categoryId: useId(), subCategoryId: useId(), status: useId() };
  const request = useRef(0);

  /**
   * Asks the server for ONE category's sub-categories. The response is applied only if it is
   * still the latest request, so switching categories quickly never shows a stale list.
   */
  function fetchSubs(forCategory: string, keepSelection: boolean) {
    const ticket = ++request.current;
    getSubCategoriesByCategory(forCategory)
      .catch(() => ({ success: false as const, error: "We couldn't load sub-categories.", data: undefined }))
      .then((res) => {
        if (ticket !== request.current) return;
        setLoadingSubs(false);
        if (!res.success || !res.data) {
          setSubsError(res.error ?? "We couldn't load sub-categories.");
          return;
        }
        const list = res.data;
        setSubOptions(list);
        // A pre-selected sub-category must belong to this category, or it is cleared.
        if (keepSelection) setSubCategoryId((cur) => (list.some((s) => s.id === cur) ? cur : ""));
      });
  }

  // Edit (or a filtered Add): pre-load the chosen category's list and keep the pre-selected
  // sub-category. `loadingSubs` already starts true in that case.
  useEffect(() => {
    if (initialCategory) fetchSubs(initialCategory, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the dialog mounts
  }, []);

  const clear = (key: keyof Errors) => {
    setErrors((x) => ({ ...x, [key]: undefined }));
    setFormError("");
  };

  function pickCategory(v: string) {
    if (v === categoryId) return;
    setCategoryId(v);
    setSubCategoryId(""); // the old sub-category belongs to another category
    clear("categoryId");
    clear("subCategoryId");
    setSubOptions([]);
    setSubsError("");
    setLoadingSubs(true);
    fetchSubs(v, false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || loadingSubs) return;
    const values = { name, status, categoryId, subCategoryId };
    const parsed = editing ? subSubCategoryUpdateSchema.safeParse({ id: subSubCategory.id, ...values }) : subSubCategoryCreateSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const i of parsed.error.issues) next[i.path[0] as keyof Errors] ??= i.message;
      setErrors(next);
      return;
    }

    const fd = new FormData();
    if (editing) fd.set("id", subSubCategory.id);
    fd.set("categoryId", categoryId);
    fd.set("subCategoryId", subCategoryId);
    fd.set("name", name);
    fd.set("status", status);

    setErrors({});
    setFormError("");
    startTransition(async () => {
      try {
        const res = editing ? await updateSubSubCategory(fd) : await createSubSubCategory(fd);
        if (!res.success) {
          // Keep the dialog open and every input as typed.
          setErrors((res.fieldErrors ?? {}) as Errors);
          setFormError(res.error ?? "Something went wrong.");
          toast.error(res.error ?? "Something went wrong.");
          return;
        }
        toast.success(editing ? `"${name.trim()}" updated` : `"${name.trim()}" added`);
        onOpenChange(false);
        router.refresh();
      } catch {
        const msg = "We couldn't reach the server. Check your connection and try again.";
        setFormError(msg);
        toast.error(msg);
      }
    });
  }

  const subPlaceholder = !categoryId ? "Choose a category first" : subOptions.length ? "Select sub-category" : "No sub-categories in this category";

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{editing ? "Edit Sub-Sub-Category" : "Add Sub-Sub-Category"}</DialogTitle>
        <DialogDescription>
          {editing ? "Update the parents, name or status." : "The most specific level: pick a category, then one of its sub-categories."}
        </DialogDescription>

        {formError && (
          <div role="alert" className="mt-5 flex items-center gap-2.5 rounded-md bg-error-50 px-3.5 py-3 text-caption font-semibold text-error-600">
            <TriangleAlert aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
            {formError}
          </div>
        )}

        <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <ParentSelect
              id={ids.categoryId}
              label="Category"
              value={categoryId}
              onChange={pickCategory}
              options={categories}
              placeholder="Select category"
              error={errors.categoryId}
            />
            <ParentSelect
              id={ids.subCategoryId}
              label="Sub-category"
              value={subCategoryId}
              onChange={(v) => {
                setSubCategoryId(v);
                clear("subCategoryId");
              }}
              options={subOptions}
              placeholder={subPlaceholder}
              loading={loadingSubs}
              disabled={!categoryId || subOptions.length === 0}
              error={errors.subCategoryId ?? (subsError || undefined)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={ids.name} className="text-caption font-semibold text-fg">
              Sub-sub-category name <span aria-hidden className="text-error-500">*</span>
            </label>
            <Input
              id={ids.name}
              value={name}
              maxLength={60}
              required
              autoComplete="off"
              placeholder="e.g. Headphones"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? `${ids.name}-error` : undefined}
              onChange={(e) => {
                setName(e.target.value);
                clear("name");
              }}
            />
            {errors.name && (
              <span id={`${ids.name}-error`} className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
                <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
                {errors.name}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span id={`${ids.status}-label`} className="text-caption font-semibold text-fg">
              Status
            </span>
            <div className="flex items-center justify-between rounded-md border border-line pl-3.5">
              <span className="text-sm text-fg">{status === "ACTIVE" ? "Active — visible to shoppers" : "Inactive — hidden from the storefront"}</span>
              <Switch id={ids.status} aria-labelledby={`${ids.status}-label`} checked={status === "ACTIVE"} onCheckedChange={(on) => setStatus(on ? "ACTIVE" : "INACTIVE")} />
            </div>
          </div>

          <div className="mt-1 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button type="submit" disabled={pending || loadingSubs} aria-busy={pending}>
              {pending ? (
                <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-on-primary/35 border-t-on-primary" />
              ) : editing ? (
                <Save aria-hidden />
              ) : (
                <Plus aria-hidden />
              )}
              {pending ? "Saving…" : editing ? "Save changes" : "Add Sub-Sub-Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
