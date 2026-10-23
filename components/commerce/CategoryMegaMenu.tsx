"use client";

import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { categoryHref, subCategoryHref, subSubCategoryHref, type CategoryNode } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Category image on a small tile (the admin uploads one per category); grid glyph when there's none. */
export function CategoryThumb({ category, size = "md" }: { category: Pick<CategoryNode, "name" | "image">; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-7" : "size-8";
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-sm bg-iris-50", box)}>
      {category.image ? (
        <Image src={category.image} alt="" fill sizes="32px" className="object-cover" />
      ) : (
        <LayoutGrid aria-hidden className="size-4 text-primary" strokeWidth={1.9} />
      )}
    </span>
  );
}

/**
 * The right pane of the mega-menus: a category's sub-categories as headings (linked), each with its
 * sub-sub-categories. Shared by the header mega-menu and the home hero flyout.
 */
export function CategoryGroups({ category, onNavigate, className }: { category: CategoryNode; onNavigate?: () => void; className?: string }) {
  if (category.groups.length === 0) {
    return (
      <div className={cn("flex flex-col items-start gap-2 text-sm text-fg-muted", className)}>
        <p>No sub-categories yet.</p>
        <Link href={categoryHref(category.slug)} onClick={onNavigate} className="font-semibold max-lg:min-h-11 max-lg:inline-flex max-lg:items-center">
          Shop all {category.name}
        </Link>
      </div>
    );
  }
  return (
    <div aria-label={`${category.name} sub-categories`} className={cn("grid grid-cols-2 content-start gap-x-8 gap-y-6", className)}>
      {category.groups.map((g) => (
        <div key={g.slug} className="min-w-0">
          <h4 className="mb-3 font-display text-base font-extrabold tracking-[-0.01em]">
            <Link href={subCategoryHref(category.slug, g.slug)} onClick={onNavigate} className="!text-fg-strong hover:!text-primary">
              {g.name}
            </Link>
          </h4>
          {g.items.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {g.items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={subSubCategoryHref(category.slug, g.slug, item.slug)}
                    onClick={onNavigate}
                    className="text-sm !text-fg transition-colors duration-(--dur-fast) hover:!text-primary"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/** Shown wherever the tree is empty (no active categories yet). */
function NoCategories() {
  return <p className="px-4 py-6 text-sm text-fg-muted">Categories are coming soon.</p>;
}

/**
 * Two-pane mega-menu (DESIGN_SYSTEM §5 CategoryMegaMenu): category list on the left, the hovered
 * category's sub-categories on the right. Desktop only (≥1025px). Real data from getCategoryTree().
 */
export function CategoryMegaMenu({ tree, onNavigate }: { tree: CategoryNode[]; onNavigate?: () => void }) {
  const [active, setActive] = useState(0);
  const cat = tree[Math.min(active, tree.length - 1)];
  if (!cat) return <div className="rounded-lg border border-line bg-card shadow-xl"><NoCategories /></div>;

  return (
    <div className="flex min-h-105 overflow-hidden rounded-lg border border-line bg-card shadow-xl">
      <ul className="w-70 shrink-0 border-r border-line p-2">
        {tree.map((c, i) => {
          const on = c.slug === cat.slug;
          return (
            <li key={c.slug}>
              <Link
                href={categoryHref(c.slug)}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={onNavigate}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3.5 text-sm transition-colors duration-(--dur-fast)",
                  on ? "bg-iris-50 font-bold !text-primary" : "font-medium !text-fg hover:bg-iris-50 hover:!text-primary",
                )}
              >
                <CategoryThumb category={c} />
                <span className="flex-1 truncate">{c.name}</span>
                <ChevronRight aria-hidden className={cn("size-4", on ? "text-primary" : "text-fg-subtle")} strokeWidth={2} />
              </Link>
            </li>
          );
        })}
      </ul>
      <CategoryGroups
        category={cat}
        onNavigate={onNavigate}
        className="w-[420px] px-6 py-6 min-[1101px]:w-140 min-[1101px]:gap-x-10 min-[1101px]:gap-y-7 min-[1101px]:px-8 min-[1101px]:py-7"
      />
    </div>
  );
}

/** ≤1024px: floating accordion panel under the category bar; each category expands to its sub-categories. */
export function MobileCategoryPanel({ tree, onNavigate }: { tree: CategoryNode[]; onNavigate?: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (tree.length === 0) return <div className="rounded-lg border border-line bg-card shadow-xl"><NoCategories /></div>;

  return (
    <div className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain rounded-lg border border-line bg-card p-2 shadow-xl">
      {tree.map((c) => {
        const on = open === c.slug;
        return (
          <div key={c.slug}>
            <button
              type="button"
              onClick={() => setOpen(on ? null : c.slug)}
              aria-expanded={on}
              className={cn(
                "flex min-h-12 w-full items-center gap-3.5 rounded-md px-3.5 text-[0.9rem] font-semibold",
                on ? "bg-iris-50 text-primary" : "text-fg",
              )}
            >
              <CategoryThumb category={c} />
              <span className="flex-1 text-left">{c.name}</span>
              <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-(--dur-fast)", on && "rotate-180")} strokeWidth={2} />
            </button>
            {on && (
              <div className="mt-0.5 mr-2 mb-2 ml-12 flex flex-col gap-3 border-l-2 border-iris-100 py-1.5 pl-3">
                <Link href={categoryHref(c.slug)} onClick={onNavigate} className="inline-flex min-h-11 items-center text-caption font-bold">
                  Shop all {c.name}
                </Link>
                {c.groups.map((g) => (
                  <div key={g.slug}>
                    <Link
                      href={subCategoryHref(c.slug, g.slug)}
                      onClick={onNavigate}
                      className="flex min-h-11 items-center text-caption font-bold !text-fg-strong hover:!text-primary"
                    >
                      {g.name}
                    </Link>
                    <div className="flex flex-col">
                      {g.items.map((item) => (
                        <Link
                          key={item.slug}
                          href={subSubCategoryHref(c.slug, g.slug, item.slug)}
                          onClick={onNavigate}
                          className="flex min-h-11 items-center text-sm !text-fg-muted hover:!text-primary"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Flat category list (mobile drawer "Shop"): one link per category. */
export function CategoryLinkList({ tree, onPick }: { tree: CategoryNode[]; onPick?: () => void }) {
  if (tree.length === 0) return <NoCategories />;
  return (
    <ul className="flex flex-col p-2">
      {tree.map((c) => (
        <li key={c.slug}>
          <Link
            href={categoryHref(c.slug)}
            onClick={onPick}
            className="flex min-h-11 items-center gap-3 rounded-md px-2.5 text-sm font-semibold !text-fg transition-colors duration-(--dur-fast) hover:bg-iris-50 hover:!text-primary"
          >
            <CategoryThumb category={c} />
            <span className="flex-1">{c.name}</span>
            <ChevronRight aria-hidden className="size-4 text-fg-subtle" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
