"use client";

import { useTransition } from "react";

import { SelectNative } from "@/components/ui/select-native";

/** Select yang langsung menyimpan perubahan (auto-save) via server action. */
export function InlineSelect({
  id,
  value,
  options,
  action,
  placeholder = "Pilih…",
  allowEmpty = false,
  emptyLabel = "—",
}: {
  id: string;
  value: string | null;
  options: { value: string; label: string }[];
  action: (id: string, value: string) => Promise<void>;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <SelectNative
      className="h-8 w-auto min-w-40 text-sm"
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={(e) => startTransition(() => action(id, e.target.value))}
    >
      {allowEmpty ? (
        <option value="">{emptyLabel}</option>
      ) : (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SelectNative>
  );
}
