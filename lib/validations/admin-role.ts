import { z } from "zod";
import { PERMISSION_ACTIONS, PERMISSION_MODULES, type PermissionAction, type PermissionModule } from "@/lib/permissions";

/** Admin › Users › Roles URL: ?view=deleted (the deleted roles, to restore) · ?q (name, description) · ?page · ?pageSize. */
export const adminRoleListSchema = z.object({
  view: z.enum(["active", "deleted"]).catch("active"),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
    .catch(10),
});
export type AdminRoleListParams = z.infer<typeof adminRoleListSchema>;

export const ROLE_STATUSES = ["active", "inactive"] as const;

/** New Role modal: a unique name, what the role is for, and whether it can be given to users. */
export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "Enter the role name").max(60, "Use 60 characters or fewer"),
  description: z.string().trim().min(3, "Describe what this role is for").max(255, "Use 255 characters or fewer"),
  status: z.enum(ROLE_STATUSES, "Select a status"),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

/** Edit Role modal: the same fields plus which role. */
export const updateRoleSchema = createRoleSchema.extend({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/i, "Unknown role"),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

/** Delete / Restore: which role. */
export const roleIdSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/i, "Unknown role"),
});

/** Permissions modal: the role and, for every module, its four switches (unknown modules are rejected). */
const moduleSwitches = z.object(Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, z.boolean()])) as Record<PermissionAction, z.ZodBoolean>);
export const rolePermissionsSchema = z.object({
  id: roleIdSchema.shape.id,
  permissions: z.strictObject(Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, moduleSwitches])) as Record<PermissionModule, typeof moduleSwitches>),
});
