"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PermissionAction, PermissionModule, RolePermissions } from "@/lib/permissions";

const Ctx = createContext<RolePermissions | null>(null);

/**
 * The signed-in admin's permissions for every client component in the admin panel (set once by AdminShell from
 * lib/access.server). Only decides what to SHOW — every Server Action checks the same permission again.
 */
export function AdminPermissionsProvider({ permissions, children }: { permissions: RolePermissions; children: ReactNode }) {
  return <Ctx.Provider value={permissions}>{children}</Ctx.Provider>;
}

/** May the signed-in admin do `action` in `module`? false outside the admin panel. */
export function useCan(module: PermissionModule, action: PermissionAction = "read") {
  return !!useContext(Ctx)?.[module][action];
}
