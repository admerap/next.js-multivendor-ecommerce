"use client";

import { Camera, Contact, ImagePlus, Mail, Phone, Save, ShieldCheck, Trash2, TriangleAlert, Undo2, UserRound, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ChatAvatar } from "@/components/chat/ChatAvatar";
import { ariaFor, Field } from "@/components/forms/FormBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateMyProfileAction } from "@/lib/actions/admin-profile";
import { cn } from "@/lib/utils";
import { STAFF_IMAGE_TYPES, staffImageSchema, staffProfileSchema } from "@/lib/validations/admin-user";

type Values = { firstName: string; lastName: string; phone: string; email: string };
type Key = keyof Values | "image" | "currentPassword";

/**
 * Admin › Profile. Left, always shown whichever tab is open: a read-only summary card — iris banner, the photo,
 * name, role and status badges and contact details — that previews edits as you type. Right: the tabs, then
 * either the Profile Information form — Profile photo (upload / change / remove), Personal details, Contact —
 * with Discard / Save changes, on only when something changed — or the Change Password card.
 * Role and status are shown, not edited — whoever manages users sets those. Validated here for quick feedback and
 * again on the server; the header picks up the new name and photo right away.
 */
export function AdminProfile({
  initial,
  image,
  role,
  isSuperAdmin,
  status,
  tab,
  tabs,
  passwordPanel,
}: {
  initial: Values;
  image: string | null;
  role: string;
  isSuperAdmin: boolean;
  status: "active" | "inactive";
  /** which panel the right column shows */
  tab: "info" | "password";
  /** the tab links, rendered above the right card */
  tabs: React.ReactNode;
  /** the Change Password card (server-rendered) */
  passwordPanel: React.ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [pending, start] = useTransition();
  const base = useId();
  const fid = (k: Key) => `${base}-${k}`;

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const shown = removeImage ? null : (preview ?? image);
  const photoChanged = !!file || removeImage;
  // A new email (the sign-in name) needs the current password — asked right under the Email field.
  const emailChanged = values.email.trim().toLowerCase() !== saved.email.trim().toLowerCase();
  const dirty = photoChanged || (Object.keys(values) as (keyof Values)[]).some((k) => values[k] !== saved[k]);
  const fullName = [values.firstName, values.lastName].filter(Boolean).join(" ") || "Your name";

  // Unsaved edits are never lost silently: switching tab asks first (leaveTo = the tab waiting to open), and
  // reloading or closing the page shows the browser's own warning.
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const guardTabs = (e: React.MouseEvent) => {
    const link = (e.target as HTMLElement).closest("a");
    if (!dirty || !link || link.getAttribute("aria-current") === "page") return;
    e.preventDefault();
    setLeaveTo(link.getAttribute("href"));
  };
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (k: keyof Values, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
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
  const discard = () => {
    setValues(saved);
    setFile(null);
    setRemoveImage(false);
    setErrors({});
    setCurrentPassword("");
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !dirty) return;
    const parsed = staffProfileSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Key, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as Key] ??= issue.message;
      setErrors(next);
      return;
    }
    const form = new FormData();
    for (const [k, v] of Object.entries(values)) form.set(k, v);
    if (emailChanged) form.set("currentPassword", currentPassword);
    if (file) form.set("image", file);
    else if (removeImage) form.set("removeImage", "1");
    start(async () => {
      const res = await updateMyProfileAction(form).catch(() => ({
        success: false as const,
        error: "We couldn't reach the server. Please try again.",
        fieldErrors: undefined,
      }));
      if (!res.success) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setSaved(values);
      setFile(null);
      setRemoveImage(false);
      setCurrentPassword("");
      router.refresh();
    });
  };

  const text = (k: keyof Values, label: string, extra: React.ComponentProps<"input"> = {}) => (
    <Field id={fid(k)} label={label} required={k !== "phone"} error={errors[k]}>
      <Input {...ariaFor(fid(k), errors[k])} value={values[k]} onChange={(e) => set(k, e.target.value)} {...extra} />
    </Field>
  );
  const group = (icon: typeof UserRound, title: string, children: React.ReactNode) => {
    const Icon = icon;
    return (
      <div role="group" aria-label={title} className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm font-bold text-fg-strong">
          <Icon aria-hidden className="size-4 text-primary" strokeWidth={2} />
          {title}
        </p>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{children}</div>
      </div>
    );
  };

  // The photo as it will be saved: the new pick, the current one, or initials (both cards show it).
  const photo = (size: number) =>
    preview && !removeImage ? (
      <Image src={preview} alt="New photo preview" fill sizes={`${size}px`} unoptimized className="object-cover" />
    ) : (
      <ChatAvatar name={fullName} image={shown} size={size} />
    );

  // The summary card keeps the height of what it shows (self-start), on both tabs; the right column grows as it needs.
  // Side by side it stays in view while the form scrolls (sticky top-23 = the h-17 header + a 6-step gap) — only when the
  // window is tall enough to show all of it.
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* Left: the summary card, always shown (both tabs); previews the edits as you type. */}
      <section
        aria-label="Profile summary"
        className="flex flex-col self-start overflow-hidden rounded-lg bg-card shadow-sm lg:top-23 lg:[@media(min-height:640px)]:sticky"
      >
        <div aria-hidden className="relative h-28 overflow-hidden bg-linear-135 from-iris-700 to-iris-900">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,var(--iris-400),transparent_55%)] opacity-35" />
        </div>
        <div className="flex flex-1 flex-col items-center px-6 pb-6 text-center">
          <span
            className={cn(
              "relative -mt-14 grid size-28 place-items-center overflow-hidden rounded-full bg-card ring-4 ring-card transition-opacity",
              pending && "opacity-60",
            )}
          >
            {photo(112)}
          </span>

          <p className="mt-3 max-w-full truncate font-display text-xl font-extrabold text-fg-strong" title={fullName}>
            {fullName}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Badge tone="primary">
              {isSuperAdmin && <ShieldCheck aria-hidden className="size-3.5" />}
              {role}
            </Badge>
            <Badge tone={status === "active" ? "success" : "neutral"}>{status === "active" ? "Active" : "Inactive"}</Badge>
          </div>

          <dl className="mt-5 mb-5 w-full space-y-3 border-t border-line pt-5 text-left text-sm">
            {[
              { icon: Mail, label: "Email", value: values.email || "—" },
              { icon: Phone, label: "Phone", value: values.phone || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-iris-50 text-primary">
                  <Icon aria-hidden className="size-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <dt className="text-caption text-fg-muted">{label}</dt>
                  <dd className="truncate font-medium text-fg-strong" title={value}>
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
          <p className="w-full rounded-md bg-sunken px-3 py-2.5 text-left text-caption text-fg-muted">Your role and status are set by whoever manages users.</p>
        </div>
      </section>

      {/* Right: one card — the tabs are its header; below them the panel they pick (form or password). */}
      <section aria-label={tab === "password" ? "Change Password" : "Profile Information"} className="flex min-w-0 flex-col rounded-lg bg-card shadow-sm">
        <div className="border-b border-line px-5 py-3.5 sm:px-7" onClickCapture={guardTabs}>
          {tabs}
        </div>
        {tab === "password" ? (
          passwordPanel
        ) : (
          <form noValidate onSubmit={save} className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-7 px-5 py-6 sm:px-7">
              {/* Profile photo: managed here; the summary card only shows it. */}
              <div role="group" aria-label="Profile photo" className="flex flex-col gap-4">
                <p className="flex items-center gap-2 text-sm font-bold text-fg-strong">
                  <Camera aria-hidden className="size-4 text-primary" strokeWidth={2} />
                  Profile photo
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <span
                    className={cn("relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full transition-opacity", pending && "opacity-60")}
                  >
                    {photo(64)}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="secondary" size="sm" className="max-lg:h-11">
                        <label
                          htmlFor={fid("image")}
                          className="cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary"
                        >
                          <ImagePlus aria-hidden />
                          {shown ? "Change photo" : "Upload photo"}
                          <input
                            id={fid("image")}
                            type="file"
                            accept={STAFF_IMAGE_TYPES.join(",")}
                            aria-label={shown ? "Change profile photo" : "Upload profile photo"}
                            aria-invalid={errors.image ? true : undefined}
                            aria-describedby={errors.image ? `${fid("image")}-error` : undefined}
                            disabled={pending}
                            className="sr-only"
                            onChange={(e) => {
                              pick(e.target.files?.[0]);
                              e.target.value = ""; // allow re-picking the same file
                            }}
                          />
                        </label>
                      </Button>
                      {shown && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="max-lg:h-11"
                          disabled={pending}
                          onClick={() => {
                            setFile(null);
                            setRemoveImage(!!image);
                          }}
                        >
                          <Trash2 aria-hidden />
                          Remove
                        </Button>
                      )}
                    </div>
                    {errors.image && (
                      <p id={`${fid("image")}-error`} role="alert" className="text-caption font-medium text-error-600">
                        {errors.image}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-line" />
              {group(
                UserRound,
                "Personal details",
                <>
                  {text("firstName", "Name", { autoComplete: "given-name", maxLength: 50, placeholder: "Your name" })}
                  {text("lastName", "Last Name", { autoComplete: "family-name", maxLength: 50, placeholder: "Your last name" })}
                </>,
              )}
              <div className="border-t border-line" />
              {group(
                Contact,
                "Contact",
                <>
                  {text("email", "Email", { type: "email", autoComplete: "email", placeholder: "you@sundry.com" })}
                  {text("phone", "Phone", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "+1 415 555 0100" })}
                  {emailChanged && (
                    <Field
                      id={fid("currentPassword")}
                      label="Current password"
                      required
                      error={errors.currentPassword}
                      hint="You sign in with your email, so changing it needs your password"
                    >
                      <Input
                        {...ariaFor(fid("currentPassword"), errors.currentPassword)}
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setErrors((x) => ({ ...x, currentPassword: undefined }));
                        }}
                        placeholder="Enter your current password"
                      />
                    </Field>
                  )}
                </>,
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
              {dirty && (
                <p role="status" className="text-caption font-medium text-warning-600 sm:mr-auto">
                  You have unsaved changes
                </p>
              )}
              {dirty && (
                <Button type="button" variant="secondary" onClick={discard} disabled={pending}>
                  <Undo2 aria-hidden />
                  Discard
                </Button>
              )}
              <Button type="submit" disabled={pending || !dirty} title={dirty ? undefined : "Nothing to save yet"}>
                <Save aria-hidden />
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </section>

      <Dialog open={!!leaveTo} onOpenChange={(o) => !o && setLeaveTo(null)}>
        <DialogContent className="sm:w-[min(460px,calc(100vw-32px))]" aria-describedby={undefined}>
          <span className="mb-4 grid size-14 place-items-center rounded-full bg-warning-50 text-warning-600">
            <TriangleAlert aria-hidden className="size-7" strokeWidth={1.8} />
          </span>
          <DialogTitle>Leave without saving?</DialogTitle>
          <DialogDescription>Your changes to Profile Information haven&apos;t been saved and will be lost.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setLeaveTo(null)}>
              <Undo2 aria-hidden />
              Keep editing
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                const href = leaveTo;
                setLeaveTo(null);
                discard();
                if (href) router.push(href);
              }}
            >
              <X aria-hidden />
              Discard changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
