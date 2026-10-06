"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CategoryOption } from "@/app/admin/(panel)/categories/actions";
import { Button } from "@/components/ui/button";
import { SubSubCategoryFormDialog } from "./SubSubCategoryFormDialog";

/** "+ Add Sub-Sub-Category" — opens the modal; pre-selects the list's category / sub-category filters. */
export function AddSubSubCategoryButton({ categories }: { categories: CategoryOption[] }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);
  const category = params.get("category") ?? undefined;
  const defaults = category && categories.some((c) => c.id === category) ? { categoryId: category, subCategoryId: params.get("sub") ?? undefined } : undefined;

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setInstance((n) => n + 1); // fresh, empty form each time
          setOpen(true);
        }}
      >
        <Plus aria-hidden />
        Add Sub-Sub-Category
      </Button>
      {open && <SubSubCategoryFormDialog key={instance} categories={categories} defaults={defaults} open={open} onOpenChange={setOpen} />}
    </>
  );
}
