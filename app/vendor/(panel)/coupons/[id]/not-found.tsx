import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** Unknown id or another store's coupon — same answer, so other vendors' ids aren't confirmed. */
export default function CouponNotFound() {
  return (
    <EmptyState icon={SearchX} title="Coupon not found" description="This coupon doesn't exist in your store, or it was deleted.">
      <Button asChild>
        <Link href="/vendor/coupons" className="!text-on-primary">
          <ArrowLeft aria-hidden />
          Back to coupons
        </Link>
      </Button>
    </EmptyState>
  );
}
