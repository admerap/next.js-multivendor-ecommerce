/**
 * Admin panel modules for role permissions (Roles › Permissions), in sidebar order. `actions` lists what makes
 * sense in each one — e.g. reports are read-only, orders are only read and updated — the rest show "—".
 * A user's permissions are their role's (lib/access.server). Read hides/blocks the module's menu, pages and
 * exports. Create / Update / Delete are enforced for Users and Roles.
 * TODO(permissions-actions): enforce Create / Update / Delete in the other modules' buttons and actions.
 */
export const PERMISSION_ACTIONS = ["read", "create", "update", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export const ACTION_LABEL: Record<PermissionAction, string> = {
  read: "Read",
  create: "Create",
  update: "Update",
  delete: "Delete",
};

const ALL = PERMISSION_ACTIONS;
export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard", actions: ["read"] },
  { key: "users", label: "Users", actions: ALL },
  { key: "roles", label: "Roles", actions: ALL },
  { key: "brands", label: "Brands", actions: ALL },
  { key: "categories", label: "Categories", actions: ALL },
  { key: "vendors", label: "Vendors", actions: ALL },
  { key: "products", label: "Products", actions: ALL },
  { key: "orders", label: "Orders", actions: ["read", "update"] },
  { key: "reviews", label: "Reviews", actions: ["read", "update"] },
  { key: "customers", label: "Customers", actions: ["read", "update"] },
  { key: "coupons", label: "Coupons", actions: ["read", "update", "delete"] },
  { key: "reports", label: "Reports", actions: ["read"] },
  { key: "taxRates", label: "Tax Rates", actions: ALL },
] as const satisfies readonly {
  key: string;
  label: string;
  actions: readonly PermissionAction[];
}[];

export type PermissionModule = (typeof PERMISSION_MODULES)[number]["key"];
export type ModulePermissions = Record<PermissionAction, boolean>;
export type RolePermissions = Record<PermissionModule, ModulePermissions>;

const NONE: ModulePermissions = {
  read: false,
  create: false,
  update: false,
  delete: false,
};

/** Every module off — a new role starts here. */
export const noPermissions = (): RolePermissions => Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, { ...NONE }])) as RolePermissions;

/** Every action a module offers on — what the Super Admin always has. */
export const allPermissions = (): RolePermissions =>
  Object.fromEntries(
    PERMISSION_MODULES.map((m) => [m.key, Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, (m.actions as readonly string[]).includes(a)]))]),
  ) as RolePermissions;

/** Keeps a module's switches consistent: Create / Update / Delete need Read, and actions the module doesn't offer stay off. */
export function normalize(module: PermissionModule, p: ModulePermissions): ModulePermissions {
  const offered = PERMISSION_MODULES.find((m) => m.key === module)!.actions as readonly PermissionAction[];
  const out = { ...NONE };
  for (const a of offered) out[a] = p[a];
  if (out.create || out.update || out.delete) out.read = true;
  return out;
}

const MODULE_KEYS = new Set<string>(PERMISSION_MODULES.map((m) => m.key));

/** Stored rows → the full matrix (modules without a row are off; rows for modules that no longer exist are ignored). */
export function toPermissions(rows: { module: string; canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }[]): RolePermissions {
  const out = noPermissions();
  for (const r of rows) {
    if (!MODULE_KEYS.has(r.module)) continue;
    out[r.module as PermissionModule] = normalize(r.module as PermissionModule, {
      read: r.canRead,
      create: r.canCreate,
      update: r.canUpdate,
      delete: r.canDelete,
    });
  }
  return out;
}

/** Admin URL → the module it belongs to (sidebar, page guards). Longest prefix first. */
const PATH_MODULE: [string, PermissionModule][] = [
  ["/admin/settings/tax-rates", "taxRates"],
  ["/admin/dashboard", "dashboard"],
  ["/admin/users", "users"],
  ["/admin/roles", "roles"],
  ["/admin/brands", "brands"],
  ["/admin/categories", "categories"],
  ["/admin/vendors", "vendors"],
  ["/admin/products", "products"],
  ["/admin/orders", "orders"],
  ["/admin/reviews", "reviews"],
  ["/admin/customers", "customers"],
  ["/admin/coupons", "coupons"],
  ["/admin/reports", "reports"],
];
export function moduleForPath(href: string): PermissionModule | null {
  const path = href.split("?")[0];
  return PATH_MODULE.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] ?? null;
}

/** Where each module opens (No access page and dashboard shortcuts). */
export const MODULE_HOME: Record<PermissionModule, string> = {
  dashboard: "/admin/dashboard",
  users: "/admin/users",
  roles: "/admin/roles",
  brands: "/admin/brands",
  categories: "/admin/categories",
  vendors: "/admin/vendors",
  products: "/admin/products/pending",
  orders: "/admin/orders",
  reviews: "/admin/reviews",
  customers: "/admin/customers",
  coupons: "/admin/coupons/pending",
  reports: "/admin/reports/earnings",
  taxRates: "/admin/settings/tax-rates",
};

/** Does `mine` include every switch that is on in `theirs`? (Nobody but a Super Admin hands out more than they have.) */
export const covers = (mine: RolePermissions, theirs: RolePermissions) =>
  PERMISSION_MODULES.every((m) => PERMISSION_ACTIONS.every((a) => !theirs[m.key][a] || mine[m.key][a]));
