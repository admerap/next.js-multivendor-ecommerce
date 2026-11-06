import { csvDollars } from "@/lib/csv";
import type { ExportColumn } from "@/lib/list-export.server";
import { money } from "@/lib/money";
import { APPROVAL_LABELS, PRODUCT_TYPE_LABELS, type ApprovalStatus, type ProductTypeValue } from "@/lib/validations/product";

const words = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

type ProductLike = {
  name: string;
  sku: string;
  category: string;
  productType: ProductTypeValue;
  price: number;
  stock: number;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
};

/** Product export columns shared by the admin Product Manage lists and the vendor's own product list. */
export const productColumns = <T extends ProductLike>(): ExportColumn<T>[] => [
  { label: "Product", value: (p) => p.name, weight: 2.2 },
  { label: "SKU", value: (p) => p.sku, weight: 1 },
  { label: "Category", value: (p) => p.category, weight: 1.2 },
  { label: "Type", value: (p) => PRODUCT_TYPE_LABELS[p.productType], weight: 0.8 },
  { label: "Price (USD)", value: (p) => csvDollars(p.price), pdf: (p) => money(p.price), weight: 0.9, align: "right" },
  { label: "Stock", value: (p) => p.stock, weight: 0.6, align: "right" },
  { label: "Review", value: (p) => APPROVAL_LABELS[p.approvalStatus], weight: 0.8 },
  { label: "Visible", value: (p) => (p.isActive ? "Yes" : "No"), weight: 0.6 },
];

type CouponLike = {
  code: string;
  title: string;
  type: string;
  discountType: string;
  discountValue: number;
  minPurchase: number;
  usedCount: number;
  usageLimit: number | null;
  startsAt: string;
  expiresAt: string;
  status: string;
  approvalStatus: ApprovalStatus;
};

/** Coupon export columns shared by the admin Coupon Manage lists and the vendor's own coupon list. */
export const couponColumns = <T extends CouponLike>(): ExportColumn<T>[] => [
  { label: "Code", value: (c) => c.code, weight: 1 },
  { label: "Title", value: (c) => c.title, weight: 1.6 },
  { label: "Type", value: (c) => words(c.type), weight: 1 },
  {
    label: "Discount",
    value: (c) => (c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : csvDollars(c.discountValue)),
    pdf: (c) => (c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : money(c.discountValue)),
    weight: 0.8,
    align: "right",
  },
  { label: "Min. purchase (USD)", value: (c) => csvDollars(c.minPurchase), pdf: (c) => money(c.minPurchase), weight: 0.9, align: "right" },
  { label: "Used", value: (c) => (c.usageLimit ? `${c.usedCount} / ${c.usageLimit}` : c.usedCount), weight: 0.7, align: "right" },
  { label: "Starts", value: (c) => c.startsAt, weight: 0.9 },
  { label: "Expires", value: (c) => c.expiresAt, weight: 0.9 },
  { label: "Status", value: (c) => words(c.status), weight: 0.8 },
  { label: "Review", value: (c) => APPROVAL_LABELS[c.approvalStatus], weight: 0.8 },
];
