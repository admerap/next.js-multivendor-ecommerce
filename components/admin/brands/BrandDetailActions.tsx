"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BrandRow } from "@/app/admin/(panel)/brands/actions";
import { Button } from "@/components/ui/button";
import { BrandFormDialog } from "./BrandFormDialog";
import { DeleteBrandDialog } from "./DeleteBrandDialog";

/** Edit + Delete buttons on the brand detail page (delete returns to the list). */
export function BrandDetailActions({ brand }: { brand: BrandRow }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "edit" | "delete">(null);
  const [instance, setInstance] = useState(0);
  const open = (d: "edit" | "delete") => {
    setInstance((n) => n + 1);
    setDialog(d);
  };

  return (
    <div className="flex flex-wrap gap-2.5">
      <Button type="button" variant="secondary" onClick={() => open("edit")}>
        <Pencil aria-hidden />
        Edit
      </Button>
      <Button type="button" variant="danger" onClick={() => open("delete")}>
        <Trash2 aria-hidden />
        Delete
      </Button>
      {dialog === "edit" && (
        <BrandFormDialog key={`e${instance}`} brand={brand} open onOpenChange={(o) => !o && setDialog(null)} />
      )}
      {dialog === "delete" && (
        <DeleteBrandDialog
          key={`d${instance}`}
          brand={brand}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          afterDelete={() => router.replace("/admin/brands")}
        />
      )}
    </div>
  );
}
