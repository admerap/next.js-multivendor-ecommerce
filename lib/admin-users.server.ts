import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { outranksRole, toPermissions, type RolePermissions } from "@/lib/permissions";
import { splitName, type AdminUserListParams } from "@/lib/validations/admin-user";

export type AdminUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  image: string | null;
  /** the role's name, or "No role" when none is assigned yet */
  role: string;
  /** the role's id (Edit pre-fills it); null when none is assigned */
  roleId: string | null;
  /** holds the Super Admin (system) role */
  isSuperAdmin: boolean;
  /** the account's role has access the viewer lacks — they can't edit or delete it (lib/actions/admin-users) */
  outranksViewer: boolean;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
  /** set only in the Deleted view */
  deletedAt: Date | null;
};

export const NO_ROLE = "No role";

/** Staff accounts that exist for the app: soft-deleted ones only show in the Deleted view. */
const STAFF: Prisma.UserWhereInput = { role: "ADMIN" };

/**
 * Admin › Users › Users: the admin panel's staff (role ADMIN), oldest first so the first administrator leads —
 * or, with view "deleted", the soft-deleted ones, newest deletion first. Customers and vendors have their own
 * lists (Customer List, Vendor List). Callers must check the admin role. `all`: every match in one page (exports).
 * `viewer`: who is looking — for anyone but a Super Admin, Super Admin accounts are left out of rows and counts.
 */
export async function listAdminUsers(
  params: AdminUserListParams,
  { all = false, viewer }: { all?: boolean; viewer: { isSuper: boolean; permissions: RolePermissions } },
) {
  const hideSuperAdmins = !viewer.isSuper;
  const scope: Prisma.UserWhereInput = { ...STAFF, ...(hideSuperAdmins && { NOT: { adminRole: { is: { isSystem: true } } } }) };
  const deletedView = params.view === "deleted";
  const q = params.q;
  const where: Prisma.UserWhereInput = {
    ...scope,
    deletedAt: deletedView ? { not: null } : null,
    ...(q && { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] }),
  };
  const [total, staff, deleted] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...scope, deletedAt: null } }),
    prisma.user.count({ where: { ...scope, deletedAt: { not: null } } }),
  ]);
  const pageSize = all ? Math.max(1, total) : params.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const users = await prisma.user.findMany({
    where,
    orderBy: deletedView ? [{ deletedAt: "desc" }, { id: "asc" }] : [{ createdAt: "asc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      blockedAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      adminRole: {
        select: {
          id: true,
          name: true,
          isSystem: true,
          permissions: { select: { module: true, canRead: true, canCreate: true, canUpdate: true, canDelete: true } },
        },
      },
    },
  });
  const rows: AdminUserRow[] = users.map((u) => {
    const { first, last } = splitName(u.name);
    return {
      id: u.id,
      firstName: first,
      lastName: last,
      email: u.email,
      phone: u.phone,
      image: u.image,
      role: u.adminRole?.name ?? NO_ROLE,
      roleId: u.adminRole?.id ?? null,
      isSuperAdmin: u.adminRole?.isSystem ?? false,
      outranksViewer: !viewer.isSuper && !!u.adminRole && (u.adminRole.isSystem || !outranksRole(viewer.permissions, toPermissions(u.adminRole.permissions))),
      status: u.blockedAt ? "inactive" : "active",
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      deletedAt: u.deletedAt,
    };
  });
  return { rows, total, staff, deleted, page, pageSize, pageCount };
}
