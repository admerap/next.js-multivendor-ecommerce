import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { allPermissions, covers, toPermissions, type RolePermissions } from "@/lib/permissions";
import type { AdminRoleListParams } from "@/lib/validations/admin-role";

export type AdminRoleRow = {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  isSystem: boolean;
  /** how many users have this role (a role in use can't be deleted) */
  users: number;
  /** Roles › Permissions: what the role may do per module (the Super Admin: everything) */
  permissions: RolePermissions;
  /** set only in the Deleted view */
  deletedAt: Date | null;
};

/** Roles that exist for the app: soft-deleted ones are hidden everywhere except the Deleted view. */
export const LIVE_ROLE: Prisma.AdminRoleWhereInput = { deletedAt: null };

export type RoleOption = { id: string; name: string };

/**
 * Roles a user can be given (Users › New / Edit User › User Role): live and active, in the Roles page order.
 * A Super Admin may give any of them; anyone else neither the Super Admin role nor a role with access they lack
 * (the same rule the user actions enforce).
 */
export async function assignableRoles(viewer: { isSuper: boolean; permissions: RolePermissions }): Promise<RoleOption[]> {
  const roles = await prisma.adminRole.findMany({
    where: { ...LIVE_ROLE, isActive: true, ...(!viewer.isSuper && { isSystem: false }) },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, permissions: { select: { module: true, canRead: true, canCreate: true, canUpdate: true, canDelete: true } } },
  });
  return roles.filter((r) => viewer.isSuper || covers(viewer.permissions, toPermissions(r.permissions))).map(({ id, name }) => ({ id, name }));
}

/**
 * Admin › Users › Roles:the admin panel's staff roles (the Super Admin leads, then oldest first), or — with
 * view "deleted" — the soft-deleted ones, newest deletion first. Callers must check the admin role first.
 */
export async function listAdminRoles(params: AdminRoleListParams) {
  const deletedView = params.view === "deleted";
  const q = params.q;
  const where: Prisma.AdminRoleWhereInput = {
    deletedAt: deletedView ? { not: null } : null,
    ...(q && {
      OR: [{ name: { contains: q } }, { description: { contains: q } }],
    }),
  };
  const [total, live, deleted] = await Promise.all([
    prisma.adminRole.count({ where }),
    prisma.adminRole.count({ where: LIVE_ROLE }),
    prisma.adminRole.count({ where: { deletedAt: { not: null } } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, pageCount);
  const roles = await prisma.adminRole.findMany({
    where,
    orderBy: deletedView ? [{ deletedAt: "desc" }, { id: "asc" }] : [{ isSystem: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    skip: (page - 1) * params.pageSize,
    take: params.pageSize,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isSystem: true,
      deletedAt: true,
      _count: { select: { users: { where: { deletedAt: null } } } }, // live users only
      permissions: {
        select: {
          module: true,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
      },
    },
  });
  const rows: AdminRoleRow[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.isActive ? "active" : "inactive",
    isSystem: r.isSystem,
    users: r._count.users,
    permissions: r.isSystem ? allPermissions() : toPermissions(r.permissions),
    deletedAt: r.deletedAt,
  }));
  return {
    rows,
    total,
    live,
    deleted,
    page,
    pageSize: params.pageSize,
    pageCount,
  };
}
