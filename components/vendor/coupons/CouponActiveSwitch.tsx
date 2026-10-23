"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { setCouponActive } from "@/app/vendor/(panel)/coupons/actions";
import { Switch } from "@/components/ui/switch";

/** Status column switch (design). Optimistic; rolls back if the server refuses; refreshes the derived badge. */
export function CouponActiveSwitch({ id, code, isActive }: { id: string; code: string; isActive: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(isActive);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setOn(next);
    startTransition(async () => {
      try {
        const res = await setCouponActive({ id, isActive: next });
        if (!res.success || !res.data) {
          setOn(!next);
          toast.error(res.error ?? "We couldn't update the coupon.");
          return;
        }
        const s = res.data.status;
        toast.success(!next ? `${code} turned off` : s === "ACTIVE" ? `${code} is live` : s === "SCHEDULED" ? `${code} turned on — starts on its start date` : `${code} turned on, but it has expired`);
        router.refresh();
      } catch {
        setOn(!next);
        toast.error("We couldn't reach the server. Please try again.");
      }
    });
  }

  return <Switch checked={on} onCheckedChange={change} disabled={pending} aria-label={`Coupon ${code} on`} />;
}
