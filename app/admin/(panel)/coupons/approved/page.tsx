import type { Metadata } from "next";
import { AdminCouponList } from "@/components/admin/coupons/AdminCouponList";
import { requirePermission } from "@/lib/access.server";

export const metadata: Metadata = { title: "Approved Coupons" };

/** Coupon Manage › Approved Coupon. */
export default async function ApprovedCouponsPage({ searchParams }: PageProps<"/admin/coupons/approved">) {
  await requirePermission("coupons");
  return <AdminCouponList view="approved" searchParams={await searchParams} />;
}
