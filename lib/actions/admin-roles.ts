"use server";

import type { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAccess, noPermissionResult, type Access } from "@/lib/access.server";
import { prisma } from "@/lib/db";
import { covers, normalize, PERMISSION_MODULES, toPermissions, type PermissionAction, type RolePermissions } from "@/lib/permissions";
import { createRoleSchema, roleIdSchema, rolePermissionsSchema, updateRoleSchema } from "@/lib/validations/admin-role";

export type RoleResult = { success: true; name: string } | { success: false; error: string; fieldErrors?: Record<string, string> };

const FORBIDDEN: RoleResult = {
  success: false,
  error: "You don't have access to do that.",
};
const TAKEN: RoleResult = {
  success: false,
  error: "A role with this name already exists",
  fieldErrors: { name: "A role with this name already exists" },
};
const TAKEN_BY_DELETED: RoleResult = {
  success: false,
  error: "A deleted role has this name — restore it from Deleted roles instead",
  fieldErrors: {
    name: "A deleted role has this name. Restore it from Deleted roles.",
  },
};
const GONE: RoleResult = {
  success: false,
  error: "This role no longer exists. Refresh the page.",
};

function invalid(error: z.ZodError): RoleResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return {
    success: false,
    error: "Please check the highlighted fields",
    fieldErrors,
  };
}

/**
 * Names stay unique across live AND deleted roles (the database index), so a name held by a deleted role points
 * to restoring it rather than making a twin. MySQL compares case-insensitively ("support" = "Support").
 */
async function nameTaken(name: string, exceptId?: string): Promise<RoleResult | null> {
  const clash = await prisma.adminRole.findFirst({
    where: { name, ...(exceptId && { id: { not: exceptId } }) },
    select: { deletedAt: true },
  });
  return clash ? (clash.deletedAt ? TAKEN_BY_DELETED : TAKEN) : null;
}

const refresh = () => revalidatePath("/admin/roles");

/** The signed-in admin, if their role may `action` in Roles; otherwise the result to return. */
async function allowed(action: PermissionAction): Promise<Access | { error: RoleResult }> {
  const me = await getAccess();
  if (!me) return { error: FORBIDDEN };
  if (!me.permissions.roles[action]) return { error: noPermissionResult };
  return me;
}

/**
 * Why a non-Super Admin may not change this role, if they may not: the Super Admin role, their own role (they'd
 * be editing their own access), or a role with access they lack.
 */
function offLimits(me: Access, role: { id: string; isSystem: boolean; permissions: RolePermissions }): RoleResult | null {
  if (me.isSuper) return null;
  if (role.isSystem) return { success: false, error: "Only a Super Admin can change the Super Admin role." };
  if (role.id === me.roleId) return { success: false, error: "You can't change your own role. Ask a Super Admin." };
  if (!covers(me.permissions, role.permissions)) return { success: false, error: "This role has more access than yours. Ask a Super Admin." };
  return null;
}

const PERM_FIELDS = { module: true, canRead: true, canCreate: true, canUpdate: true, canDelete: true } as const;

/** Delete refused: the role still has users (the Delete button is off for these too). */
const inUse = (name: string, users: number) =>
  `“${name}” is assigned to ${users} ${users === 1 ? "user" : "users"} — give them another role before deleting it.`;

/** Roles › New Role (needs Roles › Create): validated on the server, the name must be unique. */
export async function createRoleAction(input: unknown): Promise<RoleResult> {
  const me = await allowed("create");
  if ("error" in me) return me.error;
  const parsed = createRoleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { name, description, status } = parsed.data;
  try {
    const taken = await nameTaken(name);
    if (taken) return taken;
    await prisma.adminRole.create({
      data: { name, description, isActive: status === "active" },
    });
    refresh();
    return { success: true, name };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return TAKEN; // created at the same moment by someone else
    console.error("[admin-roles] create failed", error instanceof Error ? error.name : error);
    return {
      success: false,
      error: "We couldn't create the role. Please try again.",
    };
  }
}

/**
 * Roles › Edit (needs Roles › Update): same rules as New Role (unique name, ignoring this role itself). A system
 * role — the Super Admin — keeps its name and stays active; only its description can change, and only by a Super
 * Admin. Nobody else edits their own role or one with more access. Deleted roles can't be edited.
 */
export async function updateRoleAction(input: unknown): Promise<RoleResult> {
  const me = await allowed("update");
  if ("error" in me) return me.error;
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, name, description, status } = parsed.data;
  try {
    const role = await prisma.adminRole.findFirst({
      where: { id, deletedAt: null },
      select: { name: true, isSystem: true, permissions: { select: PERM_FIELDS } },
    });
    if (!role) return GONE;
    const blocked = offLimits(me, { id, isSystem: role.isSystem, permissions: toPermissions(role.permissions) });
    if (blocked) return blocked;
    if (role.isSystem) {
      if (name !== role.name)
        return {
          success: false,
          error: `“${role.name}” can't be renamed`,
          fieldErrors: { name: "The Super Admin role can't be renamed" },
        };
      if (status !== "active")
        return {
          success: false,
          error: `“${role.name}” must stay active`,
          fieldErrors: { status: "The Super Admin role must stay active" },
        };
    }
    const taken = await nameTaken(name, id);
    if (taken) return taken;
    await prisma.adminRole.update({
      where: { id },
      data: { name, description, isActive: status === "active" },
    });
    refresh();
    return { success: true, name };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return TAKEN;
    console.error("[admin-roles] update failed", error instanceof Error ? error.name : error);
    return {
      success: false,
      error: "We couldn't save the role. Please try again.",
    };
  }
}

