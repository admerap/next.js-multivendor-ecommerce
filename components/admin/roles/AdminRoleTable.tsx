import { ShieldCheck } from "lucide-react";
import { cardLabelClass } from "@/components/data/list-classes";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminRoleRow } from "@/lib/admin-roles.server";
import { cn } from "@/lib/utils";
import { RoleActions, type RoleViewer } from "./RoleActions";

const deletedOn = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const Status = ({ r }: { r: AdminRoleRow }) =>
  r.deletedAt ? (
    <Badge tone="error" title={`Deleted ${deletedOn(r.deletedAt)}`}>
      Deleted {deletedOn(r.deletedAt)}
    </Badge>
  ) : (
    <Badge tone={r.status === "active" ? "success" : "neutral"}>{r.status === "active" ? "Active" : "Inactive"}</Badge>
  );
const Name = ({ r }: { r: AdminRoleRow }) => (
  <span className="flex min-w-0 items-center gap-2 font-semibold text-fg-strong">
    <span className="truncate" title={r.name}>
      {r.name}
    </span>
    {r.isSystem && (
      <span title="System role" className="inline-flex shrink-0 text-primary">
        <ShieldCheck aria-hidden className="size-4" />
        <span className="sr-only">(system role)</span>
      </span>
    )}
  </span>
);

/** Admin Roles: ID · Name · Description · Status · Actions. Table from 1201px, cards below. */
export function AdminRoleTable({ rows, offset, viewer }: { rows: AdminRoleRow[]; offset: number; viewer: RoleViewer }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-14">ID</TableHead>
              <TableHead className="w-[22%]">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[16%]">Status</TableHead>
              <TableHead className="w-[15%] text-center">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <Name r={r} />
                </TableCell>
                <TableCell className="truncate" title={r.description}>
                  {r.description}
                </TableCell>
                <TableCell>
                  <Status r={r} />
                </TableCell>
                <TableCell>
                  <RoleActions role={r} viewer={viewer} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Roles" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Name r={r} />
              </div>
              <div className="flex items-center gap-2">
                <Status r={r} />
                <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
              </div>
            </div>
            <dl className="mt-2.5">
              <dt className={cn("mb-0.5", cardLabelClass)}>Description</dt>
              <dd className="text-sm text-fg">{r.description}</dd>
            </dl>
            <div className="mt-3 flex justify-end border-t border-line pt-3">
              <RoleActions role={r} viewer={viewer} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
