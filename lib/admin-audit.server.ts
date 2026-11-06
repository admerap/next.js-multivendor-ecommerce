import "server-only";

import type { Prisma } from "@prisma/client";
import type { AuditChanges } from "@/lib/audit.server";
import { prisma } from "@/lib/db";
import type { ActivityListParams } from "@/lib/validations/admin-activity";

export type ActivityRow = {
  id: string;
  createdAt: Date;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityLabel: string;
  changes: AuditChanges;
};

const KIND: Record<ActivityListParams["kind"], Prisma.AuditLogWhereInput> = {
  all: {},
  users: { entityType: "user" },
  roles: { entityType: "role", NOT: { action: "role.permissions" } },
  permissions: { action: "role.permissions" },
};

/**
 * Admin › Users › Activity Log: newest first, filtered by kind (users / roles / permissions) and a search over who
 * did it and what it was about. Callers must check Activity Log › Read first.
 */
export async function listActivity(params: ActivityListParams) {
  const q = params.q;
  const where: Prisma.AuditLogWhereInput = {
    ...KIND[params.kind],
    ...(q && { OR: [{ actorName: { contains: q } }, { actorEmail: { contains: q } }, { entityLabel: { contains: q } }] }),
  };
  const [total, all] = await Promise.all([prisma.auditLog.count({ where }), prisma.auditLog.count()]);
  const pageCount = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, pageCount);
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * params.pageSize,
    take: params.pageSize,
  });
  return {
    rows: rows.map((r): ActivityRow => ({
      id: r.id,
      createdAt: r.createdAt,
      actorId: r.actorId,
      actorName: r.actorName,
      actorEmail: r.actorEmail,
      action: r.action,
      entityType: r.entityType,
      entityLabel: r.entityLabel,
      changes: ((r.details as { changes?: AuditChanges } | null)?.changes ?? {}) as AuditChanges,
    })),
    total,
    all,
    page,
    pageSize: params.pageSize,
    pageCount,
  };
}
