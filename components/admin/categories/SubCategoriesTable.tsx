"use client";

import { useState } from "react";
import type { CategoryOption } from "@/app/admin/(panel)/categories/actions";
import { deleteSubCategory, toggleSubCategoryStatus, type SubCategoryRow } from "@/app/admin/(panel)/categories/sub/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteItemDialog } from "./DeleteItemDialog";
import { RowActions } from "./RowActions";
import { StatusToggle } from "./StatusToggle";
import { SubCategoryFormDialog } from "./SubCategoryFormDialog";

function blockedReason(s: SubCategoryRow) {
  const parts = [
    s.subSubCategoriesCount > 0 && `${s.subSubCategoriesCount} ${s.subSubCategoriesCount === 1 ? "sub-sub-category" : "sub-sub-categories"}`,
    s.productsCount > 0 && `${s.productsCount} ${s.productsCount === 1 ? "product" : "products"}`,
  ].filter(Boolean);
  return parts.length ? `"${s.name}" still has ${parts.join(" and ")}. Delete or move them to another sub-category first, or deactivate it instead.` : "";
}

/** Sub-category list: full table ≥1201px, labelled cards below (CLAUDE.md §3.6). */
export function SubCategoriesTable({ items, offset, categories }: { items: SubCategoryRow[]; offset: number; categories: CategoryOption[] }) {
  const [editing, setEditing] = useState<SubCategoryRow | null>(null);
  const [deleting, setDeleting] = useState<SubCategoryRow | null>(null);

  const status = (s: SubCategoryRow) => <StatusToggle id={s.id} name={s.name} status={s.status} action={toggleSubCategoryStatus} />;
  const actions = (s: SubCategoryRow, size: "size-9" | "size-11") => (
    <RowActions name={s.name} size={size} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
  );

  return (
    <>
      {/* ≥1201px: table */}
      <div className="hidden xl:block">
        {/* Fixed layout with proportional columns so the actions never get clipped at 1201–1440px. */}
        <Table className="table-fixed [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <tr>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Sub-category name</TableHead>
              <TableHead className="w-[16%]">Slug</TableHead>
              <TableHead className="w-[14%]">Category</TableHead>
              <TableHead className="w-[11%] text-right whitespace-normal">Sub-sub-categories</TableHead>
              <TableHead className="w-[9%] text-right">Products</TableHead>
              <TableHead className="w-[14%]">Status</TableHead>
              <TableHead className="w-28 text-center">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {items.map((s, i) => (
              <TableRow key={s.id}>
                <TableCell className="text-fg-muted tabular-nums">{offset + i + 1}</TableCell>
                <TableCell className="truncate font-bold text-fg-strong" title={s.name}>{s.name}</TableCell>
                <TableCell className="truncate text-fg-muted" title={s.slug}>{s.slug}</TableCell>
                <TableCell className="truncate text-fg" title={s.categoryName}>{s.categoryName}</TableCell>
                <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{s.subSubCategoriesCount}</TableCell>
                <TableCell className="text-right font-semibold text-fg-strong tabular-nums">{s.productsCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">{status(s)}</div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">{actions(s, "size-9")}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ≤1200px: cards with label/value pairs */}
      <ul role="list" aria-label="Sub-categories" className="flex flex-col gap-3 px-4 pb-4 sm:px-6 xl:hidden">
        {items.map((s, i) => (
          <li key={s.id} className="rounded-lg border border-line p-4">
            <div className="flex items-start gap-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-fg-strong">{s.name}</p>
                <p className="truncate text-caption text-fg-muted">{s.slug}</p>
              </div>
              <span className="text-caption text-fg-subtle tabular-nums">#{offset + i + 1}</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-caption">
              <dt className="text-fg-muted">Category</dt>
              <dd className="truncate text-right font-semibold text-fg-strong">{s.categoryName}</dd>
              <dt className="text-fg-muted">Sub-sub-categories</dt>
              <dd className="text-right font-semibold text-fg-strong tabular-nums">{s.subSubCategoriesCount}</dd>
              <dt className="text-fg-muted">Products</dt>
              <dd className="text-right font-semibold text-fg-strong tabular-nums">{s.productsCount}</dd>
              <dt className="self-center text-fg-muted">Status</dt>
              <dd className="flex items-center justify-end gap-1">{status(s)}</dd>
            </dl>
            <div className="mt-3 flex justify-end border-t border-line pt-3">{actions(s, "size-11")}</div>
          </li>
        ))}
      </ul>

      {editing && (
        <SubCategoryFormDialog key={editing.id} categories={categories} subCategory={editing} open onOpenChange={(o) => !o && setEditing(null)} />
      )}
      {deleting && (
        <DeleteItemDialog
          key={deleting.id}
          noun="sub-category"
          name={deleting.name}
          status={deleting.status}
          blockedReason={blockedReason(deleting)}
          remove={() => deleteSubCategory({ id: deleting.id })}
          deactivate={() => toggleSubCategoryStatus({ id: deleting.id, status: "INACTIVE" })}
          open
          onOpenChange={(o) => !o && setDeleting(null)}
        />
      )}
    </>
  );
}
