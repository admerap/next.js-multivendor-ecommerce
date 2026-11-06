import { can } from "@/lib/access.server";
import { listActivity, type ActivityRow } from "@/lib/admin-audit.server";
import { allPages, listExport, signInAgain } from "@/lib/list-export.server";
import { firstParams } from "@/lib/list-params";
import { ACTION_TEXT, activityListSchema } from "@/lib/validations/admin-activity";

const when = (d: Date) => d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
const changes = (r: ActivityRow) =>
  Object.entries(r.changes)
    .map(([field, [before, after]]) => (before === "—" ? `${field}: ${after}` : `${field}: ${before} → ${after}`))
    .join("; ") || "—";

/** GET /api/admin/activity/export?format=xlsx|csv|pdf&kind=&q= — Activity Log › Export: every entry in the current kind and search, newest first. Needs Activity Log › Read. */
export async function GET(req: Request) {
  if (!(await can("activity"))) return signInAgain(req, "/admin/login", "/admin/activity");
  const params = activityListSchema.parse(firstParams(Object.fromEntries(new URL(req.url).searchParams)));
  const rows =
    (await allPages(async (page) => {
      const data = await listActivity({ ...params, page, pageSize: 100 });
      return { success: true, data: { items: data.rows, pageCount: data.pageCount } };
    })) ?? [];
  return listExport<ActivityRow>(req, {
    name: "activity-log",
    title: "Activity Log",
    store: "Sundry HQ",
    subtitle: [params.kind !== "all" && `Kind: ${params.kind}`, params.q && `Search: ${params.q}`].filter(Boolean).join(" · ") || "Every recorded change",
    columns: [
      { label: "When", value: (r) => when(r.createdAt), weight: 1.1 },
      { label: "Who", value: (r) => r.actorName, weight: 1.1 },
      { label: "Email", value: (r) => r.actorEmail, weight: 1.5 },
      { label: "Action", value: (r) => ACTION_TEXT[r.action]?.label ?? r.action, weight: 1.1 },
      { label: "Item", value: (r) => r.entityLabel, weight: 1.6 },
      // The PDF's standard font has no "→".
      { label: "Changes", value: changes, pdf: (r) => changes(r).replace(/→/g, "->"), weight: 2.6 },
    ],
    rows,
  });
}
