import type { Metadata } from "next";
import { AdminCouponList } from "@/components/admin/coupons/AdminCouponList";
import { requireArea } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Approved Coupons" };

/** Coupon Manage › Approved Coupon. */
export default async function ApprovedCouponsPage({ searchParams }: PageProps<"/admin/coupons/approved">) {
  await requireArea("ADMIN");
  return <AdminCouponList view="approved" searchParams={await searchParams} />;
}
