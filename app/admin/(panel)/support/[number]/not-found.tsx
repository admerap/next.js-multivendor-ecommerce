import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/data/DashCard";
import { Button } from "@/components/ui/button";

/** Unknown ticket number. */
export default function AdminTicketNotFound() {
  return (
    <EmptyState icon={SearchX} title="Ticket not found" description="This ticket doesn't exist — it may have been removed along with its customer account.">
      <Button asChild>
        <Link href="/admin/support" className="!text-on-primary">
          <ArrowLeft aria-hidden />
          Back to tickets
        </Link>
      </Button>
    </EmptyState>
  );
}
