"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Switch } from "@/components/ui/switch";
import type { CategoryStatus } from "@/lib/validations/category";
import { StatusBadge } from "./StatusBadge";

type ToggleAction = (input: { id: string; status: CategoryStatus }) => Promise<{ success: boolean; error?: string }>;

/** Status badge + switch with an optimistic flip (rolled back if the server refuses). */
export function StatusToggle({ id, name, status, action }: { id: string; name: string; status: CategoryStatus; action: ToggleAction }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<CategoryStatus | null>(null);
  const [, startTransition] = useTransition();
  const shown = optimistic ?? status;

  function toggle(on: boolean) {
    const next: CategoryStatus = on ? "ACTIVE" : "INACTIVE";
    setOptimistic(next);
    startTransition(async () => {
      const res = await action({ id, status: next });
      if (!res.success) {
        setOptimistic(null);
        toast.error(res.error ?? "We couldn't update the status.");
        return;
      }
      toast.success(`"${name}" ${next === "ACTIVE" ? "activated" : "deactivated"}`);
      router.refresh();
      setOptimistic(null); // server data now carries the new status
    });
  }

  return (
    <>
      <StatusBadge status={shown} />
      <Switch checked={shown === "ACTIVE"} onCheckedChange={toggle} aria-label={`${name} active status`} />
    </>
  );
}
