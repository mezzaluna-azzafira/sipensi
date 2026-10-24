"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DeleteButton({
  id,
  action,
  confirmText = "Hapus item ini?",
}: {
  id: string;
  action: (id: string) => Promise<void>;
  confirmText?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Hapus"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmText)) startTransition(() => action(id));
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
