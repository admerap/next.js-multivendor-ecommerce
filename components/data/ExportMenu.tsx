"use client";

import { ChevronDown, Download, FileSpreadsheet, FileText, Sheet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * "Export" menu (Seller Center reports, admin lists): the data as Excel (.xlsx), CSV or PDF, with
 * the filters currently in the URL. Plain download links to the export route, which re-checks the
 * caller's role and scope on the server. Pass `href` (filters already in it), or `base` (+ fixed `extra`
 * params such as the list's view) to take the page's current filters from the URL — page and page size left out,
 * since an export has every row.
 */
export function ExportMenu({ href, base, extra }: { href?: string; base?: string; extra?: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const sp = useSearchParams();
  const target = (() => {
    if (href) return href;
    const next = new URLSearchParams(sp);
    next.delete("page");
    next.delete("pageSize");
    for (const [k, v] of Object.entries(extra ?? {})) next.set(k, v);
    return `${base ?? ""}${next.size ? `?${next}` : ""}`;
  })();
  const link = (format: "xlsx" | "csv" | "pdf") => `${target}${target.includes("?") ? "&" : "?"}format=${format}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={box} className="relative max-sm:w-full">
      <Button type="button" variant="secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="max-sm:w-full">
        <Download aria-hidden />
        Export
        <ChevronDown aria-hidden className="size-4" />
      </Button>
      {open && (
        <div
          role="menu"
          aria-label="Export format"
          className="absolute top-[calc(100%+6px)] right-0 z-20 flex w-52 flex-col rounded-lg border border-line bg-card p-1.5 shadow-lg max-sm:w-full"
        >
          {(
            [
              ["xlsx", "Excel (.xlsx)", Sheet],
              ["csv", "CSV (.csv)", FileSpreadsheet],
              ["pdf", "PDF (.pdf)", FileText],
            ] as const
          ).map(([f, label, Icon]) => (
            <a
              key={f}
              role="menuitem"
              href={link(f)}
              download
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm font-semibold !text-fg-strong hover:bg-hover hover:!text-primary"
            >
              <Icon aria-hidden className="size-4" strokeWidth={2} />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
