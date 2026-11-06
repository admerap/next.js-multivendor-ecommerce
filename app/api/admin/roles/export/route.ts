import { can } from "@/lib/access.server";
import { listAdminRoles, type AdminRoleRow } from "@/lib/admin-roles.server";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";
import { PERMISSION_MODULES } from "@/lib/permissions";
import { adminRoleListSchema } from "@/lib/validations/admin-role";

/** "Users: RCUD · Orders: RU" — the modules a role can open, with what it may do there. */
const access = (r: AdminRoleRow) =>
  r.isSystem
    ? "Everything"
    : PERMISSION_MODULES.filter((m) => r.permissions[m.key].read)
        .map(
          (m) =>
            `${m.label}: ${(["read", "create", "update", "delete"] as const)
              .filter((a) => r.permissions[m.key][a])
              .map((a) => a[0].toUpperCase())
              .join("")}`,
        )
        .join(" · ") || "No access";

/** GET /api/admin/roles/export?format=xlsx|csv|pdf&view=&q= — Roles › Export: every role in the current view and search, with its access. Needs Roles › Read. */
export async function GET(req: Request) {
  if (!(await can("roles"))) return signInAgain(req, "/admin/login", "/admin/roles");
  const params = adminRoleListSchema.parse(firstParams(Object.fromEntries(new URL(req.url).searchParams)));
  const rows =
    (await allPages(async (page) => {
      const data = await listAdminRoles({ ...params, page, pageSize: 50 });
      return { success: true, data: { items: data.rows, pageCount: data.pageCount } };
    })) ?? [];
  return listExport<AdminRoleRow>(req, {
    name: params.view === "deleted" ? "roles-deleted" : "roles",
    title: params.view === "deleted" ? "Deleted Roles" : "Admin Roles",
    store: "Sundry HQ",
    subtitle: params.q ? `Search: ${params.q}` : "All roles",
    columns: [
      { label: "Role", value: (r) => r.name, weight: 1.2 },
      { label: "Description", value: (r) => r.description, weight: 2 },
      { label: "Status", value: (r) => (r.deletedAt ? "Deleted" : r.status === "active" ? "Active" : "Inactive"), weight: 0.7 },
      { label: "Users", value: (r) => r.users, weight: 0.5, align: "right" },
      { label: "Access", value: access, weight: 3 },
    ],
    rows,
  });
}
