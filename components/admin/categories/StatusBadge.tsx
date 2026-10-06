import { Badge } from "@/components/ui/badge";
import type { CategoryStatus } from "@/lib/validations/category";

/** Category tree status pill: Active = success (green), Inactive = error (red) — same as brands. */
export function StatusBadge({ status }: { status: CategoryStatus }) {
  return status === "ACTIVE" ? <Badge tone="success">Active</Badge> : <Badge tone="error">Inactive</Badge>;
}
