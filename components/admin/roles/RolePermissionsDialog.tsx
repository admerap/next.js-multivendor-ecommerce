"use client";

import { KeyRound, Save, ToggleLeft, ToggleRight, TriangleAlert, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { saveRolePermissionsAction } from "@/lib/actions/admin-roles";
import type { AdminRoleRow } from "@/lib/admin-roles.server";
import {
  ACTION_LABEL,
  allPermissions,
  noPermissions,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type PermissionAction,
  type PermissionModule,
  type RolePermissions,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

const COLS = "sm:grid-cols-[2.5rem_minmax(0,1fr)_repeat(4,6.5rem)]";
const same = (a: RolePermissions, b: RolePermissions) => PERMISSION_MODULES.every((m) => PERMISSION_ACTIONS.every((x) => a[m.key][x] === b[m.key][x]));
const offers = (module: (typeof PERMISSION_MODULES)[number], action: PermissionAction) => (module.actions as readonly PermissionAction[]).includes(action);

/**
 * Roles › Permissions (like the reference, large): # · Module · Read · Create · Update · Delete, one switch each,
 * then Close / Save. Every module fits on screen; the header and buttons stay put if a small screen has to
 * scroll. Turning Create, Update or Delete on turns Read on; turning Read off turns the rest off. Actions a
 * module doesn't have show "—". "Turn all on / off" set the whole matrix. Save is on only when something changed,
 * and closing with unsaved changes asks first. The Super Admin role always has everything (read-only view), and
 * `lockedReason` makes it read-only (e.g. your own role); `grantable` (anyone but a Super Admin) switches off the
 * switches you don't hold yourself — you can't grant access you don't have. `onSaved` hands the saved matrix back so reopening shows
 * it at once, before the page refresh lands.
 */
export function RolePermissionsDialog({
  role,
  initial,
  lockedReason,
  grantable,
  open,
  onOpenChange,
  onSaved,
}: {
  role: AdminRoleRow;
  /** what the switches start from (the role's stored permissions, or what was just saved) */
  initial: RolePermissions;
  /** why this role can't be changed by the viewer, if it can't (read-only view) */
  lockedReason: string | null;
  /** the viewer's own permissions, when they aren't a Super Admin: the most they can grant */
  grantable: RolePermissions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (permissions: RolePermissions) => void;
}) {
  const router = useRouter();
  const [perms, setPerms] = useState<RolePermissions>(initial);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pending, start] = useTransition();
  const locked = role.isSystem || !!lockedReason;
  const mayGrant = (m: PermissionModule, a: PermissionAction) => !grantable || grantable[m][a];
  const dirty = !locked && !same(perms, initial);
  const granted = PERMISSION_MODULES.filter((m) => perms[m.key].read).length;

  const toggle = (module: PermissionModule, action: PermissionAction, on: boolean) => {
    setConfirmDiscard(false);
    setPerms((all) => {
      const p = { ...all[module], [action]: on };
      if (action === "read" && !on) p.create = p.update = p.delete = false;
      if (action !== "read" && on) p.read = true;
      return { ...all, [module]: p };
    });
  };
  const setAll = (on: boolean) => {
    setConfirmDiscard(false);
    // "All on" stops at what the viewer may grant.
    setPerms(on ? (grantable ?? allPermissions()) : noPermissions());
  };

  // Closing (X, Close, Escape, outside click) with unsaved changes asks first.
  const requestClose = () => {
    if (pending) return;
    if (dirty) setConfirmDiscard(true);
    else onOpenChange(false);
  };

  const save = () =>
    start(async () => {
      const res = await saveRolePermissionsAction({ id: role.id, permissions: perms }).catch(() => ({
        success: false as const,
        error: "We couldn't reach the server. Please try again.",
      }));
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Permissions for “${res.name}” were saved`);
      onSaved(perms);
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : requestClose())}>
      <DialogContent hideClose className="gap-0 overflow-hidden p-0 sm:max-h-[96dvh] sm:w-[min(1040px,calc(100vw-32px))] sm:p-0">
        <div className="flex shrink-0 items-center gap-3 bg-primary px-5 py-3 text-on-primary sm:px-7">
          <KeyRound aria-hidden className="size-5.5" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <DialogTitle className="pr-0 font-display text-xl font-extrabold text-on-primary">User Permissions</DialogTitle>
            <p className="truncate text-sm text-on-primary/80">{role.name}</p>
            <DialogDescription className="sr-only">{`What users with the ${role.name} role can do in each admin module.`}</DialogDescription>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-full text-on-primary transition-colors duration-(--dur-fast) hover:bg-on-primary/15"
          >
            <X aria-hidden className="size-5" strokeWidth={2} />
          </button>
        </div>

        {/* The only scrolling area: header and footer stay in view. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-7">
          <div role="table" aria-label={`Permissions for ${role.name}`}>
            <div role="row" className={cn("sticky top-0 z-1 hidden border-b border-line bg-card py-2 text-sm font-semibold text-fg-strong sm:grid", COLS)}>
              <span role="columnheader">#</span>
              <span role="columnheader">Module</span>
              {PERMISSION_ACTIONS.map((a) => (
                <span key={a} role="columnheader" className="text-center">
                  {ACTION_LABEL[a]}
                </span>
              ))}
            </div>
            {PERMISSION_MODULES.map((m, i) => (
              <div key={m.key} role="row" className={cn("grid grid-cols-4 items-center border-b border-line py-1.5 last:border-b-0 sm:py-0", COLS)}>
                <span role="cell" className="hidden text-sm text-fg-muted tabular-nums sm:block">
                  {i + 1}
                </span>
                <span role="rowheader" className="col-span-4 pt-1 text-sm font-semibold text-fg-strong sm:col-span-1 sm:pt-0 sm:font-medium sm:text-fg">
                  {m.label}
                </span>
                {PERMISSION_ACTIONS.map((a) => (
                  <span key={a} role="cell" className="flex flex-col items-center">
                    <span aria-hidden className="text-caption text-fg-muted sm:hidden">
                      {ACTION_LABEL[a]}
                    </span>
                    {offers(m, a) ? (
                      <Switch
                        checked={perms[m.key][a]}
                        onCheckedChange={(on) => toggle(m.key, a, on)}
                        disabled={locked || pending || !mayGrant(m.key, a)}
                        title={!locked && !mayGrant(m.key, a) ? "Your role doesn't have this, so you can't grant it" : undefined}
                        aria-label={`${m.label}: ${ACTION_LABEL[a]}`}
                      />
                    ) : (
                      <span className="grid h-11 place-items-center text-fg-subtle" title={`${m.label} has no ${ACTION_LABEL[a]} action`}>
                        —<span className="sr-only">{`${m.label} has no ${ACTION_LABEL[a]} action`}</span>
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-line px-5 py-4 sm:px-7">
          {confirmDiscard ? (
            <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-fg-strong">
                <TriangleAlert aria-hidden className="size-4.5 shrink-0 text-warning-600" />
                You have unsaved changes. Close without saving?
              </p>
              <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
                <Button type="button" variant="secondary" onClick={() => setConfirmDiscard(false)}>
                  <Undo2 aria-hidden />
                  Keep editing
                </Button>
                <Button type="button" variant="danger" onClick={() => onOpenChange(false)}>
                  <X aria-hidden />
                  Discard changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {/* Summary + bulk switches on the left, Close / Save on the right. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:mr-auto">
                <p className="text-sm text-fg-muted">
                  {role.isSystem
                    ? "This system role always has full access to every module."
                    : lockedReason
                      ? `${lockedReason}, so you can only view these permissions.`
                      : `Access to ${granted} of ${PERMISSION_MODULES.length} modules`}
                </p>
                {!locked && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" size="sm" className="max-lg:h-11" onClick={() => setAll(true)} disabled={pending}>
                      <ToggleRight aria-hidden />
                      Turn all on
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="max-lg:h-11" onClick={() => setAll(false)} disabled={pending}>
                      <ToggleLeft aria-hidden />
                      Turn all off
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={requestClose} disabled={pending}>
                  <X aria-hidden />
                  Close
                </Button>
                {!locked && (
                  <Button type="button" onClick={save} disabled={pending || !dirty} title={dirty ? undefined : "Nothing to save yet"}>
                    <Save aria-hidden />
                    {pending ? "Saving…" : "Save"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
