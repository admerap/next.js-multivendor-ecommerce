"use client";

import { CircleAlert, ImagePlus, Plus, Save, TriangleAlert, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createCategory, updateCategory, type CategoryRow } from "@/app/admin/(panel)/categories/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CATEGORY_IMAGE_TYPES, categoryCreateSchema, categoryUpdateSchema, type CategoryStatus } from "@/lib/validations/category";

type Errors = Partial<Record<"name" | "image" | "status", string>>;

/** One modal for both Add (no `category`) and Edit (pre-filled). */
export function CategoryFormDialog({
  category,
  open,
  onOpenChange,
}: {
  category?: Pick<CategoryRow, "id" | "name" | "image" | "status">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = !!category;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(category?.name ?? "");
  const [status, setStatus] = useState<CategoryStatus>(category?.status ?? "ACTIVE");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const ids = { name: useId(), image: useId(), status: useId() };

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);
  const shown = previewUrl ?? category?.image ?? null;

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setErrors((e) => ({ ...e, image: undefined }));
    setFormError("");
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    const values = { name, status, image: file ?? undefined };
    const parsed = editing ? categoryUpdateSchema.safeParse({ id: category.id, ...values }) : categoryCreateSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const i of parsed.error.issues) next[i.path[0] as keyof Errors] ??= i.message;
      setErrors(next);
      return;
    }

    const fd = new FormData();
    if (editing) fd.set("id", category.id);
    fd.set("name", name);
    fd.set("status", status);
    if (file) fd.set("image", file);

    setErrors({});
    setFormError("");
    startTransition(async () => {
      try {
        const res = editing ? await updateCategory(fd) : await createCategory(fd);
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

  const errorText = (key: keyof Errors) =>
    errors[key] && (
      <span id={`${ids[key]}-error`} className="flex items-center gap-1.5 text-caption font-semibold text-error-600">
        <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
        {errors[key]}
      </span>
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
        <DialogDescription>
          {editing ? "Update the name, image or status. Leave the image as is to keep it." : "Top-level departments shoppers browse from the All Categories menu."}
        </DialogDescription>

        {formError && (
          <div role="alert" className="mt-5 flex items-center gap-2.5 rounded-md bg-error-50 px-3.5 py-3 text-caption font-semibold text-error-600">
            <TriangleAlert aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
            {formError}
          </div>
        )}

        <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.name} className="text-caption font-semibold text-fg">
              Category name <span aria-hidden className="text-error-500">*</span>
            </label>
            <Input
              id={ids.name}
              value={name}
              maxLength={60}
              required
              autoComplete="off"
              placeholder="e.g. Electronics"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? `${ids.name}-error` : undefined}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((x) => ({ ...x, name: undefined }));
                setFormError("");
              }}
            />
            {errorText("name")}
          </div>

          <div className="flex flex-col gap-2">
            <span id={`${ids.image}-label`} className="text-caption font-semibold text-fg">
              Category image <span className="font-normal text-fg-muted">(optional)</span>
            </span>
            {shown ? (
              <div className="flex items-center gap-4 rounded-md border border-line bg-sunken p-3">
                <span className="relative size-24 shrink-0 overflow-hidden rounded-md border border-line bg-card">
                  <Image src={shown} alt="Image preview" fill sizes="96px" unoptimized={!!previewUrl} className="object-contain p-2" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="truncate text-caption text-fg-muted">{file ? file.name : "Current image"}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <label htmlFor={ids.image} className="cursor-pointer">
                        <ImagePlus aria-hidden />
                        Replace
                      </label>
                    </Button>
                    {file && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)}>
                        <X aria-hidden />
                        {category?.image ? "Keep current" : "Remove"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <label
                htmlFor={ids.image}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pick(e.dataTransfer.files[0]);
                }}
                className={cn(
                  "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed bg-sunken p-4 text-center transition-colors duration-(--dur-fast) hover:border-primary hover:bg-iris-50",
                  dragging ? "border-primary bg-iris-50" : errors.image ? "border-error-500" : "border-line-default",
                )}
              >
                <span className="grid size-11 place-items-center rounded-md bg-card text-primary shadow-xs">
                  <ImagePlus aria-hidden className="size-5.5" strokeWidth={2} />
                </span>
                <span className="text-caption font-bold text-primary">Click to upload</span>
                <span className="text-caption text-fg-muted">or drag and drop</span>
              </label>
            )}
            <input
              id={ids.image}
              type="file"
              accept={CATEGORY_IMAGE_TYPES.join(",")}
              className="sr-only"
              aria-labelledby={`${ids.image}-label`}
              aria-invalid={errors.image ? true : undefined}
              aria-describedby={errors.image ? `${ids.image}-error` : undefined}
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = ""; // allow re-picking the same file
              }}
            />
            <p className="text-[0.7rem] text-fg-muted">JPG, PNG or WebP · max 2 MB · square works best</p>
            {errorText("image")}
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
              {pending ? "Saving…" : editing ? "Save changes" : "Add Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
