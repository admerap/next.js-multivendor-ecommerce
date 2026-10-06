"use client";

import { CircleAlert, Plus, Save, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { CategoryOption } from "@/app/admin/(panel)/categories/actions";
import { createSubCategory, updateSubCategory, type SubCategoryRow } from "@/app/admin/(panel)/categories/sub/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { subCategoryCreateSchema, subCategoryUpdateSchema, type CategoryStatus } from "@/lib/validations/category";
import { ParentSelect } from "./ParentSelect";

type Errors = Partial<Record<"name" | "categoryId" | "status", string>>;

/** One modal for both Add (no `subCategory`) and Edit (pre-filled). */
export function SubCategoryFormDialog({
  categories,
  subCategory,
  defaultCategoryId,
  open,
  onOpenChange,
}: {
  categories: CategoryOption[];
  subCategory?: Pick<SubCategoryRow, "id" | "name" | "status" | "categoryId">;
  /** Pre-selects the category the list is filtered by. */
  defaultCategoryId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = !!subCategory;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(subCategory?.categoryId ?? defaultCategoryId ?? "");
  const [name, setName] = useState(subCategory?.name ?? "");
  const [status, setStatus] = useState<CategoryStatus>(subCategory?.status ?? "ACTIVE");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const ids = { name: useId(), categoryId: useId(), status: useId() };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    const values = { name, status, categoryId };
    const parsed = editing ? subCategoryUpdateSchema.safeParse({ id: subCategory.id, ...values }) : subCategoryCreateSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const i of parsed.error.issues) next[i.path[0] as keyof Errors] ??= i.message;
      setErrors(next);
      return;
    }

    const fd = new FormData();
    if (editing) fd.set("id", subCategory.id);
    fd.set("categoryId", categoryId);
    fd.set("name", name);
    fd.set("status", status);

    setErrors({});
    setFormError("");
    startTransition(async () => {
      try {
        const res = editing ? await updateSubCategory(fd) : await createSubCategory(fd);
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

  const clear = (key: keyof Errors) => {
    setErrors((x) => ({ ...x, [key]: undefined }));
    setFormError("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{editing ? "Edit Sub-Category" : "Add Sub-Category"}</DialogTitle>
        <DialogDescription>
          {editing ? "Update the parent category, name or status." : "The second level of the tree, grouped under a category."}
        </DialogDescription>

        {formError && (
          <div role="alert" className="mt-5 flex items-center gap-2.5 rounded-md bg-error-50 px-3.5 py-3 text-caption font-semibold text-error-600">
            <TriangleAlert aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
            {formError}
          </div>
        )}

        <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-5">
          <ParentSelect
            id={ids.categoryId}
            label="Category"
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v);
              clear("categoryId");
            }}
            options={categories}
            placeholder="Select category"
            error={errors.categoryId}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor={ids.name} className="text-caption font-semibold text-fg">
              Sub-category name <span aria-hidden className="text-error-500">*</span>
            </label>
            <Input
              id={ids.name}
              value={name}
              maxLength={60}
              required
              autoComplete="off"
              placeholder="e.g. Audio"
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
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? (
                <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-on-primary/35 border-t-on-primary" />
              ) : editing ? (
                <Save aria-hidden />
              ) : (
                <Plus aria-hidden />
              )}
              {pending ? "Saving…" : editing ? "Save changes" : "Add Sub-Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
