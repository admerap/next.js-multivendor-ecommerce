import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** Unknown id, or a product the store deleted. */
export default function AdminProductNotFound() {
  return (
    <EmptyState icon={SearchX} title="Product not found" description="It may have been deleted by the store or already moved to another list.">
      <Button asChild>
        <Link href="/admin/products/pending" className="!text-on-primary">
          <ArrowLeft aria-hidden />
          Back to product requests
        </Link>
      </Button>
    </EmptyState>
  );
}
