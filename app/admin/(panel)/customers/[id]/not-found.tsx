import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** Unknown id, or not a customer account. */
export default function AdminCustomerNotFound() {
  return (
    <EmptyState icon={SearchX} title="Customer not found" description="There is no customer with that id. Check the link, or go back to the customer list.">
      <Button asChild>
        <Link href="/admin/customers" className="!text-on-primary">
          <ArrowLeft aria-hidden />
          Back to customers
        </Link>
      </Button>
    </EmptyState>
  );
}
