"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandFormDialog } from "./BrandFormDialog";

/** "+ Add Brand" — opens the shared brand modal in create mode. */
export function AddBrandButton() {
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
        Add Brand
      </Button>
      {open && <BrandFormDialog key={instance} open={open} onOpenChange={setOpen} />}
    </>
  );
}
