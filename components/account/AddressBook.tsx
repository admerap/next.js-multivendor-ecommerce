"use client";

import { Briefcase, Home, MapPin, MapPinned, Pencil, Phone, Plus, Save, Star, Trash2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { AddressFields } from "@/components/checkout/AddressFields";
import { EmptyState } from "@/components/data/DashCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from "@/lib/actions/addresses";
import type { SavedAddress } from "@/lib/addresses.server";
import { cn } from "@/lib/utils";
import { ADDRESS_TYPE_LABEL, MAX_SAVED_ADDRESSES, savedAddressSchema, type SavedAddressInput } from "@/lib/validations/checkout";

const TYPE_ICON = { HOME: Home, OFFICE: Briefcase, OTHER: MapPin } as const;
const blank = (name: string, phone: string): SavedAddressInput => ({
  name,
  phone,
  type: "HOME",
  country: "United States",
  state: "",
  city: "",
  zip: "",
  address: "",
  address2: "",
});

/** "142 Market St, Apt 4, Kingston, NY 12401, United States" */
export const addressLine = (a: Pick<SavedAddress, "address" | "address2" | "city" | "state" | "zip" | "country">) =>
  [a.address, a.address2, a.city, [a.state, a.zip].filter(Boolean).join(" "), a.country].filter(Boolean).join(", ");

/**
 * My Address (useraddress design): "Add New Address" — type (Home / Office / Other), contact, phone, country, state,
 * city, zip, delivery address — then "Saved Addresses": each with its type, a Default badge, Edit, Delete (asks
 * first) and Set as default. Edit loads the address into the form. Same rules as a checkout address, checked here
 * and again on the server.
 */
export function AddressBook({ addresses, contact }: { addresses: SavedAddress[]; contact: { name: string; phone: string } }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState<SavedAddressInput>(blank(contact.name, contact.phone));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<SavedAddress | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const full = !editing && addresses.length >= MAX_SAVED_ADDRESSES;

  const reset = () => {
    setEditing(null);
    setValue(blank(contact.name, contact.phone));
    setErrors({});
  };
  const edit = (a: SavedAddress) => {
    setEditing(a.id);
    setValue({
      name: a.name,
      phone: a.phone,
      type: a.type,
      country: a.country,
      state: a.state,
      city: a.city,
      zip: a.zip,
      address: a.address,
      address2: a.address2,
    });
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const run = (
    job: () => Promise<{ success: true; message: string } | { success: false; error: string; fieldErrors?: Record<string, string> }>,
    after?: () => void,
  ) =>
    start(async () => {
      const res = await job().catch(() => ({ success: false as const, error: "We couldn't reach the server. Please try again.", fieldErrors: undefined }));
      if (!res.success) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      after?.();
      router.refresh();
    });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || full) return;
    const parsed = savedAddressSchema.safeParse(value);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    run(() => saveAddressAction({ ...value, ...(editing && { id: editing }) }), reset);
  };

  return (
    <div className="flex flex-col gap-7">
      <h1 className="font-display text-h3 font-extrabold tracking-[-0.02em] text-fg-strong">
        Address <span className="text-fg-muted">({addresses.length})</span>
      </h1>

      <form ref={formRef} noValidate onSubmit={save} className="scroll-mt-28 rounded-lg border border-line p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-3.5">
          <h2 className="flex items-center gap-2 font-display text-[1.06rem] font-extrabold text-fg-strong">
            {editing ? <Pencil aria-hidden className="size-4.5 text-primary" /> : <Plus aria-hidden className="size-4.5 text-primary" />}
            {editing ? "Edit Address" : "Add New Address"}
          </h2>
          {editing && (
            <Button type="button" variant="ghost" size="sm" className="max-lg:h-11" onClick={reset} disabled={pending}>
              <X aria-hidden />
              Cancel
            </Button>
          )}
        </div>
        {full ? (
          <p className="rounded-md bg-sunken px-4 py-3 text-sm text-fg-muted">
            You have {MAX_SAVED_ADDRESSES} saved addresses — the most you can keep. Delete one to add another.
          </p>
        ) : (
          <>
            <AddressFields
              idPrefix="addr"
              title={editing ? "Edit address" : "New address"}
              value={value}
              errors={errors}
              withEmail={false}
              typePills
              bare
              onChange={(patch) => {
                setValue((v) => ({ ...v, ...patch }));
                setErrors((e) => {
                  const next = { ...e };
                  for (const k of Object.keys(patch)) delete next[k];
                  return next;
                });
              }}
            />
            <div className="mt-6">
              <Button type="submit" disabled={pending}>
                <Save aria-hidden />
                {pending ? "Saving…" : editing ? "Save changes" : "Save Address"}
              </Button>
            </div>
          </>
        )}
      </form>

      <section aria-labelledby="saved-addresses">
        <h2 id="saved-addresses" className="mb-4 font-display text-[1.06rem] font-extrabold text-fg-strong">
          Saved Addresses
        </h2>
        {addresses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line">
            <EmptyState bare icon={MapPinned} title="No saved addresses" description="Add a delivery address using the form and it will appear here." />
          </div>
        ) : (
          <ul role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {addresses.map((a) => {
              const Icon = TYPE_ICON[a.type];
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex min-w-0 flex-col rounded-lg border p-4.5",
                    a.isDefault ? "border-iris-200 bg-iris-50/40" : "border-line",
                    editing === a.id && "ring-2 ring-primary",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-wrap items-center gap-2 font-semibold text-fg-strong">
                      <span className="grid size-8 place-items-center rounded-md bg-iris-50 text-primary">
                        <Icon aria-hidden className="size-4" strokeWidth={2} />
                      </span>
                      {ADDRESS_TYPE_LABEL[a.type]}
                      {a.isDefault && <Badge tone="primary">Default</Badge>}
                    </span>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => edit(a)}
                        aria-label={`Edit ${ADDRESS_TYPE_LABEL[a.type]} address`}
                        title="Edit"
                        className="grid size-9 place-items-center rounded-md border border-line bg-card text-fg-muted transition-colors hover:border-primary hover:text-primary max-lg:size-11"
                      >
                        <Pencil aria-hidden className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(a)}
                        aria-label={`Delete ${ADDRESS_TYPE_LABEL[a.type]} address`}
                        title="Delete"
                        className="grid size-9 place-items-center rounded-md border border-line bg-card text-fg-muted transition-colors hover:border-error-500 hover:text-error-600 max-lg:size-11"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 font-semibold text-fg-strong">{a.name}</p>
                  <p className="mt-0.5 text-sm wrap-break-word text-fg">{addressLine(a)}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-fg-muted tabular-nums">
                    <Phone aria-hidden className="size-3.5" />
                    {a.phone}
                  </p>
                  {!a.isDefault && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setDefaultAddressAction({ id: a.id }))}
                      className="mt-3 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-primary hover:underline disabled:opacity-60"
                    >
                      <Star aria-hidden className="size-4" />
                      Set as default
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={!!deleting} onOpenChange={(o) => !pending && !o && setDeleting(null)}>
        <DialogContent className="sm:w-[min(440px,calc(100vw-32px))]" aria-describedby={undefined}>
          <span className="mb-4 grid size-14 place-items-center rounded-full bg-error-50 text-error-500">
            <TriangleAlert aria-hidden className="size-7" strokeWidth={1.8} />
          </span>
          <DialogTitle>Delete this address?</DialogTitle>
          <DialogDescription>
            {deleting && addressLine(deleting)}
            {deleting?.isDefault && addresses.length > 1 && " — it's your default; your newest other address becomes the default."}
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setDeleting(null)}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              className="bg-error-500 text-on-primary! hover:bg-error-600"
              onClick={() => {
                const id = deleting!.id;
                run(
                  () => deleteAddressAction({ id }),
                  () => {
                    setDeleting(null);
                    if (editing === id) reset();
                  },
                );
              }}
            >
              <Trash2 aria-hidden />
              {pending ? "Deleting…" : "Delete address"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
