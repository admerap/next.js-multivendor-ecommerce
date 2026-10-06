import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

export default function VendorNotFound() {
  return (
    <EmptyState icon={SearchX} title="Vendor not found" description="This vendor doesn't exist or its account was removed.">
      <Button asChild>
        <Link href="/admin/vendors">
          <ArrowLeft aria-hidden />
          Back to vendors
        </Link>
      </Button>
    </EmptyState>
  );
}
