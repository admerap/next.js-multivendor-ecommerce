"use client";

import { Lock, Pencil, Plus, Save, ShieldPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ariaFor, Field } from "@/components/forms/FormBits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRoleAction, updateRoleAction } from "@/lib/actions/admin-roles";
import type { AdminRoleRow } from "@/lib/admin-roles.server";
import { createRoleSchema, ROLE_STATUSES } from "@/lib/validations/admin-role";

type Values = { name: string; description: string; status: string };
const EMPTY: Values = { name: "", description: "", status: "active" };
const STATUS_LABEL = { active: "Active", inactive: "Inactive" } as const;
const textareaCls =
  "w-full resize-none rounded-md border border-line bg-card px-3.5 py-2.5 text-sm text-fg-strong outline-none transition-[border-color,box-shadow] duration-(--dur-fast) placeholder:text-fg-subtle focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--iris-50)] aria-invalid:border-[1.5px] aria-invalid:border-error-500 aria-invalid:shadow-[0_0_0_3px_var(--error-50)]";

/**
 * One modal for New Role (no `role`) and Edit Role (pre-filled): Name, Status, Description → Close / Save.
 * Editing the Super Admin (a system role) locks its name and status; only the description can change — the
 * server enforces the same. The list refreshes after saving.
 */
export function RoleFormDialog({ role, open, onOpenChange }: { role?: AdminRoleRow; open: boolean; onOpenChange: (open: boolean) => void }) {
  const editing = !!role;
  const locked = !!role?.isSystem;
  const initial: Values = role ? { name: role.name, description: role.description, status: role.status } : EMPTY;
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [pending, start] = useTransition();
  const base = useId();
  const fid = (k: keyof Values) => `${base}-${k}`;

  const set = (k: keyof Values, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setValues(initial);
      setErrors({});
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const parsed = createRoleSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof Values, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Values] ??= issue.message;
      setErrors(next);
      return;
    }
    start(async () => {
      const res = editing ? await updateRoleAction({ id: role.id, ...parsed.data }) : await createRoleAction(parsed.data);
      if (!res.success) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(editing ? `Role “${res.name}” was updated` : `Role “${res.name}” was added`);
      onOpenChange(false);
      if (!editing) setValues(EMPTY);
      router.refresh();
    });
  };

  const Icon = editing ? Pencil : ShieldPlus;
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent hideClose className="gap-0 p-0 sm:w-[min(620px,calc(100vw-32px))] sm:p-0">
        <div className="flex items-center gap-3 rounded-t-xl bg-primary px-5 py-4 text-on-primary sm:px-7 sm:py-5">
          <Icon aria-hidden className="size-5.5" strokeWidth={2} />
          <DialogTitle className="flex-1 font-display text-xl font-extrabold text-on-primary">{editing ? "Edit Role" : "New Role"}</DialogTitle>
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
          {editing ? `Change the role ${role.name}.` : "Create a role for people who run the admin panel."}
        </DialogDescription>

        <form noValidate onSubmit={save} className="flex flex-col">
          {locked && (
            <p className="mx-5 mt-5 flex items-start gap-2 rounded-md bg-iris-50 px-3.5 py-2.5 text-sm text-primary sm:mx-7">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
              This is the system role with full access: its name and status can&apos;t change. You can edit its description.
            </p>
          )}
          <div className="grid gap-x-6 gap-y-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
            <Field id={fid("name")} label="Name" required error={errors.name}>
              <Input
                {...ariaFor(fid("name"), errors.name)}
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Customer Service"
                maxLength={60}
                autoComplete="off"
                disabled={locked}
              />
            </Field>
            <Field id={fid("status")} label="Status" required error={errors.status} hint={locked ? "Always active" : "Inactive roles can't be given to users"}>
              <Select value={values.status} onValueChange={(v) => set("status", v)} disabled={locked}>
                <SelectTrigger {...ariaFor(fid("status"), errors.status)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id={fid("description")}
              label="Description"
              required
              error={errors.description}
              hint={`${values.description.length}/255`}
              className="sm:col-span-2"
            >
              <textarea
                {...ariaFor(fid("description"), errors.description)}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="e.g. Customer support and inquiries"
                maxLength={255}
                rows={3}
                className={textareaCls}
              />
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

/** "New Role" button (page heading) + its modal. */
export function NewRoleButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        New Role
      </Button>
      <RoleFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
