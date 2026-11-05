import { NextResponse } from "next/server";
import { can, getAccess } from "@/lib/access.server";
import { listAdminUsers } from "@/lib/admin-users.server";
import { isoDate, toCsv } from "@/lib/csv";
import { downloadResponse } from "@/lib/download";
import { renderReportPdf } from "@/lib/report-pdf.server";
import { adminUserListSchema } from "@/lib/validations/admin-user";

/** GET /api/admin/users/export?format=csv|pdf&q= — Users › Export: every staff account matching the search. ADMIN only. */
export async function GET(req: Request) {
  if (!(await can("users"))) return NextResponse.redirect(new URL(`/admin/login?callbackUrl=${encodeURIComponent("/admin/users")}`, req.url));

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "csv";
  const params = adminUserListSchema.parse(Object.fromEntries(sp));
  try {
    // Same rows as the page: no deleted users, and no Super Admins for someone who isn't one.
    const { rows } = await listAdminUsers({ ...params, view: "active" }, { all: true, viewer: (await getAccess())! });
    const name = `sundry-users-${isoDate(new Date())}`;
    const table = rows.map((u, i) => [String(i + 1), u.firstName, u.lastName, u.email, u.phone ?? "", u.role, u.status === "active" ? "Active" : "Inactive"]);

    if (format === "csv") {
      return downloadResponse(toCsv(["ID", "Name", "Last Name", "Email", "Phone", "Role", "Status"], table), `${name}.csv`, "csv");
    }
    const pdf = await renderReportPdf({
      title: "Users",
      store: "Sundry HQ",
      subtitle: params.q ? `Search: ${params.q}` : "Admin panel staff",
      summary: [
        ["Users", String(rows.length)],
        ["Active", String(rows.filter((u) => u.status === "active").length)],
      ],
      columns: [
        { label: "ID", weight: 0.4 },
        { label: "Name", weight: 1 },
        { label: "Last Name", weight: 1.1 },
        { label: "Email", weight: 2 },
        { label: "Phone", weight: 1.1 },
        { label: "Role", weight: 1 },
        { label: "Status", weight: 0.8 },
      ],
      rows: table.map((r) => r.map((c) => c || "—")),
    });
    return downloadResponse(pdf, `${name}.pdf`, "pdf");
  } catch (error) {
    console.error("[admin-users] export failed", error instanceof Error ? error.name : error);
    return new NextResponse("We couldn't export the users right now. Please try again.", { status: 500 });
  }
}
