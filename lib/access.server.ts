import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { requireArea } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { allPermissions, noPermissions, toPermissions, type PermissionAction, type PermissionModule, type RolePermissions } from "@/lib/permissions";

export type Access = {
  userId: string;
  /** the signed-in admin's name, email and photo, fresh from the database (header) */
  name: string;
  email: string;
  image: string | null;
  roleId: string | null;
  roleName: string | null;
  isSuper: boolean;
  permissions: RolePermissions;
};

/**
 * What the signed-in admin may do: their role's permissions, read from the database on every request (once per
 * request — React `cache`), so a change applies on the next click without signing in again. The Super Admin
 * role has everything; no role, or a role that was switched off or deleted, has nothing. null = not an admin.
 */
export const getAccess = cache(async (): Promise<Access | null> => {
  const session = await auth();
  if (session?.user.role !== "ADMIN" || !session.user.id) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      adminRole: {
        select: {
          id: true,
          name: true,
          isSystem: true,
          isActive: true,
          deletedAt: true,
          permissions: { select: { module: true, canRead: true, canCreate: true, canUpdate: true, canDelete: true } },
        },
      },
    },
  });
  const role = me?.adminRole;
  const live = !!role && !role.deletedAt && role.isActive;
  const isSuper = live && role.isSystem;
  return {
    userId: session.user.id,
    name: me?.name ?? session.user.name ?? "Admin",
    email: me?.email ?? session.user.email ?? "",
    image: me?.image ?? null,
    roleId: role?.id ?? null,
    roleName: role?.name ?? null,
    isSuper,
    permissions: isSuper ? allPermissions() : live ? toPermissions(role.permissions) : noPermissions(),
  };
});

/** May the signed-in admin do `action` in `module`? (Server Actions and Route Handlers check this.) */
export async function can(module: PermissionModule, action: PermissionAction = "read") {
  return !!(await getAccess())?.permissions[module][action];
}

/** The modules the signed-in admin may open (sidebar, dashboard shortcuts). */
export const readableModules = (access: Access | null) =>
  access ? (Object.keys(access.permissions) as PermissionModule[]).filter((m) => access.permissions[m].read) : [];

export const NO_ACCESS_PATH = "/admin/no-access";

/**
 * Page guard for the admin panel: signed in as an admin (else to the login page) AND allowed `action` (Read by
 * default; e.g. Create for an "Add …" page) in `module` (else to "No access"). Typing a URL can't get around a
 * hidden menu item.
 */
export async function requirePermission(module: PermissionModule, action: PermissionAction = "read") {
  const user = await requireArea("ADMIN");
  const access = await getAccess();
  if (!access?.permissions[module][action]) redirect(NO_ACCESS_PATH);
  return user;
}

/** The standard "your role can't do that" result for Server Actions. */
export const noPermissionResult = { success: false as const, error: "Your role doesn't allow this. Ask a Super Admin for access." };
