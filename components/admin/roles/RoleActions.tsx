"use client";

import { KeyRound, Pencil, RotateCcw, Trash2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { iconActionClass } from "@/components/data/list-classes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { deleteRoleAction, restoreRoleAction } from "@/lib/actions/admin-roles";
import type { AdminRoleRow } from "@/lib/admin-roles.server";
import { covers, type RolePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { RoleFormDialog } from "./RoleFormDialog";
import { RolePermissionsDialog } from "./RolePermissionsDialog";

/** Who is looking at the role list: their role (to spot their own) and its permissions. */
export type RoleViewer = { isSuper: boolean; roleId: string | null; permissions: RolePermissions };

/**
 * Why `viewer` may not change `role`, if they may not — the same rule as the server (lib/actions/admin-roles):
 * only a Super Admin changes the Super Admin role, their own role, or one with access they lack.
 */
function offLimits(viewer: RoleViewer, role: AdminRoleRow) {
  if (viewer.isSuper) return null;
  if (role.isSystem) return "Only a Super Admin can change the Super Admin role";
  if (role.id === viewer.roleId) return "You can't change your own role";
  if (!covers(viewer.permissions, role.permissions)) return "This role has more access than yours";
  return null;
}

/**
 * Permissions · Edit · Delete for one role (like the reference). The viewer's role decides what shows:
 * Permissions and Edit need Roles › Update, Delete needs Roles › Delete, Restore is the Super Admin's alone. A rule that blocks one row
 * keeps its button switched off with the reason (the Super Admin role, a role still in use, your own role, a
 * role with more access). Edit is amber, to stand apart; Delete asks first and soft-deletes (restorable from
 * Deleted roles). In the Deleted view the only action is Restore.
 */
export function RoleActions({ role, viewer }: { role: AdminRoleRow; viewer: RoleViewer }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [permsOpen, setPermsOpen] = useState(false);
  // What was just saved, until the refreshed row (a new `role.permissions`) arrives — so reopening right away is never stale.
  const [justSaved, setJustSaved] = useState<{ base: RolePermissions; perms: RolePermissions } | null>(null);
  const permissions = justSaved?.base === role.permissions ? justSaved.perms : role.permissions;
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: typeof deleteRoleAction, done: (name: string) => string) {
    startTransition(async () => {
      try {
        const res = await action({ id: role.id });
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success(done(res.name));
        setConfirming(false);
        router.refresh();
      } catch {
        toast.error("We couldn't reach the server. Please try again.");
      }
    });
  }

  const perms = viewer.permissions.roles;
  if (role.deletedAt) {
    // Restoring is the Super Admin's alone.
    if (!viewer.isSuper) return <span className="block text-center text-fg-subtle">—</span>;
    return (
      <div className="flex items-center justify-center">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="max-lg:h-11"
          disabled={pending}
          onClick={() => run(restoreRoleAction, (n) => `Role “${n}” was restored`)}
          aria-label={`Restore ${role.name}`}
        >
          <RotateCcw aria-hidden />
          {pending ? "Restoring…" : "Restore"}
        </Button>
      </div>
    );
  }

  const blocked = offLimits(viewer, role);
  // The Super Admin's own row: its description stays editable by a Super Admin; its permissions are always "all".
  const editLocked = role.isSystem && viewer.isSuper ? null : blocked;
  // Why Delete is off, if it is: the Super Admin never goes; a role in use waits until its users move.
  const deleteLocked = role.isSystem
    ? "The Super Admin role can't be deleted"
    : role.users > 0
      ? `Assigned to ${role.users} ${role.users === 1 ? "user" : "users"} — can't be deleted`
      : blocked;
  const off = "disabled:cursor-not-allowed disabled:opacity-40";
  if (!perms.update && !perms.delete) return <span className="block text-center text-fg-subtle">—</span>;
  return (
    <div className="flex items-center justify-center gap-1.5">
      {perms.update && (
        <>
          {/* Permissions opens even when the role is off-limits (read-only), so you can see what it can do. */}
          <button
            type="button"
            onClick={() => setPermsOpen(true)}
            aria-label={`Permissions for ${role.name}`}
            title="Permissions"
            className={cn(iconActionClass, "border-line bg-iris-50 text-primary hover:bg-primary hover:text-on-primary")}
          >
            <KeyRound aria-hidden className="size-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={!!editLocked}
            aria-label={editLocked ? `${role.name}: ${editLocked}` : `Edit ${role.name}`}
            title={editLocked ?? "Edit"}
            className={cn(
              iconActionClass,
              "border-line bg-warning-50 text-warning-600 hover:bg-warning-500 hover:text-on-primary",
              off,
              "disabled:hover:bg-warning-50 disabled:hover:text-warning-600",
            )}
          >
            <Pencil aria-hidden className="size-4" strokeWidth={2} />
          </button>
        </>
      )}
      {perms.delete && (
        <button
          type="button"
          onClick={deleteLocked ? undefined : () => setConfirming(true)}
          disabled={!!deleteLocked}
          aria-label={deleteLocked ? `${role.name}: ${deleteLocked}` : `Delete ${role.name}`}
          title={deleteLocked ?? "Delete"}
          className={cn(
            iconActionClass,
            "border-line bg-error-50 text-error-600 hover:bg-error-500 hover:text-on-primary",
            off,
            "disabled:hover:bg-error-50 disabled:hover:text-error-600",
          )}
        >
          <Trash2 aria-hidden className="size-4" strokeWidth={2} />
        </button>
      )}
      {/* Mounted only while open, so it always starts from the role's current values. */}
      {editing && <RoleFormDialog role={role} open onOpenChange={(o) => !o && setEditing(false)} />}
      {permsOpen && (
        <RolePermissionsDialog
          role={role}
          initial={permissions}
          lockedReason={role.isSystem ? null : blocked}
          grantable={viewer.isSuper ? null : viewer.permissions}
          open
          onOpenChange={(o) => !o && setPermsOpen(false)}
          onSaved={(perms) => setJustSaved({ base: role.permissions, perms })}
        />
      )}
      <Dialog open={confirming} onOpenChange={(o) => !pending && setConfirming(o)}>
        <DialogContent className="sm:w-[min(460px,calc(100vw-32px))]" aria-describedby={undefined}>
          <span className="mb-4 grid size-14 place-items-center rounded-full bg-error-50 text-error-500">
            <TriangleAlert aria-hidden className="size-7" strokeWidth={1.8} />
          </span>
          <DialogTitle>Delete “{role.name}”?</DialogTitle>
          <DialogDescription>
            The role disappears from the role list and can&apos;t be given to users. It isn&apos;t erased — you can bring it back any time from Deleted roles.
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => run(deleteRoleAction, (n) => `Role “${n}” was deleted`)}
              className="bg-error-500 !text-on-primary hover:bg-error-600"
            >
              <Trash2 aria-hidden />
              {pending ? "Deleting…" : "Delete role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
