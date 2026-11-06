import { z } from "zod";

/** Admin › Users › Activity Log URL: ?kind (all | users | roles | permissions) · ?q (who / what) · ?page · ?pageSize. */
export const ACTIVITY_KINDS = ["all", "users", "roles", "permissions"] as const;
export const activityListSchema = z.object({
  kind: z.enum(ACTIVITY_KINDS).catch("all"),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(20), z.literal(50), z.literal(100)]))
    .catch(20),
});
export type ActivityListParams = z.infer<typeof activityListSchema>;

/** How each action reads in the log, and its badge tone. */
export const ACTION_TEXT: Record<string, { label: string; tone: "success" | "info" | "warning" | "error" | "primary" | "neutral" }> = {
  "user.create": { label: "Created user", tone: "success" },
  "user.update": { label: "Edited user", tone: "info" },
  "user.delete": { label: "Deleted user", tone: "error" },
  "user.restore": { label: "Restored user", tone: "warning" },
  "role.create": { label: "Created role", tone: "success" },
  "role.update": { label: "Edited role", tone: "info" },
  "role.delete": { label: "Deleted role", tone: "error" },
  "role.restore": { label: "Restored role", tone: "warning" },
  "role.permissions": { label: "Changed permissions", tone: "primary" },
};