/**
 * Roles › Delete (soft): the role disappears from every list and selector but stays in the database with when
 * and who, and can be restored. Needs Roles › Delete. The Super Admin (system role) can never be deleted, nor can
 * a role that users still have (give them another role first) or, for a non-Super Admin, one with more access.
 */
export async function deleteRoleAction(input: unknown): Promise<RoleResult> {
  const me = await allowed("delete");
  if ("error" in me) return me.error;
  const parsed = roleIdSchema.safeParse(input);
  if (!parsed.success) return GONE;
  try {
    const role = await prisma.adminRole.findFirst({
      where: { id: parsed.data.id, deletedAt: null },
      select: { name: true, isSystem: true, permissions: { select: PERM_FIELDS } },
    });
    if (!role) return GONE;
    if (!role.isSystem) {
      const blocked = offLimits(me, { id: parsed.data.id, isSystem: false, permissions: toPermissions(role.permissions) });
      if (blocked) return blocked;
    }
    if (role.isSystem)
      return {
        success: false,
        error: `“${role.name}” is a system role and can't be deleted.`,
      };
    const users = await prisma.user.count({
      where: { adminRoleId: parsed.data.id, deletedAt: null }, // deleted users don't hold it up (they come back with no role)
    });
    if (users > 0) return { success: false, error: inUse(role.name, users) };
    // Only flip it if it's still live and unassigned (a delete racing a delete or an assignment → GONE / refused).
    const r = await prisma.adminRole.updateMany({
      where: {
        id: parsed.data.id,
        deletedAt: null,
        isSystem: false,
        users: { none: { deletedAt: null } },
      },
      data: { deletedAt: new Date(), deletedById: me.userId },
    });
    if (r.count === 0) return GONE;
    refresh();
    return { success: true, name: role.name };
  } catch (error) {
    console.error("[admin-roles] delete failed", error instanceof Error ? error.name : error);
    return {
      success: false,
      error: "We couldn't delete the role. Please try again.",
    };
  }
}

/**
 * Roles › Permissions › Save: the role's Read / Create / Update / Delete per module, one row per module (cleaned
 * up by `normalize`: the others need Read; actions a module doesn't offer stay off). Needs Roles › Update. The
 * Super Admin role always has everything and isn't stored. Anyone but a Super Admin can't change their own role,
 * a role with more access than theirs, or grant a switch they don't have themselves.
 */
export async function saveRolePermissionsAction(input: unknown): Promise<RoleResult> {
  const me = await allowed("update");
  if ("error" in me) return me.error;
  const parsed = rolePermissionsSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: "Those permissions aren't valid. Refresh the page and try again.",
    };
  const { id, permissions } = parsed.data;
  try {
    const role = await prisma.adminRole.findFirst({
      where: { id, deletedAt: null },
      select: { name: true, isSystem: true, permissions: { select: PERM_FIELDS } },
    });
    if (!role) return GONE;
    if (role.isSystem)
      return {
        success: false,
        error: `“${role.name}” always has full access.`,
      };
    const blocked = offLimits(me, { id, isSystem: false, permissions: toPermissions(role.permissions) });
    if (blocked) return blocked;
    const next = Object.fromEntries(PERMISSION_MODULES.map(({ key }) => [key, normalize(key, permissions[key])])) as RolePermissions;
    if (!me.isSuper && !covers(me.permissions, next)) return { success: false, error: "You can't grant access your own role doesn't have." };
    await prisma.$transaction(
      PERMISSION_MODULES.map(({ key }) => {
        const p = next[key];
        const data = {
          canRead: p.read,
          canCreate: p.create,
          canUpdate: p.update,
          canDelete: p.delete,
        };
        return prisma.adminRolePermission.upsert({
          where: { roleId_module: { roleId: id, module: key } },
          create: { roleId: id, module: key, ...data },
          update: data,
        });
      }),
    );
    refresh();
    return { success: true, name: role.name };
  } catch (error) {
    console.error("[admin-roles] permissions save failed", error instanceof Error ? error.name : error);
    return {
      success: false,
      error: "We couldn't save the permissions. Please try again.",
    };
  }
}

/** Roles › Deleted › Restore (Super Admin only): the role is back in the lists, with the status it had. */
export async function restoreRoleAction(input: unknown): Promise<RoleResult> {
  const me = await allowed("delete");
  if ("error" in me) return me.error;
  if (!me.isSuper) return { success: false, error: "Only a Super Admin can restore deleted roles." };
  const parsed = roleIdSchema.safeParse(input);
  if (!parsed.success) return GONE;
  try {
    const role = await prisma.adminRole.findFirst({
      where: { id: parsed.data.id, deletedAt: { not: null } },
      select: { name: true },
    });
    if (!role) return GONE;
    await prisma.adminRole.update({
      where: { id: parsed.data.id },
      data: { deletedAt: null, deletedById: null },
    });
    refresh();
    return { success: true, name: role.name };
  } catch (error) {
    console.error("[admin-roles] restore failed", error instanceof Error ? error.name : error);
    return {
      success: false,
      error: "We couldn't restore the role. Please try again.",
    };
  }
}
