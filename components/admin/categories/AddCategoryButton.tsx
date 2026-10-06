"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryFormDialog } from "./CategoryFormDialog";

/** "+ Add Category" — opens the shared category modal in create mode. */
export function AddCategoryButton() {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

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
        Add Category
      </Button>
      {open && <CategoryFormDialog key={instance} open={open} onOpenChange={setOpen} />}
    </>
  );
}
