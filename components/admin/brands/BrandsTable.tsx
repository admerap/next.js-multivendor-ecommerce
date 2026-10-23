"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { toggleBrandStatus, type BrandRow } from "@/app/admin/(panel)/brands/actions";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { BrandFormDialog } from "./BrandFormDialog";
import { BrandStatusBadge } from "./BrandStatusBadge";
import { BrandThumb } from "./BrandThumb";
import { DeleteBrandDialog } from "./DeleteBrandDialog";

const actionBtn = "grid shrink-0 place-items-center rounded-md border transition-colors duration-(--dur-fast)";
const tones = {
  view: "border-success-50 bg-success-50 !text-success-600 hover:border-success-500",
  edit: "border-iris-100 bg-iris-50 !text-primary hover:border-primary",
  del: "border-error-50 bg-error-50 !text-error-600 hover:border-error-500",
};

/** Brand list: full table ≥1201px, labelled cards below (CLAUDE.md §3.6). */
export function BrandsTable({ items, offset }: { items: BrandRow[]; offset: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState<BrandRow | null>(null);
  const [deleting, setDeleting] = useState<BrandRow | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, BrandRow["status"]>>({});
  const [, startTransition] = useTransition();

  const statusOf = (b: BrandRow) => optimistic[b.id] ?? b.status;

  function toggle(b: BrandRow, on: boolean) {
    const next = on ? "ACTIVE" : "INACTIVE";
    setOptimistic((o) => ({ ...o, [b.id]: next }));
    startTransition(async () => {
      const res = await toggleBrandStatus({ id: b.id, status: next });
      if (!res.success) {
        setOptimistic((o) => ({ ...o, [b.id]: b.status }));
        toast.error(res.error ?? "We couldn't update the status.");
        return;
      }
      toast.success(`"${b.name}" ${next === "ACTIVE" ? "activated" : "deactivated"}`);
      router.refresh();
      // Server data now carries the new status; drop the optimistic override so later edits show through.
      setOptimistic((o) => {
        const rest = { ...o };
        delete rest[b.id];
        return rest;
      });
    });
  }

  const actions = (b: BrandRow, size: string) => (
    <div className="flex items-center gap-2">
      <Link href={`/admin/brands/${b.id}`} aria-label={`View ${b.name}`} title="View" className={cn(actionBtn, size, tones.view)}>
        <Eye aria-hidden className="size-4" strokeWidth={2} />
      </Link>
      <button type="button" onClick={() => setEditing(b)} aria-label={`Edit ${b.name}`} title="Edit" className={cn(actionBtn, size, tones.edit)}>
        <Pencil aria-hidden className="size-4" strokeWidth={2} />
      </button>
      <button type="button" onClick={() => setDeleting(b)} aria-label={`Delete ${b.name}`} title="Delete" className={cn(actionBtn, size, tones.del)}>
        <Trash2 aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </div>
  );

  const toggleFor = (b: BrandRow) => (
    <Switch
      checked={statusOf(b) === "ACTIVE"}
      onCheckedChange={(on) => toggle(b, on)}
      aria-label={`${b.name} active status`}
    />
  );

  return (
    <>
      {/* ≥1201px: table */}
      <div className="hidden xl:block">
        <Table>
          <TableHeader>
            <tr>
              <TableHead className="w-14">#</TableHead>
              <TableHead className="w-20">Image</TableHead>
              <TableHead>Brand name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((b, i) => (
              <TableRow key={b.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <BrandThumb src={b.image} name={b.name} />
                </TableCell>
                <TableCell>
                  <Link href={`/admin/brands/${b.id}`} className="font-bold !text-fg-strong hover:!text-primary">
                    {b.name}
                  </Link>
                </TableCell>
                <TableCell className="text-fg-muted">{b.slug}</TableCell>
                <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{b.productsCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <BrandStatusBadge status={statusOf(b)} />
                    {toggleFor(b)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">{actions(b, "size-9")}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ≤1200px: cards with label/value pairs */}
      <ul role="list" aria-label="Brands" className="flex flex-col gap-3 px-4 pb-4 sm:px-6 xl:hidden">
        {items.map((b, i) => (
          <li key={b.id} className="rounded-lg border border-line p-4">
            <div className="flex items-center gap-3.5">
              <BrandThumb src={b.image} name={b.name} size={56} />
              <div className="min-w-0 flex-1">
                <Link href={`/admin/brands/${b.id}`} className="block truncate leading-11 font-bold !text-fg-strong">
                  {b.name}
                </Link>
                <p className="truncate text-caption text-fg-muted">{b.slug}</p>
              </div>
              <span className="self-start text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 text-caption">
              <dt className="text-fg-muted">Products</dt>
              <dd className="text-right font-semibold text-fg-strong tabular-nums">{b.productsCount}</dd>
              <dt className="self-center text-fg-muted">Status</dt>
              <dd className="flex items-center justify-end gap-1">
                <BrandStatusBadge status={statusOf(b)} />
                {toggleFor(b)}
              </dd>
            </dl>
            <div className="mt-3 flex justify-end border-t border-line pt-3">{actions(b, "size-11")}</div>
          </li>
        ))}
      </ul>

      {editing && (
        <BrandFormDialog key={editing.id} brand={editing} open onOpenChange={(o) => !o && setEditing(null)} />
      )}
      {deleting && (
        <DeleteBrandDialog key={deleting.id} brand={deleting} open onOpenChange={(o) => !o && setDeleting(null)} />
      )}
    </>
  );
}
