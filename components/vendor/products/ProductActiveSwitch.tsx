"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { setProductActive } from "@/app/vendor/(panel)/products/actions";
import { Switch } from "@/components/ui/switch";
import type { ApprovalStatus } from "@/lib/validations/product";

/**
 * Vendor show/hide switch (isActive). Optimistic: flips at once and rolls back if the server refuses.
 * The toast says what the shopper will actually see — a product is live only once it's approved too.
 */
export function ProductActiveSwitch({ id, name, isActive, approvalStatus }: { id: string; name: string; isActive: boolean; approvalStatus: ApprovalStatus }) {
  const [on, setOn] = useState(isActive);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setOn(next);
    startTransition(async () => {
      try {
        const res = await setProductActive({ id, isActive: next });
        if (!res.success || !res.data) {
          setOn(!next);
          toast.error(res.error ?? "We couldn't update the product.");
          return;
        }
        if (!next) toast.success(`${name} hidden from your store`);
        else if (res.data.approvalStatus === "APPROVED") toast.success(`${name} is now live`);
        else toast.success(`${name} will go live once it's approved`);
      } catch {
        setOn(!next);
        toast.error("We couldn't reach the server. Please try again.");
      }
    });
  }

  return (
    <Switch
      checked={on}
      onCheckedChange={change}
      disabled={pending}
      aria-label={`Show ${name} in your store`}
      title={approvalStatus === "APPROVED" ? undefined : "Shown in your store once approved"}
    />
  );
}
