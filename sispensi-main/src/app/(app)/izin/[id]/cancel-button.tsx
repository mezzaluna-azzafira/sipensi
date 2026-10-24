"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cancelRequestAction } from "./actions";

export function CancelButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          window.confirm(
            "Batalkan pengajuan ini? Tindakan ini tidak dapat diurungkan.",
          )
        ) {
          startTransition(() => cancelRequestAction(id));
        }
      }}
    >
      {pending ? "Membatalkan…" : "Batalkan pengajuan"}
    </Button>
  );
}
