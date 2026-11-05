import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** No order with that number. */
export default function AdminOrderNotFound() {
  return (
    <EmptyState icon={SearchX} title="Order not found" description="There is no order with that number. Check it and try again, or go back to the orders list.">
      <Button asChild>
        <Link href="/admin/orders" className="!text-on-primary">
          <ArrowLeft aria-hidden />
          Back to All Orders
        </Link>
      </Button>
    </EmptyState>
  );
}
