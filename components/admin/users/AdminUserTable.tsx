import { ChatAvatar } from "@/components/chat/ChatAvatar";
import { cardLabelClass } from "@/components/data/list-classes";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoleOption } from "@/lib/admin-roles.server";
import type { AdminUserRow } from "@/lib/admin-users.server";
import { cn } from "@/lib/utils";
import { UserActions } from "./UserActions";

const deletedOn = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const Status = ({ u }: { u: AdminUserRow }) =>
  u.deletedAt ? (
    <Badge tone="error" title={`Deleted ${deletedOn(u.deletedAt)}`}>
      Deleted {deletedOn(u.deletedAt)}
    </Badge>
  ) : (
    <Badge tone={u.status === "active" ? "success" : "neutral"}>{u.status === "active" ? "Active" : "Inactive"}</Badge>
  );
const fullName = (u: AdminUserRow) => [u.firstName, u.lastName].filter(Boolean).join(" ");
const Dash = () => <span className="text-fg-subtle">—</span>;

export type UserViewer = { id: string; canUpdate: boolean; canDelete: boolean; isSuper: boolean };
type Props = { rows: AdminUserRow[]; offset: number; viewer: UserViewer; roles: RoleOption[] };

/** Users (staff): ID · Name (with photo) · Last Name · Email · Phone · Role · Status · Actions. Table from 1201px, cards below. */
export function AdminUserTable({ rows, offset, viewer, roles }: Props) {
  const actions = (u: AdminUserRow) => <UserActions user={u} roles={roles} viewer={viewer} />;
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-14">ID</TableHead>
              <TableHead className="w-[15%]">Name</TableHead>
              <TableHead className="w-[12%]">Last Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[12%]">Phone</TableHead>
              <TableHead className="w-[11%]">Role</TableHead>
              <TableHead className="w-[11%]">Status</TableHead>
              <TableHead className="w-[14%] text-center">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((u, i) => (
              <TableRow key={u.id}>
                <TableCell className="font-semibold text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <ChatAvatar name={fullName(u)} image={u.image} size={36} />
                    <span className="truncate font-semibold text-fg-strong" title={u.firstName}>
                      {u.firstName}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="truncate" title={u.lastName}>
                  {u.lastName || <Dash />}
                </TableCell>
                <TableCell className="truncate" title={u.email}>
                  {u.email}
                </TableCell>
                <TableCell className="truncate tabular-nums">{u.phone ?? <Dash />}</TableCell>
                <TableCell className="truncate font-semibold text-fg-strong" title={u.role}>
                  {u.role}
                </TableCell>
                <TableCell>
                  <Status u={u} />
                </TableCell>
                <TableCell>{actions(u)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul role="list" aria-label="Users" className="flex flex-col gap-3 px-4 pt-4 pb-4 sm:px-6 xl:hidden">
        {rows.map((u, i) => (
          <li key={u.id} className="rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <ChatAvatar name={fullName(u)} image={u.image} size={44} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg-strong">{fullName(u)}</p>
                  <p className="text-caption font-semibold text-primary">{u.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Status u={u} />
                <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-y-2.5 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className={cn("mb-0.5", cardLabelClass)}>Email</dt>
                <dd className="truncate text-sm text-fg">{u.email}</dd>
              </div>
              <div className="min-w-0">
                <dt className={cn("mb-0.5", cardLabelClass)}>Phone</dt>
                <dd className="text-sm text-fg tabular-nums">{u.phone ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-3 flex justify-end border-t border-line pt-3">{actions(u)}</div>
          </li>
        ))}
      </ul>
    </>
  );
}
