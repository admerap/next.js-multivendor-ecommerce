import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** Unknown review id. */
export default function AdminReviewNotFound() {
  return (
    <EmptyState icon={SearchX} title="Review not found" description="This review doesn't exist — it may have been removed along with its product or customer.">
      <Button asChild>
        <Link href="/admin/reviews" className="!text-on-primary">
          <ArrowLeft aria-hidden />
          Back to reviews
        </Link>
      </Button>
    </EmptyState>
  );
}
