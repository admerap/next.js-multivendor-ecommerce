import { Badge } from "@/components/ui/badge";
import type { BrandStatus } from "@/lib/validations/brand";

/** Brand status pill: Active = success (green), Inactive = error (red). */
export function BrandStatusBadge({ status }: { status: BrandStatus }) {
  return status === "ACTIVE" ? <Badge tone="success">Active</Badge> : <Badge tone="error">Inactive</Badge>;
}
