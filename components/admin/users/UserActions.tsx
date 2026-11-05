"use client";

import { Eye, Pencil, RotateCcw, Trash2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { iconActionClass } from "@/components/data/list-classes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { deleteStaffUserAction, restoreStaffUserAction } from "@/lib/actions/admin-users";
import type { RoleOption } from "@/lib/admin-roles.server";
import type { AdminUserRow } from "@/lib/admin-users.server";
import { cn } from "@/lib/utils";
import { UserFormDialog } from "./UserFormDialog";
import type { UserViewer } from "./AdminUserTable";
import { UserViewDialog } from "./UserViewDialog";

/**
 * View · Edit · Delete for one staff account (like the reference). View shows the details; Edit opens the user
 * modal pre-filled (amber, like Roles); Delete asks first and soft-deletes (a Super Admin can restore it).
 * The viewer's role decides what shows: Edit needs Users › Update (your own row always has it), Delete and
 * Restore is the Super Admin's alone. A rule that blocks one row keeps its button but switched off with the reason:
 * your own account can't be deleted, a Super Admin can't be deleted, and an account whose role has more access
 * than yours can't be edited or deleted. The server enforces the same.
 */
export function UserActions({ user, roles, viewer }: { user: AdminUserRow; roles: RoleOption[]; viewer: UserViewer }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"view" | "edit" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const self = user.id === viewer.id;

  function run(action: typeof deleteStaffUserAction, done: (name: string) => string) {
    startTransition(async () => {
      try {
        const res = await action({ id: user.id });
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success(done(res.name));
        if (res.roleCleared) toast(`${res.name}'s role was deleted, so they're back with no role. Give them one with Edit.`, { icon: "⚠️", duration: 6000 });
        setDialog(null);
        router.refresh();
      } catch {
        toast.error("We couldn't reach the server. Please try again.");
      }
    });
  }

  const view = (
    <button
      type="button"
      onClick={() => setDialog("view")}
      aria-label={`View ${name}`}
      title="View"
      className={cn(iconActionClass, "border-line bg-iris-50 text-primary hover:bg-primary hover:text-on-primary")}
    >
      <Eye aria-hidden className="size-4" strokeWidth={2} />
    </button>
  );
  const viewDialog = dialog === "view" && <UserViewDialog user={user} open onOpenChange={(o) => !o && setDialog(null)} />;

  if (user.deletedAt) {
    return (
      <div className="flex items-center justify-center gap-1.5">
        {view}
        {viewer.isSuper && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="max-lg:h-11"
            disabled={pending}
            onClick={() => run(restoreStaffUserAction, (n) => `${n} was restored`)}
            aria-label={`Restore ${name}`}
          >
            <RotateCcw aria-hidden />
            {pending ? "Restoring…" : "Restore"}
          </Button>
        )}
        {viewDialog}
      </div>
    );
  }

  const showEdit = self || viewer.canUpdate;
  const showDelete = viewer.canDelete;
  const editLocked = !self && user.outranksViewer ? "This account has more access than your role" : null;
  const deleteLocked = user.isSuperAdmin
    ? "A Super Admin can't be deleted"
    : self
      ? "You can't delete your own account"
      : user.outranksViewer
        ? "This account has more access than your role"
        : null;
  const disabledLook = "disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center justify-center gap-1.5">
      {view}
      {showEdit && (
        <button
          type="button"
          onClick={() => setDialog("edit")}
          disabled={!!editLocked}
          aria-label={editLocked ? `${name}: ${editLocked}` : `Edit ${name}`}
          title={editLocked ?? "Edit"}
          className={cn(
            iconActionClass,
            "border-line bg-warning-50 text-warning-600 hover:bg-warning-500 hover:text-on-primary",
            disabledLook,
            "disabled:hover:bg-warning-50 disabled:hover:text-warning-600",
          )}
        >
          <Pencil aria-hidden className="size-4" strokeWidth={2} />
        </button>
      )}
      {showDelete && (
        <button
          type="button"
          onClick={() => setDialog("delete")}
          disabled={!!deleteLocked}
          aria-label={deleteLocked ? `${name}: ${deleteLocked}` : `Delete ${name}`}
          title={deleteLocked ?? "Delete"}
          className={cn(
            iconActionClass,
            "border-line bg-error-50 text-error-600 hover:bg-error-500 hover:text-on-primary",
            disabledLook,
            "disabled:hover:bg-error-50 disabled:hover:text-error-600",
          )}
        >
          <Trash2 aria-hidden className="size-4" strokeWidth={2} />
        </button>
      )}

      {viewDialog}
      {/* Mounted only while open, so it always starts from the user's current values. */}
      {dialog === "edit" && <UserFormDialog user={user} roles={roles} self={self} open onOpenChange={(o) => !o && setDialog(null)} />}
      <Dialog open={dialog === "delete"} onOpenChange={(o) => !pending && setDialog(o ? "delete" : null)}>
        <DialogContent className="sm:w-[min(460px,calc(100vw-32px))]" aria-describedby={undefined}>
          <span className="mb-4 grid size-14 place-items-center rounded-full bg-error-50 text-error-500">
            <TriangleAlert aria-hidden className="size-7" strokeWidth={1.8} />
          </span>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            {name} won&apos;t be able to sign in and disappears from the user list. The account isn&apos;t erased — you can bring it back any time from Deleted
            users.
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setDialog(null)}>
              <X aria-hidden />
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => run(deleteStaffUserAction, (n) => `${n} was deleted`)}
              className="bg-error-500 !text-on-primary hover:bg-error-600"
            >
              <Trash2 aria-hidden />
              {pending ? "Deleting…" : "Delete user"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
