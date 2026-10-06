"use client";

import { FolderTree } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { deleteCategory, toggleCategoryStatus, type CategoryRow } from "@/app/admin/(panel)/categories/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { DeleteItemDialog } from "./DeleteItemDialog";
import { RowActions } from "./RowActions";
import { StatusToggle } from "./StatusToggle";

/** Square category image on a sunken tile; falls back to a folder glyph. */
function CategoryThumb({ src, name, size }: { src: string | null; name: string; size: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-sunken" style={{ width: size, height: size }}>
      {src ? (
        <Image src={src} alt={`${name} image`} fill sizes={`${size}px`} className="object-contain p-1.5" />
      ) : (
        <FolderTree aria-hidden className="size-1/2 text-fg-subtle" strokeWidth={1.6} />
      )}
    </span>
  );
}

function blockedReason(c: CategoryRow) {
  const parts = [
    c.subCategoriesCount > 0 && `${c.subCategoriesCount} ${c.subCategoriesCount === 1 ? "sub-category" : "sub-categories"}`,
    c.productsCount > 0 && `${c.productsCount} ${c.productsCount === 1 ? "product" : "products"}`,
  ].filter(Boolean);
  return parts.length ? `"${c.name}" still has ${parts.join(" and ")}. Delete or move them to another category first, or deactivate it instead.` : "";
}

/** Category list: full table ≥1201px, labelled cards below (CLAUDE.md §3.6). */
export function CategoriesTable({ items, offset }: { items: CategoryRow[]; offset: number }) {
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  const status = (c: CategoryRow) => <StatusToggle id={c.id} name={c.name} status={c.status} action={toggleCategoryStatus} />;
  const actions = (c: CategoryRow, size: "size-9" | "size-11") => (
    <RowActions name={c.name} size={size} onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)} />
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
              <TableHead>Category name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Sub-categories</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell>
                  <CategoryThumb src={c.image} name={c.name} size={52} />
                </TableCell>
                <TableCell className="font-bold text-fg-strong">{c.name}</TableCell>
                <TableCell className="text-fg-muted">{c.slug}</TableCell>
                <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{c.subCategoriesCount}</TableCell>
                <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{c.productsCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">{status(c)}</div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">{actions(c, "size-9")}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ≤1200px: cards with label/value pairs */}
      <ul role="list" aria-label="Categories" className="flex flex-col gap-3 px-4 pb-4 sm:px-6 xl:hidden">
        {items.map((c, i) => (
          <li key={c.id} className="rounded-lg border border-line p-4">
            <div className="flex items-center gap-3.5">
              <CategoryThumb src={c.image} name={c.name} size={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-fg-strong">{c.name}</p>
                <p className="truncate text-caption text-fg-muted">{c.slug}</p>
              </div>
              <span className="self-start text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 text-caption">
              <dt className="text-fg-muted">Sub-categories</dt>
              <dd className="text-right font-semibold text-fg-strong tabular-nums">{c.subCategoriesCount}</dd>
              <dt className="text-fg-muted">Products</dt>
              <dd className="text-right font-semibold text-fg-strong tabular-nums">{c.productsCount}</dd>
              <dt className="self-center text-fg-muted">Status</dt>
              <dd className="flex items-center justify-end gap-1">{status(c)}</dd>
            </dl>
            <div className="mt-3 flex justify-end border-t border-line pt-3">{actions(c, "size-11")}</div>
          </li>
        ))}
      </ul>

      {editing && <CategoryFormDialog key={editing.id} category={editing} open onOpenChange={(o) => !o && setEditing(null)} />}
      {deleting && (
        <DeleteItemDialog
          key={deleting.id}
          noun="category"
          name={deleting.name}
          status={deleting.status}
          extraNote={deleting.image ? " and its image" : ""}
          blockedReason={blockedReason(deleting)}
          remove={() => deleteCategory({ id: deleting.id })}
          deactivate={() => toggleCategoryStatus({ id: deleting.id, status: "INACTIVE" })}
          open
          onOpenChange={(o) => !o && setDeleting(null)}
        />
      )}
    </>
  );
}
