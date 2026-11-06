import { getVendors, type VendorRow } from "@/app/admin/(panel)/vendors/actions";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";

const words = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * GET /api/admin/vendors/export?view=approval&format=xlsx|csv|pdf&q=&status=&sort= — Vendor List / Vendor Approval
 * › Export: every store matching the list's filters (view=approval: the pending ones). Needs Vendors › Read (the
 * list loader checks it).
 */
export async function GET(req: Request) {
  const { view, ...sp } = firstParams(Object.fromEntries(new URL(req.url).searchParams));
  const approval = view === "approval";
  const rows = await allPages((page) => getVendors({ ...sp, page, pageSize: 50 }, approval ? "PENDING" : undefined));
  if (!rows) return signInAgain(req, "/admin/login", approval ? "/admin/vendors/approval" : "/admin/vendors");
  return listExport<VendorRow>(req, {
    name: approval ? "vendor-approval" : "vendors",
    title: approval ? "Vendor Approval" : "Vendor List",
    store: "Sundry HQ",
    subtitle:
      [sp.q && `Search: ${sp.q}`, !approval && sp.status && `Status: ${words(sp.status)}`].filter(Boolean).join(" · ") ||
      (approval ? "Waiting for approval" : "All stores"),
    columns: [
      { label: "Store", value: (v) => v.storeName, weight: 1.6 },
      { label: "Owner", value: (v) => v.ownerName, weight: 1.4 },
      { label: "Email", value: (v) => v.email, weight: 2 },
      { label: "Phone", value: (v) => v.phone, weight: 1.2 },
      { label: "Products", value: (v) => v.productsCount, weight: 0.8, align: "right" },
      { label: "Orders", value: (v) => v.ordersCount, weight: 0.7, align: "right" },
      { label: "Status", value: (v) => words(v.status), weight: 0.9 },
      { label: "Joined", value: (v) => v.createdAt.slice(0, 10), weight: 0.9 },
    ],
    rows,
  });
}
