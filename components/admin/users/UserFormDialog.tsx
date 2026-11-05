"use client";

import { Eye, EyeOff, ImagePlus, Pencil, Save, Trash2, UserPlus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ChatAvatar } from "@/components/chat/ChatAvatar";
import { ariaFor, Field } from "@/components/forms/FormBits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStaffUserAction, updateStaffUserAction } from "@/lib/actions/admin-users";
import type { RoleOption } from "@/lib/admin-roles.server";
import type { AdminUserRow } from "@/lib/admin-users.server";
import { createStaffUserSchema, STAFF_IMAGE_TYPES, STAFF_STATUSES, staffImageSchema, updateStaffUserSchema } from "@/lib/validations/admin-user";

type Values = { role: string; firstName: string; lastName: string; phone: string; email: string; status: string; password: string };
type Key = keyof Values | "image";
const EMPTY: Values = { role: "", firstName: "", lastName: "", phone: "", email: "", status: "active", password: "" };
const STATUS_LABEL = { active: "Active", inactive: "Inactive" } as const;

const fromUser = (u: AdminUserRow): Values => ({
  role: u.roleId ?? "",
  firstName: u.firstName,
  lastName: u.lastName,
  phone: u.phone ?? "",
  email: u.email,
  status: u.status,
  password: "",
});

/**
 * Users › New User / Edit User (modal, like the reference): Photo, ID · User Role, Name · Last Name, Phone · Email,
 * Status · Password, then Close / Save. Edit opens pre-filled; its password stays as it is when left empty.
 * Validated here for quick feedback and again on the server. On save the list refreshes.
 * `roles`: what the signed-in admin may give (the Super Admin role only when they are the Super Admin).
 * `self`: editing your own account — role and status are locked (you'd lock yourself out).
 */
