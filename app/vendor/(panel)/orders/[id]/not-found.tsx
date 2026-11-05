import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** Unknown id or another store's order — same answer, so other stores' ids aren't confirmed. */
export default function VendorOrderNotFound() {
  return (
    <EmptyState icon={SearchX} title="Order not found" description="This order may have been removed or belongs to another store. Go back to your orders list.">
      <Button asChild>
        <Link href="/vendor/orders" className="!text-on-primary">
          <ArrowLeft aria-hidden />
          Back to All Orders
        </Link>
      </Button>
    </EmptyState>
  );
}
