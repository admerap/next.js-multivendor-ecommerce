import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** Unknown id or another store's product — same answer, so ids of other vendors aren't confirmed. */
export default function ProductNotFound() {
  return (
    <EmptyState icon={SearchX} title="Product not found" description="This product doesn't exist in your store, or it was deleted.">
      <Button asChild>
        <Link href="/vendor/products" className="!text-on-primary">
          <ArrowLeft aria-hidden />
          Back to products
        </Link>
      </Button>
    </EmptyState>
  );
}
