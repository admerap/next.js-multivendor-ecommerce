"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CategoryOption } from "@/app/admin/(panel)/categories/actions";
import { Button } from "@/components/ui/button";
import { SubCategoryFormDialog } from "./SubCategoryFormDialog";

/** "+ Add Sub-Category" — opens the modal; pre-selects the category the list is filtered by. */
export function AddSubCategoryButton({ categories }: { categories: CategoryOption[] }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);
  const filtered = params.get("category");

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
        Add Sub-Category
      </Button>
      {open && (
        <SubCategoryFormDialog
          key={instance}
          categories={categories}
          defaultCategoryId={categories.some((c) => c.id === filtered) ? (filtered ?? undefined) : undefined}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
