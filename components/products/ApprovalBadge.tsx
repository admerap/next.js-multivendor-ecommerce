import { Badge } from "@/components/ui/badge";
import { APPROVAL_LABELS, type ApprovalStatus } from "@/lib/validations/product";

const TONE = { PENDING: "warning", APPROVED: "success", REJECTED: "error" } as const;

/** Admin review status: Pending = warning, Approved = success, Denied (REJECTED) = error. */
export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return <Badge tone={TONE[status]}>{APPROVAL_LABELS[status]}</Badge>;
}
