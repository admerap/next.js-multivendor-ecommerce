"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { useCan } from "@/components/admin/AdminPermissions";
import { Switch } from "@/components/ui/switch";
import { setCustomerBlockedAction } from "@/lib/actions/admin-customers";
import { cn } from "@/lib/utils";

/**
 * Customer List "Block / Unblock" switch (admincustomerlist design): on = active, off = blocked. A
 * blocked customer can't sign in and loses an open session on their next request; the server re-checks
 * the admin role.
 */
export function CustomerBlockSwitch({ id, name, blocked, showLabel = true }: { id: string; name: string; blocked: boolean; showLabel?: boolean }) {
  const [pending, start] = useTransition();
  const canUpdate = useCan("customers", "update"); // blocking needs Customers › Update

  const change = (active: boolean) =>
    start(async () => {
      const res = await setCustomerBlockedAction({ id, blocked: !active }).catch(() => ({ success: false as const, error: "We couldn't reach the server. Please try again." }));
      if (!res.success) return void toast.error(res.error);
      toast.success(active ? `${name} can sign in and shop again` : `${name} is blocked — signed out and can't sign in`);
    });

  return (
    <span className="inline-flex items-center gap-1">
      <Switch checked={!blocked} onCheckedChange={change} disabled={pending || !canUpdate} aria-label={`${name}: active customer`} />
      {showLabel && <span className={cn("text-caption font-semibold", blocked ? "text-error-600" : "text-success-600")}>{blocked ? "Blocked" : "Active"}</span>}
    </span>
  );
}
