import { Badge } from "@/components/ui/badge";
import type { VendorStatus } from "@/lib/validations/admin-vendor";

const MAP: Record<VendorStatus, { tone: "warning" | "success" | "error"; label: string }> = {
  PENDING: { tone: "warning", label: "Pending" },
  APPROVED: { tone: "success", label: "Approved" },
  SUSPENDED: { tone: "error", label: "Suspended" },
};

/** Vendor status pill: Pending = warning, Approved = success, Suspended = error. */
export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const { tone, label } = MAP[status];
  return <Badge tone={tone}>{label}</Badge>;
}
