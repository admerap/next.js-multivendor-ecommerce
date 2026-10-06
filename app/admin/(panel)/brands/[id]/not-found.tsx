import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

export default function BrandNotFound() {
  return (
    <EmptyState icon={SearchX} title="Brand not found" description="This brand doesn't exist or was deleted.">
      <Button asChild>
        <Link href="/admin/brands">
          <ArrowLeft aria-hidden />
          Back to brands
        </Link>
      </Button>
    </EmptyState>
  );
}