export function UserFormDialog({
  user,
  roles,
  self = false,
  open,
  onOpenChange,
}: {
  user?: AdminUserRow;
  roles: RoleOption[];
  self?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const editing = !!user;
  const [values, setValues] = useState<Values>(user ? fromUser(user) : EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [pending, start] = useTransition();
  const base = useId();
  const fid = (k: Key | "id") => `${base}-${k}`;

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const shown = preview ?? (removeImage ? null : (user?.image ?? null));

  // The user's current role stays selectable even if it's no longer offered (e.g. switched off since).
  const options = user?.roleId && !roles.some((r) => r.id === user.roleId) ? [{ id: user.roleId, name: user.role }, ...roles] : roles;

  const set = (k: keyof Values, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const reset = () => {
    setValues(user ? fromUser(user) : EMPTY);
    setErrors({});
    setShowPassword(false);
    setFile(null);
    setRemoveImage(false);
  };
  const close = (o: boolean) => {
    if (pending) return;
    onOpenChange(o);
    if (!o) reset();
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    const check = staffImageSchema.safeParse(f);
    if (!check.success) {
      setErrors((e) => ({ ...e, image: check.error.issues[0]?.message ?? "Choose a valid image" }));
      return;
    }
    setErrors((e) => ({ ...e, image: undefined }));
    setFile(f);
    setRemoveImage(false);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const parsed = editing ? updateStaffUserSchema.safeParse({ ...values, id: user.id }) : createStaffUserSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Key, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as Key] ??= issue.message;
      setErrors(next);
      return;
    }
    const form = new FormData();
    for (const [k, v] of Object.entries(values)) form.set(k, v);
    if (editing) form.set("id", user.id);
    if (file) form.set("image", file);
    else if (removeImage) form.set("removeImage", "1");
    start(async () => {
      const res = await (editing ? updateStaffUserAction : createStaffUserAction)(form).catch(() => ({
        success: false as const,
        error: "We couldn't reach the server. Please try again.",
        fieldErrors: undefined,
      }));
      if (!res.success) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(editing ? `${res.name} was updated` : `${res.name} was added`);
      onOpenChange(false);
      reset();
      router.refresh();
    });
  };

  const text = (k: "firstName" | "lastName" | "phone" | "email", label: string, placeholder: string, extra: React.ComponentProps<"input"> = {}) => (
    <Field id={fid(k)} label={label} required={k !== "phone"} error={errors[k]}>
      <Input {...ariaFor(fid(k), errors[k])} value={values[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} {...extra} />
    </Field>
  );
  const fullName = [values.firstName, values.lastName].filter(Boolean).join(" ") || "New user";
  const Icon = editing ? Pencil : UserPlus;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent hideClose className="gap-0 p-0 sm:w-[min(760px,calc(100vw-32px))] sm:p-0">
        <div className="flex items-center gap-3 rounded-t-xl bg-primary px-5 py-4 text-on-primary sm:px-7 sm:py-5">
          <Icon aria-hidden className="size-5.5" strokeWidth={2} />
          <DialogTitle className="flex-1 font-display text-xl font-extrabold text-on-primary">{editing ? "Edit User" : "New User"}</DialogTitle>
          <button
            type="button"
            onClick={() => close(false)}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full text-on-primary transition-colors duration-(--dur-fast) hover:bg-on-primary/15"
          >
            <X aria-hidden className="size-5" strokeWidth={2} />
          </button>
        </div>
        <DialogDescription className="sr-only">
          {editing ? `Change ${user.firstName}'s account details.` : "Create an account for someone who runs the admin panel."}
        </DialogDescription>

        <form noValidate onSubmit={save} className="flex min-h-0 flex-col">
          <div className="grid max-h-[calc(100dvh-220px)] gap-x-6 gap-y-5 overflow-y-auto px-5 py-6 sm:grid-cols-2 sm:px-7">
            {/* Photo: optional, previewed before saving. */}
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full">
                {preview ? (
                  <Image src={preview} alt="New photo preview" fill sizes="80px" unoptimized className="object-cover" />
                ) : (
                  <ChatAvatar name={fullName} image={shown} size={80} />
                )}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <span id={`${fid("image")}-label`} className="text-caption font-semibold text-fg">
                  Photo <span className="font-normal text-fg-muted">(optional · JPG, PNG or WebP, up to 2 MB)</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm" className="max-lg:h-11">
                    <label htmlFor={fid("image")} className="cursor-pointer">
                      <ImagePlus aria-hidden />
                      {shown ? "Change photo" : "Upload photo"}
                    </label>
                  </Button>
                  {shown && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="max-lg:h-11"
                      onClick={() => {
                        setFile(null);
                        setRemoveImage(!!user?.image);
                      }}
                    >
                      <Trash2 aria-hidden />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  id={fid("image")}
                  type="file"
                  accept={STAFF_IMAGE_TYPES.join(",")}
                  className="sr-only"
                  aria-labelledby={`${fid("image")}-label`}
                  aria-invalid={errors.image ? true : undefined}
                  aria-describedby={errors.image ? `${fid("image")}-error` : undefined}
                  onChange={(e) => {
                    pick(e.target.files?.[0]);
                    e.target.value = ""; // allow re-picking the same file
                  }}
                />
                {errors.image && (
                  <p id={`${fid("image")}-error`} role="alert" className="text-caption font-medium text-error-600">
                    {errors.image}
                  </p>
                )}
              </div>
            </div>

            <Field id={fid("id")} label="ID" hint={editing ? undefined : "Given when the user is saved"}>
              <Input id={fid("id")} value={editing ? user.id : "Assigned automatically"} disabled readOnly className="text-fg-muted" />
            </Field>
            <Field id={fid("role")} label="User Role" required error={errors.role} hint={self ? "You can't change your own role" : options.length === 0 ? "No active roles — add one in Users › Roles" : undefined}>
              <Select value={values.role} onValueChange={(v) => set("role", v)} disabled={self || options.length === 0}>
                <SelectTrigger {...ariaFor(fid("role"), errors.role)}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {text("firstName", "Name", "User name", { autoComplete: "off", maxLength: 50 })}
            {text("lastName", "Last Name", "User last name", { autoComplete: "off", maxLength: 50 })}
            {text("phone", "Phone", "User phone", { type: "tel", autoComplete: "off", inputMode: "tel" })}
            {text("email", "Email", "User email", { type: "email", autoComplete: "off" })}
            <Field id={fid("status")} label="Status" required error={errors.status} hint={self ? "You can't switch off your own account" : "Inactive users can't sign in"}>
              <Select value={values.status} onValueChange={(v) => set("status", v)} disabled={self}>
                <SelectTrigger {...ariaFor(fid("status"), errors.status)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id={fid("password")}
              label={editing ? "New Password" : "Password"}
              required={!editing}
              error={errors.password}
              hint={editing ? "Leave empty to keep the current password" : "At least 8 characters, with a letter and a number"}
            >
              <div className="relative">
                <Input
                  {...ariaFor(fid("password"), errors.password)}
                  type={showPassword ? "text" : "password"}
                  value={values.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder={editing ? "Unchanged" : "User password"}
                  autoComplete="new-password"
                  maxLength={72}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-md text-fg-muted hover:text-primary"
                >
                  {showPassword ? <EyeOff aria-hidden className="size-4.5" /> : <Eye aria-hidden className="size-4.5" />}
                </button>
              </div>
            </Field>
          </div>
          <div className="flex flex-col-reverse gap-2.5 border-t border-line px-5 py-5 sm:flex-row sm:justify-center sm:px-7">
            <Button type="button" variant="secondary" onClick={() => close(false)} disabled={pending}>
              <X aria-hidden />
              Close
            </Button>
            <Button type="submit" disabled={pending}>
              <Save aria-hidden />
              {pending ? "Saving…" : editing ? "Save changes" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Users › New User button: opens the modal empty. */
export function NewUserButton({ roles }: { roles: RoleOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus aria-hidden />
        New User
      </Button>
      {open && <UserFormDialog roles={roles} open onOpenChange={setOpen} />}
    </>
  );
}
