import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** Unknown id, or a coupon the store deleted. */
export default function AdminCouponNotFound() {
  return (
    <EmptyState icon={SearchX} title="Coupon not found" description="It may have been deleted by the store or already moved to another list.">
      <Button asChild>
        <Link href="/admin/coupons/pending" className="!text-on-primary">
          <ArrowLeft aria-hidden />
          Back to coupon requests
        </Link>
      </Button>
    </EmptyState>
  );
}
