import "server-only";

import type { Prisma } from "@prisma/client";
import { getAccess } from "@/lib/access.server";
import { prisma } from "@/lib/db";
import { ACTION_LABEL, PERMISSION_ACTIONS, PERMISSION_MODULES, type RolePermissions } from "@/lib/permissions";

export type AuditAction =
  "user.create" | "user.update" | "user.delete" | "user.restore" | "role.create" | "role.update" | "role.delete" | "role.restore" | "role.permissions";

/** What changed: field → [before, after] (strings, for the log page). A password is only ever "changed". */
export type AuditChanges = Record<string, [string, string]>;

/**
 * Activity Log: records one thing an admin did (lib/actions/admin-users, admin-roles). The actor comes from the
 * session (name and email snapshotted, so the line still reads right after they change or leave). Never throws:
 * a failure to log is reported on the server and the action itself goes on.
 */
export async function logAudit(entry: { action: AuditAction; entityType: "user" | "role"; entityId: string; entityLabel: string; changes?: AuditChanges }) {
  const changes = entry.changes && Object.keys(entry.changes).length > 0 ? entry.changes : undefined;
  // An edit that changed nothing (Save pressed with the same values) isn't worth a line.
  if (!changes && (entry.action.endsWith(".update") || entry.action === "role.permissions")) return;
  try {
    const me = await getAccess();
    await prisma.auditLog.create({
      data: {
        actorId: me?.userId ?? null,
        actorName: me?.name ?? "Unknown",
        actorEmail: me?.email ?? "",
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityLabel: entry.entityLabel.slice(0, 191),
        details: changes ? ({ changes } as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (error) {
    console.error("[audit] could not record", entry.action, error instanceof Error ? error.name : error);
  }
}

/** Field-by-field differences between two flat records (only the ones that differ). */
export function diff(before: Record<string, string>, after: Record<string, string>): AuditChanges {
  const out: AuditChanges = {};
  for (const k of Object.keys(after)) if ((before[k] ?? "") !== (after[k] ?? "")) out[k] = [before[k] || "—", after[k] || "—"];
  return out;
}

/** "RCUD"-style summary of one module's switches ("—" when off), for permission changes. */
const short = (p: RolePermissions[keyof RolePermissions]) =>
  PERMISSION_ACTIONS.filter((a) => p[a])
    .map((a) => ACTION_LABEL[a][0])
    .join("") || "—";

/** Permission changes per module, e.g. { Products: ["R", "RU"] }. */
export function permissionDiff(before: RolePermissions, after: RolePermissions): AuditChanges {
  const out: AuditChanges = {};
  for (const m of PERMISSION_MODULES) {
    const a = short(before[m.key]);
    const b = short(after[m.key]);
    if (a !== b) out[m.label] = [a, b];
  }
  return out;
}
